// src/app/public/control-acceso/[obraId]/page.tsx
"use client";

import { useEffect, useState, FormEvent, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Obra } from '@/types/pcg';
import { getDoc, doc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { useToast } from '@/hooks/use-toast';
import { PcgLogo } from '@/components/branding/PcgLogo';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, QrCode, Upload, FileCheck2, CameraOff, AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { QrScanner } from '@/components/auth/QrScanner';

const formSchema = z.object({
  nombreCompleto: z.string().min(5, 'El nombre completo es requerido.'),
  rut: z.string().min(8, 'El RUT es requerido.'),
  empresa: z.string().min(2, 'El nombre de la empresa es requerido.'),
  motivo: z.string().min(5, 'El motivo del ingreso es requerido.'),
  tipoPersona: z.enum(['trabajador', 'subcontratista', 'visita'], { required_error: 'Debe seleccionar un tipo.' }),
  duracionIngreso: z.enum(['visita breve', 'jornada parcial', 'jornada completa'], { required_error: 'Debe seleccionar la duración.' }),
  archivo: z.any().refine(file => file instanceof File, 'El archivo de la cédula es obligatorio.'),
});

type FormValues = z.infer<typeof formSchema>;

type Step = 'form' | 'induction' | 'success' | 'error';

function ControlAccesoForm() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const obraId = params.obraId as string;

    const [obra, setObra] = useState<Obra | null>(null);
    const [loadingObra, setLoadingObra] = useState(true);
    const [step, setStep] = useState<Step>('form');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Estados para el QR
    const [scanning, setScanning] = useState(false);
    const [scanError, setScanError] = useState<string | null>(null);

    // Estados para la inducción
    const [inductionData, setInductionData] = useState<{
        inductionText: string;
        audioUrl: string;
        evidenciaId: string;
    } | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            nombreCompleto: '',
            rut: '',
            empresa: '',
            motivo: '',
        },
    });
    const { register, handleSubmit, setValue, formState: { errors } } = form;

    useEffect(() => {
        if (obraId) {
            const fetchObra = async () => {
                const obraRef = doc(firebaseDb, "obras", obraId);
                const obraSnap = await getDoc(obraRef);
                if (obraSnap.exists()) {
                    setObra({ id: obraSnap.id, ...obraSnap.data() } as Obra);
                } else {
                    toast({ variant: 'destructive', title: 'Error', description: 'Obra no encontrada.' });
                }
                setLoadingObra(false);
            };
            fetchObra();
        }
    }, [obraId, toast]);
    
    const handleScan = (data: string | null) => {
      if (data) {
          try {
              const parts = data.split('|');
              let rut: string | undefined;
              let nombreCompleto: string | undefined;
  
              // Formato nuevo: NUMERO_DOCUMENTO||RUN|APELLIDOS|NOMBRES|...
              // Formato antiguo: RUN|PATERNO|MATERNO|NOMBRES|...
              if (parts.length > 4 && parts[1] === '') { 
                  rut = parts[2];
                  const apellidos = parts[3]; 
                  const nombres = parts[4];
                  nombreCompleto = `${nombres} ${apellidos}`.trim();
              } else if (parts.length >= 4) { 
                  rut = parts[0];
                  const nombres = parts[3];
                  const apellidoPaterno = parts[1];
                  const apellidoMaterno = parts[2];
                  nombreCompleto = `${nombres} ${apellidoPaterno} ${apellidoMaterno}`.trim();
              }
  
              if (rut && nombreCompleto) {
                  // Limpia y formatea el RUT
                  const rutLimpio = rut.replace(/\./g, '');
                  if (/^\d+[kK\d]$/.test(rutLimpio) && !rutLimpio.includes('-')) {
                      rut = rutLimpio.slice(0, -1) + '-' + rutLimpio.slice(-1);
                  }
  
                  setValue('rut', rut, { shouldValidate: true });
                  setValue('nombreCompleto', nombreCompleto, { shouldValidate: true });
  
                  toast({
                      title: "Datos Escaneados Correctamente",
                      description: "Se ha autocompletado el nombre y RUT.",
                  });
              } else {
                   toast({
                      variant: "destructive",
                      title: "QR no reconocido",
                      description: "El formato del QR no parece ser de una cédula chilena. Por favor, ingrese los datos manualmente.",
                  });
              }
          } catch (e: any) {
              console.error("Error al procesar QR:", e);
              toast({
                  variant: "destructive",
                  title: "Error al procesar",
                  description: `No se pudo interpretar el código QR. Error: ${e.message}`,
              });
          }
      }
      setScanning(false);
    };

    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        setIsSubmitting(true);
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            formData.append(key, value);
        });
        formData.append('obraId', obraId);
        
        try {
            const response = await fetch('/api/control-acceso/submit', {
                method: 'POST',
                body: formData,
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Error en el servidor');
            }
            
            setInductionData(result);
            setStep('induction');
        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: error.message });
            setStep('error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleConfirmInduction = async () => {
        if (!inductionData) return;
        setIsSubmitting(true);
        try {
            await fetch('/api/control-acceso/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ evidenciaId: inductionData.evidenciaId })
            });
            setStep('success');
        } catch (error) {
            setStep('error');
        } finally {
             setIsSubmitting(false);
        }
    };

    if (loadingObra) {
        return <div className="text-center p-8"><Loader2 className="animate-spin" /> Cargando...</div>;
    }

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader className="text-center">
                <div className="mx-auto w-fit mb-2"><PcgLogo /></div>
                <CardTitle>Control de Acceso</CardTitle>
                <CardDescription>Registro de ingreso para: {obra?.nombreFaena || 'Obra no encontrada'}</CardDescription>
            </CardHeader>
            <CardContent>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.3 }}
                    >
                        {step === 'form' && (
                             <Form {...form}>
                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                     <Button type="button" onClick={() => setScanning(true)} className="w-full" variant="outline"><QrCode className="mr-2"/> Escanear Cédula de Identidad (Recomendado)</Button>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField control={form.control} name="nombreCompleto" render={({ field }) => (
                                            <FormItem><FormLabel>Nombre Completo*</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name="rut" render={({ field }) => (
                                            <FormItem><FormLabel>RUT*</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                    </div>
                                    <FormField control={form.control} name="empresa" render={({ field }) => (
                                        <FormItem><FormLabel>Empresa*</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="motivo" render={({ field }) => (
                                        <FormItem><FormLabel>Tarea a realizar hoy*</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         <FormField control={form.control} name="tipoPersona" render={({ field }) => (
                                            <FormItem><FormLabel>Tipo de Persona*</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione..."/></SelectTrigger></FormControl><SelectContent><SelectItem value="visita">Visita</SelectItem><SelectItem value="subcontratista">Subcontratista</SelectItem><SelectItem value="trabajador">Trabajador</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name="duracionIngreso" render={({ field }) => (
                                            <FormItem><FormLabel>Duración del Ingreso*</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione..."/></SelectTrigger></FormControl><SelectContent><SelectItem value="visita breve">Visita Breve</SelectItem><SelectItem value="jornada parcial">Jornada Parcial</SelectItem><SelectItem value="jornada completa">Jornada Completa</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                                        )}/>
                                    </div>

                                    <FormField control={form.control} name="archivo" render={({ field: { onChange, value, ...rest }}) => (
                                        <FormItem>
                                            <FormLabel>Adjuntar Cédula de Identidad (foto o PDF)*</FormLabel>
                                            <FormControl>
                                                <Input type="file" accept="image/*,application/pdf" onChange={e => onChange(e.target.files?.[0])} {...rest} />
                                            </FormControl>
                                            {value && <p className="text-xs text-muted-foreground flex items-center gap-1"><FileCheck2 className="h-3 w-3 text-green-600"/>{value.name}</p>}
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Siguiente: Inducción de Seguridad</Button>
                                </form>
                            </Form>
                        )}
                        {step === 'induction' && inductionData && (
                            <div className="space-y-4">
                                <Alert variant="default" className="bg-blue-50 border-blue-200">
                                    <AlertTitle className="font-bold text-blue-800">Inducción de Seguridad Contextual (IA)</AlertTitle>
                                    <AlertDescription className="text-blue-700">Lee con atención y escucha el audio. Tu seguridad es nuestra prioridad.</AlertDescription>
                                </Alert>
                                <div className="p-4 border rounded-md max-h-60 overflow-y-auto bg-gray-50 text-sm whitespace-pre-wrap">{inductionData.inductionText}</div>
                                <audio controls src={inductionData.audioUrl} className="w-full">Tu navegador no soporta el elemento de audio.</audio>
                                <Button onClick={handleConfirmInduction} className="w-full" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Declaro haber leído y entendido la inducción</Button>
                            </div>
                        )}
                        {step === 'success' && (
                            <div className="text-center space-y-4">
                                <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                                <h3 className="text-xl font-semibold">Registro Exitoso</h3>
                                <p className="text-muted-foreground">Tu ingreso y la confirmación de la inducción han sido registrados. ¡Que tengas una jornada segura!</p>
                            </div>
                        )}
                        {step === 'error' && (
                             <div className="text-center space-y-4">
                                <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
                                <h3 className="text-xl font-semibold">Error en el Proceso</h3>
                                <p className="text-muted-foreground">Ocurrió un error al registrar tu ingreso. Por favor, intenta nuevamente o contacta al administrador de la obra.</p>
                                <Button onClick={() => setStep('form')}>Volver a Intentar</Button>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </CardContent>
            {scanning && (
                <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle>Escanear QR de Cédula</CardTitle>
                            <CardDescription>Apunta la cámara al código QR que se encuentra en la parte trasera de tu cédula de identidad.</CardDescription>
                        </CardHeader>
                        <CardContent className="aspect-square bg-gray-800 rounded-md overflow-hidden">
                             <QrScanner 
                                onDecode={handleScan}
                                onError={(e) => { console.error(e); setScanError('No se pudo iniciar la cámara. Revisa los permisos en tu navegador.'); setScanning(false); }}
                                isScanning={scanning}
                            />
                        </CardContent>
                        <CardFooter className="flex-col gap-4 pt-4">
                            {scanError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{scanError}</AlertDescription></Alert>}
                            <Button variant="outline" onClick={() => setScanning(false)} className="w-full"><CameraOff className="mr-2"/> Cancelar Escaneo</Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </Card>
    );
}

export default function Page() {
    return (
        <div className="min-h-screen bg-muted flex items-center justify-center p-4">
            <Suspense fallback={<Loader2 className="animate-spin" />}>
                <ControlAccesoForm />
            </Suspense>
        </div>
    );
}