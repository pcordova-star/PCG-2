// src/app/(pcg)/admin/empresas/page.tsx
"use client";

import React, { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Trash2, ArrowLeft } from 'lucide-react';
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

    const [empresas, setEmpresas] = useState<(Company & { subcontractorCount: number })[]>([]);
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

        async function fetchCompaniesAndSubcontractors() {
            setLoading(true);
            try {
                // Fetch all companies and subcontractors in parallel
                const [companiesSnap, subcontractorsSnap] = await Promise.all([
                    getDocs(query(collection(firebaseDb, "companies"), orderBy("createdAt", "desc"))),
                    getDocs(collection(firebaseDb, "subcontractors"))
                ]);
                
                // Count subcontractors per company
                const subCounts = new Map<string, number>();
                subcontractorsSnap.docs.forEach(doc => {
                    const companyId = doc.data().companyId;
                    if (companyId) {
                        subCounts.set(companyId, (subCounts.get(companyId) || 0) + 1);
                    }
                });

                // Map company data and add subcontractor count
                const companiesData = companiesSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    subcontractorCount: subCounts.get(doc.id) || 0,
                } as Company & { subcontractorCount: number }));

                setEmpresas(companiesData);

            } catch (err: any) {
                console.error("Error fetching data:", err);
                setError("No se pudieron cargar los datos de empresas o subcontratistas.");
            } finally {
                setLoading(false);
            }
        }
        fetchCompaniesAndSubcontractors();
    }, [isSuperAdmin]);

    const handleOpenDialog = (company: Partial<Company> | null = null) => {
        setCurrentCompany(company || { 
            nombreFantasia: '', 
            razonSocial: '', 
            rut: '', 
            activa: true, 
            baseMensual: 100000, 
            valorPorUsuario: 35000, 
            feature_compliance_module_enabled: false,
            feature_plan_analysis_enabled: false,
            feature_plan_comparison_enabled: false,
            feature_risk_prevention_enabled: false,
            feature_operational_checklists_enabled: false,
            feature_document_control_enabled: false,
            feature_access_control_enabled: false,
            feature_director_dashboard_enabled: false,
        });
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
            feature_compliance_module_enabled: currentCompany.feature_compliance_module_enabled || false,
            feature_plan_analysis_enabled: currentCompany.feature_plan_analysis_enabled || false,
            feature_plan_comparison_enabled: currentCompany.feature_plan_comparison_enabled || false,
            feature_risk_prevention_enabled: currentCompany.feature_risk_prevention_enabled || false,
            feature_operational_checklists_enabled: currentCompany.feature_operational_checklists_enabled || false,
            feature_document_control_enabled: currentCompany.feature_document_control_enabled || false,
            feature_access_control_enabled: currentCompany.feature_access_control_enabled || false,
            feature_director_dashboard_enabled: currentCompany.feature_director_dashboard_enabled || false,
        };

        try {
            if (currentCompany.id) {
                const docRef = doc(firebaseDb, "companies", currentCompany.id);
                await updateDoc(docRef, { ...dataToSave, updatedAt: serverTimestamp() });
                setEmpresas(empresas.map(emp => emp.id === currentCompany!.id ? { ...emp, ...dataToSave } as Company & { subcontractorCount: number } : emp));
            } else {
                const docRef = await addDoc(collection(firebaseDb, "companies"), {
                    ...dataToSave,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                const nuevaEmpresa: Company & { subcontractorCount: number } = {
                    id: docRef.id,
                    ...dataToSave,
                    subcontractorCount: 0,
                    createdAt: new Date(),
                } as Company & { subcontractorCount: number };
                setEmpresas([nuevaEmpresa, ...empresas]);
            }
            setDialogOpen(false);
        } catch (err: any) {
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

        } catch (err: any) {
            console.error("Error deleting company and its subcollections:", err);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la empresa. Revisa la consola para más detalles.' });
        }
    };

    if (authLoading || (!isSuperAdmin && !loading)) {
        return <div className="p-8 text-center text-muted-foreground">Verificando permisos...</div>;
    }

    return (
        <div className="space-y-6">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Dashboard</Link>
            </Button>
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
                                <TableHead>Subcontratos</TableHead>
                                <TableHead>M. Cumplimiento</TableHead>
                                <TableHead>M. Análisis IA</TableHead>
                                <TableHead>M. Comparación IA</TableHead>
                                <TableHead>M. Prevención</TableHead>
                                <TableHead>M. Checklists</TableHead>
                                <TableHead>M. Documental</TableHead>
                                <TableHead>M. Acceso</TableHead>
                                <TableHead>M. Acceso Director</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={12} className="text-center h-24">Cargando empresas...</TableCell></TableRow>
                            ) : empresas.map((emp) => (
                                <TableRow key={emp.id}>
                                    <TableCell className="font-medium">{emp.nombreFantasia}</TableCell>
                                    <TableCell>{emp.rut}</TableCell>
                                    <TableCell className="font-medium text-center">{emp.subcontractorCount}</TableCell>
                                    <TableCell>
                                        <Badge variant={emp.feature_compliance_module_enabled ? 'default' : 'outline'}>
                                            {emp.feature_compliance_module_enabled ? 'On' : 'Off'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={emp.feature_plan_analysis_enabled ? 'default' : 'outline'}>
                                            {emp.feature_plan_analysis_enabled ? 'On' : 'Off'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={emp.feature_plan_comparison_enabled ? 'default' : 'outline'}>
                                            {emp.feature_plan_comparison_enabled ? 'On' : 'Off'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={emp.feature_risk_prevention_enabled ? 'default' : 'outline'}>
                                            {emp.feature_risk_prevention_enabled ? 'On' : 'Off'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={emp.feature_operational_checklists_enabled ? 'default' : 'outline'}>
                                            {emp.feature_operational_checklists_enabled ? 'On' : 'Off'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={emp.feature_document_control_enabled ? 'default' : 'outline'}>
                                            {emp.feature_document_control_enabled ? 'On' : 'Off'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={emp.feature_access_control_enabled ? 'default' : 'outline'}>
                                            {emp.feature_access_control_enabled ? 'On' : 'Off'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={emp.feature_director_dashboard_enabled ? 'default' : 'outline'}>
                                            {emp.feature_director_dashboard_enabled ? 'On' : 'Off'}
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
                                                            Esta acción no se puede deshacer. Se eliminará permanentemente la empresa &quot;{emp.nombreFantasia}&quot; y todos sus datos asociados (usuarios, obras, etc.).
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
                        <div className="grid gap-4 py-4 md:grid-cols-2 max-h-[65vh] overflow-y-auto pr-4">
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
                             <div className="col-span-2 pt-4 border-t space-y-2">
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="activa" name="activa" checked={currentCompany?.activa} onCheckedChange={(checked) => handleFormChange({ target: { name: 'activa', value: '', type: 'checkbox', checked: !!checked } } as any)} />
                                    <Label htmlFor="activa">Empresa activa</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="feature_compliance_module_enabled" name="feature_compliance_module_enabled" checked={currentCompany?.feature_compliance_module_enabled} onCheckedChange={(checked) => handleFormChange({ target: { name: 'feature_compliance_module_enabled', value: '', type: 'checkbox', checked: !!checked } } as any)} />
                                    <Label htmlFor="feature_compliance_module_enabled">Módulo de Cumplimiento Legal (MCLP)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="feature_plan_analysis_enabled" name="feature_plan_analysis_enabled" checked={currentCompany?.feature_plan_analysis_enabled} onCheckedChange={(checked) => handleFormChange({ target: { name: 'feature_plan_analysis_enabled', value: '', type: 'checkbox', checked: !!checked } } as any)} />
                                    <Label htmlFor="feature_plan_analysis_enabled">Módulo de Análisis de Planos IA</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="feature_plan_comparison_enabled" name="feature_plan_comparison_enabled" checked={currentCompany?.feature_plan_comparison_enabled} onCheckedChange={(checked) => handleFormChange({ target: { name: 'feature_plan_comparison_enabled', value: '', type: 'checkbox', checked: !!checked } } as any)} />
                                    <Label htmlFor="feature_plan_comparison_enabled">Módulo de Comparación de Planos IA</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="feature_risk_prevention_enabled" name="feature_risk_prevention_enabled" checked={currentCompany?.feature_risk_prevention_enabled} onCheckedChange={(checked) => handleFormChange({ target: { name: 'feature_risk_prevention_enabled', value: '', type: 'checkbox', checked: !!checked } } as any)} />
                                    <Label htmlFor="feature_risk_prevention_enabled">Módulo de Prevención de Riesgos</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="feature_operational_checklists_enabled" name="feature_operational_checklists_enabled" checked={currentCompany?.feature_operational_checklists_enabled} onCheckedChange={(checked) => handleFormChange({ target: { name: 'feature_operational_checklists_enabled', value: '', type: 'checkbox', checked: !!checked } } as any)} />
                                    <Label htmlFor="feature_operational_checklists_enabled">Módulo de Checklists Operacionales</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="feature_document_control_enabled" name="feature_document_control_enabled" checked={currentCompany?.feature_document_control_enabled} onCheckedChange={(checked) => handleFormChange({ target: { name: 'feature_document_control_enabled', value: '', type: 'checkbox', checked: !!checked } } as any)} />
                                    <Label htmlFor="feature_document_control_enabled">Módulo de Control Documental (ISO 9001)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="feature_access_control_enabled" name="feature_access_control_enabled" checked={currentCompany?.feature_access_control_enabled} onCheckedChange={(checked) => handleFormChange({ target: { name: 'feature_access_control_enabled', value: '', type: 'checkbox', checked: !!checked } } as any)} />
                                    <Label htmlFor="feature_access_control_enabled">Módulo de Control de Acceso (QR Visitas)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="feature_director_dashboard_enabled" name="feature_director_dashboard_enabled" checked={currentCompany?.feature_director_dashboard_enabled} onCheckedChange={(checked) => handleFormChange({ target: { name: 'feature_director_dashboard_enabled', value: '', type: 'checkbox', checked: !!checked } } as any)} />
                                    <Label htmlFor="feature_director_dashboard_enabled">Módulo de Acceso Director</Label>
                                </div>
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
