"use client";

import React, { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { collection, doc, getDoc, query, orderBy, where, addDoc, serverTimestamp, updateDoc, onSnapshot } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Company, CompanyUser, UserInvitation, RolInvitado } from '@/types/pcg';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { invitarUsuario } from '@/lib/invitaciones/invitarUsuario';


export default function AdminEmpresaUsuariosPage() {
    const { user, role, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const companyId = params.companyId as string;
    const { toast } = useToast();

    const [company, setCompany] = useState<Company | null>(null);
    const [users, setUsers] = useState<CompanyUser[]>([]);
    const [invitations, setInvitations] = useState<UserInvitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [newInvitation, setNewInvitation] = useState<{ email: string, roleDeseado: RolInvitado }>({ email: '', roleDeseado: 'cliente' });
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

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

        const unsubUsers = onSnapshot(query(collection(firebaseDb, "users"), where("empresaId", "==", companyId)), (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompanyUser));
            usersData.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
            setUsers(usersData);
        });

        const unsubInvitations = onSnapshot(query(collection(firebaseDb, "invitacionesUsuarios"), where("empresaId", "==", companyId), orderBy("empresaId", "desc")), (snapshot) => {
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

    const handleOpenDialog = () => {
        setNewInvitation({ email: '', roleDeseado: 'cliente' });
        setDialogOpen(true);
        setFormError(null);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNewInvitation({ ...newInvitation, [name]: value });
    };
    
    const handleSelectChange = (value: RolInvitado) => {
        setNewInvitation({ ...newInvitation, roleDeseado: value });
    };

    const handleInviteSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!user || !isSuperAdmin) {
            setFormError("No tienes permisos para realizar esta acción.");
            return;
        }
        if (!company) {
            setFormError("No se ha cargado la información de la empresa.");
            return;
        }
        if (!newInvitation.email) {
            setFormError("El email es obligatorio.");
            return;
        }

        setIsSaving(true);
        setFormError(null);

        try {
            await invitarUsuario({
              email: newInvitation.email,
              empresaId: company.id,
              empresaNombre: company.nombre,
              roleDeseado: newInvitation.roleDeseado,
            });

            toast({
                title: "Invitación Enviada",
                description: `Se ha enviado una invitación por correo a ${newInvitation.email}.`
            });

            setDialogOpen(false);
        } catch (err: any) {
            console.error("Error sending invitation:", err);
            setFormError(err.message || "No se pudo enviar la invitación. Intente de nuevo.");
        } finally {
            setIsSaving(false);
        }
    };

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
                <Button onClick={handleOpenDialog}>
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
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center h-24">No hay usuarios activos en esta empresa.</TableCell></TableRow>
                            ) : users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.nombre}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell><Badge variant="secondary">{user.role}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        {/* Botones de Editar/Eliminar irían aquí */}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Invitaciones Enviadas</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email Invitado</TableHead>
                                <TableHead>Rol Asignado</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invitations.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center h-24">No hay invitaciones para esta empresa.</TableCell></TableRow>
                            ) : invitations.map((inv) => (
                                <TableRow key={inv.id}>
                                    <TableCell className="font-medium">{inv.email}</TableCell>
                                    <TableCell><Badge variant="outline">{inv.roleDeseado}</Badge></TableCell>
                                    <TableCell>
                                        <Badge variant={inv.estado === 'pendiente' ? 'default' : inv.estado === 'aceptada' ? 'secondary' : 'destructive'}>
                                            {inv.estado}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        {inv.estado === 'pendiente' && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="text-destructive">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Revocar
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>¿Revocar invitación?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            La invitación para {inv.email} será invalidada y no podrá ser usada para registrarse.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleRevokeInvitation(inv.id!)} className="bg-destructive hover:bg-destructive/90">
                                                            Revocar
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <form onSubmit={handleInviteSubmit}>
                        <DialogHeader>
                            <DialogTitle>Invitar Usuario a {company?.nombre}</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 grid gap-4">
                             <div className="space-y-2">
                                <Label htmlFor="email">Email del invitado*</Label>
                                <Input id="email" name="email" type="email" value={newInvitation.email || ''} onChange={handleFormChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="roleDeseado">Rol en la Empresa</Label>
                                <Select value={newInvitation.roleDeseado || 'cliente'} onValueChange={handleSelectChange}>
                                    <SelectTrigger id="roleDeseado">
                                        <SelectValue placeholder="Seleccione un rol" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin_empresa">Admin Empresa</SelectItem>
                                        <SelectItem value="jefe_obra">Jefe de Obra</SelectItem>
                                        <SelectItem value="prevencionista">Prevencionista</SelectItem>
                                        <SelectItem value="cliente">Cliente (Solo lectura)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {formError && <p className="text-sm font-medium text-destructive">{formError}</p>}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isSaving ? "Enviando..." : "Enviar Invitación"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
