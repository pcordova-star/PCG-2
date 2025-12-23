

"use client";

import React, { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, ArrowLeft, Loader2, Trash2, Edit, UserX, UserCheck, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { collection, doc, getDoc, query, orderBy, where, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseDb, firebaseFunctions, firebaseAuth } from '@/lib/firebaseClient';
import { Company, AppUser, UserInvitation, RolInvitado } from '@/types/pcg';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

// Definición de roles para el formulario, alineado con los custom claims
const rolesDisponibles: { value: RolInvitado, label: string }[] = [
    { value: 'admin_empresa', label: 'Admin Empresa' },
    { value: 'jefe_obra', label: 'Jefe de Obra' },
    { value: 'prevencionista', label: 'Prevencionista' },
    { value: 'cliente', label: 'Cliente (Solo lectura)' },
];

export default function AdminEmpresaUsuariosPage() {
    const { user, role, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const companyId = params.companyId as string;
    const { toast } = useToast();

    const [company, setCompany] = useState<Company | null>(null);
    const [users, setUsers] = useState<AppUser[]>([]);
    const [invitations, setInvitations] = useState<UserInvitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<{ email: string, nombre: string, role: RolInvitado, password?: string, id?: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // DEBUGGING STATE
    const [debugInfo, setDebugInfo] = useState<object | null>(null);

    const isSuperAdmin = role === "superadmin";

    useEffect(() => {
        if (!authLoading && !isSuperAdmin) {
            router.replace('/dashboard');
        }
    }, [authLoading, isSuperAdmin, router]);

    useEffect(() => {
        if (!isSuperAdmin || !companyId) return;

        setLoading(true);

        const fetchCompanyData = async () => {
            try {
                const companyRef = doc(firebaseDb, "companies", companyId);
                const companySnap = await getDoc(companyRef);
                if (companySnap.exists()) {
                    setCompany({ id: companySnap.id, ...companySnap.data() } as Company);
                } else {
                    throw new Error("Empresa no encontrada");
                }
            } catch (err: any) {
                console.error("Error fetching company data:", err);
                setError("No se pudieron cargar los datos de la empresa.");
            }
        };

        const unsubUsers = onSnapshot(query(collection(firebaseDb, "users"), where("empresaId", "==", companyId)), (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
            usersData.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
            setUsers(usersData);
        }, (err) => {
            console.error("Error fetching users:", err);
        });

        const unsubInvitations = onSnapshot(query(collection(firebaseDb, "invitacionesUsuarios"), where("empresaId", "==", companyId), orderBy("createdAt", "desc")), (snapshot) => {
            const invitationsData = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate(),
                } as UserInvitation;
            });
            setInvitations(invitationsData);
        });
        
        Promise.all([fetchCompanyData()]).finally(() => setLoading(false));

        return () => {
            unsubUsers();
            unsubInvitations();
        };
    }, [isSuperAdmin, companyId]);

    const handleOpenDialog = (data: Partial<AppUser> & { password?: string } | null = null) => {
        if (data && data.id) { // Editando usuario existente
            setCurrentUser({
                id: data.id,
                email: data.email || '',
                nombre: data.nombre || '',
                role: (data.role as RolInvitado) || 'jefe_obra',
            });
        } else { // Creando nuevo usuario
             setCurrentUser({
                email: '',
                nombre: '',
                role: 'jefe_obra',
                password: '',
            });
        }
        setDialogOpen(true);
    };

    const handleFormSubmit = async (e: FormEvent) => {
        e.preventDefault();
        
        // --- INICIO DE INSTRUMENTACIÓN ---
        setDebugInfo(null);
        const authUser = firebaseAuth.currentUser;

        if (!authUser) {
            const errorMsg = "Error de diagnóstico: El usuario no está autenticado en `firebaseAuth.currentUser`.";
            setError(errorMsg);
            setDebugInfo({ error: errorMsg });
            return;
        }

        try {
            await authUser.getIdToken(true); // Forzar refresco del token
            const tokenResult = await authUser.getIdTokenResult();
            
            const debugData = {
                email: authUser.email,
                uid: authUser.uid,
                tokenClaims: tokenResult.claims,
                projectId: firebaseAuth.app.options.projectId,
                functionsRegion: firebaseFunctions.region,
            };

            console.log("DEBUG: Auth State before Callable", debugData);
            setDebugInfo(debugData);

        } catch (tokenError) {
            console.error("Error obteniendo token:", tokenError);
            setError("Error crítico al obtener el token de autenticación.");
            setDebugInfo({ error: "Fallo en getIdTokenResult()", message: (tokenError as Error).message });
            return;
        }
        // --- FIN DE INSTRUMENTACIÓN ---

        if (!user || !isSuperAdmin || !currentUser) {
            setError("No tienes permisos para realizar esta acción.");
            return;
        }

        setIsSaving(true);
        setError(null);
        
        try {
            if (currentUser.id) {
                const userRef = doc(firebaseDb, "users", currentUser.id);
                await updateDoc(userRef, {
                    nombre: currentUser.nombre,
                });
                toast({ title: "Usuario Actualizado", description: `Los datos de ${currentUser.nombre} han sido actualizados.` });
            } else {
                if (!company) throw new Error("No se ha cargado la empresa");
                if (!currentUser.email || !currentUser.nombre || !currentUser.role || !currentUser.password) {
                    throw new Error("Email, nombre, rol y contraseña son obligatorios.");
                }

                const createCompanyUser = httpsCallable(firebaseFunctions, 'createCompanyUser');
                await createCompanyUser({
                    companyId: company.id,
                    email: currentUser.email,
                    nombre: currentUser.nombre,
                    role: currentUser.role,
                    password: currentUser.password,
                });
                
                toast({ title: "Usuario Creado e Invitado", description: `Se ha enviado una invitación por correo a ${currentUser.email}.` });
            }
            
            setDialogOpen(false);
        } catch (err: any) {
            console.error("Error al guardar:", err);
            const errorMessage = err.message || "Ocurrió un problema.";
            setError(errorMessage);
            setDebugInfo(prev => ({ ...prev, callError: { code: err.code, message: err.message } }));
            toast({ variant: "destructive", title: "Error al guardar", description: errorMessage });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleToggleActivo = async (userToUpdate: AppUser) => {
        try {
            const userRef = doc(firebaseDb, "users", userToUpdate.id!);
            await updateDoc(userRef, { activo: !userToUpdate.activo });
            toast({ title: `Usuario ${userToUpdate.activo ? 'Desactivado' : 'Activado'}`, description: `${userToUpdate.nombre} ha sido ${userToUpdate.activo ? 'desactivado' : 'activado'}.` });
        } catch(err) {
            console.error("Error toggling user status:", err);
            toast({ variant: 'destructive', title: "Error", description: "No se pudo cambiar el estado del usuario." });
        }
    }
    
    const handleDeleteUser = async (userToDelete: AppUser) => {
        try {
            const userRef = doc(firebaseDb, "users", userToDelete.id!);
            await updateDoc(userRef, { eliminado: true, eliminadoAt: serverTimestamp() });
            toast({ title: "Usuario Eliminado", description: `${userToDelete.nombre} ha sido marcado como eliminado.` });
        } catch(err) {
            console.error("Error deleting user:", err);
            toast({ variant: 'destructive', title: "Error", description: "No se pudo eliminar el usuario." });
        }
    }

    const handleRevokeInvitation = async (invitationId: string) => {
        try {
            const invitationRef = doc(firebaseDb, "invitacionesUsuarios", invitationId);
            await updateDoc(invitationRef, { estado: 'revocada' });
            toast({ title: "Invitación Revocada" });
        } catch (err) {
            toast({ variant: 'destructive', title: "Error", description: "No se pudo revocar la invitación." });
        }
    }
    
    const handleResendInvitation = async (inv: UserInvitation) => {
        toast({ title: "Función no implementada", description: "La capacidad de reenviar invitaciones aún está en desarrollo." });
    }
    
    if (authLoading || (!isSuperAdmin && !loading)) {
        return <div className="p-8 text-center text-muted-foreground">Verificando permisos...</div>;
    }
    
    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Cargando datos de la empresa...</div>;
    }
    
    if (error && !dialogOpen) {
        return <div className="p-8 text-center text-destructive">{error}</div>;
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                     <Button variant="outline" size="sm" asChild className="mb-4">
                        <Link href="/admin/empresas"><ArrowLeft className="mr-2 h-4 w-4" />Volver a Empresas</Link>
                    </Button>
                    <h1 className="text-2xl font-bold">Usuarios de {company?.nombreFantasia}</h1>
                    <p className="text-muted-foreground">Crea, edita y administra los usuarios para esta empresa.</p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Crear Nuevo Usuario
                </Button>
            </header>

            {/* DEBUG UI */}
            {debugInfo && (
                <Card className="bg-blue-50 border-blue-200">
                    <CardHeader>
                        <CardTitle className="text-blue-900">Información de Depuración de Auth</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="text-xs bg-white p-2 rounded-md overflow-x-auto">
                            {JSON.stringify(debugInfo, null, 2)}
                        </pre>
                    </CardContent>
                </Card>
            )}
            
            <Card>
                <CardHeader>
                    <CardTitle>Usuarios Activos</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Rol</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center h-24">No hay usuarios activos en esta empresa.</TableCell></TableRow>
                            ) : users.map((u) => (
                                <TableRow key={u.id} className={cn(!u.activo && "text-muted-foreground opacity-60")}>
                                    <TableCell className="font-medium">{u.nombre}</TableCell>
                                    <TableCell>{u.email}</TableCell>
                                    <TableCell><Badge variant="secondary">{u.role}</Badge></TableCell>
                                    <TableCell><Badge variant={u.activo ? 'default' : 'destructive'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge></TableCell>
                                    <TableCell className="text-right">
                                       <div className="flex gap-1 justify-end">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(u)}><Edit className="h-4 w-4" /></Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className={cn(u.activo ? 'text-yellow-600' : 'text-green-600')}>
                                                        {u.activo ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>¿{u.activo ? 'Desactivar' : 'Reactivar'} usuario?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Al {u.activo ? 'desactivar' : 'reactivar'} a {u.nombre}, {u.activo ? 'no podrá' : 'podrá'} iniciar sesión.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleToggleActivo(u)}>{u.activo ? 'Desactivar' : 'Reactivar'}</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Esta acción marcará al usuario {u.nombre} como eliminado y no aparecerá en las listas. No se puede deshacer.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteUser(u)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                       </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <form onSubmit={handleFormSubmit}>
                        <DialogHeader>
                            <DialogTitle>{currentUser?.id ? "Editar Usuario" : "Crear Nuevo Usuario"}</DialogTitle>
                             <DialogDescription>
                                {currentUser?.id ? "Modifica los datos del usuario." : "Completa los datos para crear una nueva cuenta y enviar una invitación por correo."}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 grid gap-4">
                             <div className="space-y-2">
                                <Label htmlFor="email">Email del usuario*</Label>
                                <Input id="email" name="email" type="email" value={currentUser?.email || ''} onChange={e => setCurrentUser(prev => prev ? ({...prev, email: e.target.value}) : null)} disabled={!!currentUser?.id} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="nombre">Nombre*</Label>
                                <Input id="nombre" name="nombre" value={currentUser?.nombre || ''} onChange={e => setCurrentUser(prev => prev ? ({...prev, nombre: e.target.value}) : null)} />
                            </div>
                           
                            {!currentUser?.id && (
                                <div className="space-y-2">
                                    <Label htmlFor="password">Contraseña Temporal*</Label>
                                    <Input id="password" name="password" type="text" value={currentUser?.password || ''} onChange={e => setCurrentUser(prev => prev ? ({...prev, password: e.target.value}) : null)} />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="role">Rol en la Empresa</Label>
                                <Select value={currentUser?.role || 'jefe_obra'} onValueChange={v => setCurrentUser(prev => prev ? ({...prev, role: v as RolInvitado}) : null)}>
                                    <SelectTrigger id="role"><SelectValue placeholder="Seleccione un rol" /></SelectTrigger>
                                    <SelectContent>
                                        {rolesDisponibles.map(r => (
                                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isSaving ? "Guardando..." : "Guardar Cambios"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
