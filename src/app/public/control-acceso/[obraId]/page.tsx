// src/app/public/control-acceso/[obraId]/page.tsx
"use client";

import React, { useState, useEffect, FormEvent, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowRight, QrCode, Upload, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getDoc, doc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Obra } from '@/types/pcg';
import { Scanner } from 'react-zxing';

type FormState = {
  nombreCompleto: string;
  rut: string;
  empresa: string;
  motivo: string;
  tipoPersona: 'visita' | 'subcontratista' | 'trabajador';
  duracionIngreso: 'visita breve' | 'jornada parcial' | 'jornada completa';
  archivo: File | null;
  aceptaTerminos: boolean;
};

const initialFormState: FormState = {
  nombreCompleto: '',
  rut: '',
  empresa: '',
  motivo: '',
  tipoPersona: 'visita',
  duracionIngreso: 'visita breve',
  archivo: null,
  aceptaTerminos: false,
};

function formatRut(rut: string): string {
    let value = rut.replace(/[^0-9kK]/g, '');
    let body = value.slice(0, -1);
    let dv = value.slice(-1).toUpperCase();
    if (body.length > 0) {
      body = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return `${body}-${dv}`;
    }
    return value;
}

function RegistroAccesoPageInner() {
    const { obraId } = useParams();
    const router = useRouter();
    const { toast } = useToast();
    
    const [obra, setObra] = useState<Obra | null>(null);
    const [loadingObra, setLoadingObra] = useState(true);
    const [formState, setFormState] = useState<FormState>(initialFormState);
    const [submissionState, setSubmissionState] = useState<'idle' | 'submitting' | 'submitted'>('idle');
    const [submissionError, setSubmissionError] = useState<string | null>(null);
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    // Estado para la inducción
    const [inductionData, setInductionData] = useState<{ text: string; audioUrl: string; evidenciaId: string } | null>(null);

    useEffect(() => {
        const fetchObra = async () => {
            if (typeof obraId !== 'string') return;
            setLoadingObra(true);
            try {
                const obraRef = doc(firebaseDb, "obras", obraId);
                const obraSnap = await getDoc(obraRef);
                if (obraSnap.exists()) {
                    setObra({ id: obraSnap.id, ...obraSnap.data() } as Obra);
                } else {
                    setSubmissionError("La obra especificada no existe.");
                }
            } catch (err) {
                setSubmissionError("No se pudieron cargar los datos de la obra.");
            } finally {
                setLoadingObra(false);
            }
        };
        fetchObra();
    }, [obraId]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: keyof FormState, value: string) => {
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormState(prev => ({ ...prev, archivo: e.target.files?.[0] || null }));
    };

    const handleScan = (result: any) => {
        if (result) {
          setIsScannerOpen(false);
          const rawText = result.getText();
          const parts = rawText.split('|');

          if(parts.length < 4) {
             toast({ variant: 'destructive', title: 'Código QR no reconocido', description: 'El formato del QR no parece ser de una cédula chilena.' });
             return;
          }

          const [run, apellidoPaterno, apellidoMaterno, nombres] = parts;
          const nombreCompleto = `${nombres} ${apellidoPaterno} ${apellidoMaterno}`;
          
          setFormState(prev => ({
            ...prev,
            nombreCompleto: nombreCompleto.trim(),
            rut: formatRut(run)
          }));
          
          toast({ title: '¡Datos escaneados!', description: 'Nombre y RUT autocompletados. Por favor, revisa antes de continuar.' });
        }
    };
    
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSubmissionError(null);

        if (!formState.aceptaTerminos) {
            setSubmissionError("Debes aceptar los términos y condiciones para continuar.");
            return;
        }
        if (!formState.archivo) {
            setSubmissionError("Debes adjuntar tu cédula de identidad para continuar.");
            return;
        }

        setSubmissionState('submitting');
        
        try {
            const formData = new FormData();
            formData.append('obraId', obraId as string);
            formData.append('nombreCompleto', formState.nombreCompleto);
            formData.append('rut', formState.rut);
            formData.append('empresa', formState.empresa);
            formData.append('motivo', formState.motivo);
            formData.append('tipoPersona', formState.tipoPersona);
            formData.append('duracionIngreso', formState.duracionIngreso);
            formData.append('archivo', formState.archivo);
            
            const response = await fetch('/api/control-acceso/submit', { method: 'POST', body: formData });
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Ocurrió un error al registrar el ingreso.');
            }
            
            setInductionData({
                text: data.inductionText,
                audioUrl: data.audioUrl,
                evidenciaId: data.evidenciaId
            });
            setSubmissionState('submitted');

        } catch (err: any) {
            setSubmissionError(err.message);
            setSubmissionState('idle');
        }
    };

    const handleConfirmInduction = async () => {
        if (!inductionData) return;
        try {
            await fetch('/api/control-acceso/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ evidenciaId: inductionData.evidenciaId })
            });
            router.push(`/public/control-acceso/finalizado`);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo confirmar la inducción.' });
        }
    };

    if (loadingObra) {
        return <div className="text-center p-8"><Loader2 className="animate-spin" /></div>;
    }
    
     if (isScannerOpen) {
        return (
            <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
                <Card className="w-full max-w-lg mx-4">
                    <CardHeader>
                        <CardTitle>Escanear Código QR</CardTitle>
                        <CardDescription>Apunta la cámara al código QR de tu cédula de identidad.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Scanner onResult={handleScan} onError={(error) => console.error(error?.message)} />
                    </CardContent>
                    <CardFooter>
                        <Button variant="outline" className="w-full" onClick={() => setIsScannerOpen(false)}>Cancelar</Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }
    
    if (submissionState === 'submitted' && inductionData) {
        return (
            <Card className="max-w-2xl mx-auto">
                 <CardHeader>
                    <CardTitle className="text-2xl">Inducción de Seguridad Obligatoria</CardTitle>
                    <CardDescription>Por favor, lee y escucha atentamente la siguiente información antes de ingresar.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 bg-muted rounded-md border text-sm max-h-60 overflow-y-auto">
                        <p className="whitespace-pre-wrap">{inductionData.text}</p>
                    </div>
                    {inductionData.audioUrl && (
                        <div>
                            <Label>Escuchar Inducción</Label>
                            <audio controls src={inductionData.audioUrl} className="w-full mt-1">Tu navegador no soporta audio.</audio>
                        </div>
                    )}
                     <div className="flex items-center space-x-2 pt-4">
                        <Checkbox id="confirm-induction" onCheckedChange={(checked) => setFormState(prev => ({...prev, aceptaTerminos: !!checked}))} />
                        <Label htmlFor="confirm-induction" className="text-sm font-normal leading-none">Declaro haber leído, entendido y aceptado la información de seguridad presentada.</Label>
                     </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleConfirmInduction} className="w-full" disabled={!formState.aceptaTerminos}>
                        Confirmar y Finalizar Registro
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="text-2xl">Registro de Acceso a {obra?.nombreFaena || 'Obra'}</CardTitle>
                <CardDescription>Completa tus datos para ingresar.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    <Button type="button" className="w-full" variant="outline" onClick={() => setIsScannerOpen(true)}>
                        <QrCode className="mr-2 h-5 w-5"/>
                        Escanear Cédula de Identidad (Recomendado)
                    </Button>

                    <div className="relative flex py-5 items-center">
                        <div className="flex-grow border-t border-muted"></div>
                        <span className="flex-shrink mx-4 text-muted-foreground text-xs">O INGRESA MANUALMENTE</span>
                        <div className="flex-grow border-t border-muted"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1"><Label htmlFor="nombreCompleto">Nombre Completo*</Label><Input id="nombreCompleto" name="nombreCompleto" value={formState.nombreCompleto} onChange={handleInputChange} required /></div>
                        <div className="space-y-1"><Label htmlFor="rut">RUT*</Label><Input id="rut" name="rut" value={formState.rut} onChange={(e) => setFormState(p => ({...p, rut: formatRut(e.target.value)}))} required /></div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1"><Label htmlFor="empresa">Empresa que representa*</Label><Input id="empresa" name="empresa" value={formState.empresa} onChange={handleInputChange} required /></div>
                        <div className="space-y-1"><Label htmlFor="tipoPersona">Tipo de Ingreso*</Label><Select name="tipoPersona" value={formState.tipoPersona} onValueChange={v => handleSelectChange('tipoPersona', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="visita">Visita</SelectItem><SelectItem value="subcontratista">Subcontratista</SelectItem><SelectItem value="trabajador">Trabajador</SelectItem></SelectContent></Select></div>
                    </div>
                    <div className="space-y-1"><Label htmlFor="motivo">Motivo o Tarea a Realizar*</Label><Textarea id="motivo" name="motivo" value={formState.motivo} onChange={handleInputChange} required placeholder="Ej: Visita técnica a terreno, Reunión con Jefe de Obra, Instalación de faenas eléctricas, etc." /></div>
                    <div className="space-y-1"><Label htmlFor="duracionIngreso">Duración Estimada del Ingreso*</Label><Select name="duracionIngreso" value={formState.duracionIngreso} onValueChange={v => handleSelectChange('duracionIngreso', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="visita breve">Visita Breve (menos de 2 horas)</SelectItem><SelectItem value="jornada parcial">Jornada Parcial (2-5 horas)</SelectItem><SelectItem value="jornada completa">Jornada Completa (+5 horas)</SelectItem></SelectContent></Select></div>
                    
                    <div className="space-y-1">
                        <Label htmlFor="archivo">Adjuntar Cédula de Identidad (foto o PDF)*</Label>
                        <Input id="archivo" name="archivo" type="file" onChange={handleFileChange} required />
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                        <Checkbox id="aceptaTerminos" checked={formState.aceptaTerminos} onCheckedChange={c => setFormState(p => ({...p, aceptaTerminos: !!c}))} />
                        <Label htmlFor="aceptaTerminos" className="text-xs">Declaro que la información es verídica y acepto los <a href="/terminos" target="_blank" className="underline">Términos y Condiciones</a>.</Label>
                    </div>

                    {submissionError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{submissionError}</AlertDescription></Alert>}

                    <Button type="submit" className="w-full" disabled={submissionState === 'submitting' || !formState.aceptaTerminos}>
                        {submissionState === 'submitting' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ArrowRight className="mr-2 h-4 w-4"/>}
                        {submissionState === 'submitting' ? 'Procesando...' : 'Siguiente: Inducción de Seguridad'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

export default function RegistroAccesoPage() {
    return (
        <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
            <Suspense fallback={<Loader2 className="animate-spin" />}>
                <RegistroAccesoPageInner />
            </Suspense>
        </div>
    );
}