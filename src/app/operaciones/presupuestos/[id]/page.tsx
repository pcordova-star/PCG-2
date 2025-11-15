// src/app/operaciones/presupuestos/[id]/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, Trash2, Loader2, Save } from 'lucide-react';
import { collection, doc, getDoc, setDoc, addDoc, serverTimestamp, query, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { useToast } from "@/hooks/use-toast";

// --- Tipos ---
type Obra = { id: string; nombreFaena: string; };
type CatalogoItem = { id: string; codigo: string; descripcion: string; unidad: string; precioActual: number; };
type PresupuestoItem = {
    id: string; // Puede ser un UUID temporal en el cliente
    itemId: string | null;
    codigo: string;
    descripcion: string;
    unidad: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
};
type Presupuesto = {
    id?: string;
    obraId: string;
    nombre: string;
    fechaCreacion: Timestamp;
    moneda: string;
    observaciones: string;
    totalPresupuesto: number;
    items: Omit<PresupuestoItem, 'id'>[];
};

function formatCurrency(value: number) {
    if (isNaN(value)) return '$ 0';
    return value.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });
}

function parseCurrency(value: string): number {
    const numberString = value.replace(/[^0-9,-]+/g, "").replace(",", ".");
    const parsed = parseFloat(numberString);
    return isNaN(parsed) ? 0 : parsed;
}


export default function PresupuestoEditPage() {
    const { id: presupuestoId } = useParams<{ id: string }>();
    const router = useRouter();
    const { toast } = useToast();

    const [obras, setObras] = useState<Obra[]>([]);
    const [catalogo, setCatalogo] = useState<CatalogoItem[]>([]);
    const [presupuesto, setPresupuesto] = useState<Partial<Presupuesto>>({
        nombre: '',
        obraId: '',
        moneda: 'CLP',
        observaciones: '',
        items: [],
        totalPresupuesto: 0
    });
    const [items, setItems] = useState<PresupuestoItem[]>([]);

    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Cargar datos iniciales (obras, catálogo y presupuesto si se está editando)
    useEffect(() => {
        const fetchInitialData = async () => {
            // Obras
            const obrasQuery = query(collection(firebaseDb, "obras"), orderBy("nombreFaena"));
            const obrasSnap = await getDocs(obrasQuery);
            const obrasData = obrasSnap.docs.map(doc => ({ id: doc.id, nombreFaena: doc.data().nombreFaena } as Obra));
            setObras(obrasData);
            
            // Catálogo
            const catQuery = query(collection(firebaseDb, "catalogoItems"), orderBy("codigo"));
            const catSnap = await getDocs(catQuery);
            const catData = catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CatalogoItem));
            setCatalogo(catData);

            // Presupuesto (si es edición)
            if (presupuestoId !== 'nuevo') {
                const docRef = doc(firebaseDb, "presupuestos", presupuestoId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as Presupuesto;
                    setPresupuesto(data);
                    setItems(data.items.map(item => ({ ...item, id: crypto.randomUUID(), subtotal: item.cantidad * item.precioUnitario })));
                } else {
                    toast({ variant: "destructive", title: "Error", description: "Presupuesto no encontrado." });
                    router.push('/operaciones/presupuestos');
                }
            } else {
                setPresupuesto(prev => ({...prev, obraId: obrasData[0]?.id || ''}));
            }
            setLoading(false);
        };
        fetchInitialData();
    }, [presupuestoId, router, toast]);

    const totalPresupuesto = useMemo(() => {
        return items.reduce((sum, item) => sum + item.subtotal, 0);
    }, [items]);

    const handleItemChange = (index: number, field: keyof PresupuestoItem, value: any) => {
        const newItems = [...items];
        const item = newItems[index];
        
        let numericValue = value;
        if (field === 'cantidad' || field === 'precioUnitario') {
            numericValue = typeof value === 'string' ? parseCurrency(value) : Number(value);
             if (isNaN(numericValue)) numericValue = 0;
        }

        (item as any)[field] = numericValue;

        if (field === 'cantidad' || field === 'precioUnitario') {
            item.subtotal = item.cantidad * item.precioUnitario;
        }
        setItems(newItems);
    };
    
    const handleSelectItemFromCatalogo = (item: CatalogoItem) => {
        const newItem: PresupuestoItem = {
            id: crypto.randomUUID(),
            itemId: item.id,
            codigo: item.codigo,
            descripcion: item.descripcion,
            unidad: item.unidad,
            cantidad: 1,
            precioUnitario: item.precioActual,
            subtotal: item.precioActual
        };
        setItems([...items, newItem]);
    };

    const addNewItemRow = () => {
         const newItem: PresupuestoItem = {
            id: crypto.randomUUID(),
            itemId: null,
            codigo: '',
            descripcion: 'Nueva Partida',
            unidad: 'UN',
            cantidad: 1,
            precioUnitario: 0,
            subtotal: 0
        };
        setItems([...items, newItem]);
    }
    
    const removeItemRow = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    }

    const handleSave = async () => {
        if (!presupuesto.obraId || !presupuesto.nombre) {
            toast({ variant: "destructive", title: "Error", description: "La obra y el nombre del presupuesto son obligatorios." });
            return;
        }
        setIsSaving(true);
        const dataToSave = {
            ...presupuesto,
            items: items.map(({ id, subtotal, ...rest }) => rest), // Quitar id temporal y subtotal
            totalPresupuesto: totalPresupuesto,
            fechaCreacion: presupuesto.id ? presupuesto.fechaCreacion : serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        try {
            if (presupuesto.id) {
                await setDoc(doc(firebaseDb, "presupuestos", presupuesto.id), dataToSave, { merge: true });
            } else {
                await addDoc(collection(firebaseDb, "presupuestos"), dataToSave);
            }
            toast({ title: "Éxito", description: "Presupuesto guardado correctamente." });
            router.push('/operaciones/presupuestos');
        } catch (error) {
            console.error("Error saving budget:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el presupuesto." });
        } finally {
            setIsSaving(false);
        }
    };


    if (loading) {
        return <div className="p-8 text-center"><Loader2 className="animate-spin" /> Cargando...</div>
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <header className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.push('/operaciones/presupuestos')}><ArrowLeft /></Button>
                <div>
                    <h1 className="text-2xl font-bold">{presupuestoId === 'nuevo' ? "Nuevo Presupuesto" : "Editar Presupuesto"}</h1>
                    <p className="text-muted-foreground">Complete los datos y agregue ítems desde el catálogo o manualmente.</p>
                </div>
            </header>

            <Card>
                <CardHeader><CardTitle>Datos Generales</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Obra*</Label>
                        <Select value={presupuesto.obraId} onValueChange={(val) => setPresupuesto(p => ({...p, obraId: val}))} disabled={!!presupuesto.id}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar obra..." /></SelectTrigger>
                            <SelectContent>{obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nombreFaena}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Nombre del Presupuesto*</Label>
                        <Input value={presupuesto.nombre} onChange={e => setPresupuesto(p => ({...p, nombre: e.target.value}))} />
                    </div>
                     <div className="space-y-2">
                        <Label>Moneda</Label>
                        <Input value={presupuesto.moneda} onChange={e => setPresupuesto(p => ({...p, moneda: e.target.value}))} />
                    </div>
                     <div className="md:col-span-3 space-y-2">
                        <Label>Observaciones</Label>
                        <Input value={presupuesto.observaciones} onChange={e => setPresupuesto(p => ({...p, observaciones: e.target.value}))} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Ítems del Presupuesto</CardTitle></CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ítem</TableHead>
                                    <TableHead className="w-1/3">Descripción</TableHead>
                                    <TableHead>Un.</TableHead>
                                    <TableHead>Cant.</TableHead>
                                    <TableHead>P. Unitario</TableHead>
                                    <TableHead>Subtotal</TableHead>
                                    <TableHead>Acción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item, index) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-mono text-center">{index + 1}</TableCell>
                                        <TableCell><Input value={item.descripcion} onChange={(e) => handleItemChange(index, 'descripcion', e.target.value)} /></TableCell>
                                        <TableCell><Input value={item.unidad} onChange={(e) => handleItemChange(index, 'unidad', e.target.value)} className="w-20" /></TableCell>
                                        <TableCell><Input type="text" value={item.cantidad.toLocaleString('es-CL')} onChange={(e) => handleItemChange(index, 'cantidad', e.target.value)} className="w-24"/></TableCell>
                                        <TableCell><Input type="text" value={item.precioUnitario.toLocaleString('es-CL')} onChange={(e) => handleItemChange(index, 'precioUnitario', e.target.value)} className="w-32" /></TableCell>
                                        <TableCell>{formatCurrency(item.subtotal)}</TableCell>
                                        <TableCell><Button variant="ghost" size="icon" onClick={() => removeItemRow(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <Popover>
                            <PopoverTrigger asChild><Button variant="outline">Agregar desde Catálogo</Button></PopoverTrigger>
                            <PopoverContent className="w-96 max-h-96 overflow-y-auto">
                                <div className="space-y-2">
                                    <h4 className="font-medium text-sm">Seleccionar Ítem</h4>
                                    {catalogo.map(catItem => (
                                        <div key={catItem.id} onClick={() => handleSelectItemFromCatalogo(catItem)} className="p-2 hover:bg-accent rounded-md cursor-pointer text-sm">
                                            <p className="font-semibold">{catItem.codigo} - {catItem.descripcion}</p>
                                            <p className="text-muted-foreground">{formatCurrency(catItem.precioActual)}</p>
                                        </div>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                         <Button variant="secondary" onClick={addNewItemRow}>Agregar Fila Manual</Button>
                    </div>
                </CardContent>
                <CardFooter className="flex-col items-end gap-2">
                    <p className="text-lg font-semibold">Total Presupuesto:</p>
                    <p className="text-3xl font-bold">{formatCurrency(totalPresupuesto)}</p>
                </CardFooter>
            </Card>
             <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => router.back()}>Cancelar</Button>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2"/>}
                    {isSaving ? "Guardando..." : "Guardar Presupuesto"}
                </Button>
            </div>
        </div>
    );
}
