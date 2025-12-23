
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
import { collection, doc, getDoc, query, orderBy, where, onSnapshot, addDoc, serverTimestamp, writeBatch, deleteDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Company, UserInvitation, RolInvitado } from '@/types/pcg';
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
    const companyIdParams = params.companyId as string;
    const { toast } = useToast();

    const [company, setCompany] = useState<Company | null>(null);
    const [invitations, setInvitations] = useState<UserInvitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [newInvitation, setNewInvitation] = useState({
      nombre: '',
      email: '',
      role: 'jefe_obra' as RolInvitado,
    });
    const [isSaving, setIsSaving] = useState(false);

    const isSuperAdmin = role === "superadmin";

    useEffect(() => {
        if (!isSuperAdmin || !companyIdParams) {
          if (!loading) router.replace('/dashboard');
          return;
        };

        setLoading(true);

        const fetchCompanyData = async () => {
            try {
                const companyRef = doc(firebaseDb, "companies", companyIdParams);
                const companySnap = await getDoc(companyRef);
                if (companySnap.exists()) {
                    setCompany({ id: companySnap.id, ...companySnap.data() } as Company);
                } else {
                    setError("Empresa no encontrada.");
                }
            } catch (err: any) {
                console.error("Error fetching company data:", err);
                setError("No se pudieron cargar los datos de la empresa.");
            }
        };

        const unsubInvitations = onSnapshot(query(collection(firebaseDb, "invitacionesUsuarios"), where("empresaId", "==", companyIdParams), orderBy("createdAt", "desc")), (snapshot) => {
            const invitationsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate(),
            } as UserInvitation));
            setInvitations(invitationsData);
            setLoading(false); // Asegurarse de que el loading termine aquí
        }, (err) => {
            console.error("Error fetching invitations:", err);
            setError("No se pudieron cargar las invitaciones.");
            setLoading(false); // Y aquí también en caso de error
        });
        
        fetchCompanyData(); // No necesita un finally porque el onSnapshot se encarga del loading

        return () => {
            unsubInvitations();
        };
    }, [isSuperAdmin, companyIdParams, loading, router]);


    const handleFormSubmit = async (e: FormEvent) => {
        e.preventDefault();
        
        if (!user || !isSuperAdmin || !company) {
            setError("No tienes permisos o la empresa no es válida.");
            return;
        }
        if (!newInvitation.email || !newInvitation.nombre || !newInvitation.role) {
            setError("Email, nombre y rol son obligatorios.");
            return;
        }

        setIsSaving(true);
        setError(null);
        
        try {
            const invitationsRef = collection(firebaseDb, "invitacionesUsuarios");
            await addDoc(invitationsRef, {
                email: newInvitation.email.toLowerCase().trim(),
                nombre: newInvitation.nombre,
                empresaId: company.id,
                empresaNombre: company.nombreFantasia || company.razonSocial,
                roleDeseado: newInvitation.role,
                estado: 'pendiente_auth', // Nuevo estado inicial
                createdAt: serverTimestamp(),
                creadoPorUid: user.uid,
            });
            
            toast({ title: "Invitación Creada", description: `El usuario ${newInvitation.email} ha sido invitado. Ahora un administrador debe crear su cuenta en Firebase Authentication.` });
            setDialogOpen(false);
            setNewInvitation({ nombre: '', email: '', role: 'jefe_obra' });
            
        } catch (err: any) {
            console.error("Error al crear la invitación:", err);
            setError(err.message || "Ocurrió un problema al guardar la invitación.");
            toast({ variant: "destructive", title: "Error al guardar", description: err.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeleteInvitation = async (invitationId: string) => {
        try {
            await deleteDoc(doc(firebaseDb, "invitacionesUsuarios", invitationId));
            toast({ title: "Invitación eliminada" });
        } catch (err) {
            console.error("Error deleting invitation:", err);
            toast({ variant: 'destructive', title: "Error", description: "No se pudo eliminar la invitación." });
        }
    }

    if (loading) {
        return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto h-8 w-8" /> <p className="mt-2">Cargando datos de usuarios...</p></div>;
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
                    <h1 className="text-2xl font-bold">Invitaciones para {company?.nombreFantasia || 'empresa no encontrada'}</h1>
                    <p className="text-muted-foreground">Crea y administra las invitaciones de usuarios para esta empresa.</p>
                </div>
                <Button onClick={() => setDialogOpen(true)} disabled={!company}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Crear Invitación
                </Button>
            </header>
            
            <Card>
                <CardHeader>
                    <CardTitle>Invitaciones Enviadas</CardTitle>
                    <CardDescription>
                        Una vez creada la invitación, crea manualmente el usuario en Firebase Authentication. Al primer login, la cuenta se activará.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Rol Deseado</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invitations.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center h-24">No hay invitaciones para esta empresa.</TableCell></TableRow>
                            ) : invitations.map((inv) => (
                                <TableRow key={inv.id}>
                                    <TableCell className="font-medium">{inv.nombre}</TableCell>
                                    <TableCell>{inv.email}</TableCell>
                                    <TableCell><Badge variant="secondary">{inv.roleDeseado}</Badge></TableCell>
                                    <TableCell><Badge variant={inv.estado === 'activado' ? 'default' : 'destructive'}>{inv.estado}</Badge></TableCell>
                                    <TableCell className="text-right">
                                       <div className="flex gap-1 justify-end">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>¿Eliminar invitación?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Esta acción eliminará la invitación para {inv.email}. No se puede deshacer.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteInvitation(inv.id!)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
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
                            <DialogTitle>Crear Nueva Invitación</DialogTitle>
                             <DialogDescription>
                                Completa los datos para crear una nueva invitación. Recuerda luego crear el usuario en Firebase Authentication.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 grid gap-4">
                             <div className="space-y-2">
                                <Label htmlFor="nombre">Nombre*</Label>
                                <Input id="nombre" value={newInvitation.nombre} onChange={e => setNewInvitation(prev => ({...prev, nombre: e.target.value}))} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="email">Email del usuario*</Label>
                                <Input id="email" type="email" value={newInvitation.email} onChange={e => setNewInvitation(prev => ({...prev, email: e.target.value}))} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role">Rol en la Empresa</Label>
                                <Select value={newInvitation.role} onValueChange={v => setNewInvitation(prev => ({...prev, role: v as RolInvitado}))}>
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
                                {isSaving ? "Guardando..." : "Guardar Invitación"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
