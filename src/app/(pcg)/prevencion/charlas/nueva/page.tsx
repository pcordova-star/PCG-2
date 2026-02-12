// src/app/(pcg)/prevencion/charlas/nueva/page.tsx
"use client";

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, Save, FileText, Info } from 'lucide-react';
import { Obra, IPERRegistro, Charla, FirmaAsistente } from '@/types/pcg';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { AsistentesCharla } from '@/components/prevencion/charlas/AsistentesCharla';
import { generarCharlaPdf } from '@/lib/pdf/generarCharlaPdf';

function NuevaCharlaPageContent() {
    const { user, companyId } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const obraIdFromQuery = searchParams.get('obraId');

    const [obra, setObra] = useState<Obra | null>(null);
    const [iperRegistros, setIperRegistros] = useState<IPERRegistro[]>([]);
    const [selectedIperId, setSelectedIperId] = useState<string | null>(null);
    
    const [charla, setCharla] = useState<Partial<Charla>>({
        titulo: '',
        contenido: '',
        estado: 'programada',
        generadaAutomaticamente: false,
    });
    const [asistentes, setAsistentes] = useState<FirmaAsistente[]>([]);

    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [savedCharla, setSavedCharla] = useState<Charla | null>(null);

    useEffect(() => {
        if (!obraIdFromQuery) return;

        const fetchObraData = async () => {
            setLoading(true);
            const obraRef = doc(firebaseDb, "obras", obraIdFromQuery);
            const obraSnap = await getDoc(obraRef);
            if (obraSnap.exists()) {
                setObra({ id: obraSnap.id, ...obraSnap.data() } as Obra);
            }

            const iperQuery = query(collection(firebaseDb, 'iperRegistros'), where('obraId', '==', obraIdFromQuery));
            const iperSnap = await getDocs(iperQuery);
            setIperRegistros(iperSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as IPERRegistro)));
            setLoading(false);
        };
        fetchObraData();
    }, [obraIdFromQuery]);
    
    useEffect(() => {
        if (!selectedIperId) return;
        const iper = iperRegistros.find(i => i.id === selectedIperId);
        if (iper) {
            setCharla(prev => ({
                ...prev,
                titulo: `Charla de Seguridad: ${iper.tarea}`,
                iperIdRelacionado: iper.id,
                tarea: iper.tarea,
                peligro: iper.peligro,
                riesgo: iper.riesgo,
                controlGenero: iper.control_especifico_genero,
                contenido: `Temas a tratar:\n- Peligro: ${iper.peligro}\n- Riesgo: ${iper.riesgo}\n- Medidas de control: ${iper.medidasControlPropuestas || 'Definidas en IPER.'}\n- Control específico de género: ${iper.control_especifico_genero || 'No aplica.'}`,
                generadaAutomaticamente: true,
            }));
        }
    }, [selectedIperId, iperRegistros]);
    
    const handleSave = async () => {
        if (!user || !companyId || !obraIdFromQuery || !charla.titulo) {
            toast({ variant: 'destructive', title: 'Faltan datos', description: 'Se requiere obra, título y usuario.' });
            return;
        }
        setIsSaving(true);
        try {
            const dataToSave: Omit<Charla, 'id'> = {
                obraId: obraIdFromQuery,
                obraNombre: obra?.nombreFaena || 'Sin nombre',
                companyId: companyId,
                iperIdRelacionado: charla.iperIdRelacionado || null,
                ...charla,
                asistentes: asistentes,
                fechaCreacion: serverTimestamp(),
                creadaPorUid: user.uid,
            } as Omit<Charla, 'id'>;

            const docRef = await addDoc(collection(firebaseDb, 'charlas'), dataToSave);
            toast({ title: 'Charla guardada con éxito' });
            setSavedCharla({ id: docRef.id, ...dataToSave } as Charla);
        } catch (error) {
            console.error("Error saving charla:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la charla.' });
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return <div className="text-center p-8"><Loader2 className="animate-spin" /> Cargando datos...</div>;
    }

    if (savedCharla) {
        return (
            <div className="space-y-6">
                <header>
                    <h1 className="text-2xl font-bold">Charla Guardada</h1>
                </header>
                <Card>
                    <CardHeader>
                        <CardTitle>Éxito: {savedCharla.titulo}</CardTitle>
                        <CardDescription>La charla ha sido guardada. Ahora puedes generar el acta en PDF o crear una nueva charla.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-4">
                        <Button onClick={() => setSavedCharla(null)}>Crear Otra Charla</Button>
                        <Button variant="outline" onClick={() => generarCharlaPdf(savedCharla, obra!)}>
                            <FileText className="mr-2 h-4 w-4" />
                            Generar Acta PDF
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
             <header className="flex items-center gap-4">
                <Button asChild variant="outline" size="sm">
                    <Link href={`/prevencion/charlas?obraId=${obraIdFromQuery}`}><ArrowLeft className="mr-2 h-4 w-4" />Volver al Listado</Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Nueva Charla de Seguridad</h1>
                    <p className="text-muted-foreground">Obra: {obra?.nombreFaena}</p>
                </div>
            </header>

             <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                    <div className="flex items-center gap-3">
                         <Info className="h-5 w-5 text-blue-700"/>
                        <CardTitle className="text-blue-900">Asistente Inteligente</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                     <Label>Usar IPER como base (opcional)</Label>
                    <Select onValueChange={setSelectedIperId}>
                        <SelectTrigger><SelectValue placeholder="Selecciona un riesgo de la matriz IPER para autocompletar..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">No usar IPER (charla manual)</SelectItem>
                            {iperRegistros.map(iper => (
                                <SelectItem key={iper.id} value={iper.id}>
                                    {`IPER-${String(iper.correlativo).padStart(3, '0')}: ${iper.tarea}`}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>1. Datos de la Charla</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2"><Label>Título de la Charla</Label><Input value={charla.titulo} onChange={e => setCharla(p => ({...p, titulo: e.target.value}))}/></div>
                    <div className="space-y-2"><Label>Contenido / Temas Tratados</Label><Textarea value={charla.contenido} onChange={e => setCharla(p => ({...p, contenido: e.target.value}))} rows={8}/></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Fecha de Realización</Label><Input type="date" value={charla.fechaRealizacion ? new Date(charla.fechaRealizacion).toISOString().slice(0, 10) : ''} onChange={e => setCharla(p => ({...p, fechaRealizacion: e.target.value ? new Date(e.target.value) : undefined}))}/></div>
                        <div className="space-y-2"><Label>Duración (minutos)</Label><Input type="number" value={charla.duracionMinutos} onChange={e => setCharla(p => ({...p, duracionMinutos: Number(e.target.value)}))}/></div>
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                 <CardHeader><CardTitle>2. Registro de Asistentes</CardTitle></CardHeader>
                 <CardContent>
                    <AsistentesCharla asistentes={asistentes} onChange={setAsistentes}/>
                 </CardContent>
            </Card>
            
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2"/>}
                    Guardar Charla y Asistencia
                </Button>
            </div>
        </div>
    );
}


export default function Page() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <NuevaCharlaPageContent />
    </Suspense>
  )
}
