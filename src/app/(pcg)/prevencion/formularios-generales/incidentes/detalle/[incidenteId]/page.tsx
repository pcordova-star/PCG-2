// src/app/(pcg)/prevencion/formularios-generales/incidentes/detalle/[incidenteId]/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Save, FileText } from 'lucide-react';
import { RegistroIncidente, MedidaCorrectivaDetallada, Obra } from '@/types/pcg';
import { useToast } from '@/hooks/use-toast';
import { PlanAccionEditor } from '@/app/(pcg)/prevencion/formularios-generales/components/PlanAccionEditor';
import { generarInvestigacionAccidentePdf } from '@/lib/pdf/generarInvestigacionAccidentePdf';

export default function DetalleIncidentePage() {
    const { incidenteId } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [incidente, setIncidente] = useState<RegistroIncidente | null>(null);
    const [obra, setObra] = useState<Obra | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!user || !incidenteId) return;

        const fetchIncidente = async () => {
            setLoading(true);
            const incidenteRef = doc(firebaseDb, 'incidentes', incidenteId as string);
            const incidenteSnap = await getDoc(incidenteRef);

            if (incidenteSnap.exists()) {
                const data = { id: incidenteSnap.id, ...incidenteSnap.data() } as RegistroIncidente;
                setIncidente(data);

                const obraRef = doc(firebaseDb, 'obras', data.obraId);
                const obraSnap = await getDoc(obraRef);
                if (obraSnap.exists()) {
                    setObra(obraSnap.data() as Obra);
                }
            }
            setLoading(false);
        };
        fetchIncidente();
    }, [user, incidenteId]);

    const handlePlanAccionChange = (medidas: MedidaCorrectivaDetallada[]) => {
        setIncidente(prev => prev ? ({ ...prev, medidasCorrectivasDetalladas: medidas }) : null);
    };

    const handleSave = async () => {
        if (!incidente) return;
        setIsSaving(true);
        try {
            const incidenteRef = doc(firebaseDb, 'incidentes', incidenteId as string);
            await updateDoc(incidenteRef, {
                medidasCorrectivasDetalladas: incidente.medidasCorrectivasDetalladas || [],
            });
            toast({ title: 'Plan de Acción Guardado', description: 'Las medidas correctivas han sido guardadas.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el plan de acción.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleGeneratePdf = async () => {
        if (incidente && obra) {
            generarInvestigacionAccidentePdf(incidente, obra);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Faltan datos para generar el PDF.' });
        }
    }

    if (loading) {
        return <div className="text-center p-8"><Loader2 className="animate-spin" /> Cargando incidente...</div>;
    }

    if (!incidente) {
        return <div className="text-center text-destructive p-8">No se encontró el incidente.</div>;
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                 <Button asChild variant="outline" size="sm">
                    <Link href="/prevencion/formularios-generales/incidentes"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Listado</Link>
                </Button>
                 <div className="flex items-center gap-2">
                    <Button onClick={handleGeneratePdf}><FileText className="mr-2 h-4 w-4"/>Generar PDF</Button>
                </div>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Reporte de Incidente: {incidente.id.substring(0, 8)}</CardTitle>
                    <CardDescription>
                        Reportado el {incidente.createdAt.toDate().toLocaleDateString('es-CL')} en {obra?.nombreFaena}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h4 className="font-semibold">Descripción del Hecho</h4>
                        <p className="text-muted-foreground">{incidente.descripcionHecho}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold">Acciones Inmediatas Tomadas</h4>
                        <p className="text-muted-foreground">{incidente.medidasCorrectivas || "No se registraron."}</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Plan de Acción</CardTitle>
                    <CardDescription>Define las medidas correctivas para evitar la recurrencia de este incidente.</CardDescription>
                </CardHeader>
                <CardContent>
                    <PlanAccionEditor
                        medidas={incidente.medidasCorrectivasDetalladas}
                        onChange={handlePlanAccionChange}
                    />
                </CardContent>
                <CardFooter className="justify-end">
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                        Guardar Plan de Acción
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}