

"use client";

import React, { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, ArrowLeft, Loader2, Trash2, Edit } from 'lucide-react';
import Link from 'next/link';
import { collection, doc, getDoc, query, orderBy, where, onSnapshot, updateDoc, writeBatch, addDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseDb, firebaseFunctions } from '@/lib/firebaseClient';
import { httpsCallable } from 'firebase/functions';
import { Company, AppUser, RolInvitado, UserInvitation } from '@/types/pcg';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';


const rolesDisponibles: { value: RolInvitado, label: string }[] = [
    { value: 'admin_empresa', label: 'Admin Empresa' },
    { value: 'jefe_obra', label: 'Jefe de Obra' },
    { value: 'prevencionista', label: 'Prevencionista' },
    { value: 'cliente', label: 'Cliente (Solo lectura)' },
];

export default function AdminEmpresaUsuariosPage() {
    const { user, role } = useAuth();
    const router = useRouter();
    const params = useParams();
    const companyId = params.companyId as string;
    const { toast } = useToast();

    const [company, setCompany] = useState<Company | null>(null);
    const [activeUsers, setActiveUsers] = useState<AppUser[]>([]);
    const [pendingInvitations, setPendingInvitations] = useState<UserInvitation[]>([]);

    const [loadingCompany, setLoadingCompany] = useState(true);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [loadingInvites, setLoadingInvites] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [newUser, setNewUser] = useState({
      nombre: '',
      email: '',
      password: '',
      role: 'jefe_obra' as RolInvitado,
    });
    const [isSaving, setIsSaving] = useState(false);

    const isSuperAdmin = role === "superadmin";

    useEffect(() => {
        if (!isSuperAdmin || !companyId) {
          if (!loadingCompany) router.replace('/dashboard');
          return;
        };

        const unsubCompany = onSnapshot(doc(firebaseDb, "companies", companyId), (doc) => {
            if (doc.exists()) {
                setCompany({ id: doc.id, ...doc.data() } as Company);
            } else {
                setError("Empresa no encontrada.");
                setCompany(null);
            }
            setLoadingCompany(false);
        }, (err) => {
            console.error("Error fetching company data:", err);
            setError("No se pudieron cargar los datos de la empresa.");
            setLoadingCompany(false);
        });

        const usersQuery = query(
            collection(firebaseDb, "users"),
            where("empresaId", "==", companyId),
            orderBy("nombre", "asc")
        );
        
        const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as AppUser));
            setActiveUsers(usersData);
            setLoadingUsers(false);
        }, (err) => {
            console.error("Error fetching active users:", err);
            setError("No se pudieron cargar los usuarios activos. Es posible que falte un índice en Firestore.");
            setLoadingUsers(false);
        });

        const invitesQuery = query(
            collection(firebaseDb, "invitacionesUsuarios"),
            where("empresaId", "==", companyId),
            where("estado", "==", "pendiente"),
            orderBy("createdAt", "desc")
        );

        const unsubInvites = onSnapshot(invitesQuery, (snapshot) => {
            const invitesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as UserInvitation));
            setPendingInvitations(invitesData);
            setLoadingInvites(false);
        }, (err) => {
            console.error("Error fetching pending invites:", err);
            setError("No se pudieron cargar las invitaciones pendientes. Es posible que falte un índice en Firestore.");
            setLoadingInvites(false);
        });


        return () => {
            unsubCompany();
            unsubUsers();
            unsubInvites();
        };
    }, [isSuperAdmin, companyId, router, loadingCompany]);


    const handleFormSubmit = async (e: FormEvent) => {
        e.preventDefault();
        
        if (!user || !isSuperAdmin || !company) {
            setError("No tienes permisos o la empresa no es válida.");
            return;
        }
        if (!newUser.email || !newUser.nombre || !newUser.role || !newUser.password) {
            setError("Email, nombre, contraseña y rol son obligatorios.");
            return;
        }
        if (newUser.password.length < 6) {
             setError("La contraseña debe tener al menos 6 caracteres.");
             return;
        }

        setIsSaving(true);
        setError(null);
        
        try {
            const createCompanyUserFn = httpsCallable(firebaseFunctions, 'createCompanyUser');
            await createCompanyUserFn({
                companyId: company.id,
                email: newUser.email.toLowerCase().trim(),
                nombre: newUser.nombre,
                password: newUser.password,
                role: newUser.role,
            });
            
            toast({ title: "Usuario Creado", description: `${newUser.email} ha sido creado en ${company.nombreFantasia}.` });
            setDialogOpen(false);
            setNewUser({ nombre: '', email: '', password: '', role: 'jefe_obra' });
            
        } catch (err: any) {
            console.error("Error al crear el usuario:", err);
            const errorMessage = err.message || "Ocurrió un problema al crear el usuario.";
            setError(errorMessage);
            toast({ variant: "destructive", title: "Error al crear", description: errorMessage });
        } finally {
            setIsSaving(false);
        }
    };

    if (loadingCompany) {
        return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto h-8 w-8" /> <p className="mt-2">Cargando datos...</p></div>;
    }
    
    if (error) {
        return (
             <div className="p-8 text-center space-y-4">
                <p className="text-destructive">{error}</p>
                 <Button variant="outline" asChild>
                    <Link href="/admin/empresas"><ArrowLeft className="mr-2 h-4 w-4" />Volver a Empresas</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                     <Button variant="outline" size="sm" asChild className="mb-4">
                        <Link href="/admin/empresas"><ArrowLeft className="mr-2 h-4 w-4" />Volver a Empresas</Link>
                    </Button>
                    <h1 className="text-2xl font-bold">Usuarios de {company?.nombreFantasia || 'empresa no encontrada'}</h1>
                    <p className="text-muted-foreground">Crea y administra los usuarios de esta empresa.</p>
                </div>
                <Button onClick={() => setDialogOpen(true)} disabled={!company}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Crear Usuario
                </Button>
            </header>
            
            <Card>
                <CardHeader>
                    <CardTitle>Usuarios Activos</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow><TableHead>Nombre</TableHead><TableHead>Email</TableHead><TableHead>Rol</TableHead><TableHead>Estado</TableHead></TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingUsers ? (
                                <TableRow><TableCell colSpan={4} className="text-center h-24"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                            ) : activeUsers.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center h-24">No hay usuarios activos para esta empresa.</TableCell></TableRow>
                            ) : activeUsers.map((u) => (
                                <TableRow key={u.id}>
                                    <TableCell className="font-medium">{u.nombre}</TableCell>
                                    <TableCell>{u.email}</TableCell>
                                    <TableCell><Badge variant="secondary">{u.role}</Badge></TableCell>
                                    <TableCell><Badge variant={u.activo ? 'default' : 'destructive'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Usuarios Pendientes de Activación</CardTitle>
                     <CardDescription>Esta sección es para el flujo antiguo de invitaciones y puede ser eliminada.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow><TableHead>Email</TableHead><TableHead>Nombre</TableHead><TableHead>Rol Asignado</TableHead><TableHead>Fecha Invitación</TableHead></TableRow>
                        </TableHeader>
                        <TableBody>
                           {loadingInvites ? (
                                <TableRow><TableCell colSpan={4} className="text-center h-24"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                            ) : pendingInvitations.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center h-24">No hay usuarios pendientes.</TableCell></TableRow>
                            ) : pendingInvitations.map((inv) => (
                                <TableRow key={inv.id}>
                                    <TableCell>{inv.email}</TableCell>
                                    <TableCell>{inv.nombre}</TableCell>
                                    <TableCell><Badge variant="outline">{inv.roleDeseado}</Badge></TableCell>
                                    <TableCell>{inv.createdAt?.toDate().toLocaleDateString() || 'N/A'}</TableCell>
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
                            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                             <DialogDescription>
                                Completa los datos para crear un nuevo usuario en {company?.nombreFantasia}. El acceso será inmediato.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 grid gap-4">
                             <div className="space-y-2">
                                <Label htmlFor="nombre">Nombre*</Label>
                                <Input id="nombre" value={newUser.nombre} onChange={e => setNewUser(prev => ({...prev, nombre: e.target.value}))} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="email">Email del usuario*</Label>
                                <Input id="email" type="email" value={newUser.email} onChange={e => setNewUser(prev => ({...prev, email: e.target.value}))} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="password">Contraseña*</Label>
                                <Input id="password" type="password" value={newUser.password} onChange={e => setNewUser(prev => ({...prev, password: e.target.value}))} placeholder="Mínimo 6 caracteres" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role">Rol en la Empresa</Label>
                                <Select value={newUser.role} onValueChange={v => setNewUser(prev => ({...prev, role: v as RolInvitado}))}>
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
                                {isSaving ? "Creando usuario..." : "Crear Usuario"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
