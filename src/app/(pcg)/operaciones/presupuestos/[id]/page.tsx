"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Trash2, Loader2, Save, PlusCircle, FolderPlus, FilePlus, Type, AlertTriangle, ArrowUp, ArrowDown, Edit, ChevronRight } from 'lucide-react';
import { collection, doc, getDoc, setDoc, addDoc, serverTimestamp, query, orderBy, getDocs, Timestamp, where, writeBatch, updateDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { generarPresupuestoPdf, HierarchicalItem as PdfHierarchicalItem, DatosEmpresa, DatosObra, DatosPresupuesto } from '@/lib/pdf/generarPresupuestoPdf';
import { useAuth } from '@/context/AuthContext';
import { Company, Rdi } from '@/types/pcg';
import { motion } from 'framer-motion';

type Obra = { id: string; nombreFaena: string; direccion?: string; };
type PresupuestoItemType = 'chapter' | 'subchapter' | 'item';
type PresupuestoItem = {
    id: string;
    parentId: string | null;
    type: PresupuestoItemType;
    descripcion: string;
    unidad: string;
    cantidad: number | null;
    precioUnitario: number | null;
    especialidad?: string;
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
    rdiId?: string | null;
    source?: 'IA_PDF' | 'manual';
};

function formatoMoneda(value: number | null | undefined) {
    if (value == null || isNaN(value)) return '$ 0';
    return new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0,
    }).format(value);
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

function PresupuestoEditor() {
    const { user, companyId, role } = useAuth();
    const params = useParams();
    const presupuestoId = params.id as string;
    const searchParams = useSearchParams();
    const obraIdFromQuery = searchParams.get('obraId');
    const rdiIdFromQuery = searchParams.get('rdiId');
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
        rdiId: rdiIdFromQuery || null,
    });
    const [items, setItems] = useState<PresupuestoItem[]>([]);
    const [rdiDeOrigen, setRdiDeOrigen] = useState<Rdi | null>(null);
    
    const [dialogOpen, setDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<PresupuestoItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());

    const isAiGenerated = presupuesto.source === 'IA_PDF';

    const toggleCollapse = useCallback((itemId: string) => {
        setCollapsedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) newSet.delete(itemId);
            else newSet.add(itemId);
            return newSet;
        });
    }, []);

    useEffect(() => {
        if (!companyId && role !== 'superadmin') return;

        const fetchInitialData = async () => {
            setLoading(true);
            const obrasRef = collection(firebaseDb, "obras");
            let q;
            if (role === 'superadmin') q = query(obrasRef, orderBy("nombreFaena"));
            else q = query(obrasRef, where("empresaId", "==", companyId), orderBy("nombreFaena"));

            const obrasSnap = await getDocs(q);
            const obrasData = obrasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra));
            setObras(obrasData);

            if (companyId) {
                const companySnap = await getDoc(doc(firebaseDb, "companies", companyId));
                if (companySnap.exists()) setCompany(companySnap.data() as Company);
            }

            if (rdiIdFromQuery && obraIdFromQuery) {
                const rdiSnap = await getDoc(doc(firebaseDb, "obras", obraIdFromQuery, "rdi", rdiIdFromQuery));
                if (rdiSnap.exists()) {
                    const rdiData = rdiSnap.data() as Rdi;
                    setRdiDeOrigen(rdiData);
                    setPresupuesto(prev => ({
                        ...prev,
                        obraId: obraIdFromQuery,
                        nombre: `Adicional RDI ${rdiData.correlativo}: ${rdiData.titulo}`,
                        observaciones: rdiData.descripcion,
                        rdiId: rdiIdFromQuery,
                    }));
                }
            }
            
            if (presupuestoId !== 'nuevo') {
                const docSnap = await getDoc(doc(firebaseDb, "presupuestos", presupuestoId));
                if (docSnap.exists()) {
                    const data = docSnap.data() as Presupuesto;
                    setPresupuesto({ ...data, id: docSnap.id });
                    setItems(data.items.map(i => ({...i, id: (i as any).id || crypto.randomUUID()})));
                } else {
                    toast({ variant: "destructive", title: "Error", description: "Itemizado no encontrado." });
                    router.push('/operaciones/presupuestos');
                }
            } else if (!rdiIdFromQuery) {
                setPresupuesto(prev => ({ ...prev, obraId: obraIdFromQuery || obrasData[0]?.id || '', nombre: 'Nuevo Itemizado' }));
            }
            setLoading(false);
        };
        fetchInitialData();
    }, [presupuestoId, companyId, role]);

    const { hierarchicalItems, totalPresupuesto } = useMemo(() => {
        if (!items) return { hierarchicalItems: [], totalPresupuesto: 0 };
        const itemsById = new Map(items.map(i => [i.id, { ...i, children: [] as PresupuestoItem[], subtotal: 0 }]));
        const roots: PresupuestoItem[] = [];
        items.forEach(item => {
            if (item.parentId && itemsById.has(item.parentId)) itemsById.get(item.parentId)!.children.push(item as any);
            else roots.push(item);
        });
        const calculateSubtotal = (itemId: string): number => {
            const item = itemsById.get(itemId);
            if (!item) return 0;
            if (item.type === 'item') {
                item.subtotal = (item.cantidad || 0) * (item.precioUnitario || 0);
                return item.subtotal;
            }
            item.subtotal = item.children.reduce((sum, child) => sum + calculateSubtotal(child.id), 0);
            return item.subtotal;
        };
        let total = 0;
        roots.forEach(root => { total += calculateSubtotal(root.id); });
        const flattened: HierarchicalItem[] = [];
        const processItems = (currentItems: PresupuestoItem[], level: number, prefix: string) => {
            let chC = 1, subC = 0, itC = 1;
            currentItems.forEach(item => {
                const itemWithChildren = itemsById.get(item.id)! as HierarchicalItem;
                let cPrefix = prefix, itemNumber;
                if (item.type === 'chapter') { itemNumber = `${chC}`; cPrefix = `${itemNumber}.`; chC++; subC = 0; itC = 1; }
                else if (item.type === 'subchapter') { itemNumber = String.fromCharCode(65 + subC); cPrefix = `${itemNumber}.`; subC++; itC = 1; }
                else { itemNumber = `${prefix}${itC}`; itC++; }
                flattened.push({ ...itemWithChildren, level, itemNumber: item.type === 'chapter' ? itemNumber : (item.type === 'subchapter' ? `${prefix}${itemNumber}` : itemNumber) });
                if (itemWithChildren.children.length > 0) processItems(itemWithChildren.children, level + 1, cPrefix);
            });
        };
        processItems(roots, 0, '');
        return { hierarchicalItems: flattened, totalPresupuesto: total };
    }, [items]);

    const handleSave = async () => {
        if (!presupuesto.obraId || !presupuesto.nombre) {
            toast({ variant: "destructive", title: "Error", description: "La obra y el nombre del itemizado son obligatorios." });
            return;
        }
        setIsSaving(true);
        const dataToSave = { ...presupuesto, items, updatedAt: serverTimestamp() };
        delete (dataToSave as any).id;
        try {
            if (presupuesto.id) await setDoc(doc(firebaseDb, "presupuestos", presupuesto.id), dataToSave, { merge: true });
            else await addDoc(collection(firebaseDb, "presupuestos"), { ...dataToSave, fechaCreacion: serverTimestamp() });
            toast({ title: "Éxito", description: "Itemizado guardado." });
            router.push('/operaciones/presupuestos');
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar." });
        } finally { setIsSaving(false); }
    };

    if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin" /> Cargando...</div>;

    const ggP = presupuesto.gastosGeneralesPorcentaje ?? 25;
    const ggVal = totalPresupuesto * (ggP / 100);
    const subGG = totalPresupuesto + ggVal;
    const ivaVal = subGG * 0.19;
    const totalFinal = subGG + ivaVal;

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <header className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.push('/operaciones/presupuestos')}><ArrowLeft /></Button>
                <h1 className="text-2xl font-bold">{presupuestoId === 'nuevo' ? "Nuevo Itemizado" : "Editar Itemizado"}</h1>
            </header>
            <Card>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
                    <div className="space-y-2"><Label>Obra*</Label><Select value={presupuesto.obraId} onValueChange={(val) => setPresupuesto(p => ({...p, obraId: val}))} disabled={!!presupuesto.id}><SelectTrigger><SelectValue placeholder="Obra..." /></SelectTrigger><SelectContent>{obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nombreFaena}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label>Nombre*</Label><Input value={presupuesto.nombre} onChange={e => setPresupuesto(p => ({...p, nombre: e.target.value}))} /></div>
                    <div className="space-y-2"><Label>GG&U (%)</Label><Input type="number" value={presupuesto.gastosGeneralesPorcentaje} onChange={e => setPresupuesto(p => ({...p, gastosGeneralesPorcentaje: Number(e.target.value)}))} /></div>
                </CardContent>
            </Card>
            <Card><CardContent><Table><TableHeader><TableRow><TableHead>Ítem</TableHead><TableHead>Descripción</TableHead><TableHead>Un.</TableHead><TableHead>Cant.</TableHead><TableHead>P. Unit.</TableHead><TableHead>P. Total</TableHead></TableRow></TableHeader><TableBody>{hierarchicalItems.map(item => (<TableRow key={item.id} className={cn(item.type !== 'item' && 'bg-muted/50 font-bold')}><TableCell>{item.itemNumber}</TableCell><TableCell>{item.descripcion}</TableCell><TableCell>{item.unidad}</TableCell><TableCell>{item.cantidad}</TableCell><TableCell>{formatoMoneda(item.precioUnitario)}</TableCell><TableCell>{formatoMoneda(item.subtotal)}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
            <div className="flex justify-end gap-4"><Button variant="ghost" onClick={() => router.back()}>Cancelar</Button><Button onClick={handleSave} disabled={isSaving}>{isSaving && <Loader2 className="animate-spin mr-2" />}Guardar</Button></div>
        </div>
    );
}

export default function PresupuestoEditPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center"><Loader2 className="animate-spin" /></div>}>
            <PresupuestoEditor />
        </Suspense>
    );
}
