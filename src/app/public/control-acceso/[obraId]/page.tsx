
"use client";

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useZxing } from 'react-zxing';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input';
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, QrCode, Upload, ShieldCheck, X } from 'lucide-react';
import { getDoc, doc } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import { Obra } from "@/types/pcg";
import { PcgLogo } from '@/components/branding/PcgLogo';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

function PublicAccessPageInner() {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const obraId = searchParams.get('obraId') || '';
  
  const [obra, setObra] = useState<Obra | null>(null);
  const [loadingObra, setLoadingObra] = useState(true);
  
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    rut: '',
    empresa: '',
    motivo: '',
    tipoPersona: 'visita' as 'trabajador' | 'subcontratista' | 'visita',
    duracionIngreso: 'visita breve' as 'visita breve' | 'jornada parcial' | 'jornada completa',
  });
  const [file, setFile] = useState<File | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [inductionData, setInductionData] = useState<{ text: string | null; audioUrl: string | null; evidenciaId: string | null; } | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);

  const { ref } = useZxing({
    onResult(result) {
      handleScan(result.getText());
    },
    onError(error) {
      console.error('Scanner Error:', error);
      toast({
        variant: 'destructive',
        title: 'Error del Escáner',
        description: 'No se pudo iniciar la cámara. Revisa los permisos en tu navegador.',
      });
      setShowScanner(false);
    }
  });

  useEffect(() => {
    if (obraId) {
      const fetchObra = async () => {
        setLoadingObra(true);
        const obraRef = doc(firebaseDb, "obras", obraId);
        const snap = await getDoc(obraRef);
        if (snap.exists()) {
          setObra({ id: snap.id, ...snap.data() } as Obra);
        } else {
          setError("La obra no fue encontrada o el enlace es incorrecto.");
        }
        setLoadingObra(false);
      };
      fetchObra();
    } else {
      setError("No se especificó una obra en el enlace.");
      setLoadingObra(false);
    }
  }, [obraId]);

  const handleScan = (text: string) => {
    try {
      const parts = text.split('_');
      const rutCompleto = parts.find(p => p.startsWith("RUN"));
      const nombres = parts.find(p => p.startsWith("Nombres"));
      const apellidoPaterno = parts.find(p => p.startsWith("Apellido Paterno"));

      if (!rutCompleto || !nombres || !apellidoPaterno) {
        throw new Error("Formato de QR no reconocido.");
      }

      const rut = rutCompleto.substring(3).replace(/\./g, '');
      const nombre = `${nombres.substring(7)} ${apellidoPaterno.substring(16)}`.trim();
      
      const formatRut = (r: string) => {
        if (!r || r.length < 2) return r;
        const body = r.slice(0, -1);
        const dv = r.slice(-1).toUpperCase();
        return `${body.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.')}-${dv}`;
      };

      setFormData(prev => ({ ...prev, nombreCompleto: nombre, rut: formatRut(rut) }));
      toast({
        title: "Datos Extraídos",
        description: "Nombre y RUT autocompletados desde la cédula.",
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Error de Escaneo',
        description: 'No se pudo leer el QR. Asegúrate de que es una cédula chilena válida y prueba de nuevo.'
      });
    } finally {
      setShowScanner(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!obraId) return;

    if (!file) {
      setError("Por favor, adjunta una foto o copia de tu cédula de identidad.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const data = new FormData();
    data.append('obraId', obraId);
    data.append('nombreCompleto', formData.nombreCompleto);
    data.append('rut', formData.rut);
    data.append('empresa', formData.empresa);
    data.append('motivo', formData.motivo);
    data.append('tipoPersona', formData.tipoPersona);
    data.append('duracionIngreso', formData.duracionIngreso);
    data.append('archivo', file);

    try {
      const res = await fetch('/api/control-acceso/submit', { method: 'POST', body: data });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Ocurrió un error en el servidor.');
      }
      
      setInductionData({
        text: result.inductionText,
        audioUrl: result.audioUrl,
        evidenciaId: result.evidenciaId
      });
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleConfirmInduction = async () => {
    if (!inductionData?.evidenciaId) return;
    try {
        await fetch('/api/control-acceso/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ evidenciaId: inductionData.evidenciaId })
        });
        toast({
            title: "Confirmación Enviada",
            description: "Tu ingreso ha sido registrado con éxito."
        });
        // Reset a estado final
        setInductionData({ text: 'CONFIRMADO', audioUrl: null, evidenciaId: null });

    } catch (error) {
        console.error("Error confirmando inducción", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar tu confirmación.' });
    }
  };

  if (loadingObra) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (error && !obra) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Error de Acceso</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (inductionData) {
     return (
        <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl">
                 <CardHeader className="text-center">
                    <PcgLogo />
                    <CardTitle className="text-2xl pt-4">Inducción de Seguridad</CardTitle>
                    <CardDescription>Lee con atención y confirma para completar tu ingreso.</CardDescription>
                </CardHeader>
                <CardContent>
                    {inductionData.text === 'CONFIRMADO' ? (
                        <div className="text-center space-y-4 py-8">
                            <ShieldCheck className="h-16 w-16 text-green-500 mx-auto animate-pulse" />
                            <h3 className="text-xl font-semibold">¡Registro de Ingreso Exitoso!</h3>
                            <p className="text-muted-foreground">Tu acceso ha sido confirmado. Puedes cerrar esta ventana.</p>
                        </div>
                    ) : inductionData.text ? (
                        <div className="space-y-4">
                            <div className="max-h-60 overflow-y-auto p-4 bg-slate-100 rounded-md border text-sm whitespace-pre-wrap">
                                {inductionData.text}
                            </div>
                            {inductionData.audioUrl && (
                                <audio controls src={inductionData.audioUrl} className="w-full">
                                    Tu navegador no soporta el elemento de audio.
                                </audio>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <h3 className="text-lg font-semibold">Registro Base Completado</h3>
                            <p className="text-muted-foreground">No se generó una inducción de IA para esta tarea. Tu ingreso ha sido registrado de todas formas.</p>
                        </div>
                    )}
                </CardContent>
                {inductionData.text !== 'CONFIRMADO' && (
                    <CardFooter>
                        <Button className="w-full" onClick={handleConfirmInduction}>
                            Declaro haber leído y comprendido la inducción
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      {showScanner && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4">
            <p className="text-white mb-4">Apunta la cámara al código QR de la cédula</p>
            <div className="w-full max-w-md bg-black rounded-lg overflow-hidden shadow-2xl">
                <video ref={ref} className="w-full h-auto" />
            </div>
            <Button variant="secondary" onClick={() => setShowScanner(false)} className="mt-6">
                <X className="mr-2 h-4 w-4"/>
                Cancelar
            </Button>
        </div>
      )}
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
            <div className="mx-auto mb-4">
                <PcgLogo />
            </div>
          <CardTitle className="text-2xl">Registro de Acceso a Obra</CardTitle>
          <CardDescription>Obra: {obra?.nombreFaena}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label>Datos Personales</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border rounded-md">
                     <div className="space-y-2 sm:col-span-2">
                         <Button type="button" onClick={() => setShowScanner(true)} className="w-full">
                            <QrCode className="mr-2" />
                            Escanear Cédula de Identidad (Autocompletar)
                        </Button>
                    </div>
                    <div className="space-y-2"><Label htmlFor="nombreCompleto">Nombre Completo*</Label><Input id="nombreCompleto" name="nombreCompleto" value={formData.nombreCompleto} onChange={handleFormChange} required /></div>
                    <div className="space-y-2"><Label htmlFor="rut">RUT*</Label><Input id="rut" name="rut" value={formData.rut} onChange={handleFormChange} required /></div>
                </div>
            </div>

            <div className="space-y-2">
                 <Label>Datos del Ingreso</Label>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border rounded-md">
                    <div className="space-y-2"><Label htmlFor="empresa">Empresa*</Label><Input id="empresa" name="empresa" value={formData.empresa} onChange={handleFormChange} required /></div>
                    <div className="space-y-2"><Label htmlFor="motivo">Tarea a realizar hoy*</Label><Input id="motivo" name="motivo" value={formData.motivo} onChange={handleFormChange} required /></div>
                    <div className="space-y-2">
                        <Label htmlFor="tipoPersona">Tipo de Persona</Label>
                        <Select name="tipoPersona" value={formData.tipoPersona} onValueChange={(v) => setFormData(p => ({...p, tipoPersona: v as any}))}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent><SelectItem value="visita">Visita</SelectItem><SelectItem value="subcontratista">Subcontratista</SelectItem><SelectItem value="trabajador">Trabajador</SelectItem></SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="duracionIngreso">Duración del Ingreso</Label>
                        <Select name="duracionIngreso" value={formData.duracionIngreso} onValueChange={(v) => setFormData(p => ({...p, duracionIngreso: v as any}))}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent><SelectItem value="visita breve">Visita Breve</SelectItem><SelectItem value="jornada parcial">Jornada Parcial</SelectItem><SelectItem value="jornada completa">Jornada Completa</SelectItem></SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Adjuntar Cédula o Documento de Identidad*</Label>
              <Input id="file" type="file" accept="image/*,application/pdf" onChange={handleFileChange} required />
              {file && <p className="text-xs text-muted-foreground">{file.name}</p>}
            </div>

            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitting ? 'Registrando ingreso...' : 'Registrar Ingreso y Continuar a Inducción'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PublicAccessPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <PublicAccessPageInner />
        </Suspense>
    );
}

