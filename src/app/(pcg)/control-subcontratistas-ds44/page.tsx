// src/app/(pcg)/control-subcontratistas-ds44/page.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, PlusCircle } from 'lucide-react';
import { Obra, EmpresaContratista, TipoEmpresaPrevencion, EstadoEvaluacionEmpresa } from '@/types/pcg';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const initialFormState: Partial<EmpresaContratista> = {
    razonSocial: '',
    rut: '',
    tipoEmpresa: 'SUBCONTRATISTA',
    representanteLegal: '',
    contactoNombre: '',
    contactoTelefono: '',
    contactoEmail: '',
    estadoEvaluacion: 'POR_EVALUAR',
};

export default function Ds44ContratistasPage() {
    const { companyId, role, user } = useAuth();
    const { toast } = useToast();
    const [obras, setObras] = useState<Obra[]>([]);
    const [selectedObraId, setSelectedObraId] = useState('');
    const [empresas, setEmpresas] = useState<EmpresaContratista[]>([]);
    const [loadingObras, setLoadingObras] = useState(true);
    const [loadingEmpresas, setLoadingEmpresas] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formState, setFormState] = useState<Partial<EmpresaContratista>>(initialFormState);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!companyId && role !== 'superadmin') return;

        const obrasRef = collection(firebaseDb, "obras");
        const q = role === 'superadmin' 
            ? query(obrasRef, orderBy("nombreFaena"))
            : query(obrasRef, where("empresaId", "==", companyId), orderBy("nombreFaena"));
        
        getDocs(q).then((snapshot) => {
            const obrasList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra));
            setObras(obrasList);
            if (obrasList.length > 0) {
                setSelectedObraId(obrasList[0].id);
            }
            setLoadingObras(false);
        });
    }, [companyId, role]);

    useEffect(() => {
        if (!selectedObraId) return;

        setLoadingEmpresas(true);
        const empresasRef = collection(firebaseDb, "obras", selectedObraId, "empresasSubcontratistasDs44");
        const q = query(empresasRef, orderBy('fechaCreacion', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmpresaContratista));
            setEmpresas(data);
            setLoadingEmpresas(false);
        }, (error) => {
            console.error("Error fetching DS44 companies:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las empresas contratistas.' });
            setLoadingEmpresas(false);
        });

        return () => unsubscribe();
    }, [selectedObraId, toast]);

    const handleFormChange = (field: keyof EmpresaContratista, value: any) => {
        setFormState(prev => ({...prev, [field]: value}));
    };

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedObraId || !formState.razonSocial || !formState.rut) {
            toast({ variant: 'destructive', title: 'Campos requeridos', description: 'Razón Social y RUT son obligatorios.' });
            return;
        }
        setIsSaving(true);
        try {
            const collectionRef = collection(firebaseDb, "obras", selectedObraId, "empresasSubcontratistasDs44");
            await addDoc(collectionRef, {
                ...formState,
                obraId: selectedObraId,
                fechaCreacion: serverTimestamp(),
            });
            toast({ title: 'Éxito', description: 'Empresa contratista registrada.' });
            setIsModalOpen(false);
            setFormState(initialFormState);
        } catch (error) {
            console.error("Error saving DS44 company:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo registrar la empresa.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex items-center gap-4">
                <Button asChild variant="outline" size="sm">
                    <Link href="/prevencion"><ArrowLeft className="mr-2 h-4 w-4" />Volver a Prevención</Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Control de Empresas Contratistas (DS44)</h1>
                    <p className="text-muted-foreground">Gestiona el registro y la documentación de las empresas que prestan servicios en tus obras.</p>
                </div>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Selección de Obra</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="max-w-md space-y-2">
                        <Label htmlFor="obra-select">Obra</Label>
                        <Select value={selectedObraId} onValueChange={setSelectedObraId} disabled={loadingObras}>
                            <SelectTrigger id="obra-select">
                                <SelectValue placeholder={loadingObras ? "Cargando obras..." : "Selecciona una obra"} />
                            </SelectTrigger>
                            <SelectContent>
                                {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nombreFaena}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle>Empresas Registradas en Obra</CardTitle>
                        <CardDescription>{loadingEmpresas ? "Cargando..." : `Mostrando ${empresas.length} empresas.`}</CardDescription>
                    </div>
                    <Button onClick={() => setIsModalOpen(true)} disabled={!selectedObraId}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Nueva Empresa
                    </Button>
                </CardHeader>
                <CardContent>
                    {loadingEmpresas ? <div className="text-center p-8"><Loader2 className="animate-spin" /></div>
                    : empresas.length === 0 ? <p className="text-center text-muted-foreground p-8">No hay empresas registradas para esta obra.</p>
                    : (
                        <Table>
                            <TableHeader><TableRow><TableHead>Razón Social</TableHead><TableHead>RUT</TableHead><TableHead>Tipo</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {empresas.map(emp => (
                                    <TableRow key={emp.id}>
                                        <TableCell className="font-medium">{emp.razonSocial}</TableCell>
                                        <TableCell>{emp.rut}</TableCell>
                                        <TableCell><Badge variant="secondary">{emp.tipoEmpresa}</Badge></TableCell>
                                        <TableCell><Badge variant="outline">{emp.estadoEvaluacion}</Badge></TableCell>
                                        <TableCell className="text-right"><Button variant="outline" size="sm" disabled>Ver Ficha</Button></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <form onSubmit={handleSave}>
                        <DialogHeader>
                            <DialogTitle>Registrar Nueva Empresa Contratista</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label htmlFor="razonSocial">Razón Social*</Label><Input id="razonSocial" value={formState.razonSocial} onChange={e => handleFormChange('razonSocial', e.target.value)} required /></div>
                                <div className="space-y-2"><Label htmlFor="rut">RUT*</Label><Input id="rut" value={formState.rut} onChange={e => handleFormChange('rut', e.target.value)} required /></div>
                            </div>
                            <div className="space-y-2"><Label htmlFor="tipoEmpresa">Tipo de Empresa</Label><Select value={formState.tipoEmpresa} onValueChange={(v) => handleFormChange('tipoEmpresa', v as TipoEmpresaPrevencion)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="CONTRATISTA_PRINCIPAL">Contratista Principal</SelectItem><SelectItem value="SUBCONTRATISTA">Subcontratista</SelectItem><SelectItem value="SERVICIOS">Servicios Transitorios</SelectItem></SelectContent></Select></div>
                            <div className="space-y-2"><Label htmlFor="representanteLegal">Representante Legal</Label><Input id="representanteLegal" value={formState.representanteLegal} onChange={e => handleFormChange('representanteLegal', e.target.value)}/></div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                {isSaving ? "Guardando..." : "Guardar Empresa"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
