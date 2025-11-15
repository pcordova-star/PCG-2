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
import { PlusCircle, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { collection, getDocs, doc, getDoc, query, orderBy, where } from 'firebase/firestore';
import { firebaseDb, firebaseFunctions } from '@/lib/firebaseClient';
import { httpsCallable } from 'firebase/functions';
import { Company, CompanyUser } from '@/types/pcg';
import { useToast } from '@/hooks/use-toast';


// Simulación de rol, reemplazar con lógica de claims real
const useSuperAdminRole = () => {
    return true; // Temporalmente permitir acceso para desarrollo
}

export default function AdminEmpresaUsuariosPage() {
    const isSuperAdmin = useSuperAdminRole();
    const router = useRouter();
    const params = useParams();
    const companyId = params.companyId as string;
    const { toast } = useToast();

    const [company, setCompany] = useState<Company | null>(null);
    const [users, setUsers] = useState<CompanyUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [newUser, setNewUser] = useState({ nombre: '', email: '', password: '', role: 'LECTOR_CLIENTE' });
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const createCompanyUserFn = httpsCallable(firebaseFunctions, 'createCompanyUser');

    const fetchCompanyData = async () => {
        if (!isSuperAdmin || !companyId) return;

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
    };
    
    useEffect(() => {
        fetchCompanyData();
    }, [isSuperAdmin, companyId]);

    const handleOpenDialog = () => {
        setNewUser({ nombre: '', email: '', password: '', role: 'LECTOR_CLIENTE' });
        setDialogOpen(true);
        setFormError(null);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNewUser({ ...newUser, [name]: value });
    };
    
    const handleSelectChange = (value: string) => {
        setNewUser({ ...newUser, role: value });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!newUser.nombre || !newUser.email || !newUser.password) {
            setFormError("Nombre, Email y Contraseña son obligatorios.");
            return;
        }

        setIsSaving(true);
        setFormError(null);

        try {
            const result = await createCompanyUserFn({
              companyId,
              email: newUser.email,
              nombre: newUser.nombre,
              password: newUser.password,
              role: newUser.role,
            });

            toast({
                title: "Usuario Creado",
                description: `El usuario ${newUser.nombre} ha sido creado con éxito.`
            })

            await fetchCompanyData(); // Refrescar la lista de usuarios
            setDialogOpen(false);
        } catch (err: any) {
            console.error("Error saving user:", err);
            setFormError(err.message || "No se pudo guardar el usuario. Intente de nuevo.");
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
                <Button onClick={handleOpenDialog}>
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
                                <Input id="nombre" name="nombre" value={newUser.nombre || ''} onChange={handleFormChange} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="email">Email*</Label>
                                <Input id="email" name="email" type="email" value={newUser.email || ''} onChange={handleFormChange} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="password">Contraseña*</Label>
                                <Input id="password" name="password" type="password" value={newUser.password || ''} onChange={handleFormChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role">Rol en la Empresa</Label>
                                <Select value={newUser.role || 'LECTOR_CLIENTE'} onValueChange={handleSelectChange}>
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
                            {formError && <p className="text-sm font-medium text-destructive">{formError}</p>}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isSaving ? "Guardando..." : "Agregar Usuario"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
