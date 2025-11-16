// src/app/admin/empresas/[companyId]/usuarios/page.tsx
"use client";

import React, { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, ArrowLeft, Loader2, Trash2, Edit, UserX, UserCheck, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { collection, doc, getDoc, query, orderBy, where, addDoc, serverTimestamp, updateDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Company, CompanyUser, UserInvitation, RolInvitado, AppUser } from '@/types/pcg';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { invitarUsuario } from '@/lib/invitaciones/invitarUsuario';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';


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
    const [currentUser, setCurrentUser] = useState<Partial<AppUser> & { isInvitation?: boolean } | null>(null);
    const [isSaving, setIsSaving] = useState(false);

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
            } catch (err) {
                console.error("Error fetching company data:", err);
                setError("No se pudieron cargar los datos de la empresa.");
            }
        };

        const unsubUsers = onSnapshot(query(collection(firebaseDb, "users"), where("empresaId", "==", companyId), where("eliminado", "==", false)), (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
            usersData.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
            setUsers(usersData);
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
            setInvitations(invitationsData.filter(inv => inv.estado === 'pendiente'));
        });
        
        Promise.all([fetchCompanyData()]).finally(() => setLoading(false));

        return () => {
            unsubUsers();
            unsubInvitations();
        };
    }, [isSuperAdmin, companyId]);

    const handleOpenDialog = (data: Partial<AppUser> | Partial<UserInvitation> | null = null, isInvitation: boolean = false) => {
        if (data) {
            setCurrentUser({ ...data, isInvitation });
        } else {
            setCurrentUser({
                email: '',
                role: 'cliente',
                nombre: '',
                isInvitation: true
            });
        }
        setDialogOpen(true);
    };

    const handleFormSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!user || !isSuperAdmin || !currentUser) {
            setError("No tienes permisos para realizar esta acción.");
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            if (currentUser.isInvitation && !currentUser.id) { // Es una nueva invitación
                if (!company) throw new Error("No se ha cargado la empresa");
                if (!currentUser.email) throw new Error("El email es obligatorio.");
                await invitarUsuario({
                    email: currentUser.email!,
                    empresaId: company.id,
                    empresaNombre: company.nombre,
                    roleDeseado: currentUser.role as RolInvitado,
                });
                toast({ title: "Invitación Enviada", description: `Se ha enviado una invitación por correo a ${currentUser.email}.` });
            } else if (currentUser.isInvitation && currentUser.id) { // Editando una invitación pendiente
                 const batch = writeBatch(firebaseDb);
                 const invRef = doc(firebaseDb, "invitacionesUsuarios", currentUser.id);
                 batch.update(invRef, { email: currentUser.email, roleDeseado: currentUser.role });
                 await batch.commit();
                 toast({ title: "Invitación Actualizada", description: "Los datos de la invitación han sido actualizados." });
            } else { // Editando un usuario existente
                if (!currentUser.id) throw new Error("ID de usuario no encontrado.");
                const userRef = doc(firebaseDb, "users", currentUser.id);
                await updateDoc(userRef, {
                    nombre: currentUser.nombre,
                    role: currentUser.role,
                    activo: currentUser.activo,
                });
                toast({ title: "Usuario Actualizado", description: `Los datos de ${currentUser.nombre} han sido actualizados.` });
            }
            setDialogOpen(false);
        } catch (err: any) {
            console.error("Error al guardar:", err);
            setError(err.message || "No se pudo guardar la información.");
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
            console.error("Error revoking invitation:", err);
            toast({ variant: 'destructive', title: "Error", description: "No se pudo revocar la invitación." });
        }
    }
    
    const handleResendInvitation = async (inv: UserInvitation) => {
        if (!company) return;
        try {
            await invitarUsuario({
                email: inv.email,
                empresaId: company.id,
                empresaNombre: company.nombre,
                roleDeseado: inv.roleDeseado,
            });
            toast({ title: "Invitación Reenviada", description: `Se ha reenviado la invitación a ${inv.email}.` });
        } catch (err: any) {
             toast({ variant: 'destructive', title: "Error", description: "No se pudo reenviar la invitación." });
        }
    }
    
    if (authLoading || (!isSuperAdmin && !loading)) {
        return <div className="p-8 text-center text-muted-foreground">Verificando permisos...</div>;
    }
    
    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Cargando datos de la empresa...</div>;
    }
    
    if (error) {
        return <div className="p-8 text-center text-destructive">{error}</div>;
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                     <Button variant="outline" size="sm" asChild className="mb-4">
                        <Link href="/admin/empresas"><ArrowLeft className="mr-2 h-4 w-4" />Volver a Empresas</Link>
                    </Button>
                    <h1 className="text-2xl font-bold">Usuarios de {company?.nombre}</h1>
                    <p className="text-muted-foreground">Administra los usuarios e invitaciones para esta empresa.</p>
                </div>
                <Button onClick={() => handleOpenDialog(null, true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Invitar Usuario
                </Button>
            </header>
            
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
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(u, false)}><Edit className="h-4 w-4" /></Button>
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

            <Card>
                <CardHeader>
                    <CardTitle>Invitaciones Pendientes</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email Invitado</TableHead>
                                <TableHead>Rol Asignado</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invitations.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center h-24">No hay invitaciones pendientes.</TableCell></TableRow>
                            ) : invitations.map((inv) => (
                                <TableRow key={inv.id}>
                                    <TableCell className="font-medium">{inv.email}</TableCell>
                                    <TableCell><Badge variant="outline">{inv.roleDeseado}</Badge></TableCell>
                                    <TableCell>{inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex gap-1 justify-end">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(inv, true)}><Edit className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleResendInvitation(inv)}><RefreshCw className="h-4 w-4" /></Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>¿Revocar invitación?</AlertDialogTitle>
                                                    <AlertDialogDescription>La invitación para {inv.email} será invalidada y no podrá ser usada.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleRevokeInvitation(inv.id!)} className="bg-destructive hover:bg-destructive/90">Revocar</AlertDialogAction>
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
                            <DialogTitle>{currentUser?.id ? "Editar Usuario / Invitación" : "Invitar Nuevo Usuario"}</DialogTitle>
                             <DialogDescription>
                                {currentUser?.isInvitation ? "Completa los datos para enviar o modificar una invitación." : "Modifica los datos del usuario."}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 grid gap-4">
                             <div className="space-y-2">
                                <Label htmlFor="email">Email del usuario*</Label>
                                <Input id="email" name="email" type="email" value={currentUser?.email || ''} onChange={e => setCurrentUser(prev => ({...prev, email: e.target.value}))} disabled={!currentUser?.isInvitation} />
                                {!currentUser?.isInvitation && <p className='text-xs text-muted-foreground'>El email no se puede cambiar para usuarios existentes.</p>}
                            </div>
                             {!currentUser?.isInvitation && (
                                <div className="space-y-2">
                                    <Label htmlFor="nombre">Nombre*</Label>
                                    <Input id="nombre" name="nombre" value={currentUser?.nombre || ''} onChange={e => setCurrentUser(prev => ({...prev, nombre: e.target.value}))} />
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="role">Rol en la Empresa</Label>
                                <Select value={currentUser?.role || 'cliente'} onValueChange={v => setCurrentUser(prev => ({...prev, role: v as RolInvitado}))}>
                                    <SelectTrigger id="role"><SelectValue placeholder="Seleccione un rol" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin_empresa">Admin Empresa</SelectItem>
                                        <SelectItem value="jefe_obra">Jefe de Obra</SelectItem>
                                        <SelectItem value="prevencionista">Prevencionista</SelectItem>
                                        <SelectItem value="cliente">Cliente (Solo lectura)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             {!currentUser?.isInvitation && (
                                 <div className="flex items-center space-x-2 pt-2">
                                    <Switch id="activo" checked={currentUser?.activo ?? true} onCheckedChange={c => setCurrentUser(prev => ({...prev, activo: c}))}/>
                                    <Label htmlFor="activo">Usuario Activo</Label>
                                 </div>
                             )}
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
