// src/app/(pcg)/cumplimiento/admin/subcontratistas/[subcontractorId]/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, UserX } from 'lucide-react';
import Link from 'next/link';
import { collection, doc, query, where, onSnapshot } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { httpsCallable } from 'firebase/functions';
import { Subcontractor, AppUser } from '@/types/pcg';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { firebaseFunctions } from '@/lib/firebaseClient';


export default function SubcontractorUsersPage() {
    const { user, role } = useAuth();
    const router = useRouter();
    const params = useParams();
    const subcontractorId = params.subcontractorId as string;
    const { toast } = useToast();

    const [subcontractor, setSubcontractor] = useState<Subcontractor | null>(null);
    const [users, setUsers] = useState<AppUser[]>([]);
    
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!subcontractorId) return;

        const unsubSubcontractor = onSnapshot(doc(firebaseDb, "subcontractors", subcontractorId), (doc) => {
            if (doc.exists()) {
                setSubcontractor({ id: doc.id, ...doc.data() } as Subcontractor);
            } else {
                setError("Subcontratista no encontrado.");
                setSubcontractor(null);
            }
        }, (err) => {
            console.error("Error fetching subcontractor data:", err);
            setError("No se pudieron cargar los datos del subcontratista.");
        });

        const usersQuery = query(
            collection(firebaseDb, "users"),
            where("subcontractorId", "==", subcontractorId)
        );
        
        const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as AppUser));
            setUsers(usersData);
            setLoadingData(false);
        }, (err) => {
            console.error("Error fetching subcontractor users:", err);
            setError("No se pudieron cargar los usuarios.");
            setLoadingData(false);
        });

        return () => {
            unsubSubcontractor();
            unsubUsers();
        };
    }, [subcontractorId]);

    const handleDeactivateUser = async (userId: string) => {
        if (!user || (role !== "admin_empresa" && role !== "superadmin")) {
            toast({ variant: "destructive", title: "Error de permisos" });
            return;
        }
        
        try {
            const deactivateFn = httpsCallable(firebaseFunctions, 'deactivateCompanyUser');
            await deactivateFn({ userId, motivo: 'Baja administrativa desde panel de subcontratistas.' });

            toast({ title: "Usuario Desactivado", description: "El usuario ya no podrá acceder a la plataforma." });

        } catch (err: any) {
            console.error("Error al desactivar usuario:", err);
            toast({ variant: "destructive", title: "Error", description: err.message });
        }
    };

    if (loadingData) {
        return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto h-8 w-8" /> <p className="mt-2">Cargando datos...</p></div>;
    }
    
    if (error) {
        return (
             <div className="p-8 text-center space-y-4">
                <p className="text-destructive">{error}</p>
                 <Button variant="outline" asChild>
                    <Link href="/cumplimiento/admin/subcontratistas"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Listado</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header>
                 <Button variant="outline" size="sm" asChild className="mb-4">
                    <Link href="/cumplimiento/admin/subcontratistas"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Listado de Subcontratistas</Link>
                </Button>
                <h1 className="text-2xl font-bold">Usuarios de {subcontractor?.razonSocial || 'Subcontratista'}</h1>
                <p className="text-muted-foreground">Usuarios asociados a esta empresa subcontratista.</p>
            </header>
            
            <Card>
                <CardHeader>
                    <CardTitle>Usuarios Registrados</CardTitle>
                    <CardDescription>Usuarios activos e inactivos del subcontratista.</CardDescription>
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
                                <TableRow><TableCell colSpan={5} className="text-center h-24">No hay usuarios para este subcontratista.</TableCell></TableRow>
                            ) : users.map((u) => (
                                <TableRow key={u.id} className={!u.activo ? 'bg-muted/50 text-muted-foreground' : ''}>
                                    <TableCell className="font-medium">{u.nombre}</TableCell>
                                    <TableCell>{u.email}</TableCell>
                                    <TableCell><Badge variant="secondary">{u.role}</Badge></TableCell>
                                    <TableCell>
                                        <Badge variant={u.activo ? 'default' : 'outline'}>
                                            {u.activo ? 'Activo' : 'Inactivo'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {u.activo && (role === 'admin_empresa' || role === 'superadmin') && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                                        <UserX className="mr-2 h-4 w-4" />
                                                        Dar de baja
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>¿Dar de baja a {u.nombre}?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Esta acción deshabilitará el acceso del usuario. El registro se mantendrá, pero no podrá iniciar sesión.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeactivateUser(u.id!)} className="bg-destructive hover:bg-destructive/90">Confirmar baja</AlertDialogAction>
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
        </div>
    );
}
