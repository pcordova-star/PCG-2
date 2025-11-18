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
        setCurrentCompany(company || { nombreFantasia: '', razonSocial: '', rut: '', activa: true, baseMensual: 100000, valorPorUsuario: 35000 });
        setDialogOpen(true);
        setError(null);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (currentCompany) {
            const { name, value, type, checked } = e.target;
            const finalValue = type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value);
            setCurrentCompany({ ...currentCompany, [name]: finalValue });
        }
    };
    
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!currentCompany || !currentCompany.nombreFantasia || !currentCompany.razonSocial || !currentCompany.rut) {
            setError("Nombre de fantasía, Razón Social y RUT son obligatorios.");
            return;
        }

        setIsSaving(true);
        setError(null);
        
        const dataToSave = {
            ...currentCompany,
            baseMensual: currentCompany.baseMensual || 100000,
            valorPorUsuario: currentCompany.valorPorUsuario || 35000,
        };

        try {
            if (currentCompany.id) {
                const docRef = doc(firebaseDb, "companies", currentCompany.id);
                await updateDoc(docRef, { ...dataToSave, updatedAt: serverTimestamp() });
                setEmpresas(empresas.map(emp => emp.id === currentCompany!.id ? { ...emp, ...dataToSave } as Company : emp));
            } else {
                const docRef = await addDoc(collection(firebaseDb, "companies"), {
                    ...dataToSave,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                const nuevaEmpresa: Company = {
                    id: docRef.id,
                    ...dataToSave,
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
            await deleteSubcollection(firebaseDb, `companies/${companyId}/users`);
            const obrasRef = collection(firebaseDb, `companies/${companyId}/obras`);
            const obrasSnap = await getDocs(obrasRef);
            for (const obraDoc of obrasSnap.docs) {
                const obraId = obraDoc.id;
                await deleteSubcollection(firebaseDb, `companies/${companyId}/obras/${obraId}/actividades`);
                await deleteSubcollection(firebaseDb, `companies/${companyId}/obras/${obraId}/avancesDiarios`);
                await deleteDoc(doc(firebaseDb, `companies/${companyId}/obras`, obraId));
            }
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

            {error && !dialogOpen && <p className="text-sm font-medium text-destructive">{error}</p>}
            
            <Card>
                <CardHeader>
                    <CardTitle>Empresas Registradas</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre Fantasía</TableHead>
                                <TableHead>RUT</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={4} className="text-center h-24">Cargando empresas...</TableCell></TableRow>
                            ) : empresas.map((emp) => (
                                <TableRow key={emp.id}>
                                    <TableCell className="font-medium">{emp.nombreFantasia}</TableCell>
                                    <TableCell>{emp.rut}</TableCell>
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
                                                            Esta acción no se puede deshacer. Se eliminará permanentemente la empresa "{emp.nombreFantasia}" y todos sus datos asociados (usuarios, obras, etc.).
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
                <DialogContent className="sm:max-w-2xl">
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>{currentCompany?.id ? "Editar Empresa" : "Crear Nueva Empresa"}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4 md:grid-cols-2">
                            <div className="space-y-2"><Label>Nombre Fantasía*</Label><Input name="nombreFantasia" value={currentCompany?.nombreFantasia || ''} onChange={handleFormChange} /></div>
                            <div className="space-y-2"><Label>Razón Social*</Label><Input name="razonSocial" value={currentCompany?.razonSocial || ''} onChange={handleFormChange} /></div>
                            <div className="space-y-2"><Label>RUT*</Label><Input name="rut" value={currentCompany?.rut || ''} onChange={handleFormChange} /></div>
                            <div className="space-y-2"><Label>Giro</Label><Input name="giro" value={currentCompany?.giro || ''} onChange={handleFormChange} /></div>
                            <div className="space-y-2 col-span-2"><Label>Dirección</Label><Input name="direccion" value={currentCompany?.direccion || ''} onChange={handleFormChange} /></div>
                            <div className="space-y-2"><Label>Comuna</Label><Input name="comuna" value={currentCompany?.comuna || ''} onChange={handleFormChange} /></div>
                            <div className="space-y-2"><Label>Ciudad</Label><Input name="ciudad" value={currentCompany?.ciudad || ''} onChange={handleFormChange} /></div>
                            <div className="space-y-2"><Label>Teléfono Contacto</Label><Input name="telefonoContacto" value={currentCompany?.telefonoContacto || ''} onChange={handleFormChange} /></div>
                            <div className="space-y-2"><Label>Email Contacto</Label><Input name="emailContacto" type="email" value={currentCompany?.emailContacto || ''} onChange={handleFormChange} /></div>
                            
                            <div className="col-span-2 border-t pt-4 mt-2 grid md:grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Monto Base Mensual</Label><Input name="baseMensual" type="number" value={currentCompany?.baseMensual || 100000} onChange={handleFormChange} /></div>
                                <div className="space-y-2"><Label>Valor por Usuario</Label><Input name="valorPorUsuario" type="number" value={currentCompany?.valorPorUsuario || 35000} onChange={handleFormChange} /></div>
                            </div>

                             <div className="flex items-center space-x-2 col-span-2">
                                <Checkbox id="activa" name="activa" checked={currentCompany?.activa} onCheckedChange={(checked) => handleFormChange({ target: { name: 'activa', value: checked, type: 'checkbox', checked: !!checked } } as any)} />
                                <Label htmlFor="activa">Empresa activa</Label>
                            </div>
                            {error && <p className="text-sm font-medium text-destructive col-span-2">{error}</p>}
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
