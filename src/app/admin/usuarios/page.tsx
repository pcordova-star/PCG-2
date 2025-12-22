"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, ArrowLeft, Info } from 'lucide-react';
import { collection, doc, query, orderBy, onSnapshot, updateDoc, writeBatch, getDocs } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Company, UserInvitation } from '@/types/pcg';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
// Flow global deshabilitado: fuente única createCompanyUser
// import { invitarUsuario } from '@/lib/invitaciones/invitarUsuario';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';

// Feature flag local para deshabilitar el formulario de invitación global.
const ENABLE_GLOBAL_INVITES = false;

export default function AdminUsuariosPage() {
    const { role, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [companies, setCompanies] = useState<Company[]>([]);
    const [invitations, setInvitations] = useState<UserInvitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [filtroEmpresa, setFiltroEmpresa] = useState('all');
    const [filtroEstado, setFiltroEstado] = useState('all');

    const [selectedInvitations, setSelectedInvitations] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!authLoading && role !== 'superadmin') {
            router.replace('/dashboard');
        }
    }, [authLoading, role, router]);

    useEffect(() => {
        if (role !== 'superadmin') return;

        setLoading(true);

        const fetchCompanies = async () => {
            const companiesRef = collection(firebaseDb, "companies");
            try {
                const companiesSnap = await getDocs(query(companiesRef, orderBy("nombreFantasia")));
                const companiesData = companiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
                setCompanies(companiesData);
            } catch (err: any) {
                 console.error("Error fetching companies:", err);
                 setError("No se pudieron cargar las empresas.");
            }
        };

        const unsubInvitations = onSnapshot(
            query(collection(firebaseDb, "invitacionesUsuarios"), orderBy("createdAt", "desc")),
            (snapshot) => {
                const invitationsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate(),
                } as UserInvitation));
                setInvitations(invitationsData);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching invitations:", err);
                setError("No se pudieron cargar las invitaciones.");
                setLoading(false);
            }
        );

        fetchCompanies();

        return () => {
            unsubInvitations();
        };
    }, [role]);

    const filteredInvitations = useMemo(() => {
        return invitations.filter(inv => {
            const matchCompany = filtroEmpresa === 'all' || inv.empresaId === filtroEmpresa;
            const matchStatus = filtroEstado === 'all' || inv.estado === filtroEstado;
            return matchCompany && matchStatus;
        });
    }, [invitations, filtroEmpresa, filtroEstado]);

    /**
     * Flow global deshabilitado: fuente única createCompanyUser
    const handleCreateInvitation = async (e: FormEvent) => { ... };
    const handleResendInvitation = async (inv: UserInvitation) => { ... };
    */

    const handleRevokeInvitation = async (invitationId: string) => {
        try {
            const invitationRef = doc(firebaseDb, "invitacionesUsuarios", invitationId);
            await updateDoc(invitationRef, { estado: 'revocada' });
            toast({ title: "Invitación Revocada" });
        } catch (err: any) {
            toast({ variant: 'destructive', title: "Error", description: "No se pudo revocar la invitación." });
        }
    };

    const handleDeleteInvitations = async (ids: Set<string>) => {
        if (ids.size === 0) return;
        try {
            const batch = writeBatch(firebaseDb);
            ids.forEach(id => {
                const docRef = doc(firebaseDb, "invitacionesUsuarios", id);
                batch.delete(docRef);
            });
            await batch.commit();
            toast({ title: "Eliminación exitosa", description: `Se eliminaron ${ids.size} invitaciones.` });
            setSelectedInvitations(new Set());
        } catch(err: any) {
            toast({ variant: "destructive", title: "Error al eliminar", description: "No se pudieron eliminar las invitaciones seleccionadas."});
        }
    }
    
    const handleSelectAll = (checked: boolean) => {
        if(checked) {
            setSelectedInvitations(new Set(filteredInvitations.map(inv => inv.id!)));
        } else {
            setSelectedInvitations(new Set());
        }
    }

    if (loading) {
        return <div className="p-8 text-center"><Loader2 className="animate-spin" /> Cargando invitaciones...</div>;
    }

    if (error) {
        return <div className="p-8 text-center text-destructive">{error}</div>;
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div className="space-y-4">
                     <Button variant="outline" size="sm" asChild>
                        <Link href="/admin/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Dashboard</Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Supervisión de Invitaciones</h1>
                        <p className="text-muted-foreground">Supervisa y gestiona invitaciones (sin crear usuarios desde aquí).</p>
                    </div>
                </div>
            </header>

            {!ENABLE_GLOBAL_INVITES && (
                 <Card className="bg-blue-50 border-blue-200">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <Info className="h-6 w-6 text-blue-600"/>
                        <div>
                            <CardTitle className="text-blue-900">Gestión de Usuarios Centralizada</CardTitle>
                            <CardDescription className="text-blue-700">
                                La creación de usuarios se realiza solo desde: Admin &gt; Empresas &gt; Usuarios.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                         <Button asChild>
                            <Link href="/admin/empresas">
                                Ir a Gestión de Empresas
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Filtros de Invitaciones</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 space-y-2">
                        <Label>Filtrar por Empresa</Label>
                        <Select value={filtroEmpresa} onValueChange={setFiltroEmpresa}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las empresas</SelectItem>
                                {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.nombreFantasia || c.razonSocial}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex-1 space-y-2">
                        <Label>Filtrar por Estado</Label>
                        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los estados</SelectItem>
                                <SelectItem value="pendiente">Pendiente</SelectItem>
                                <SelectItem value="aceptada">Aceptada</SelectItem>
                                <SelectItem value="revocada">Revocada</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle>Listado Global de Invitaciones</CardTitle>
                        <CardDescription>Mostrando {filteredInvitations.length} de {invitations.length} invitaciones totales.</CardDescription>
                    </div>
                    {selectedInvitations.size > 0 && (
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Eliminar ({selectedInvitations.size})
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>¿Eliminar {selectedInvitations.size} invitaciones?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteInvitations(selectedInvitations)}>Eliminar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-10"><Checkbox onCheckedChange={handleSelectAll} /></TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Empresa</TableHead>
                                <TableHead>Rol Asignado</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredInvitations.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="text-center h-24">No hay invitaciones que coincidan con los filtros.</TableCell></TableRow>
                            ) : filteredInvitations.map((inv) => (
                                <TableRow key={inv.id}>
                                    <TableCell><Checkbox checked={selectedInvitations.has(inv.id!)} onCheckedChange={(checked) => {
                                        setSelectedInvitations(prev => {
                                            const newSet = new Set(prev);
                                            if (checked) newSet.add(inv.id!);
                                            else newSet.delete(inv.id!);
                                            return newSet;
                                        });
                                    }}/></TableCell>
                                    <TableCell className="font-medium">{inv.email}</TableCell>
                                    <TableCell>{inv.empresaNombre}</TableCell>
                                    <TableCell><Badge variant="outline">{inv.roleDeseado}</Badge></TableCell>
                                    <TableCell><Badge variant={inv.estado === 'pendiente' ? 'secondary' : (inv.estado === 'revocada' ? 'destructive' : 'default')}>{inv.estado}</Badge></TableCell>
                                    <TableCell>{inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-1 justify-end">
                                            {inv.estado === 'pendiente' && (
                                                <>
                                                    {ENABLE_GLOBAL_INVITES && (
                                                        // <Button variant="ghost" size="icon" onClick={() => handleResendInvitation(inv)} title="Reenviar invitación"><RefreshCw className="h-4 w-4" /></Button>
                                                        <></>
                                                    )}
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-destructive" title="Revocar invitación"><Trash2 className="h-4 w-4" /></Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>¿Revocar invitación?</AlertDialogTitle>
                                                                <AlertDialogDescription>La invitación para {inv.email} será invalidada.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleRevokeInvitation(inv.id!)} className="bg-destructive hover:bg-destructive/90">Revocar</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </>
                                            )}
                                             {inv.estado === 'revocada' && (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="text-destructive" title="Eliminar invitación">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>¿Eliminar permanentemente?</AlertDialogTitle>
                                                            <AlertDialogDescription>La invitación para {inv.email} será borrada de la base de datos.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteInvitations(new Set([inv.id!]))} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
