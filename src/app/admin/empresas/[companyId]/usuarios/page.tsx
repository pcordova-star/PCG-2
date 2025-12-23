
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
import { collection, doc, getDoc, query, orderBy, where, onSnapshot, updateDoc, writeBatch } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { firebaseDb, firebaseFunctions } from '@/lib/firebaseClient';
import { Company, AppUser, RolInvitado } from '@/types/pcg';
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
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [newUser, setNewUser] = useState({
      nombre: '',
      email: '',
      role: 'jefe_obra' as RolInvitado,
    });
    const [isSaving, setIsSaving] = useState(false);

    const isSuperAdmin = role === "superadmin";

    useEffect(() => {
        if (!isSuperAdmin || !companyId) {
          if (!loading) router.replace('/dashboard');
          return;
        };

        const unsub = onSnapshot(doc(firebaseDb, "companies", companyId), (doc) => {
            if (doc.exists()) {
                setCompany({ id: doc.id, ...doc.data() } as Company);
            } else {
                setError("Empresa no encontrada.");
                setCompany(null);
            }
        }, (err) => {
            console.error("Error fetching company data:", err);
            setError("No se pudieron cargar los datos de la empresa.");
        });

        const usersQuery = query(
            collection(firebaseDb, "users"),
            where("empresaId", "==", companyId),
            orderBy("nombre", "asc")
        );
        
        const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
            setLoading(true);
            console.log(`[AdminUsuarios] Cargando usuarios para companyId: ${companyId}. Encontrados: ${snapshot.size}`);
            const usersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as AppUser));
            setUsers(usersData);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching users:", err);
            setError("No se pudieron cargar los usuarios de la empresa.");
            setLoading(false);
        });

        return () => {
            unsub();
            unsubUsers();
        };
    }, [isSuperAdmin, companyId, router]);


    const handleFormSubmit = async (e: FormEvent) => {
        e.preventDefault();
        
        if (!user || !isSuperAdmin || !company) {
            setError("No tienes permisos o la empresa no es válida.");
            return;
        }
        if (!newUser.email || !newUser.nombre || !newUser.role) {
            setError("Email, nombre y rol son obligatorios.");
            return;
        }

        setIsSaving(true);
        setError(null);
        
        try {
            const createCompanyUserFn = httpsCallable(firebaseFunctions, 'createCompanyUser');
            await createCompanyUserFn({
                email: newUser.email,
                nombre: newUser.nombre,
                role: newUser.role,
                companyId: company.id,
            });
            
            toast({ title: "Usuario Creado", description: `Se ha enviado una invitación a ${newUser.email} para unirse a ${company.nombreFantasia}.` });
            setDialogOpen(false);
            setNewUser({ nombre: '', email: '', role: 'jefe_obra' });
            
        } catch (err: any) {
            console.error("Error al crear el usuario:", err);
            const errorMessage = err.message || "Ocurrió un problema al crear el usuario. Revisa las Cloud Functions.";
            setError(errorMessage);
            toast({ variant: "destructive", title: "Error al crear", description: errorMessage });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeleteUser = async (userToDelete: AppUser) => {
        if (!userToDelete.id) return;
        try {
            // Lógica para borrar un usuario. Puede ser complejo (borrar de Auth, etc.)
            // Por ahora, solo lo marcaremos como inactivo.
            const userRef = doc(firebaseDb, "users", userToDelete.id);
            await updateDoc(userRef, { activo: false, eliminado: true, eliminadoAt: serverTimestamp() });
            toast({ title: "Usuario desactivado", description: `${userToDelete.nombre} ha sido marcado como inactivo.` });
        } catch (err) {
            console.error("Error deleting user:", err);
            toast({ variant: 'destructive', title: "Error", description: "No se pudo desactivar el usuario." });
        }
    }

    if (loading && !company && !error) {
        return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto h-8 w-8" /> <p className="mt-2">Cargando datos de la empresa y usuarios...</p></div>;
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
                    <CardTitle>Usuarios Registrados</CardTitle>
                    <CardDescription>
                       Lista de todos los usuarios (activos e inactivos) asociados a esta empresa.
                    </CardDescription>
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
                            {loading ? (
                                 <TableRow><TableCell colSpan={5} className="text-center h-24"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                            ) : users.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center h-24">No hay usuarios para esta empresa.</TableCell></TableRow>
                            ) : users.map((u) => (
                                <TableRow key={u.id} className={u.eliminado ? 'text-muted-foreground opacity-60' : ''}>
                                    <TableCell className="font-medium">{u.nombre}</TableCell>
                                    <TableCell>{u.email}</TableCell>
                                    <TableCell><Badge variant="secondary">{u.role}</Badge></TableCell>
                                    <TableCell>
                                        <Badge variant={u.activo && !u.eliminado ? 'default' : 'destructive'}>
                                            {u.eliminado ? 'Eliminado' : (u.activo ? 'Activo' : 'Inactivo')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                       <div className="flex gap-1 justify-end">
                                            <Button variant="ghost" size="icon" disabled><Edit className="h-4 w-4" /></Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>¿Desactivar usuario?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Esta acción marcará al usuario {u.email} como inactivo/eliminado y revocará su acceso. No se puede deshacer.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteUser(u)} className="bg-destructive hover:bg-destructive/90">Confirmar</AlertDialogAction>
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
                            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                             <DialogDescription>
                                Completa los datos para invitar un nuevo usuario a {company?.nombreFantasia}. Recibirá un correo para activar su cuenta.
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
                                {isSaving ? "Creando usuario..." : "Crear y Enviar Invitación"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
