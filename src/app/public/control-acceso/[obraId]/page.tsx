// src/app/public/control-acceso/[obraId]/page.tsx
"use client";

import { useEffect, useState, FormEvent, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ArrowRight, ShieldCheck, FileText, CheckCircle, Volume2 } from 'lucide-react';
import { getDoc, doc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { PcgLogo } from '@/components/branding/PcgLogo';
import { Obra, InduccionContextualRegistro } from '@/types/pcg';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';

function ControlAccesoForm() {
    const params = useParams();
    const router = useRouter();
    const obraId = params.obraId as string;

    const [obra, setObra] = useState<Obra | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'form' | 'induction' | 'success'>('form');

    // Form fields
    const [nombre, setNombre] = useState('');
    const [rut, setRut] = useState('');
    const [empresa, setEmpresa] = useState('');
    const [motivo, setMotivo] = useState('');
    const [tipoPersona, setTipoPersona] = useState<'trabajador' | 'subcontratista' | 'visita'>('visita');
    const [duracionIngreso, setDuracionIngreso] = useState<'visita breve' | 'jornada parcial' | 'jornada completa'>('visita breve');
    const [archivo, setArchivo] = useState<File | null>(null);
    const [aceptaTerminos, setAceptaTerminos] = useState(false);
    
    // Induction state
    const [inductionData, setInductionData] = useState<Partial<InduccionContextualRegistro> & { audioUrl?: string; evidenciaId?: string } | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);

    useEffect(() => {
        if (obraId) {
            const fetchObra = async () => {
                setLoading(true);
                const obraRef = doc(firebaseDb, "obras", obraId);
                const obraSnap = await getDoc(obraRef);
                if (obraSnap.exists()) {
                    setObra({ id: obraSnap.id, ...obraSnap.data() } as Obra);
                } else {
                    setError("La obra no existe o el enlace es incorrecto.");
                }
                setLoading(false);
            };
            fetchObra();
        }
    }, [obraId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            if (e.target.files[0].size > 5 * 1024 * 1024) { // 5MB limit
                 setError('El archivo es demasiado grande. Máximo 5MB.');
                 setArchivo(null);
                 e.target.value = '';
                 return;
            }
            setArchivo(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!aceptaTerminos) {
            setError("Debe aceptar los términos para continuar.");
            return;
        }
        if (!nombre || !rut || !empresa || !motivo || !archivo) {
            setError("Todos los campos y el archivo son obligatorios.");
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('obraId', obraId);
            formData.append('nombreCompleto', nombre);
            formData.append('rut', rut);
            formData.append('empresa', empresa);
            formData.append('motivo', motivo);
            formData.append('tipoPersona', tipoPersona);
            formData.append('duracionIngreso', duracionIngreso);
            formData.append('archivo', archivo);

            const response = await fetch('/api/control-acceso/submit', {
                method: 'POST',
                body: formData,
            });
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Ocurrió un error al enviar el formulario.');
            }
            
            setInductionData({ ...result, evidenciaId: result.evidenciaId });
            setStep('induction');

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };
    
     const handleConfirmInduction = async () => {
        if (!inductionData?.evidenciaId) {
             setError("No se puede confirmar la inducción, falta el ID de evidencia.");
             return;
        }
        setIsConfirming(true);
        try {
             await fetch('/api/control-acceso/confirm', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ evidenciaId: inductionData.evidenciaId }),
            });
            setStep('success');
        } catch (err: any) {
             setError("Error al confirmar. Intenta nuevamente.");
        } finally {
             setIsConfirming(false);
        }
    };


    if (loading) {
        return <div className="text-center p-8"><Loader2 className="animate-spin" /> Cargando...</div>;
    }

    if (error && step === 'form') {
        return <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    }
    
    if (!obra) {
        return <Alert variant="destructive"><AlertTitle>Error de Configuración</AlertTitle><AlertDescription>El enlace de acceso es inválido o la obra no fue encontrada.</AlertDescription></Alert>;
    }
    
     if (step === 'induction') {
        return (
            <Card className="w-full max-w-2xl mx-auto animate-in fade-in-50">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-6 w-6 text-primary"/>
                        <CardTitle>Inducción de Seguridad Obligatoria</CardTitle>
                    </div>
                    <CardDescription>
                        Por favor, lee y/o escucha atentamente la siguiente información de seguridad antes de ingresar a la obra <strong>{obra.nombreFaena}</strong>.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-4 bg-muted border rounded-md whitespace-pre-wrap text-sm">
                        {inductionData?.inductionText || 'Cargando texto de inducción...'}
                    </div>
                    {inductionData?.audioUrl && (
                        <div>
                            <Label className="flex items-center gap-2"><Volume2 className="h-4 w-4"/> Audio de la Inducción</Label>
                            <audio controls src={inductionData.audioUrl} className="w-full mt-2">
                                Tu navegador no soporta el elemento de audio.
                            </audio>
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button onClick={handleConfirmInduction} className="w-full" disabled={isConfirming}>
                        {isConfirming ? <Loader2 className="animate-spin mr-2"/> : <CheckCircle className="mr-2"/>}
                        Declaro haber leído/escuchado y acepto los riesgos y medidas
                    </Button>
                </CardFooter>
            </Card>
        );
    }
    
    if (step === 'success') {
        return (
             <Card className="w-full max-w-lg mx-auto text-center animate-in fade-in-50">
                <CardHeader>
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4"/>
                    <CardTitle className="text-2xl">¡Registro Completado con Éxito!</CardTitle>
                    <CardDescription>
                        Tu acceso a la obra <strong>{obra.nombreFaena}</strong> ha sido registrado. Ya puedes presentarte en la portería.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <p className="text-sm text-muted-foreground">Gracias por tu cooperación.</p>
                </CardContent>
             </Card>
        );
    }

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader className="text-center">
                <div className="mx-auto w-fit mb-4"><PcgLogo /></div>
                <CardTitle className="text-2xl">Registro de Acceso a Obra</CardTitle>
                <CardDescription>Completa tus datos para ingresar a <strong>{obra.nombreFaena}</strong>.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="nombre">Nombre Completo*</Label><Input id="nombre" value={nombre} onChange={e => setNombre(e.target.value)} required /></div>
                        <div className="space-y-2"><Label htmlFor="rut">RUT*</Label><Input id="rut" value={rut} onChange={e => setRut(e.target.value)} required /></div>
                        <div className="space-y-2"><Label htmlFor="empresa">Empresa que representa*</Label><Input id="empresa" value={empresa} onChange={e => setEmpresa(e.target.value)} required /></div>
                        <div className="space-y-2"><Label htmlFor="tipoPersona">Tipo de Ingreso*</Label>
                            <Select value={tipoPersona} onValueChange={(v) => setTipoPersona(v as any)} required>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="visita">Visita</SelectItem>
                                    <SelectItem value="subcontratista">Subcontratista</SelectItem>
                                    <SelectItem value="trabajador">Trabajador</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="motivo">Motivo o Tarea a Realizar*</Label>
                        <Textarea id="motivo" value={motivo} onChange={e => setMotivo(e.target.value)} required placeholder="Ej: Visita técnica a terreno, Reunión con Jefe de Obra, Instalación de faenas eléctricas, etc." />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="duracionIngreso">Duración Estimada del Ingreso*</Label>
                        <Select value={duracionIngreso} onValueChange={(v) => setDuracionIngreso(v as any)} required>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="visita breve">Visita Breve (menos de 2 horas)</SelectItem>
                                <SelectItem value="jornada parcial">Jornada Parcial (hasta 4 horas)</SelectItem>
                                <SelectItem value="jornada completa">Jornada Completa</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="archivo">Adjuntar Cédula de Identidad (foto o PDF)*</Label>
                        <Input id="archivo" type="file" onChange={handleFileChange} required accept="image/*,application/pdf" />
                         {archivo && <p className="text-xs text-muted-foreground">Archivo: {archivo.name}</p>}
                    </div>

                    <div className="pt-4 flex items-start gap-3">
                        <Checkbox id="aceptaTerminos" checked={aceptaTerminos} onCheckedChange={(c) => setAceptaTerminos(!!c)} />
                        <Label htmlFor="aceptaTerminos" className="text-xs text-muted-foreground font-normal">
                             Declaro que la información es verídica y acepto que mis datos sean tratados según los <Link href="/terminos" target="_blank" className="text-primary underline">Términos y Condiciones</Link> de la plataforma.
                        </Label>
                    </div>

                     {error && <p className="text-sm font-medium text-destructive text-center pt-2">{error}</p>}
                    
                    <Button type="submit" disabled={isSubmitting || !aceptaTerminos} className="w-full">
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ArrowRight className="mr-2 h-4 w-4"/>}
                        {isSubmitting ? 'Procesando...' : 'Siguiente: Inducción de Seguridad'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

export default function ControlAccesoPage() {
    return (
        <div className="min-h-screen bg-muted/40 p-4 flex items-center justify-center">
            <Suspense fallback={<div className="text-center"><Loader2 className="animate-spin" /></div>}>
                <ControlAccesoForm />
            </Suspense>
        </div>
    )
}
