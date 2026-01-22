"use client";

import { useState, FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addDoc, collection, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import { useAuth } from "@/context/AuthContext";
import { ActividadProgramada, Obra } from "../page";

interface RegistrarAvanceFormProps {
    obraId?: string;
    actividades: ActividadProgramada[];
    onAvanceRegistrado: () => void;
    allowObraSelection?: boolean;
    obras?: Obra[];
}

export default function RegistrarAvanceForm({ obraId, actividades, onAvanceRegistrado, allowObraSelection = false, obras = [] }: RegistrarAvanceFormProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [selectedObraId, setSelectedObraId] = useState(obraId || '');
    const [actividadId, setActividadId] = useState('');
    const [cantidad, setCantidad] = useState('');
    const [comentario, setComentario] = useState('');
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
      if (obraId) {
        setSelectedObraId(obraId);
      }
    }, [obraId]);

    const actividadesFiltradas = allowObraSelection ? actividades.filter(a => a.obraId === selectedObraId) : actividades;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!selectedObraId || !actividadId || !cantidad) {
            toast({ variant: 'destructive', title: 'Error', description: 'Obra, actividad y cantidad son requeridos.' });
            return;
        }

        setLoading(true);
        const cantidadNum = parseFloat(cantidad);

        try {
            const obraRef = doc(firebaseDb, "obras", selectedObraId);
            const avancesRef = collection(obraRef, "avancesDiarios");
            const actividad = actividades.find(a => a.id === actividadId);

            await runTransaction(firebaseDb, async (tx) => {
                const obraSnap = await tx.get(obraRef);
                if (!obraSnap.exists()) throw new Error("La obra no existe.");

                tx.set(doc(avancesRef), {
                    obraId: selectedObraId,
                    actividadId,
                    cantidadEjecutada: cantidadNum,
                    comentario,
                    fecha: serverTimestamp(),
                    creadoPor: { uid: user.uid, displayName: user.displayName || user.email },
                    visibleCliente: true,
                    tipoRegistro: 'CANTIDAD',
                });
                
                if (actividad && actividad.cantidad > 0) {
                     const obraData = obraSnap.data();
                    const totalActividades = actividades.length;
                    if(totalActividades > 0) {
                        const pesoActividad = 1 / totalActividades;
                        const avanceParcialActividad = (cantidadNum / actividad.cantidad);
                        const avancePonderadoDelDia = avanceParcialActividad * pesoActividad * 100;
                        if (!isNaN(avancePonderadoDelDia)) {
                            const nuevoAvanceAcumulado = Math.min(100, (obraData.avanceAcumulado || 0) + avancePonderadoDelDia);
                            tx.update(obraRef, { avanceAcumulado: nuevoAvanceAcumulado, ultimaActualizacion: serverTimestamp() });
                        }
                    }
                }
            });

            toast({ title: 'Éxito', description: 'Avance registrado correctamente.' });
            setActividadId(''); setCantidad(''); setComentario('');
            onAvanceRegistrado();
        } catch (error: any) {
            console.error("Error al registrar avance:", error);
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Registrar Avance por Cantidad</CardTitle>
                <CardDescription>Reporta la cantidad ejecutada para una actividad específica.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {allowObraSelection && (
                        <div className="space-y-2">
                            <Label htmlFor="obra-avance">Obra</Label>
                            <Select value={selectedObraId} onValueChange={setSelectedObraId}>
                                <SelectTrigger id="obra-avance"><SelectValue placeholder="Seleccione obra..." /></SelectTrigger>
                                <SelectContent>
                                    {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nombreFaena}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="actividad-avance">Actividad</Label>
                        <Select value={actividadId} onValueChange={setActividadId} disabled={!selectedObraId}>
                            <SelectTrigger id="actividad-avance"><SelectValue placeholder="Seleccione actividad..." /></SelectTrigger>
                            <SelectContent>
                                {actividadesFiltradas.map(act => <SelectItem key={act.id} value={act.id}>{act.nombreActividad}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="cantidad-avance">Cantidad Ejecutada</Label>
                        <Input id="cantidad-avance" type="number" value={cantidad} onChange={e => setCantidad(e.target.value)} placeholder={`Unidad: ${actividades.find(a => a.id === actividadId)?.unidad || ''}`} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="comentario-avance">Comentario (opcional)</Label>
                        <Textarea id="comentario-avance" value={comentario} onChange={e => setComentario(e.target.value)} />
                    </div>
                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Registrar Avance
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
