"use client";

import React, { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { collection, addDoc, getDocs, doc, getDoc, serverTimestamp, query, orderBy, setDoc, where } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Company, CompanyUser } from '@/types/pcg';

// Simulación de rol, reemplazar con lógica de claims real
const useSuperAdminRole = () => {
    return true; // Temporalmente permitir acceso para desarrollo
}

export default function AdminEmpresaUsuariosPage() {
    const isSuperAdmin = useSuperAdminRole();
    const router = useRouter();
    const params = useParams();
    const companyId = params.companyId as string;

    const [company, setCompany] = useState<Company | null>(null);
    const [users, setUsers] = useState<CompanyUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<Partial<CompanyUser> | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!isSuperAdmin || !companyId) return;

        async function fetchData() {
            setLoading(true);
            try {
                // Cargar datos de la empresa
                const companyRef = doc(firebaseDb, "companies", companyId);
                const companySnap = await getDoc(companyRef);
                if (!companySnap.exists()) throw new Error("Empresa no encontrada");
                setCompany({ id: companySnap.id, ...companySnap.data() } as Company);

                // Cargar usuarios de la empresa
                const usersQuery = query(collection(firebaseDb, "companies", companyId, "users"), orderBy("nombre", "asc"));
                const usersSnapshot = await getDocs(usersQuery);
                const usersData = usersSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as CompanyUser));
                setUsers(usersData);
            } catch (err) {
                console.error("Error fetching data:", err);
                setError(err instanceof Error ? err.message : "No se pudieron cargar los datos.");
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [isSuperAdmin, companyId]);

    const handleOpenDialog = (user: Partial<CompanyUser> | null = null) => {
        setCurrentUser(user || { nombre: '', email: '', role: 'LECTOR_CLIENTE', activo: true });
        setDialogOpen(true);
        setError(null);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (currentUser) {
            const { name, value } = e.target;
            setCurrentUser({ ...currentUser, [name]: value });
        }
    };
    
    const handleSelectChange = (name: keyof CompanyUser, value: string) => {
         if (currentUser) {
            setCurrentUser({ ...currentUser, [name]: value });
        }
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!currentUser || !currentUser.nombre || !currentUser.email) {
            setError("Nombre y Email son obligatorios.");
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            // Simulación: en un caso real, aquí llamaríamos a una Cloud Function
            // que crea el usuario en Firebase Auth y nos devuelve el UID.
            const simularedUid = `sim_${currentUser.email.split('@')[0]}_${Date.now()}`;
            
            const companyUserRef = doc(firebaseDb, "companies", companyId, "users", simularedUid);
            const globalUserRef = doc(firebaseDb, "users", simularedUid);

            const companyUserData = {
                uid: simularedUid,
                email: currentUser.email,
                nombre: currentUser.nombre,
                role: currentUser.role || 'LECTOR_CLIENTE',
                activo: currentUser.activo !== false, // por defecto true
                obrasAsignadas: currentUser.obrasAsignadas || [],
            };
            
            await setDoc(companyUserRef, companyUserData);
            
            // Crear o actualizar el usuario global
            await setDoc(globalUserRef, {
                nombre: currentUser.nombre,
                email: currentUser.email,
                isSuperAdmin: false,
                companyIdPrincipal: companyId,
                createdAt: serverTimestamp(),
            }, { merge: true });

            setUsers(prev => [...prev, { id: simularedUid, ...companyUserData } as CompanyUser]);
            setDialogOpen(false);
        } catch (err) {
            console.error("Error saving user:", err);
            setError("No se pudo guardar el usuario.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isSuperAdmin) {
        return <div className="p-8 text-center text-destructive">Acceso denegado.</div>;
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
                    <p className="text-muted-foreground">Administra los usuarios asignados a esta empresa.</p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Agregar Usuario
                </Button>
            </header>
            
            <Card>
                <CardHeader>
                    <CardTitle>Listado de Usuarios</CardTitle>
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
                                <TableRow><TableCell colSpan={5} className="text-center h-24">No hay usuarios en esta empresa.</TableCell></TableRow>
                            ) : users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.nombre}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell><Badge variant="secondary">{user.role}</Badge></TableCell>
                                    <TableCell>
                                        <Badge variant={user.activo ? 'default' : 'outline'}>
                                            {user.activo ? 'Activo' : 'Inactivo'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {/* Botones de Editar/Eliminar irían aquí */}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>Agregar Usuario a {company?.nombre}</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 grid gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="nombre">Nombre Completo*</Label>
                                <Input id="nombre" name="nombre" value={currentUser?.nombre || ''} onChange={handleFormChange} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="email">Email*</Label>
                                <Input id="email" name="email" type="email" value={currentUser?.email || ''} onChange={handleFormChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role">Rol en la Empresa</Label>
                                <Select value={currentUser?.role || 'LECTOR_CLIENTE'} onValueChange={(value) => handleSelectChange('role', value)}>
                                    <SelectTrigger id="role">
                                        <SelectValue placeholder="Seleccione un rol" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="EMPRESA_ADMIN">Admin Empresa</SelectItem>
                                        <SelectItem value="JEFE_OBRA">Jefe de Obra</SelectItem>
                                        <SelectItem value="PREVENCIONISTA">Prevencionista</SelectItem>
                                        <SelectItem value="LECTOR_CLIENTE">Cliente (Solo lectura)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? "Guardando..." : "Agregar Usuario"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
