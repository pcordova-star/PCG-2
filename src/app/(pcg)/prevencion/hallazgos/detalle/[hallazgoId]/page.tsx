// src/app/(pcg)/prevencion/hallazgos/detalle/[hallazgoId]/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Paperclip, AlertTriangle } from 'lucide-react';
import { Hallazgo, Criticidad, Obra } from '@/types/pcg';
import { cn } from '@/lib/utils';
import ImageFromStorage from '@/components/client/ImageFromStorage';

const criticidadColors: Record<Criticidad, string> = {
  baja: "bg-blue-100 text-blue-800",
  media: "bg-yellow-100 text-yellow-800",
  alta: "bg-red-100 text-red-800",
};

export default function DetalleHallazgoPage() {
    const { hallazgoId } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    
    const [hallazgo, setHallazgo] = useState<Hallazgo | null>(null);
    const [obra, setObra] = useState<Obra | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !hallazgoId) return;

        const fetchHallazgo = async () => {
            setLoading(true);
            const hallazgoRef = doc(firebaseDb, 'hallazgos', hallazgoId as string);
            const hallazgoSnap = await getDoc(hallazgoRef);

            if (hallazgoSnap.exists()) {
                const data = { id: hallazgoSnap.id, ...hallazgoSnap.data() } as Hallazgo;
                setHallazgo(data);

                // Fetch obra details
                const obraRef = doc(firebaseDb, 'obras', data.obraId);
                const obraSnap = await getDoc(obraRef);
                if (obraSnap.exists()) {
                    setObra(obraSnap.data() as Obra);
                }
            }
            setLoading(false);
        };
        fetchHallazgo();
    }, [user, hallazgoId]);

    if (loading) {
        return <div className="text-center p-8"><Loader2 className="animate-spin" /> Cargando hallazgo...</div>;
    }

    if (!hallazgo) {
        return <div className="text-center text-destructive p-8">No se encontró el hallazgo.</div>;
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                 <Button asChild variant="outline" size="sm">
                    <Link href="/prevencion/hallazgos"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Listado</Link>
                </Button>
                <div>
                    <Badge className={cn(criticidadColors[hallazgo.criticidad])}>{hallazgo.criticidad}</Badge>
                     <Badge variant="outline" className="ml-2">{hallazgo.estado}</Badge>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                     <Card>
                        <CardHeader>
                            <CardTitle>{hallazgo.tipoRiesgo}</CardTitle>
                            <CardDescription>
                                Reportado por {hallazgo.createdBy} el {hallazgo.createdAt.toDate().toLocaleDateString('es-CL')} en {obra?.nombreFaena}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                             <h4 className="font-semibold mb-2">Descripción del Hallazgo</h4>
                             <p className="text-muted-foreground whitespace-pre-wrap">{hallazgo.descripcion}</p>
                             
                             <h4 className="font-semibold mt-4 mb-2">Acciones Inmediatas Tomadas</h4>
                             <p className="text-muted-foreground whitespace-pre-wrap">{hallazgo.accionesInmediatas?.[0] || "No se registraron."}</p>
                        </CardContent>
                    </Card>
                </div>
                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Evidencia</CardTitle></CardHeader>
                        <CardContent>
                           {hallazgo.evidenciaUrl ? (
                                <a href={hallazgo.evidenciaUrl} target="_blank" rel="noopener noreferrer">
                                    <ImageFromStorage storagePath={hallazgo.evidenciaUrl} />
                                </a>
                            ) : (
                                <p className="text-muted-foreground text-sm">No hay evidencia adjunta.</p>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                         <CardHeader><CardTitle>Plan de Acción</CardTitle></CardHeader>
                         <CardContent>
                             <p className="text-sm text-muted-foreground">El plan de acción para este hallazgo aún no ha sido definido.</p>
                             <Button className="w-full mt-4" disabled>Definir Plan de Acción</Button>
                         </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
