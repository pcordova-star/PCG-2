"use client";

import React, { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy, writeBatch } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Company } from '@/types/pcg';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

async function deleteSubcollection(db: any, collectionPath: string) {
    const collectionRef = collection(db, collectionPath);
    const q = query(collectionRef);
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        return;
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
}


export default function AdminEmpresasPage() {
    const { role, loading: authLoading } = useAuth();
    const isSuperAdmin = role === 'superadmin';
    const router = useRouter();
    const { toast } = useToast();

    const [empresas, setEmpresas] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [currentCompany, setCurrentCompany] = useState<Partial<Company> | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!authLoading && !isSuperAdmin) {
          router.replace('/dashboard');
        }
    }, [authLoading, isSuperAdmin, router]);
    
    useEffect(() => {
        if (!isSuperAdmin) return;

        async function fetchCompanies() {
            setLoading(true);
            try {
                const q = query(collection(firebaseDb, "companies"), orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(q);
                const companiesData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Company));
                setEmpresas(companiesData);
            } catch (err) {
                console.error("Error fetching companies:", err);
                setError("No se pudieron cargar las empresas.");
            } finally {
                setLoading(false);
            }
        }
        fetchCompanies();
    }, [isSuperAdmin]);

    const handleOpenDialog = (company: Partial<Company> | null = null) => {
        setCurrentCompany(company || { nombre: '', rut: '', plan: 'basic', activa: true });
        setDialogOpen(true);
        setError(null);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (currentCompany) {
            const { name, value, type, checked } = e.target;
            setCurrentCompany({ ...currentCompany, [name]: type === 'checkbox' ? checked : value });
        }
    };
    
    const handleSelectChange = (name: keyof Company, value: any) => {
         if (currentCompany) {
            setCurrentCompany({ ...currentCompany, [name]: value });
        }
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!currentCompany || !currentCompany.nombre || !currentCompany.rut) {
            setError("Nombre y RUT son obligatorios.");
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            if (currentCompany.id) {
                // Actualizar empresa existente
                const docRef = doc(firebaseDb, "companies", currentCompany.id);
                await updateDoc(docRef, { ...currentCompany, updatedAt: serverTimestamp() });
                setEmpresas(empresas.map(emp => emp.id === currentCompany!.id ? { ...emp, ...currentCompany } as Company : emp));
            } else {
                // Crear nueva empresa
                const docRef = await addDoc(collection(firebaseDb, "companies"), {
                    ...currentCompany,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                const nuevaEmpresa: Company = {
                    id: docRef.id,
                    ...currentCompany,
                    createdAt: new Date(),
                } as Company;
                setEmpresas([nuevaEmpresa, ...empresas]);
            }
            setDialogOpen(false);
        } catch (err) {
            console.error("Error saving company:", err);
            setError("No se pudo guardar la empresa.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (companyId: string) => {
        if (!isSuperAdmin) {
            toast({ variant: 'destructive', title: 'Error', description: 'No tienes permisos para eliminar empresas.' });
            return;
        }

        try {
            // Borrar subcolecciones de usuarios y de invitaciones (aunque invitaciones no es subcolección)
            await deleteSubcollection(firebaseDb, `companies/${companyId}/users`);
            // Nota: las invitaciones se pueden dejar o borrar con una query aparte si es necesario.

            // Borrar subcolección de obras y sus subcolecciones anidadas
            const obrasRef = collection(firebaseDb, `companies/${companyId}/obras`);
            const obrasSnap = await getDocs(obrasRef);
            for (const obraDoc of obrasSnap.docs) {
                const obraId = obraDoc.id;
                // Borrar subcolecciones de cada obra
                await deleteSubcollection(firebaseDb, `companies/${companyId}/obras/${obraId}/actividades`);
                await deleteSubcollection(firebaseDb, `companies/${companyId}/obras/${obraId}/avancesDiarios`);
                // Añadir aquí otras subcolecciones de obra si existen
                
                // Borrar el documento de la obra
                await deleteDoc(doc(firebaseDb, `companies/${companyId}/obras`, obraId));
            }

            // Finalmente, borrar el documento principal de la empresa
            await deleteDoc(doc(firebaseDb, "companies", companyId));
            
            setEmpresas(prev => prev.filter(emp => emp.id !== companyId));
            toast({ title: 'Empresa Eliminada', description: 'La empresa y todos sus datos asociados han sido eliminados.' });

        } catch (err) {
            console.error("Error deleting company and its subcollections:", err);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la empresa. Revisa la consola para más detalles.' });
        }
    };

    if (authLoading || (!isSuperAdmin && !loading)) {
        return <div className="p-8 text-center text-muted-foreground">Verificando permisos...</div>;
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Gestión de Empresas</h1>
                    <p className="text-muted-foreground">Crea, edita y administra las empresas en la plataforma.</p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nueva Empresa
                </Button>
            </header>

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            
            <Card>
                <CardHeader>
                    <CardTitle>Empresas Registradas</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>RUT</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center h-24">Cargando empresas...</TableCell></TableRow>
                            ) : empresas.map((emp) => (
                                <TableRow key={emp.id}>
                                    <TableCell className="font-medium">{emp.nombre}</TableCell>
                                    <TableCell>{emp.rut}</TableCell>
                                    <TableCell><Badge variant="outline">{emp.plan}</Badge></TableCell>
                                    <TableCell>
                                        <Badge variant={emp.activa ? 'default' : 'secondary'}>
                                            {emp.activa ? 'Activa' : 'Inactiva'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-2 justify-end">
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={`/admin/empresas/${emp.id}/usuarios`}>
                                                    Ver usuarios
                                                </Link>
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(emp)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>¿Eliminar empresa?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Esta acción no se puede deshacer. Se eliminará permanentemente la empresa "{emp.nombre}" y todos sus datos asociados (usuarios, obras, etc.).
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(emp.id!)} className="bg-destructive hover:bg-destructive/90">
                                                            Eliminar Permanentemente
                                                        </AlertDialogAction>
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
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>{currentCompany?.id ? "Editar Empresa" : "Crear Nueva Empresa"}</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 grid gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="nombre">Nombre*</Label>
                                <Input id="nombre" name="nombre" value={currentCompany?.nombre || ''} onChange={handleFormChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="rut">RUT*</Label>
                                <Input id="rut" name="rut" value={currentCompany?.rut || ''} onChange={handleFormChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="plan">Plan</Label>
                                <Select value={currentCompany?.plan || 'basic'} onValueChange={(value) => handleSelectChange('plan', value)}>
                                    <SelectTrigger id="plan">
                                        <SelectValue placeholder="Seleccione un plan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="basic">Basic</SelectItem>
                                        <SelectItem value="pro">Pro</SelectItem>
                                        <SelectItem value="enterprise">Enterprise</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="flex items-center space-x-2">
                                <Checkbox id="activa" name="activa" checked={currentCompany?.activa} onCheckedChange={(checked) => handleSelectChange('activa', !!checked)} />
                                <Label htmlFor="activa">Empresa activa</Label>
                            </div>
                            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? "Guardando..." : "Guardar"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
