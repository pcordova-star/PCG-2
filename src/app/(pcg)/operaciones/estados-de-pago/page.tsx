// src/app/(pcg)/operaciones/estados-de-pago/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { collection, query, where, orderBy, onSnapshot, doc, getDocs, addDoc, serverTimestamp, deleteDoc, updateDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Loader2, PlusCircle, ArrowLeft, FileText, MoreVertical, Edit, Trash2, DollarSign } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Obra, ActividadProgramada, Company } from '@/types/pcg';
import { generarEstadoDePagoPdf } from '@/lib/pdf/generarEstadoDePagoPdf';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

// Types needed for this page
type EstadoDePagoStatus = 'borrador' | 'presentado' | 'pagado';

type EstadoDePago = {
  id: string;
  correlativo: number;
  fechaGeneracion: Date;
  fechaDeCorte: string;
  totalAcumulado: number;
  totalAnterior: number;
  subtotal: number;
  iva: number;
  total: number; // This is the total FOR THIS PERIOD
  actividades: any[]; // simplified for now
  status: EstadoDePagoStatus;
};

type NewEepData = Omit<EstadoDePago, 'id' | 'correlativo' | 'fechaGeneracion' | 'fechaDeCorte' | 'status'>;

function formatoMoneda(valor: number) {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(valor);
}

export default function EstadosDePagoPage() {
    const { user, companyId, company, role } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [obras, setObras] = useState<Obra[]>([]);
    const [selectedObraId, setSelectedObraId] = useState('');
    const [estadosDePago, setEstadosDePago] = useState<EstadoDePago[]>([]);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    
    // State for review modal
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [newEepData, setNewEepData] = useState<NewEepData | null>(null);

    // Fetch obras
    useEffect(() => {
        if (!companyId && role !== 'superadmin') return;
        const obrasRef = collection(firebaseDb, "obras");
        let q;
        if(role === 'superadmin') {
            q = query(obrasRef, orderBy("nombreFaena"));
        } else {
            q = query(obrasRef, where("empresaId", "==", companyId), orderBy("nombreFaena"));
        }

        const unsub = onSnapshot(q, (snapshot) => {
            const obrasData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra));
            setObras(obrasData);
            const obraIdFromQuery = searchParams.get('obraId');
            if (obraIdFromQuery && obrasData.some(o => o.id === obraIdFromQuery)) {
                setSelectedObraId(obraIdFromQuery);
            } else if (obrasData.length > 0 && !selectedObraId) {
                setSelectedObraId(obrasData[0].id);
            }
        });
        return () => unsub();
    }, [companyId, role, searchParams, selectedObraId]);

    // Fetch estados de pago for selected obra
    useEffect(() => {
        if (!selectedObraId) {
            setEstadosDePago([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const edpRef = collection(firebaseDb, "obras", selectedObraId, "estadosDePago");
        const q = query(edpRef, orderBy("correlativo", "desc"));

        const unsub = onSnapshot(q, (snapshot) => {
            const edpData = snapshot.docs.map(doc => {
                const data = doc.data();
                const fecha = data.fechaGeneracion;
                // Robust date handling
                const finalDate = (fecha && typeof fecha.toDate === 'function') 
                    ? fecha.toDate() 
                    : (fecha instanceof Date ? fecha : new Date());

                return {
                    id: doc.id,
                    ...data,
                    fechaGeneracion: finalDate,
                    status: data.status || 'presentado', // Default for old documents
                } as EstadoDePago;
            });
            setEstadosDePago(edpData);
            setLoading(false);
        }, (error) => {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los estados de pago.' });
            console.error("Error fetching EEPP:", error);
            setLoading(false);
        });
        return () => unsub();
    }, [selectedObraId, toast]);

    const handleGenerarEdp = async () => {
        if (!selectedObraId || !user) return;

        setIsGenerating(true);
        toast({ title: 'Generando EEPP...', description: 'Calculando avances y preparando el informe.' });

        try {
            const obraRef = doc(firebaseDb, "obras", selectedObraId);
            const actividadesRef = collection(obraRef, "actividades");
            const avancesRef = collection(obraRef, "avancesDiarios");
            const edpRef = collection(obraRef, "estadosDePago");
            
            const [actividadesSnap, avancesSnap, edpSnap] = await Promise.all([
                getDocs(query(actividadesRef, orderBy("fechaInicio"))),
                getDocs(query(avancesRef)),
                getDocs(query(edpRef, orderBy("correlativo", "asc")))
            ]);

            const actividades = actividadesSnap.docs.map(d => ({id: d.id, ...d.data()}) as ActividadProgramada);
            const avances = avancesSnap.docs.map(d => d.data());
            const edpsAnteriores = edpSnap.docs.map(d => d.data() as EstadoDePago);

            const avancesPorActividad = new Map<string, number>();
            avances.forEach(avance => {
                if (avance.actividadId && typeof avance.cantidadEjecutada === 'number') {
                    avancesPorActividad.set(avance.actividadId, (avancesPorActividad.get(avance.actividadId) || 0) + avance.cantidadEjecutada);
                }
            });

            const actividadesEDP = actividades.map(act => {
                const cantidadEjecutada = avancesPorActividad.get(act.id) || 0;
                const porcentajeAvance = act.cantidad > 0 ? (cantidadEjecutada / act.cantidad) * 100 : 0;
                const montoProyectado = (act.precioContrato || 0) * cantidadEjecutada;
                return {
                    actividadId: act.id,
                    nombre: act.nombreActividad,
                    precioContrato: act.precioContrato,
                    cantidad: act.cantidad,
                    unidad: act.unidad,
                    porcentajeAvance: Math.min(100, porcentajeAvance),
                    montoProyectado: montoProyectado
                };
            });

            const totalAcumulado = actividadesEDP.reduce((sum, act) => sum + act.montoProyectado, 0);
            const totalAnterior = edpsAnteriores.reduce((sum, edp) => sum + edp.total, 0);
            
            const subtotalEstePeriodo = totalAcumulado - totalAnterior;
            const iva = subtotalEstePeriodo * 0.19;
            const totalEstePeriodo = subtotalEstePeriodo + iva;
            
            setNewEepData({
                totalAcumulado,
                totalAnterior,
                subtotal: subtotalEstePeriodo,
                iva,
                total: totalEstePeriodo,
                actividades: actividadesEDP,
            });
            setIsReviewModalOpen(true);

        } catch (error: any) {
            console.error("Error al generar EDP:", error);
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleSaveEdp = async (status: EstadoDePagoStatus) => {
        if (!newEepData || !user || !selectedObraId) return;
        
        setIsGenerating(true);
        try {
            const edpCollectionRef = collection(firebaseDb, "obras", selectedObraId, "estadosDePago");
            const edpCountSnap = await getDocs(query(edpCollectionRef));
            const nuevoCorrelativo = edpCountSnap.size + 1;

            const nuevoEdp = {
                ...newEepData,
                status: status,
                correlativo: nuevoCorrelativo,
                fechaGeneracion: serverTimestamp(),
                fechaDeCorte: new Date().toISOString().split('T')[0],
                generadoPorUid: user.uid,
                obraId: selectedObraId
            };
            
            await addDoc(edpCollectionRef, nuevoEdp);

            toast({ title: `EEP N°${nuevoCorrelativo} guardado como ${status}`, description: 'El nuevo estado de pago ha sido generado.' });
            setIsReviewModalOpen(false);
            setNewEepData(null);
        } catch (error: any) {
            console.error("Error al guardar EEPP:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el estado de pago.' });
        } finally {
            setIsGenerating(false);
        }
    }
    
    const handleUpdateStatus = async (edpId: string, status: EstadoDePagoStatus) => {
        if (!selectedObraId) return;
        try {
            const edpRef = doc(firebaseDb, "obras", selectedObraId, "estadosDePago", edpId);
            await updateDoc(edpRef, { status });
            toast({ title: 'Estado actualizado', description: `El EEPP ha sido marcado como ${status}.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el estado.' });
        }
    };

    const handleDownloadPdf = async (edp: EstadoDePago) => {
        const obra = obras.find(o => o.id === selectedObraId);
        if (!company || !obra) {
            toast({variant: 'destructive', title: 'Error', description: 'Faltan datos de la empresa o la obra.'});
            return;
        }
        
        generarEstadoDePagoPdf(company, obra, edp);
    };

    const handleEditEdp = (edp: EstadoDePago) => {
        toast({
            title: "Función en desarrollo",
            description: "La edición de EEPP estará disponible próximamente."
        });
    };

    const handleDeleteEdp = async (edpId: string) => {
        if (!selectedObraId) return;
        try {
            const edpRef = doc(firebaseDb, "obras", selectedObraId, "estadosDePago", edpId);
            await deleteDoc(edpRef);
            toast({ title: 'Estado de Pago eliminado', description: 'El EEPP ha sido eliminado. Los cálculos de EEPP futuros se ajustarán automáticamente.' });
        } catch (error: any) {
            console.error("Error al eliminar EEPP:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el estado de pago.' });
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}>
                    <ArrowLeft className="mr-2 h-4 w-4"/>Volver
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Estados de Pago</h1>
                    <p className="text-muted-foreground">Genera y revisa los informes de estado de pago por obra.</p>
                </div>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Seleccionar Obra</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="max-w-sm">
                        <Label htmlFor="obra-select">Obra</Label>
                        <Select value={selectedObraId} onValueChange={setSelectedObraId}>
                            <SelectTrigger id="obra-select"><SelectValue placeholder="Seleccione una obra..."/></SelectTrigger>
                            <SelectContent>
                                {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nombreFaena}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Historial de Estados de Pago</CardTitle>
                    <Button onClick={handleGenerarEdp} disabled={!selectedObraId || isGenerating}>
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4"/>}
                        Generar Nuevo EEPP
                    </Button>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center p-8"><Loader2 className="h-6 w-6 animate-spin"/></div>
                    ) : estadosDePago.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">No hay estados de pago generados para esta obra.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Correlativo</TableHead>
                                    <TableHead>Fecha Generación</TableHead>
                                    <TableHead>Monto del Período</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {estadosDePago.map(edp => (
                                    <TableRow key={edp.id}>
                                        <TableCell>EDP-{String(edp.correlativo).padStart(3, '0')}</TableCell>
                                        <TableCell>{edp.fechaGeneracion.toLocaleDateString('es-CL')}</TableCell>
                                        <TableCell>{formatoMoneda(edp.total)}</TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                edp.status === 'pagado' ? 'default' :
                                                edp.status === 'presentado' ? 'secondary' :
                                                'outline'
                                            }>
                                                {edp.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleDownloadPdf(edp)}>
                                                        <FileText className="mr-2 h-4 w-4" />
                                                        Ver/Descargar PDF
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleEditEdp(edp)}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Editar
                                                    </DropdownMenuItem>
                                                     {edp.status !== 'pagado' && (
                                                        <DropdownMenuItem onClick={() => handleUpdateStatus(edp.id, 'pagado')}>
                                                            <DollarSign className="mr-2 h-4 w-4" />
                                                            Marcar como Pagado
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem
                                                                onSelect={(e) => e.preventDefault()}
                                                                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Eliminar
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>¿Eliminar Estado de Pago?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Esta acción es permanente. Se eliminará el EEPP N°{edp.correlativo}.
                                                                    Al generar un nuevo EEPP se considerará el historial actualizado.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    className="bg-destructive hover:bg-destructive/90"
                                                                    onClick={() => handleDeleteEdp(edp.id)}
                                                                >
                                                                    Confirmar Eliminación
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
            
            {/* Review Modal */}
            <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Revisar y Confirmar Nuevo Estado de Pago</DialogTitle>
                        <DialogDescription>
                            Verifica los cálculos y el detalle de avance antes de guardar el informe.
                        </DialogDescription>
                    </DialogHeader>
                    {newEepData && (
                        <div className="py-4 space-y-6">
                            <ScrollArea className="h-72 w-full rounded-md border p-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Actividad</TableHead>
                                            <TableHead className="text-right">Avance (%)</TableHead>
                                            <TableHead className="text-right">Monto Acumulado</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {newEepData.actividades.map(act => (
                                            <TableRow key={act.actividadId}>
                                                <TableCell>{act.nombre}</TableCell>
                                                <TableCell className="text-right">{act.porcentajeAvance.toFixed(1)}%</TableCell>
                                                <TableCell className="text-right">{formatoMoneda(act.montoProyectado)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                            
                             <Table>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">Total Avance Acumulado a la Fecha</TableCell>
                                        <TableCell className="text-right">{formatoMoneda(newEepData.totalAcumulado)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="text-muted-foreground">(-) Total Cobrado en EEPP Anteriores</TableCell>
                                        <TableCell className="text-right text-muted-foreground">{formatoMoneda(newEepData.totalAnterior)}</TableCell>
                                    </TableRow>
                                     <TableRow className="font-bold border-t-2 border-primary">
                                        <TableCell>Subtotal de Este Período</TableCell>
                                        <TableCell className="text-right">{formatoMoneda(newEepData.subtotal)}</TableCell>
                                    </TableRow>
                                     <TableRow>
                                        <TableCell>IVA (19%)</TableCell>
                                        <TableCell className="text-right">{formatoMoneda(newEepData.iva)}</TableCell>
                                    </TableRow>
                                     <TableRow className="text-lg font-extrabold bg-primary/10">
                                        <TableCell>Total a Pagar en este EEPP</TableCell>
                                        <TableCell className="text-right">{formatoMoneda(newEepData.total)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsReviewModalOpen(false)} disabled={isGenerating}>Cancelar</Button>
                         <Button variant="secondary" onClick={() => handleSaveEdp('borrador')} disabled={isGenerating}>
                            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar como Borrador
                        </Button>
                        <Button onClick={() => handleSaveEdp('presentado')} disabled={isGenerating}>
                            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar y Presentar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
