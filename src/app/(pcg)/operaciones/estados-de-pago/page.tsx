// src/app/(pcg)/operaciones/estados-de-pago/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, PlusCircle, ArrowLeft, FileText } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Obra, ActividadProgramada, Company } from '@/types/pcg';
import { generarEstadoDePagoPdf } from '@/lib/pdf/generarEstadoDePagoPdf';

// Types needed for this page
type EstadoDePago = {
  id: string;
  correlativo: number;
  fechaGeneracion: Date;
  fechaDeCorte: string;
  total: number;
  subtotal: number;
  iva: number;
  actividades: any[]; // simplified for now
};

export default function EstadosDePagoPage() {
    const { user, companyId, company, role } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [obras, setObras] = useState<Obra[]>([]);
    const [selectedObraId, setSelectedObraId] = useState('');
    const [estadosDePago, setEstadosDePago] = useState<EstadoDePago[]>([]);
    const [loading, setLoading] = useState(true);

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
            } else if (obrasData.length > 0) {
                setSelectedObraId(obrasData[0].id);
            }
        });
        return () => unsub();
    }, [companyId, role, searchParams]);

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
                // Ensure fechaGeneracion is a Date object
                const fechaGeneracionDate = data.fechaGeneracion?.toDate ? data.fechaGeneracion.toDate() : new Date(data.fechaGeneracion);
                return {
                    id: doc.id,
                    ...data,
                    fechaGeneracion: fechaGeneracionDate
                } as EstadoDePago
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

        toast({ title: 'Generando EEPP...', description: 'Calculando avances y preparando el informe.' });

        try {
            const obraRef = doc(firebaseDb, "obras", selectedObraId);
            const actividadesRef = collection(obraRef, "actividades");
            const avancesRef = collection(obraRef, "avancesDiarios");
            
            const [obraSnap, actividadesSnap, avancesSnap] = await Promise.all([
                getDoc(obraRef),
                getDocs(query(actividadesRef, orderBy("fechaInicio"))),
                getDocs(query(avancesRef))
            ]);

            if (!obraSnap.exists()) throw new Error("Obra no encontrada.");

            const obraData = obraSnap.data() as Obra;
            const actividades = actividadesSnap.docs.map(d => ({id: d.id, ...d.data()}) as ActividadProgramada);
            const avances = avancesSnap.docs.map(d => d.data());

            // --- Logica de calculo (similar a la que movi al dashboard del director)
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

            const subtotal = actividadesEDP.reduce((sum, act) => sum + act.montoProyectado, 0);
            const iva = subtotal * 0.19;
            const total = subtotal + iva;

            const edpCollectionRef = collection(obraRef, "estadosDePago");
            const edpCountSnap = await getDocs(query(edpCollectionRef));
            const nuevoCorrelativo = edpCountSnap.size + 1;

            const nuevoEdp = {
                correlativo: nuevoCorrelativo,
                fechaGeneracion: serverTimestamp(),
                fechaDeCorte: new Date().toISOString().split('T')[0],
                subtotal,
                iva,
                total,
                actividades: actividadesEDP,
                generadoPorUid: user.uid,
                obraId: selectedObraId
            };
            
            await addDoc(edpCollectionRef, nuevoEdp);

            toast({ title: `EDP N°${nuevoCorrelativo} generado`, description: 'El nuevo estado de pago se ha guardado.' });

        } catch (error: any) {
            console.error("Error al generar EDP:", error);
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };
    
    const handleDownloadPdf = async (edp: EstadoDePago) => {
        const obra = obras.find(o => o.id === selectedObraId);
        if (!company || !obra) {
            toast({variant: 'destructive', title: 'Error', description: 'Faltan datos de la empresa o la obra.'});
            return;
        }
        
        generarEstadoDePagoPdf(company, obra, {
            ...edp,
            fechaGeneracion: edp.fechaGeneracion.toISOString()
        });
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
                    <Button onClick={handleGenerarEdp} disabled={!selectedObraId || loading}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Generar Nuevo EEPP
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
                                    <TableHead>Monto Total</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {estadosDePago.map(edp => (
                                    <TableRow key={edp.id}>
                                        <TableCell>EDP-{String(edp.correlativo).padStart(3, '0')}</TableCell>
                                        <TableCell>{edp.fechaGeneracion.toLocaleDateString('es-CL')}</TableCell>
                                        <TableCell>{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(edp.total)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={() => handleDownloadPdf(edp)}>
                                                <FileText className="mr-2 h-4 w-4" />
                                                Ver/Descargar PDF
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
