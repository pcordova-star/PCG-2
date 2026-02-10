// src/app/public/control-acceso/[obraId]/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, QrCode, Upload, User, Building, Pencil, FileText, Play, CheckCircle, Volume2, AlertTriangle, Video, VideoOff } from 'lucide-react';
import jsQR from 'jsqr';
import { PcgLogo } from '@/components/branding/PcgLogo';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Obra } from '@/types/pcg';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type FormState = {
  nombreCompleto: string;
  rut: string;
  empresa: string;
  motivo: string;
  tipoPersona: 'trabajador' | 'subcontratista' | 'visita';
  duracionIngreso: 'visita breve' | 'jornada parcial' | 'jornada completa';
};

type InductionData = {
  inductionText: string;
  audioUrl: string;
  evidenciaId: string;
};

export default function AccesoPage() {
  const params = useParams();
  const { toast } = useToast();
  const obraId = params.obraId as string;

  const [form, setForm] = useState<FormState>({
    nombreCompleto: '', rut: '', empresa: '', motivo: '',
    tipoPersona: 'visita', duracionIngreso: 'visita breve'
  });
  const [archivo, setArchivo] = useState<File | null>(null);
  const [obra, setObra] = useState<Obra | null>(null);

  const [step, setStep] = useState<'form' | 'submitting' | 'induction' | 'success'>('form');
  const [inductionData, setInductionData] = useState<InductionData | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (obraId) {
      getDoc(doc(firebaseDb, "obras", obraId)).then(snap => {
        if (snap.exists()) setObra({ id: snap.id, ...snap.data() } as Obra);
      });
    }
  }, [obraId]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setArchivo(e.target.files?.[0] || null);
  };
  
  const handleScanClick = async () => {
    setIsScanning(true);
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        setHasCameraPermission(true);
        if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
        setHasCameraPermission(false);
        setIsScanning(false);
        toast({ variant: 'destructive', title: 'Error de cámara', description: 'No se pudo acceder a la cámara. Revisa los permisos en tu navegador.' });
    }
  };

  const scanQrCode = useCallback(() => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
            const data = code.data;
            if (data.includes('|')) { // Heurística para CI chileno
                const parts = data.split('|');
                const rut = parts[0];
                const nombre = parts[3];
                const apellidoPaterno = parts[1];
                const apellidoMaterno = parts[2];
                const nombreCompleto = `${nombre} ${apellidoPaterno} ${apellidoMaterno}`.trim();
                
                setForm(prev => ({ ...prev, nombreCompleto, rut }));
                toast({ title: 'Datos escaneados', description: `RUT y nombre autocompletados.` });
            }
            setIsScanning(false);
        }
    }
    if (isScanning) {
        requestAnimationFrame(scanQrCode);
    }
  }, [isScanning, toast]);

  useEffect(() => {
      let animationFrameId: number;
      if (isScanning) {
          animationFrameId = requestAnimationFrame(scanQrCode);
      }
      return () => {
          if (animationFrameId) cancelAnimationFrame(animationFrameId);
          if (videoRef.current?.srcObject) {
              (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
          }
      }
  }, [isScanning, scanQrCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obraId) return;
    if (!form.rut || !form.nombreCompleto || !form.empresa || !form.motivo) {
        toast({ variant: 'destructive', title: 'Campos requeridos', description: 'Por favor, completa todos los campos del formulario.'});
        return;
    }

    setStep('submitting');
    
    const formData = new FormData();
    formData.append('obraId', obraId);
    Object.entries(form).forEach(([key, value]) => formData.append(key, value));
    if (archivo) formData.append('archivo', archivo);

    try {
        const response = await fetch('/api/control-acceso/submit', { method: 'POST', body: formData });
        const result = await response.json();

        if (!response.ok) throw new Error(result.error || 'Error en el servidor');
        
        setInductionData(result);
        setStep('induction');

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error al enviar', description: error.message });
        setStep('form');
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
          setStep('success');
      } catch (error) {
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudo confirmar la inducción.' });
      }
  };


  return (
    <div className="w-full max-w-2xl mx-auto">
        <div className="mx-auto w-fit mb-6">
            <PcgLogo size={80} />
        </div>

      {step === 'form' && (
        <Card>
          <CardHeader>
            <CardTitle>Registro de Acceso a Obra</CardTitle>
            <CardDescription>Obra: {obra?.nombreFaena || 'Cargando...'}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label htmlFor="rut">RUT*</Label><Input id="rut" name="rut" value={form.rut} onChange={handleFormChange} /></div>
                    <div className="space-y-2"><Label htmlFor="nombreCompleto">Nombre Completo*</Label><Input id="nombreCompleto" name="nombreCompleto" value={form.nombreCompleto} onChange={handleFormChange} /></div>
                </div>
                 <Button type="button" variant="outline" className="w-full" onClick={handleScanClick}><QrCode className="mr-2"/> Escanear Cédula de Identidad (Recomendado)</Button>
                
                <div className="space-y-2"><Label htmlFor="empresa">Empresa*</Label><Input id="empresa" name="empresa" value={form.empresa} onChange={handleFormChange} /></div>
                <div className="space-y-2"><Label htmlFor="motivo">Motivo/Tarea a Realizar Hoy*</Label><Textarea id="motivo" name="motivo" value={form.motivo} onChange={handleFormChange} /></div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-2"><Label>Tipo de Persona*</Label><Select name="tipoPersona" value={form.tipoPersona} onValueChange={(v) => setForm(p=>({...p, tipoPersona: v as any}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="visita">Visita</SelectItem><SelectItem value="subcontratista">Subcontratista</SelectItem><SelectItem value="trabajador">Trabajador</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label>Duración del Ingreso*</Label><Select name="duracionIngreso" value={form.duracionIngreso} onValueChange={(v) => setForm(p=>({...p, duracionIngreso: v as any}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="visita breve">Visita Breve</SelectItem><SelectItem value="jornada parcial">Jornada Parcial</SelectItem><SelectItem value="jornada completa">Jornada Completa</SelectItem></SelectContent></Select></div>
                </div>
                
                 <div className="space-y-2">
                    <Label htmlFor="archivo" className="text-muted-foreground">(Alternativo) Adjuntar Cédula de Identidad (foto o PDF)</Label>
                    <Input id="archivo" type="file" onChange={handleFileChange} />
                </div>
              <Button type="submit" className="w-full">Siguiente: Inducción de Seguridad</Button>
            </form>
          </CardContent>
        </Card>
      )}

       {isScanning && (
            <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4">
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <CardTitle>Escanear Código QR de la Cédula</CardTitle>
                        <CardDescription>Apunta con la cámara al código QR en la parte trasera de tu carnet.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         {hasCameraPermission === false ? (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Permiso de Cámara Denegado</AlertTitle>
                                <AlertDescription>
                                    Debes permitir el acceso a la cámara en la configuración de tu navegador para usar el escáner.
                                </AlertDescription>
                            </Alert>
                         ) : (
                            <div className="relative w-full aspect-video bg-black rounded-md overflow-hidden">
                                <video ref={videoRef} playsInline autoPlay className="w-full h-full object-cover"/>
                                <canvas ref={canvasRef} className="hidden" />
                                <div className="absolute inset-0 border-8 border-white/30 rounded-lg" />
                            </div>
                         )}
                    </CardContent>
                     <CardFooter className="flex-col gap-2">
                        <Button variant="secondary" className="w-full" onClick={() => setIsScanning(false)}>Cancelar</Button>
                        <p className="text-xs text-muted-foreground">El escaneo es local y no guarda imágenes.</p>
                     </CardFooter>
                </Card>
            </div>
        )}

      {step === 'submitting' && (
        <Card className="text-center p-8"><Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" /><p className="mt-4 font-semibold">Generando inducción con IA...</p></Card>
      )}
      
      {step === 'induction' && inductionData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Inducción de Seguridad Contextual</CardTitle>
            <CardDescription>Por favor, lee y escucha atentamente antes de continuar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-muted rounded-lg border max-h-60 overflow-y-auto">
              <p className="text-sm whitespace-pre-wrap">{inductionData.inductionText}</p>
            </div>
            {inductionData.audioUrl && (
              <div>
                <Label>Escuchar Inducción</Label>
                <audio controls src={inductionData.audioUrl} className="w-full mt-2">Tu navegador no soporta audio.</audio>
              </div>
            )}
            <Button onClick={handleConfirmInduction} className="w-full"><CheckCircle className="mr-2"/> Declaro haber leído y entendido la inducción</Button>
          </CardContent>
        </Card>
      )}

      {step === 'success' && (
        <Card className="text-center p-8">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4"/>
          <CardTitle className="text-2xl">¡Registro Exitoso!</CardTitle>
          <CardDescription>Tu ingreso ha sido registrado y la inducción confirmada. Ya puedes ingresar a la obra.</CardDescription>
        </Card>
      )}

    </div>
  );
}