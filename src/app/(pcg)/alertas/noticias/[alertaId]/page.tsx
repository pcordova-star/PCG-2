// src/app/(pcg)/alertas/noticias/[alertaId]/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ArrowLeft, CheckCircle, AlertTriangle, Newspaper, BrainCircuit } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

type AlertaCompleta = {
    id: string;
    esCritica: boolean;
    fechaGeneracion: any;
    // from noticiaExterna
    tituloOriginal?: string;
    fuente?: string;
    url?: string;
    contenidoCrudo?: string;
    // from analisisIA
    resumen?: string;
    especialidad?: string[];
    accionRecomendada?: string;
};

export default function PaginaDetalleAlerta() {
    const { alertaId } = useParams();
    const { user, companyId } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [alerta, setAlerta] = useState<AlertaCompleta | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        if (!user || !companyId || !alertaId) return;

        const fetchAlerta = async () => {
            setLoading(true);
            setError(null);
            try {
                const alertaRef = doc(firebaseDb, "alertasNoticias", alertaId as string);
                const alertaSnap = await getDoc(alertaRef);

                if (!alertaSnap.exists() || alertaSnap.data().companyId !== companyId) {
                    throw new Error("Alerta no encontrada o no tienes permiso para verla.");
                }
                const alertaData = alertaSnap.data();

                const noticiaRef = doc(firebaseDb, "noticiasExternas", alertaData.noticiaId);
                const analisisRef = doc(noticiaRef, "analisisIA", alertaData.analisisId);
                
                const [noticiaSnap, analisisSnap] = await Promise.all([
                    getDoc(noticiaRef),
                    getDoc(analisisRef)
                ]);

                if (!noticiaSnap.exists() || !analisisSnap.exists()) {
                     throw new Error("No se pudieron cargar los detalles completos de la noticia.");
                }

                const noticiaExterna = noticiaSnap.data();
                const analisisIA = analisisSnap.data();

                setAlerta({
                    id: alertaSnap.id,
                    esCritica: alertaData.esCritica,
                    fechaGeneracion: alertaData.fechaGeneracion,
                    tituloOriginal: noticiaExterna.tituloOriginal,
                    fuente: noticiaExterna.fuente,
                    url: noticiaExterna.url,
                    contenidoCrudo: noticiaExterna.contenidoCrudo,
                    resumen: analisisIA.resumen,
                    especialidad: analisisIA.especialidad,
                    accionRecomendada: analisisIA.accionRecomendada,
                });

            } catch (err: any) {
                setError(err.message);
                toast({ variant: 'destructive', title: 'Error', description: err.message });
            } finally {
                setLoading(false);
            }
        };

        fetchAlerta();
    }, [user, companyId, alertaId, toast]);

    const handleMarcarLeida = async () => {
        setIsUpdating(true);
        try {
            const alertaRef = doc(firebaseDb, "alertasNoticias", alertaId as string);
            await updateDoc(alertaRef, { estado: 'vista' });
            toast({ title: "Alerta marcada como vista", description: "Ya no aparecerá en tu panel principal." });
            router.push('/dashboard');
        } catch (error) {
            console.error("Error updating alert status:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el estado de la alerta.' });
        } finally {
            setIsUpdating(false);
        }
    };


    if (loading) {
        return <div className="p-8 text-center"><Loader2 className="animate-spin" /> Cargando alerta...</div>;
    }
    if (error) {
        return <div className="p-8 text-center text-destructive">{error}</div>;
    }
    if (!alerta) {
        return <div className="p-8 text-center">No se encontró la alerta.</div>;
    }


    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4"/> Volver al Dashboard</Link>
                </Button>
                <Button onClick={handleMarcarLeida} disabled={isUpdating}>
                    {isUpdating ? <Loader2 className="animate-spin mr-2"/> : <CheckCircle className="mr-2"/>}
                    Marcar como leída y archivar
                </Button>
            </header>

            <Card className="border-l-4 border-primary">
                <CardHeader>
                    {alerta.esCritica && (
                        <div className="flex items-center gap-2 mb-2 text-destructive font-bold animate-pulse">
                            <AlertTriangle/>
                            <span>ALERTA CRÍTICA</span>
                        </div>
                    )}
                    <CardTitle className="text-2xl">{alerta.tituloOriginal}</CardTitle>
                    <CardDescription>
                        Fuente: {alerta.fuente} | {alerta.fechaGeneracion?.toDate().toLocaleDateString('es-CL')}
                    </CardDescription>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                     <Card>
                        <CardHeader className="flex flex-row items-center gap-3">
                            <BrainCircuit className="h-6 w-6 text-primary"/>
                            <CardTitle>Análisis de IA</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <h4 className="font-semibold">Resumen Ejecutivo:</h4>
                            <p className="text-muted-foreground italic mb-4">{alerta.resumen}</p>

                            <h4 className="font-semibold">Acción Recomendada en PCG:</h4>
                            <p className="font-bold text-primary p-3 bg-primary/10 rounded-md mt-1">{alerta.accionRecomendada}</p>
                            
                             <div className="mt-4">
                                <h4 className="font-semibold mb-2">Especialidades Afectadas:</h4>
                                <div className="flex flex-wrap gap-2">
                                    {alerta.especialidad?.map(e => <Badge key={e} variant="secondary">{e}</Badge>)}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center gap-3">
                            <Newspaper className="h-6 w-6 text-primary"/>
                            <CardTitle>Noticia Original</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           <div className="max-h-80 overflow-y-auto p-3 bg-muted/50 rounded-md border text-sm">
                                <p className="whitespace-pre-wrap">{alerta.contenidoCrudo}</p>
                           </div>
                           {alerta.url && (
                                <Button asChild variant="outline" className="w-full">
                                    <a href={alerta.url} target="_blank" rel="noopener noreferrer">Leer en fuente original</a>
                                </Button>
                           )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
