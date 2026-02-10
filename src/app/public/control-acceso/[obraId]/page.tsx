// src/app/public/control-acceso/[obraId]/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Camera, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PcgLogo } from '@/components/branding/PcgLogo';
import { useZxing } from 'react-zxing';
import jsQR from 'jsqr';

// Componente de éxito
const SuccessDisplay = ({ onReset }: { onReset: () => void }) => (
    <div className="text-center space-y-4 py-8">
        <ShieldCheck className="mx-auto h-16 w-16 text-green-500" />
        <h2 className="text-2xl font-bold">¡Registro Exitoso!</h2>
        <p className="text-muted-foreground">Tu ingreso ha sido registrado correctamente. Ya puedes acceder a la faena.</p>
        <Button onClick={onReset}>Registrar a otra persona</Button>
    </div>
);

// Componente para mostrar la inducción
const InductionDisplay = ({ inductionText, audioUrl, onConfirm, onSkip, isConfirming }: { inductionText: string; audioUrl: string | null; onConfirm: () => void; onSkip: () => void; isConfirming: boolean }) => (
    <div className="space-y-6 py-4">
        <div className="text-center">
            <h2 className="text-xl font-bold">Inducción de Seguridad Requerida</h2>
            <p className="text-muted-foreground">Por favor, lee y/o escucha atentamente las siguientes indicaciones de seguridad antes de ingresar.</p>
        </div>
        <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4 space-y-4">
                {audioUrl && (
                    <audio controls src={audioUrl} className="w-full">Tu navegador no soporta el elemento de audio.</audio>
                )}
                <div className="max-h-60 overflow-y-auto p-3 bg-background rounded-md border text-sm whitespace-pre-wrap">
                    {inductionText}
                </div>
            </CardContent>
        </Card>
        <div className="flex flex-col gap-2">
            <Button onClick={onConfirm} disabled={isConfirming} size="lg">
                {isConfirming ? <Loader2 className="animate-spin mr-2"/> : <ShieldCheck className="mr-2"/>}
                Declaro haber leído/escuchado y acepto las condiciones
            </Button>
            <Button onClick={onSkip} variant="link" className="text-xs text-muted-foreground">Omitir y finalizar registro</Button>
        </div>
    </div>
);

// Componente principal
export default function AccesoObraPage() {
    const params = useParams();
    const router = useRouter();
    const obraId = params.obraId as string;
    const { toast } = useToast();

    const [nombreCompleto, setNombreCompleto] = useState('');
    const [rut, setRut] = useState('');
    const [empresa, setEmpresa] = useState('');
    const [motivo, setMotivo] = useState('');
    const [tipoPersona, setTipoPersona] = useState('');
    const [duracionIngreso, setDuracionIngreso] = useState('');
    const [archivo, setArchivo] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Estado del flujo
    const [formStep, setFormStep] = useState<'form' | 'induction' | 'success'>('form');
    const [inductionData, setInductionData] = useState<{ text: string, audioUrl: string | null } | null>(null);
    const [evidenciaId, setEvidenciaId] = useState<string | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);
    
    // Estados para el escáner
    const [showScanner, setShowScanner] = useState(false);
    const { ref } = useZxing({
        onDecodeResult: (result) => {
          handleScan(result.getText());
        },
        timeBetweenDecodingAttempts: 300,
      });

    const handleScan = (text: string) => {
        try {
            const parts = text.split('|');
            // Formatos conocidos: RUN|Apellido1|Apellido2|Nombres|... ó RUN|...|Nombres|Apellido1|Apellido2
            // El nombre completo está en la posición 3 o en la 2
            const run = parts[0];
            let nombre = 'No encontrado';
            
            if (parts.length > 3) {
                 // Formato: 12345678-9|APELLIDO1|APELLIDO2|NOMBRES|...
                const nombres = parts[3];
                const apellido1 = parts[1];
                const apellido2 = parts[2];
                nombre = `${nombres} ${apellido1} ${apellido2}`.trim();
            }

            if(nombre === 'No encontrado' && parts.length > 2) {
                 // Intentar otro formato común
                 const nombresAlt = parts[2];
                 const apellido1Alt = parts[parts.length - 3];
                 const apellido2Alt = parts[parts.length - 2];
                 if(nombresAlt && apellido1Alt) {
                    nombre = `${nombresAlt} ${apellido1Alt} ${apellido2Alt || ''}`.trim();
                 }
            }
            
            if (run && nombre !== 'No encontrado') {
                const formattedRut = run.includes('-') ? run : `${run.slice(0, -1)}-${run.slice(-1)}`;
                setRut(formattedRut);
                setNombreCompleto(nombre.replace(/\s+/g, ' '));
                setShowScanner(false);
                toast({ title: "Datos escaneados", description: "El nombre y RUT han sido autocompletados." });
            } else {
                 toast({ variant: 'destructive', title: "QR no reconocido", description: "El formato del QR no es el de una cédula chilena."});
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Error de Escaneo", description: "No se pudo interpretar el código QR." });
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!obraId || !nombreCompleto || !rut || !empresa || !motivo || !tipoPersona || !duracionIngreso || !archivo) {
            toast({ variant: "destructive", title: "Faltan campos", description: "Por favor, complete todos los campos obligatorios." });
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('obraId', obraId);
            formData.append('nombreCompleto', nombreCompleto);
            formData.append('rut', rut);
            formData.append('empresa', empresa);
            formData.append('motivo', motivo);
            formData.append('tipoPersona', tipoPersona);
            formData.append('duracionIngreso', duracionIngreso);
            formData.append('archivo', archivo);

            const res = await fetch('/api/control-acceso/submit', { method: 'POST', body: formData });
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.error || "Error en el servidor.");
            }
            
            if (data.inductionText) {
                setInductionData({ text: data.inductionText, audioUrl: data.audioUrl });
                setEvidenciaId(data.evidenciaId);
                setFormStep('induction');
            } else {
                // Si la IA falló pero el registro fue exitoso
                 toast({ title: "Registro exitoso", description: "La inducción de IA no está disponible en este momento."});
                setFormStep('success');
            }

        } catch (error: any) {
            toast({ variant: "destructive", title: "Error en el registro", description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmInduction = async () => {
        if (!evidenciaId) return;
        setIsConfirming(true);
        try {
            await fetch('/api/control-acceso/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ evidenciaId }),
            });
            setFormStep('success');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo confirmar la inducción.' });
        } finally {
            setIsConfirming(false);
        }
    };
    
    const handleReset = () => {
        setNombreCompleto(''); setRut(''); setEmpresa(''); setMotivo('');
        setTipoPersona(''); setDuracionIngreso(''); setArchivo(null);
        setFormStep('form'); setInductionData(null); setEvidenciaId(null);
    }
    
    if (showScanner) {
        return (
            <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-4">
                <video ref={ref} className="w-full max-w-md rounded-lg border-4 border-primary" />
                <p className="text-white mt-4 text-center">Apunte la cámara al código QR de la parte trasera de su cédula de identidad.</p>
                <Button onClick={() => setShowScanner(false)} variant="secondary" className="mt-6">Cancelar Escaneo</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4">
                        <PcgLogo />
                    </div>
                    <CardTitle>Inducción de Acceso a Faena</CardTitle>
                    <CardDescription>Complete el formulario para registrar su ingreso.</CardDescription>
                </CardHeader>
                <CardContent>
                    {formStep === 'form' && (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Nombre Completo*</Label><Input value={nombreCompleto} onChange={(e) => setNombreCompleto(e.target.value)} required /></div>
                                <div className="space-y-2"><Label>RUT*</Label><Input value={rut} onChange={(e) => setRut(e.target.value)} required /></div>
                            </div>
                             <Button type="button" variant="outline" className="w-full" onClick={() => setShowScanner(true)}>
                                <Camera className="mr-2 h-4 w-4"/> Escanear Cédula de Identidad (Autocompletar)
                            </Button>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Empresa*</Label><Input value={empresa} onChange={(e) => setEmpresa(e.target.value)} required /></div>
                                <div className="space-y-2"><Label>Tipo de Persona*</Label><Select value={tipoPersona} onValueChange={setTipoPersona} required><SelectTrigger><SelectValue placeholder="Seleccione..."/></SelectTrigger><SelectContent><SelectItem value="trabajador">Trabajador</SelectItem><SelectItem value="subcontratista">Subcontratista</SelectItem><SelectItem value="visita">Visita</SelectItem></SelectContent></Select></div>
                            </div>
                            <div className="space-y-2"><Label>Motivo del ingreso o tarea a realizar*</Label><Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} required /></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Duración del Ingreso*</Label><Select value={duracionIngreso} onValueChange={setDuracionIngreso} required><SelectTrigger><SelectValue placeholder="Seleccione..."/></SelectTrigger><SelectContent><SelectItem value="visita breve">Visita Breve (menos de 2 hrs)</SelectItem><SelectItem value="jornada parcial">Jornada Parcial (2-4 hrs)</SelectItem><SelectItem value="jornada completa">Jornada Completa</SelectContent></Select></div>
                                <div className="space-y-2"><Label>Adjuntar Cédula de Identidad (foto o PDF)*</Label><Input type="file" onChange={(e) => setArchivo(e.target.files?.[0] || null)} required accept="image/*,application/pdf" /></div>
                            </div>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : null}
                                {isSubmitting ? "Procesando..." : "Registrar y Continuar a Inducción"}
                            </Button>
                        </form>
                    )}
                    {formStep === 'induction' && inductionData && (
                        <InductionDisplay 
                            inductionText={inductionData.text} 
                            audioUrl={inductionData.audioUrl}
                            onConfirm={handleConfirmInduction}
                            onSkip={() => setFormStep('success')}
                            isConfirming={isConfirming}
                        />
                    )}
                    {formStep === 'success' && <SuccessDisplay onReset={handleReset} />}
                </CardContent>
            </Card>
        </div>
    );
}