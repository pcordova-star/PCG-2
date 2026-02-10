// src/app/public/control-acceso/[obraId]/page.tsx
"use client";

import { useEffect, useState, FormEvent, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Obra } from '@/types/pcg';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mic, Play, Pause, AlertTriangle, ShieldCheck } from 'lucide-react';
import { PcgLogo } from '@/components/branding/PcgLogo';
import { Textarea } from '@/components/ui/textarea';

function AccessForm() {
    const params = useParams();
    const router = useRouter();
    const obraId = params.obraId as string;
    const { toast } = useToast();

    const [obra, setObra] = useState<Obra | null>(null);
    const [loadingObra, setLoadingObra] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Estados del resultado de la IA
    const [inductionStep, setInductionStep] = useState(false);
    const [inductionText, setInductionText] = useState('');
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [evidenciaId, setEvidenciaId] = useState<string | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);

    const [formData, setFormData] = useState({
        nombreCompleto: '',
        rut: '',
        empresa: '',
        motivo: '',
        archivo: null as File | null,
        tipoPersona: 'visita' as 'trabajador' | 'subcontratista' | 'visita',
        duracionIngreso: 'visita breve' as 'visita breve' | 'jornada parcial' | 'jornada completa',
    });

    useEffect(() => {
        if (obraId) {
            const fetchObra = async () => {
                setLoadingObra(true);
                const obraRef = doc(firebaseDb, "obras", obraId);
                const obraSnap = await getDoc(obraRef);
                if (obraSnap.exists()) {
                    setObra({ id: obraSnap.id, ...obraSnap.data() } as Obra);
                } else {
                    setError("La obra no fue encontrada o el enlace es incorrecto.");
                }
                setLoadingObra(false);
            };
            fetchObra();
        }
    }, [obraId]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };
    
    const handleSelectChange = (name: 'tipoPersona' | 'duracionIngreso', value: string) => {
        setFormData(prev => ({...prev, [name]: value as any}));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData(prev => ({...prev, archivo: e.target.files![0]}));
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!formData.archivo) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debes adjuntar el archivo de tu carnet de identidad.' });
            return;
        }

        setIsSubmitting(true);
        setError(null);
        
        try {
            const formPayload = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                if (value) formPayload.append(key, value);
            });
            formPayload.append('obraId', obraId);

            const response = await fetch('/api/control-acceso/submit', {
                method: 'POST',
                body: formPayload,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Ocurrió un error en el servidor.");
            }
            
            setInductionText(result.inductionText);
            setAudioUrl(result.audioUrl);
            setEvidenciaId(result.evidenciaId);
            setInductionStep(true);

        } catch (err: any) {
            console.error("Error en el registro:", err);
            setError(err.message || 'No se pudo completar el registro. Intenta nuevamente.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleConfirmation = async () => {
        if (!evidenciaId) return;
        setIsConfirming(true);
        try {
            await fetch('/api/control-acceso/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ evidenciaId }),
            });
            // La redirección ocurrirá después de mostrar el mensaje final.
            router.push(`/public/control-acceso/exito?obraNombre=${encodeURIComponent(obra?.nombreFaena || '')}`);
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo confirmar la inducción.' });
        } finally {
            setIsConfirming(false);
        }
    }

    if (loadingObra) {
        return <div className="text-center p-8"><Loader2 className="animate-spin" /> Cargando información de la obra...</div>;
    }

    if (error) {
        return <div className="text-center p-8 text-destructive bg-destructive/10 rounded-md">{error}</div>;
    }
    
    if (inductionStep) {
        return (
             <Card className="w-full max-w-lg mx-auto">
                <CardHeader className="text-center">
                    <Mic className="mx-auto h-10 w-10 text-primary mb-2"/>
                    <CardTitle>Inducción de Seguridad Contextual</CardTitle>
                    <CardDescription>Escucha atentamente las siguientes indicaciones para un ingreso seguro.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {audioUrl && (
                        <div className="flex justify-center">
                            <audio src={audioUrl} controls autoPlay onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} className="w-full">
                                Tu navegador no soporta el elemento de audio.
                            </audio>
                        </div>
                    )}
                    <div className="p-4 bg-muted rounded-md border text-sm text-muted-foreground whitespace-pre-wrap max-h-60 overflow-y-auto">
                        {inductionText || "Cargando texto de la inducción..."}
                    </div>
                </CardContent>
                 <CardFooter className="flex-col gap-4">
                    <Button onClick={handleConfirmation} disabled={isConfirming} className="w-full bg-green-600 hover:bg-green-700">
                        {isConfirming ? <Loader2 className="animate-spin mr-2"/> : <ShieldCheck className="mr-2"/>}
                        {isConfirming ? 'Confirmando...' : 'Declaro haber leído y entendido'}
                    </Button>
                     <p className="text-xs text-muted-foreground text-center">Al confirmar, se registrará tu ingreso y la aceptación de esta inducción.</p>
                </CardFooter>
            </Card>
        )
    }

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
                <div className="mx-auto w-fit"><PcgLogo /></div>
                <h1 className="text-2xl font-bold">Auto-Registro de Ingreso a Obra</h1>
                <p className="text-muted-foreground">Estás ingresando a la obra: <strong className="text-foreground">{obra?.nombreFaena}</strong></p>
            </div>
             <Card>
                <CardHeader>
                     <div className="flex items-start gap-4">
                        <AlertTriangle className="h-8 w-8 text-amber-500 mt-1 flex-shrink-0"/>
                        <div>
                            <CardTitle>Declaración de Ingreso Seguro</CardTitle>
                            <CardDescription>
                                Completa este formulario para declarar tu tarea. Se generará una micro-inducción de seguridad con IA basada en tu declaración.
                            </CardDescription>
                        </div>
                     </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="nombreCompleto">Nombre Completo*</Label>
                                <Input id="nombreCompleto" name="nombreCompleto" value={formData.nombreCompleto} onChange={handleInputChange} required />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="rut">RUT*</Label>
                                <Input id="rut" name="rut" value={formData.rut} onChange={handleInputChange} required />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="empresa">Empresa a la que pertenece*</Label>
                            <Input id="empresa" name="empresa" value={formData.empresa} onChange={handleInputChange} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="motivo">Tarea específica a realizar hoy*</Label>
                            <Textarea id="motivo" name="motivo" value={formData.motivo} onChange={handleInputChange} required placeholder="Ej: 'Instalación de faena eléctrica', 'Revisión de planos de arquitectura', 'Despacho de hormigón para losa'."/>
                            <p className="text-xs text-muted-foreground">Sé lo más específico posible. Tu inducción se basará en esto.</p>
                        </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="tipoPersona">Tipo de Persona</Label>
                                <Select name="tipoPersona" value={formData.tipoPersona} onValueChange={(v) => handleSelectChange('tipoPersona', v)}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="visita">Visita</SelectItem>
                                        <SelectItem value="subcontratista">Subcontratista</SelectItem>
                                        <SelectItem value="trabajador">Trabajador Interno</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="duracionIngreso">Duración Estimada</Label>
                                <Select name="duracionIngreso" value={formData.duracionIngreso} onValueChange={(v) => handleSelectChange('duracionIngreso', v)}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="visita breve">Visita Breve (menos de 2 hrs)</SelectItem>
                                        <SelectItem value="jornada parcial">Jornada Parcial (2-4 hrs)</SelectItem>
                                        <SelectItem value="jornada completa">Jornada Completa</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="archivo">Adjuntar Cédula de Identidad (foto o PDF)*</Label>
                            <Input id="archivo" name="archivo" type="file" onChange={handleFileChange} required accept="image/*,application/pdf"/>
                        </div>

                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            {isSubmitting ? 'Procesando...' : 'Registrar y Generar Inducción'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="text-center p-8"><Loader2 className="animate-spin" /></div>}>
            <AccessForm />
        </Suspense>
    )
}
