// src/app/operaciones/presupuestos/page.tsx
"use client";

import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, PlusCircle, Edit, Trash2, History, Copy, GanttChartSquare, Wand2 } from 'lucide-react';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, Timestamp, writeBatch, where, onSnapshot, getDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

// --- Tipos de Datos ---
type Obra = { id: string; nombreFaena: string; };
type CatalogoItem = {
    id: string;
    codigo: string;
    descripcion: string;
    unidad: string;
    precioActual: number;
    fechaUltimoPrecio: Timestamp;
    categoria?: string;
};
type HistorialPrecio = { id: string; itemId: string; precio: number; fecha: Timestamp; fuente: string; };
type Presupuesto = { id: string; obraId: string; nombre: string; fechaCreacion: Timestamp; totalPresupuesto: number; };

function formatCurrency(value: number) {
    if (isNaN(value)) return '$ 0';
    return value.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });
}

// --- Componente de Catálogo ---
function CatalogoTab() {
    const { toast } = useToast();
    const [items, setItems] = useState<CatalogoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<Partial<CatalogoItem> | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [historialVisible, setHistorialVisible] = useState(false);
    const [historialPrecios, setHistorialPrecios] = useState<HistorialPrecio[]>([]);

    useEffect(() => {
        const q = query(collection(firebaseDb, "catalogoItems"), orderBy("codigo"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CatalogoItem));
            setItems(data);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching catalog items: ", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los ítems del catálogo." });
            setLoading(false);
        });
        return () => unsubscribe();
    }, [toast]);

    const handleOpenDialog = (item: Partial<CatalogoItem> | null = null) => {
        setCurrentItem(item || { codigo: '', descripcion: '', unidad: 'UN', precioActual: 0, categoria: '' });
        setDialogOpen(true);
    };

    const handleSaveItem = async (e: FormEvent) => {
        e.preventDefault();
        if (!currentItem || !currentItem.codigo || !currentItem.descripcion) {
            toast({ variant: "destructive", title: "Error de validación", description: "Código y descripción son obligatorios." });
            return;
        }
        setIsSaving(true);
        const precio = Number(currentItem.precioActual) || 0;

        try {
            const batch = writeBatch(firebaseDb);
            if (currentItem.id) { // Editando
                const itemRef = doc(firebaseDb, "catalogoItems", currentItem.id);
                const originalItem = items.find(i => i.id === currentItem.id);

                batch.update(itemRef, { ...currentItem, precioActual: precio, fechaUltimoPrecio: serverTimestamp() });

                if (originalItem && originalItem.precioActual !== precio) {
                    const historialRef = doc(collection(firebaseDb, "historialPrecios"));
                    batch.set(historialRef, {
                        itemId: currentItem.id,
                        precio,
                        fecha: serverTimestamp(),
                        fuente: 'Actualización manual'
                    });
                }
            } else { // Creando
                const newItemRef = doc(collection(firebaseDb, "catalogoItems"));
                batch.set(newItemRef, { ...currentItem, precioActual: precio, fechaUltimoPrecio: serverTimestamp() });

                const historialRef = doc(collection(firebaseDb, "historialPrecios"));
                batch.set(historialRef, {
                    itemId: newItemRef.id,
                    precio,
                    fecha: serverTimestamp(),
                    fuente: 'Creación de ítem'
                });
            }
            await batch.commit();
            toast({ title: "Éxito", description: `Ítem ${currentItem.id ? 'actualizado' : 'creado'} correctamente.` });
            setDialogOpen(false);
        } catch (error) {
            console.error("Error saving item: ", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el ítem." });
        } finally {
            setIsSaving(false);
        }
    };

    const handleShowHistory = async (itemId: string) => {
        const q = query(collection(firebaseDb, "historialPrecios"), where("itemId", "==", itemId), orderBy("fecha", "desc"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HistorialPrecio));
        setHistorialPrecios(data);
        setCurrentItem(items.find(i => i.id === itemId) || null);
        setHistorialVisible(true);
    };

    return (
        <Card>
            <CardHeader className="flex-row justify-between items-center">
                <div>
                    <CardTitle>Catálogo de Ítems</CardTitle>
                    <CardDescription>Administra las partidas y precios base para tus itemizados.</CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2" /> Nuevo Ítem</Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead>Unidad</TableHead>
                            <TableHead>Precio Actual</TableHead>
                            <TableHead>Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? <TableRow><TableCell colSpan={5} className="text-center">Cargando...</TableCell></TableRow> :
                            items.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-mono">{item.codigo}</TableCell>
                                    <TableCell>{item.descripcion}</TableCell>
                                    <TableCell>{item.unidad}</TableCell>
                                    <TableCell>{formatCurrency(item.precioActual)}</TableCell>
                                    <TableCell className="flex gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)}><Edit className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleShowHistory(item.id)}><History className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        }
                    </TableBody>
                </Table>
            </CardContent>

            {/* Dialog para crear/editar item */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <form onSubmit={handleSaveItem}>
                        <DialogHeader>
                            <DialogTitle>{currentItem?.id ? "Editar Ítem" : "Nuevo Ítem"}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2"><Label>Código*</Label><Input value={currentItem?.codigo || ''} onChange={e => setCurrentItem(prev => ({...prev, codigo: e.target.value}))} /></div>
                            <div className="space-y-2"><Label>Descripción*</Label><Input value={currentItem?.descripcion || ''} onChange={e => setCurrentItem(prev => ({...prev, descripcion: e.target.value}))} /></div>
                            <div className="space-y-2"><Label>Unidad</Label><Input value={currentItem?.unidad || ''} onChange={e => setCurrentItem(prev => ({...prev, unidad: e.target.value}))} /></div>
                            <div className="space-y-2"><Label>Precio Actual*</Label><Input type="number" value={currentItem?.precioActual || 0} onChange={e => setCurrentItem(prev => ({...prev, precioActual: Number(e.target.value)}))} /></div>
                            <div className="space-y-2"><Label>Categoría</Label><Input value={currentItem?.categoria || ''} onChange={e => setCurrentItem(prev => ({...prev, categoria: e.target.value}))} /></div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isSaving}>{isSaving ? "Guardando..." : "Guardar"}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Dialog para historial de precios */}
            <Dialog open={historialVisible} onOpenChange={setHistorialVisible}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Historial de Precios: {currentItem?.descripcion}</DialogTitle>
                    </DialogHeader>
                    <Table>
                        <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Precio</TableHead><TableHead>Fuente</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {historialPrecios.map(h => (
                                <TableRow key={h.id}>
                                    <TableCell>{h.fecha?.toDate().toLocaleDateString('es-CL')}</TableCell>
                                    <TableCell>{formatCurrency(h.precio)}</TableCell>
                                    <TableCell>{h.fuente}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

// --- Componente de Itemizados por Obra ---
function PresupuestosTab() {
    const router = useRouter();
    const { toast } = useToast();
    const { companyId, role } = useAuth();
    const [obras, setObras] = useState<Obra[]>([]);
    const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>('');
    const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!companyId && role !== 'superadmin') return;

        const fetchObras = async () => {
            const obrasRef = collection(firebaseDb, "obras");
            let q;
            if (role === 'superadmin') {
                q = query(obrasRef, orderBy("nombreFaena"));
            } else {
                q = query(obrasRef, where("empresaId", "==", companyId), orderBy("nombreFaena"));
            }
            
            const snapshot = await getDocs(q);
            const obrasData = snapshot.docs.map(doc => ({ id: doc.id, nombreFaena: doc.data().nombreFaena } as Obra));
            setObras(obrasData);
            if (obrasData.length > 0) {
                setObraSeleccionadaId(obrasData[0].id);
            }
        };
        fetchObras();
    }, [companyId, role]);

    useEffect(() => {
        if (!obraSeleccionadaId) {
            setPresupuestos([]);
            setLoading(false);
            return;
        };
        setLoading(true);
        const q = query(collection(firebaseDb, "presupuestos"), where("obraId", "==", obraSeleccionadaId), orderBy("fechaCreacion", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Presupuesto));
            setPresupuestos(data);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching presupuestos:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los itemizados." });
            setLoading(false);
        });
        return () => unsubscribe();
    }, [obraSeleccionadaId, toast]);

    const handleDuplicar = async (presupuestoId: string) => {
        const presupuestoOriginal = await getDoc(doc(firebaseDb, "presupuestos", presupuestoId));
        if (!presupuestoOriginal.exists()) {
            toast({ variant: "destructive", title: "Error", description: "No se encontró el itemizado a duplicar." });
            return;
        }
        const data = presupuestoOriginal.data();
        // Defensively remove the id field from the copied data
        const { id, ...dataToCopy } = data;
        const nuevoNombre = `Copia de ${data.nombre}`;
        
        try {
            const docRef = await addDoc(collection(firebaseDb, "presupuestos"), {
                ...dataToCopy,
                nombre: nuevoNombre,
                fechaCreacion: serverTimestamp()
            });
            toast({ title: "Éxito", description: `Itemizado duplicado. Ahora puedes editar la copia.` });
            router.push(`/operaciones/presupuestos/${docRef.id}`);
        } catch (error) {
            console.error("Error duplicating budget:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo duplicar el itemizado." });
        }
    };
    
    const handleDelete = async (presupuestoId: string) => {
        try {
            await deleteDoc(doc(firebaseDb, "presupuestos", presupuestoId));
            toast({title: "Éxito", description: "Itemizado eliminado correctamente."});
        } catch (error) {
            console.error("Error deleting budget:", error);
            toast({variant: "destructive", title: "Error", description: "No se pudo eliminar el itemizado."});
        }
    }


    return (
        <Card>
            <CardHeader className="flex-row justify-between items-center">
                <div>
                    <CardTitle>Itemizados por Obra</CardTitle>
                    <CardDescription>Crea, edita y gestiona itemizados para cada obra.</CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.push('/operaciones/presupuestos/itemizados/importar')}>
                        <Wand2 className="mr-2 h-4 w-4" /> Importar (beta)
                    </Button>
                    <Button onClick={() => router.push('/operaciones/presupuestos/nuevo')}>
                        <PlusCircle className="mr-2" /> Nuevo Itemizado
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="max-w-md mb-4">
                    <Label>Seleccione una obra</Label>
                    <Select value={obraSeleccionadaId} onValueChange={setObraSeleccionadaId}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar obra..." /></SelectTrigger>
                        <SelectContent>
                            {obras.map(obra => <SelectItem key={obra.id} value={obra.id}>{obra.nombreFaena}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <Table>
                    <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Fecha</TableHead><TableHead>Total</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {loading ? <TableRow><TableCell colSpan={4} className="text-center">Cargando...</TableCell></TableRow> :
                            presupuestos.map(p => (
                                <TableRow key={p.id}>
                                    <TableCell>{p.nombre}</TableCell>
                                    <TableCell>{p.fechaCreacion?.toDate().toLocaleDateString('es-CL')}</TableCell>
                                    <TableCell>{formatCurrency(p.totalPresupuesto || 0)}</TableCell>
                                    <TableCell className="flex gap-2">
                                        <Button variant="secondary" size="sm" onClick={() => router.push(`/operaciones/programacion?obraId=${p.obraId}`)}><GanttChartSquare className="mr-2 h-3 w-3" />Ir a Programación</Button>
                                        <Button variant="outline" size="sm" onClick={() => router.push(`/operaciones/presupuestos/${p.id}`)}>Ver / Editar</Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDuplicar(p.id)}><Copy className="h-4 w-4" /></Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>¿Eliminar Itemizado?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(p.id)}>Eliminar</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))
                        }
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}


// --- Componente Principal ---
export default function PresupuestosPage() {
    const router = useRouter();

    return (
        <div className="space-y-6">
            <header className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.push('/dashboard')}><ArrowLeft /></Button>
                <div>
                    <h1 className="text-2xl font-bold">Itemizados</h1>
                    <p className="text-muted-foreground">Administra tu catálogo de ítems y crea itemizados por obra.</p>
                </div>
            </header>
            <Tabs defaultValue="presupuestos" className="w-full">
                <TabsList>
                    <TabsTrigger value="presupuestos">Itemizados por Obra</TabsTrigger>
                    <TabsTrigger value="catalogo">Catálogo de Ítems</TabsTrigger>
                </TabsList>
                <TabsContent value="presupuestos">
                    <PresupuestosTab />
                </TabsContent>
                <TabsContent value="catalogo">
                    <CatalogoTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}
