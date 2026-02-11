// /src/app/public/control-acceso/[obraId]/page.tsx
"use client";

import { useState, useEffect, FormEvent, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useZxing } from 'react-zxing';
import jsQR from 'jsqr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Camera, ShieldX, X, Upload } from 'lucide-react';
import { PcgLogo } from '@/components/branding/PcgLogo';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from '@/components/ui/alert-dialog';

interface FormData {
  nombreCompleto: string;
  rut: string;
  empresa: string;
  motivo: string;
  tipoPersona: 'trabajador' | 'subcontratista' | 'visita';
  duracionIngreso: 'visita breve' | 'jornada parcial' | 'jornada completa';
}

const parseQrData = (data: string): { rut: string; nombre: string } | null => {
  try {
    const parts = data.split('&');
    const runPart = parts.find(p => p.startsWith('RUN='));
    const namePart = parts.find(p => p.startsWith('Nombres='));
    const lastNamePart = parts.find(p => p.startsWith('Apellidos='));

    if (!runPart || !namePart || !lastNamePart) return null;

    const rut = runPart.split('=')[1];
    const nombres = namePart.split('=')[1].replace(/\+/g, ' ');
    const apellidos = lastNamePart.split('=')[1].replace(/\+/g, ' ');

    return { rut, nombre: `${nombres} ${apellidos}` };
  } catch {
    return null;
  }
};

export default function AccesoObraPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const obraId = params.obraId as string;

  const [formData, setFormData] = useState<FormData>({
    nombreCompleto: '',
    rut: '',
    empresa: '',
    motivo: '',
    tipoPersona: 'visita',
    duracionIngreso: 'visita breve',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState({ inductionText: '', audioUrl: '' });

  const { ref } = useZxing({
    onResult(result) {
      const parsedData = parseQrData(result.getText());
      if (parsedData) {
        setFormData(prev => ({
          ...prev,
          rut: parsedData.rut,
          nombreCompleto: parsedData.nombre,
        }));
        toast({ title: "Éxito", description: "Datos de la cédula cargados correctamente." });
        setIsScanning(false);
      } else {
        toast({ variant: 'destructive', title: "Error de Escaneo", description: "El código QR no parece ser de una cédula de identidad chilena válida." });
      }
    },
    onError(err) {
        console.error("Error del lector QR:", err);
        toast({ variant: "destructive", title: "Error de Cámara", description: "No se pudo acceder a la cámara. Revisa los permisos."});
        setIsScanning(false);
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Special handling for select is done via onValueChange
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value as any }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const submissionData = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      submissionData.append(key, value);
    });
    submissionData.append('obraId', obraId);

    try {
      const res = await fetch('/api/control-acceso/submit', {
        method: 'POST',
        body: submissionData,
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Ocurrió un error en el servidor.');
      }
      
      if(result.inductionText && result.audioUrl) {
          setSuccessData({ inductionText: result.inductionText, audioUrl: result.audioUrl });
          setShowSuccessModal(true);
      } else {
          router.push('/public/control-acceso/exito');
      }

    } catch (err: any) {
      setError(err.message);
      toast({ variant: 'destructive', title: 'Error al registrar', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isScanning) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-lg p-4 relative">
          <p className="text-center font-semibold mb-2">Apunta la cámara al código QR de tu cédula</p>
          <div className="w-full aspect-square bg-gray-200 rounded overflow-hidden relative">
            <video ref={ref} className="w-full h-full object-cover" />
            <div className="absolute inset-0 border-4 border-dashed border-white/50 rounded-lg"></div>
          </div>
          <Button variant="secondary" onClick={() => setIsScanning(false)} className="mt-4 w-full">
            Cancelar Escaneo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4"><PcgLogo /></div>
            <CardTitle className="text-2xl">Registro de Acceso a Obra</CardTitle>
            <CardDescription>Completa tus datos para registrar tu ingreso.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="border-2 border-dashed border-primary/20 bg-primary/5 p-4 rounded-lg text-center">
                <Button type="button" onClick={() => setIsScanning(true)} className="w-full sm:w-auto">
                  <Camera className="mr-2 h-4 w-4" /> Escanear Cédula (QR)
                </Button>
                <p className="text-xs text-muted-foreground mt-2">Apunta la cámara al código QR de tu cédula para autocompletar tu nombre y RUT.</p>
              </div>

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
                <Label htmlFor="motivo">Tarea o motivo del ingreso*</Label>
                <Textarea id="motivo" name="motivo" value={formData.motivo} onChange={handleInputChange} required />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipoPersona">Tipo de Persona</Label>
                  <Select name="tipoPersona" value={formData.tipoPersona} onValueChange={(v) => handleSelectChange('tipoPersona', v)}>
                    <SelectTrigger id="tipoPersona"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="visita">Visita</SelectItem>
                      <SelectItem value="subcontratista">Subcontratista</SelectItem>
                      <SelectItem value="trabajador">Trabajador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duracionIngreso">Duración Estimada</Label>
                  <Select name="duracionIngreso" value={formData.duracionIngreso} onValueChange={(v) => handleSelectChange('duracionIngreso', v)}>
                    <SelectTrigger id="duracionIngreso"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="visita breve">Visita Breve (hasta 2 horas)</SelectItem>
                      <SelectItem value="jornada parcial">Jornada Parcial (2-4 horas)</SelectItem>
                      <SelectItem value="jornada completa">Jornada Completa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {error && (
                <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4"/>}
                Registrar Ingreso y Continuar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Inducción de Seguridad Requerida</AlertDialogTitle>
            <AlertDialogDescription>
              Lee y escucha atentamente la siguiente inducción de seguridad generada para la tarea que vas a realizar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4 max-h-[50vh] overflow-y-auto">
            <p className="text-sm whitespace-pre-wrap p-4 bg-muted rounded-md">{successData.inductionText}</p>
            {successData.audioUrl && (
              <audio controls src={successData.audioUrl} className="w-full">Tu navegador no soporta el elemento de audio.</audio>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => router.push('/public/control-acceso/exito')}>
              He leído y entendido la inducción
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
