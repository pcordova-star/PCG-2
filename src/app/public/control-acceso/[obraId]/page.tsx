// src/app/public/control-acceso/[obraId]/page.tsx
'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, QrCode, Upload, CheckCircle, ShieldX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PcgLogo } from '@/components/branding/PcgLogo';
import { Scanner } from 'react-zxing';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Obra } from '@/types/pcg';

function ControlAccesoForm() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const obraId = params.obraId as string;
  const [obra, setObra] = useState<Obra | null>(null);
  const [loadingObra, setLoadingObra] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    rut: '',
    empresa: '',
    motivo: '',
    tipoPersona: 'visita' as 'visita' | 'subcontratista' | 'trabajador',
    duracionIngreso: 'visita breve' as 'visita breve' | 'jornada parcial' | 'jornada completa',
  });
  const [archivo, setArchivo] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Induction State
  const [inductionData, setInductionData] = useState<{ text: string, audioUrl: string, evidenciaId: string } | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (obraId) {
      const fetchObra = async () => {
        setLoadingObra(true);
        const obraRef = doc(firebaseDb, "obras", obraId);
        const obraSnap = await getDoc(obraRef);
        if (obraSnap.exists()) {
          setObra({ id: obraSnap.id, ...obraSnap.data() } as Obra);
        } else {
          setError("La obra especificada no existe.");
        }
        setLoadingObra(false);
      };
      fetchObra();
    }
  }, [obraId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setArchivo(e.target.files ? e.target.files[0] : null);
  };
  
  const handleScan = (result: string | null | undefined) => {
    if (result) {
      try {
        const parts = result.split('|');
        let rut = '';
        let nombreCompleto = '';

        // Formato cédulas nuevas: RUN|APELLIDO PATERNO|APELLIDO MATERNO|NOMBRES...
        if (parts.length > 3 && parts[0].includes('-')) {
            rut = parts[0];
            const nombres = parts[3];
            const apellidoPaterno = parts[1];
            const apellidoMaterno = parts[2];
            nombreCompleto = `${nombres} ${apellidoPaterno} ${apellidoMaterno}`.trim();
        }
        
        if (rut && nombreCompleto) {
          setFormData(prev => ({...prev, nombreCompleto, rut }));
          toast({ title: "Éxito", description: "Datos escaneados correctamente." });
        } else {
          toast({ variant: "destructive", title: "QR no reconocido", description: "El formato del código QR no parece ser de una cédula chilena válida." });
        }
      } catch (e) {
        toast({ variant: "destructive", title: "Error de Escaneo", description: "No se pudo interpretar el código QR." });
      } finally {
        setIsScannerOpen(false);
      }
    }
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!archivo) {
      setError("El archivo de la cédula de identidad es obligatorio.");
      return;
    }
    
    setIsSubmitting(true);
    
    const submissionForm = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      submissionForm.append(key, value);
    });
    submissionForm.append('obraId', obraId);
    submissionForm.append('archivo', archivo);
    
    try {
        const response = await fetch('/api/control-acceso/submit', {
            method: 'POST',
            body: submissionForm,
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Error en el servidor.");
        }

        setInductionData({ text: result.inductionText, audioUrl: result.audioUrl, evidenciaId: result.evidenciaId });

    } catch (err: any) {
        setError(err.message);
        toast({ variant: 'destructive', title: 'Error al registrar', description: err.message });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleConfirmInduction = async () => {
    if (!inductionData) return;
    setIsConfirming(true);
    try {
        const res = await fetch('/api/control-acceso/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ evidenciaId: inductionData.evidenciaId }),
        });
        if (!res.ok) throw new Error("No se pudo confirmar la inducción.");
        // Redirigir a página de éxito final
        router.push('/public/control-acceso/success');
    } catch (err) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la confirmación.' });
        setIsConfirming(false);
    }
  };

  if (loadingObra) {
    return <div className="text-center p-8"><Loader2 className="animate-spin mx-auto"/> Cargando datos de la obra...</div>;
  }
  
  if (error && !obra) {
      return <div className="text-center text-destructive p-8">{error}</div>;
  }

  if (inductionData) {
    return (
        <Card className="w-full max-w-lg">
            <CardHeader>
                <CardTitle>Inducción de Seguridad Obligatoria</CardTitle>
                <CardDescription>Lee y escucha atentamente la siguiente información antes de ingresar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-md border text-sm max-h-60 overflow-y-auto">
                    {inductionData.text}
                </div>
                {inductionData.audioUrl && (
                    <audio controls src={inductionData.audioUrl} className="w-full">
                        Tu navegador no soporta el elemento de audio.
                    </audio>
                )}
                 <Button onClick={handleConfirmInduction} className="w-full" disabled={isConfirming}>
                    {isConfirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Declaro haber leído y entendido la inducción
                </Button>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center">
        <PcgLogo />
        <CardTitle className="pt-2">{obra?.nombreFaena}</CardTitle>
        <CardDescription>Formulario de auto-registro para acceso a obra.</CardDescription>
      </CardHeader>
      <CardContent>
        {isScannerOpen ? (
          <div className="space-y-4">
            <div className="aspect-square w-full max-w-sm mx-auto bg-black rounded-lg overflow-hidden">
              <Scanner onResult={handleScan} onError={(e) => console.error(e)} />
            </div>
            <Button variant="outline" className="w-full" onClick={() => setIsScannerOpen(false)}>Cancelar Escaneo</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Button type="button" onClick={() => setIsScannerOpen(true)} className="w-full" variant="secondary">
              <QrCode className="mr-2" />
              Escanear Cédula de Identidad (Recomendado)
            </Button>
            
            <div className="space-y-2">
              <Label htmlFor="nombreCompleto">Nombre Completo*</Label>
              <Input id="nombreCompleto" name="nombreCompleto" value={formData.nombreCompleto} onChange={handleInputChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rut">RUT*</Label>
              <Input id="rut" name="rut" value={formData.rut} onChange={handleInputChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="empresa">Empresa*</Label>
              <Input id="empresa" name="empresa" value={formData.empresa} onChange={handleInputChange} required />
            </div>
             <div className="space-y-2">
              <Label htmlFor="tipoPersona">Tipo de Ingreso*</Label>
               <Select name="tipoPersona" value={formData.tipoPersona} onValueChange={(v) => handleSelectChange('tipoPersona', v)}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="visita">Visita</SelectItem>
                  <SelectItem value="subcontratista">Subcontratista</SelectItem>
                  <SelectItem value="trabajador">Trabajador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="motivo">Tarea a realizar / Motivo de ingreso*</Label>
              <Textarea id="motivo" name="motivo" value={formData.motivo} onChange={handleInputChange} required />
            </div>
             <div className="space-y-2">
              <Label htmlFor="duracionIngreso">Duración Estimada del Ingreso*</Label>
               <Select name="duracionIngreso" value={formData.duracionIngreso} onValueChange={(v) => handleSelectChange('duracionIngreso', v)}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="visita breve">Visita Breve (menos de 2 horas)</SelectItem>
                  <SelectItem value="jornada parcial">Jornada Parcial (2-4 horas)</SelectItem>
                  <SelectItem value="jornada completa">Jornada Completa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="archivo">Adjuntar Cédula de Identidad (foto o PDF)*</Label>
              <Input id="archivo" name="archivo" type="file" onChange={handleFileChange} required accept="image/*,application/pdf"/>
              <p className="text-xs text-muted-foreground">Si no usaste el escáner, sube una foto de tu cédula aquí.</p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : null}
              {isSubmitting ? 'Registrando...' : 'Registrar y Continuar a Inducción'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function SuspendedControlAccesoPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4">
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
                <ControlAccesoForm />
            </Suspense>
        </div>
    );
}
