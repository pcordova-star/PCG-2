// src/app/operaciones/presupuestos/[id]/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Trash2, Loader2, Save, PlusCircle, FolderPlus, FilePlus, Type } from 'lucide-react';
import { collection, doc, getDoc, setDoc, addDoc, serverTimestamp, query, orderBy, getDocs, Timestamp, where, writeBatch } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { generarPresupuestoPdf, HierarchicalItem as PdfHierarchicalItem, DatosEmpresa, DatosObra, DatosPresupuesto } from '@/lib/pdf/generarPresupuestoPdf';
import { useAuth } from '@/context/AuthContext';
import { Company } from '@/types/pcg';

// --- Tipos ---
type Obra = { id: string; nombreFaena: string; direccion?: string; };

type PresupuestoItemType = 'chapter' | 'subchapter' | 'item';

type PresupuestoItem = {
    id: string; // UUID temporal en cliente
    parentId: string | null;
    type: PresupuestoItemType;
    descripcion: string;
    unidad: string;
    cantidad: number;
    precioUnitario: number;
};

type HierarchicalItem = PresupuestoItem & {
    children: HierarchicalItem[];
    level: number;
    itemNumber: string;
    subtotal: number;
};


type Presupuesto = {
    id?: string;
    obraId: string;
    nombre: string;
    fechaCreacion: Timestamp;
    moneda: string;
    observaciones: string;
    gastosGeneralesPorcentaje?: number;
    items: Omit<PresupuestoItem, 'id'>[];
};

function formatoMoneda(value: number) {
    if (isNaN(value)) return '$ 0';
    return value.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
}

function formatNumber(value: number): string {
    if (isNaN(value)) return '';
    return value.toLocaleString('es-CL');
}

function parseNumber(value: string): number {
    const numberString = value.replace(/\./g, '').replace(/,/g, '.');
    const parsed = parseFloat(numberString);
    return isNaN(parsed) ? 0 : parsed;
}


export default function PresupuestoEditPage() {
    const { user, companyId, role } = useAuth();
    const { id: presupuestoId } = useParams<{ id: string }>();
    const searchParams = useSearchParams();
    const obraIdFromQuery = searchParams.get('obraId');
    const router = useRouter();
    const { toast } = useToast();

    const [obras, setObras] = useState<Obra[]>([]);
    const [company, setCompany] = useState<Company | null>(null);
    const [presupuesto, setPresupuesto] = useState<Partial<Presupuesto>>({
        nombre: '',
        obraId: '',
        moneda: 'CLP',
        observaciones: '',
        gastosGeneralesPorcentaje: 25,
    });
    const [items, setItems] = useState<PresupuestoItem[]>([]);
    
    const [dialogOpen, setDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<PresupuestoItem | null>(null);

    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!companyId && role !== 'superadmin') return;

        const fetchInitialData = async () => {
            setLoading(true);
            
            const obrasRef = collection(firebaseDb, "obras");
            let obrasQuery;
            if (role === 'superadmin') {
                obrasQuery = query(obrasRef, orderBy("nombreFaena"));
            } else {
                obrasQuery = query(obrasRef, where("empresaId", "==", companyId), orderBy("nombreFaena"));
            }

            const obrasSnap = await getDocs(obrasQuery);
            const obrasData = obrasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra));
            setObras(obrasData);

            if (companyId) {
                const companyRef = doc(firebaseDb, "companies", companyId);
                const companySnap = await getDoc(companyRef);
                if (companySnap.exists()) {
                    setCompany(companySnap.data() as Company);
                }
            }
            
            if (presupuestoId !== 'nuevo') {
                const docRef = doc(firebaseDb, "presupuestos", presupuestoId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as Presupuesto;
                    setPresupuesto({ ...data, id: docSnap.id, gastosGeneralesPorcentaje: data.gastosGeneralesPorcentaje ?? 25 });
                    setItems(data.items.map(item => ({ ...item, id: crypto.randomUUID() })));
                } else {
                    toast({ variant: "destructive", title: "Error", description: "Itemizado no encontrado." });
                    router.push('/operaciones/presupuestos');
                }
            } else {
                const initialObraId = obraIdFromQuery || obrasData[0]?.id || '';
                setPresupuesto(prev => ({ ...prev, obraId: initialObraId, nombre: 'Nuevo Itemizado Sin Título', gastosGeneralesPorcentaje: 25 }));
            }
            setLoading(false);
        };
        fetchInitialData();
    }, [presupuestoId, router, toast, obraIdFromQuery, companyId, role]);
    
    const { hierarchicalItems, totalPresupuesto } = useMemo(() => {
    if (!items) return { hierarchicalItems: [], totalPresupuesto: 0 };

    const itemsById = new Map(items.map(i => [i.id, { ...i, children: [] as PresupuestoItem[], subtotal: 0 }]));
    const roots: PresupuestoItem[] = [];

    items.forEach(item => {
        if (item.parentId && itemsById.has(item.parentId)) {
            const parent = itemsById.get(item.parentId)!;
            if(!parent.children) parent.children = [];
            parent.children.push(item as any);
        } else {
            roots.push(item);
        }
    });

    const calculateSubtotal = (itemId: string): number => {
        const item = itemsById.get(itemId);
        if (!item) return 0;
        if (item.type === 'item') {
            const subtotal = item.cantidad * item.precioUnitario;
            item.subtotal = subtotal;
            return subtotal;
        }
        const childrenSubtotal = item.children.reduce((sum, child) => sum + calculateSubtotal(child.id), 0);
        item.subtotal = childrenSubtotal;
        return childrenSubtotal;
    };

    let total = 0;
    roots.forEach(root => {
        total += calculateSubtotal(root.id);
    });

    const flattened: HierarchicalItem[] = [];
    const processItemsForFlattening = (currentItems: PresupuestoItem[], level: number, prefix: string) => {
        let chapterCounter = 1;
        let subChapterCounter = 0;
        let itemCounter = 1;

        currentItems.forEach(item => {
            const itemWithChildren = itemsById.get(item.id)! as HierarchicalItem;
            let currentPrefix = prefix;
            let itemNumber;

            if (item.type === 'chapter') {
                itemNumber = `${chapterCounter}`;
                currentPrefix = `${itemNumber}.`;
                chapterCounter++;
                subChapterCounter = 0; 
                itemCounter = 1; 
            } else if (item.type === 'subchapter') {
                itemNumber = String.fromCharCode(65 + subChapterCounter);
                currentPrefix = `${itemNumber}.`; // Subchapters reset item counter in their scope.
                subChapterCounter++;
                itemCounter = 1; 
            } else { // type is 'item'
                itemNumber = `${prefix}${itemCounter}`;
                itemCounter++;
            }

            flattened.push({
                ...itemWithChildren,
                level,
                itemNumber: item.type === 'chapter' ? itemNumber : (item.type === 'subchapter' ? `${prefix}${itemNumber}` : itemNumber),
            });

            if (itemWithChildren.children.length > 0) {
                processItemsForFlattening(itemWithChildren.children, level + 1, currentPrefix);
            }
        });
    };

    processItemsForFlattening(roots, 0, '');

    return { hierarchicalItems: flattened, totalPresupuesto: total };
}, [items]);


    const actualizarCatalogoDesdePresupuesto = async (presupuestoItems: PresupuestoItem[]) => {
        const partidas = presupuestoItems.filter(item => item.type === 'item' && item.descripcion && item.precioUnitario > 0);
        if (partidas.length === 0) return;

        const catalogoRef = collection(firebaseDb, "catalogoItems");
        const batch = writeBatch(firebaseDb);

        for (const partida of partidas) {
            // Usamos la descripción como identificador único (con cuidado de mayúsculas/minúsculas y espacios)
            const descripcionNormalizada = partida.descripcion.trim().toLowerCase();
            const q = query(catalogoRef, where("descripcionNormalizada", "==", descripcionNormalizada));
            
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                // No existe: crear nuevo ítem en catálogo
                const nuevoItemRef = doc(catalogoRef);
                batch.set(nuevoItemRef, {
                    codigo: `AUT-${Date.now()}`, // Código autogenerado
                    descripcion: partida.descripcion.trim(),
                    descripcionNormalizada: descripcionNormalizada,
                    unidad: partida.unidad,
                    precioActual: partida.precioUnitario,
                    fechaUltimoPrecio: serverTimestamp(),
                });
            } else {
                // Existe: actualizar el precio
                const docExistente = snapshot.docs[0];
                batch.update(docExistente.ref, {
                    precioActual: partida.precioUnitario,
                    fechaUltimoPrecio: serverTimestamp(),
                });
            }
        }
        
        try {
            await batch.commit();
            toast({ title: "Catálogo actualizado", description: "El catálogo de ítems se ha actualizado con los precios de este itemizado." });
        } catch (error) {
            console.error("Error updating catalog from budget:", error);
            toast({ variant: "destructive", title: "Error de catálogo", description: "No se pudo actualizar el catálogo de ítems." });
        }
    };

    const handleSave = async () => {
        if (!presupuesto.obraId || !presupuesto.nombre) {
            toast({ variant: "destructive", title: "Error", description: "La obra y el nombre del itemizado son obligatorios." });
            return;
        }
        setIsSaving(true);
        const dataToSave: Omit<Presupuesto, 'id' | 'fechaCreacion'> & { updatedAt: any, fechaCreacion?: any } = {
            ...presupuesto,
            items: items.map(({ id, ...rest }) => rest),
            updatedAt: serverTimestamp()
        };

        try {
            if (presupuesto.id) {
                await setDoc(doc(firebaseDb, "presupuestos", presupuesto.id), dataToSave, { merge: true });
            } else {
                dataToSave.fechaCreacion = serverTimestamp();
                await addDoc(collection(firebaseDb, "presupuestos"), dataToSave);
            }
            
            // Lógica para actualizar el catálogo después de guardar
            await actualizarCatalogoDesdePresupuesto(items);

            toast({ title: "Éxito", description: "Itemizado guardado correctamente." });
            router.push('/operaciones/presupuestos');
        } catch (error) {
            console.error("Error saving budget:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el itemizado." });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleAddNewItem = (type: PresupuestoItemType, parentId: string | null) => {
        setCurrentItem({
            id: crypto.randomUUID(),
            parentId,
            type,
            descripcion: type === 'chapter' ? 'Nuevo Título Principal' : (type === 'subchapter' ? 'Nuevo Título de Actividad' : 'Nueva Partida'),
            unidad: 'UN',
            cantidad: 1,
            precioUnitario: 0,
        });
        setDialogOpen(true);
    };
    
    const handleEditItem = (item: PresupuestoItem) => {
        setCurrentItem({ ...item });
        setDialogOpen(true);
    };

    const handleSaveItem = () => {
        if (!currentItem) return;
        setItems(prevItems => {
            const existing = prevItems.find(i => i.id === currentItem.id);
            if (existing) {
                return prevItems.map(i => i.id === currentItem.id ? currentItem : i);
            } else {
                return [...prevItems, currentItem];
            }
        });
        setDialogOpen(false);
        setCurrentItem(null);
    };
    
    const removeItem = (id: string) => {
        setItems(prev => {
            const itemsToRemove = new Set([id]);
            let changed = true;
            while(changed) {
                changed = false;
                prev.forEach(item => {
                    if (item.parentId && itemsToRemove.has(item.parentId) && !itemsToRemove.has(item.id)) {
                        itemsToRemove.add(item.id);
                        changed = true;
                    }
                });
            }
            return prev.filter(i => !itemsToRemove.has(i.id));
        });
    };
    
    const handleDownloadPdf = () => {
        if (!company || !presupuesto || !presupuesto.obraId) {
            toast({ variant: "destructive", title: "Error", description: "Faltan datos de la empresa o la obra para generar el PDF." });
            return;
        }
        
        const obraData = obras.find(o => o.id === presupuesto.obraId);
        if (!obraData) {
            toast({ variant: "destructive", title: "Error", description: "No se encontraron los datos de la obra." });
            return;
        }

        const datosEmpresa: DatosEmpresa = {
            nombre: company.razonSocial,
            rut: company.rut,
            direccion: company.direccion,
        };
        
        const datosObra: DatosObra = {
            nombreFaena: obraData.nombreFaena,
            ubicacion: obraData.direccion,
        };

        const ggPorcentaje = presupuesto.gastosGeneralesPorcentaje ?? 25;
        const gastosGenerales = totalPresupuesto * (ggPorcentaje / 100);
        const subtotalConGG = totalPresupuesto + gastosGenerales;
        const iva = subtotalConGG * 0.19;
        const total = subtotalConGG + iva;

        const datosPresupuesto: DatosPresupuesto = {
            codigo: presupuesto.id || 'nuevo',
            nombre: presupuesto.nombre || 'Sin nombre',
            fecha: new Date().toLocaleDateString('es-CL'),
            items: hierarchicalItems as PdfHierarchicalItem[],
            subtotal: totalPresupuesto,
            gastosGeneralesPorcentaje: ggPorcentaje,
            gastosGenerales: gastosGenerales,
            subtotalConGG: subtotalConGG,
            iva: iva,
            total: total
        };

        generarPresupuestoPdf(datosEmpresa, datosObra, datosPresupuesto);
    };


    if (loading) {
        return <div className="p-8 text-center"><Loader2 className="animate-spin" /> Cargando...</div>
    }

    const ggPorcentaje = presupuesto.gastosGeneralesPorcentaje ?? 25;
    const gastosGenerales = totalPresupuesto * (ggPorcentaje / 100);
    const subtotalConGG = totalPresupuesto + gastosGenerales;
    const iva = subtotalConGG * 0.19;
    const totalFinal = subtotalConGG + iva;

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <header className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.push('/operaciones/presupuestos')}><ArrowLeft /></Button>
                <div>
                    <h1 className="text-2xl font-bold">{presupuestoId === 'nuevo' ? "Nuevo Itemizado" : "Editar Itemizado"}</h1>
                </div>
            </header>

            <Card>
                <CardHeader><CardTitle>Datos Generales del Itemizado</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Obra*</Label>
                        <Select value={presupuesto.obraId} onValueChange={(val) => setPresupuesto(p => ({...p, obraId: val}))} disabled={!!presupuesto.id}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar obra..." /></SelectTrigger>
                            <SelectContent>{obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nombreFaena}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Nombre del Itemizado*</Label>
                        <Input value={presupuesto.nombre} onChange={e => setPresupuesto(p => ({...p, nombre: e.target.value}))} />
                    </div>
                    <div className="space-y-2">
                        <Label>Gastos Generales y Utilidades (%)</Label>
                        <Input type="number" value={presupuesto.gastosGeneralesPorcentaje ?? 25} onChange={e => setPresupuesto(p => ({...p, gastosGeneralesPorcentaje: Number(e.target.value)}))} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Ítems del Itemizado</CardTitle>
                    <div className="flex gap-2 mt-2">
                         <Button size="sm" onClick={() => handleAddNewItem('chapter', null)}><FolderPlus className="mr-2"/>Agregar Título Principal</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[10%]">Ítem</TableHead>
                                <TableHead className="w-[40%]">Descripción</TableHead>
                                <TableHead>Un.</TableHead>
                                <TableHead>Cant.</TableHead>
                                <TableHead>P. Unitario</TableHead>
                                <TableHead>P. Total</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {hierarchicalItems.map(item => (
                                <TableRow key={item.id} className={cn(item.type === 'chapter' && 'bg-blue-50 font-bold', item.type === 'subchapter' && 'bg-slate-100 font-semibold')}>
                                    <TableCell style={{ paddingLeft: `${1 + item.level * 1.5}rem` }} className="font-mono">
                                        {item.itemNumber}
                                    </TableCell>
                                    <TableCell>{item.descripcion}</TableCell>
                                    <TableCell>{item.type === 'item' ? item.unidad : ''}</TableCell>
                                    <TableCell>{item.type === 'item' ? item.cantidad.toLocaleString('es-CL') : ''}</TableCell>
                                    <TableCell>{item.type === 'item' ? formatoMoneda(item.precioUnitario) : ''}</TableCell>
                                    <TableCell className="font-bold">{formatoMoneda(item.subtotal)}</TableCell>
                                    <TableCell className="text-right">
                                       <div className="flex gap-1 justify-end">
                                            {item.type === 'chapter' && (
                                                <Button variant="ghost" size="icon" onClick={() => handleAddNewItem('subchapter', item.id)} title="Agregar Título de Actividad"><Type className="h-4 w-4 text-slate-600" /></Button>
                                            )}
                                            {(item.type === 'chapter' || item.type === 'subchapter') && (
                                                <Button variant="ghost" size="icon" onClick={() => handleAddNewItem('item', item.id)} title="Agregar Partida"><FilePlus className="h-4 w-4" /></Button>
                                            )}
                                            <Button variant="ghost" size="icon" onClick={() => handleEditItem(item as PresupuestoItem)}><Trash2 className="h-4 w-4 text-blue-600"/></Button>
                                            <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                       </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
                 <CardFooter className="flex-col items-end gap-2 text-right">
                    <div className="w-full max-w-sm space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal Neto:</span>
                            <span className="font-semibold">{formatoMoneda(totalPresupuesto)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Gastos Generales y Utilidades ({ggPorcentaje}%):</span>
                            <span className="font-semibold">{formatoMoneda(gastosGenerales)}</span>
                        </div>
                         <div className="flex justify-between border-t pt-2 mt-2">
                            <span className="text-muted-foreground">Subtotal + GGyU:</span>
                            <span className="font-semibold">{formatoMoneda(subtotalConGG)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">IVA (19%):</span>
                            <span className="font-semibold">{formatoMoneda(iva)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2 mt-2">
                            <span className="text-lg font-bold">Total General:</span>
                            <span className="text-lg font-bold">{formatoMoneda(totalFinal)}</span>
                        </div>
                    </div>
                </CardFooter>
            </Card>

             <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => router.back()}>Cancelar</Button>
                <Button variant="outline" onClick={handleDownloadPdf}>
                    Descargar PDF
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2"/>}
                    {isSaving ? "Guardando..." : "Guardar Itemizado"}
                </Button>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                 <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{currentItem?.id ? 'Editar Ítem' : 'Nuevo Ítem'}</DialogTitle>
                    </DialogHeader>
                    {currentItem && (
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label>Descripción</Label>
                                <Input value={currentItem.descripcion} onChange={e => setCurrentItem({...currentItem, descripcion: e.target.value})} />
                            </div>
                            {currentItem.type === 'item' && (
                                <>
                                     <div className="space-y-2">
                                        <Label>Unidad</Label>
                                        <Input value={currentItem.unidad} onChange={e => setCurrentItem({...currentItem, unidad: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Cantidad</Label>
                                        <Input 
                                            type="text" 
                                            value={formatNumber(currentItem.cantidad)} 
                                            onChange={e => setCurrentItem({...currentItem, cantidad: parseNumber(e.target.value)})} />
                                    </div>
                                     <div className="space-y-2">
                                        <Label>Precio Unitario</Label>
                                        <Input 
                                            type="text"
                                            value={formatNumber(currentItem.precioUnitario)} 
                                            onChange={e => setCurrentItem({...currentItem, precioUnitario: parseNumber(e.target.value)})} />
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveItem}>Guardar Ítem</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
