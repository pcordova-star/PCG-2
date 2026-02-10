// src/app/public/control-acceso/[obraId]/page.tsx
"use client";

import { useState, useEffect, FormEvent, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, QrCode, Upload, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PcgLogo } from '@/components/branding/PcgLogo';
import { getDoc, doc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Obra } from '@/types/pcg';
import { useZxing } from "react-zxing";
import jsQR from 'jsqr';

type FormStatus = 'pending' | 'submitting' | 'submitted' | 'error';

function parseChileanId(qrData: string): { rut: string; nombre: string } | null {
  try {
    const parts = qrData.split('|');
    if (parts.length < 4) return null;

    const rut = parts[0];
    const apellidoPaterno = parts[1];
    const apellidoMaterno = parts[2];
    const nombres = parts[3];

    if (!rut || !nombres || !apellidoPaterno) return null;
    
    // Formatear RUT: XXXXXXXX-X
    const rutBody = rut.slice(0, -1);
    const rutDv = rut.slice(-1);
    const formattedRut = `${rutBody}-${rutDv}`;

    const nombreCompleto = `${nombres} ${apellidoPaterno} ${apellidoMaterno}`.trim();
    
    return { rut: formattedRut, nombre: nombreCompleto };
  } catch (error) {
    console.error("Error parsing QR data:", error);
    return null;
  }
}

export default function PublicAccessPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const obraId = params.obraId as string;

  const [obra, setObra] = useState<Obra | null>(null);
  const [loadingObra, setLoadingObra] = useState(true);
  
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    rut: '',
    empresa: '',
    motivo: '',
    tipoPersona: 'visita' as 'trabajador' | 'subcontratista' | 'visita',
    duracionIngreso: 'visita breve' as 'visita breve' | 'jornada parcial' | 'jornada completa',
    archivo: null as File | null,
  });
  
  const [status, setStatus] = useState<FormStatus>('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estados para el flujo post-submit (inducción)
  const [inductionText, setInductionText] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [evidenciaId, setEvidenciaId] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  // Estados para el scanner
  const [isScanning, setIsScanning] = useState(false);
  const { ref } = useZxing({
    onResult: (result) => {
      const parsedData = parseChileanId(result.getText());
      if (parsedData) {
        setFormData(prev => ({
          ...prev,
          nombreCompleto: parsedData.nombre,
          rut: parsedData.rut
        }));
        toast({ title: "Datos escaneados", description: "Nombre y RUT autocompletados." });
        setIsScanning(false);
      } else {
        toast({ variant: 'destructive', title: "QR no válido", description: "El código QR escaneado no parece ser de una cédula de identidad chilena válida." });
      }
    },
    paused: !isScanning,
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
          setErrorMessage("La obra especificada no existe.");
        }
        setLoadingObra(false);
      };
      fetchObra();
    }
  }, [obraId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, archivo: e.target.files?.[0] || null }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!obraId) {
      setErrorMessage("Falta el ID de la obra.");
      return;
    }
    
    setStatus('submitting');
    setErrorMessage(null);

    const formPayload = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value) {
        formPayload.append(key, value);
      }
    });
    formPayload.append('obraId', obraId);

    try {
      const response = await fetch('/api/control-acceso/submit', {
        method: 'POST',
        body: formPayload,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ocurrió un error en el servidor.');
      }
      
      setInductionText(result.inductionText);
      setAudioUrl(result.audioUrl);
      setEvidenciaId(result.evidenciaId);
      setStatus('submitted');

    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'No se pudo enviar el formulario.');
      toast({ variant: 'destructive', title: 'Error de envío', description: err.message });
    }
  };

  const handleConfirmInduction = async () => {
    setIsConfirming(true);
    try {
        await fetch('/api/control-acceso/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ evidenciaId }),
        });
        router.push(`/public/success?message=${encodeURIComponent('Registro y confirmación de inducción completados con éxito.')}`);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo confirmar la inducción.' });
        setIsConfirming(false);
    }
  };
  
  if (loadingObra) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8"/></div>;
  }
  
  if (errorMessage && status !== 'submitting') {
     return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle className="text-destructive">Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>{errorMessage}</p>
                    <Button asChild className="mt-4"><Link href="/">Volver al Inicio</Link></Button>
                </CardContent>
            </Card>
        </div>
     );
  }

  if (isScanning) {
    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-4">
            <video ref={ref} className="w-full max-w-md rounded-lg border-4 border-primary" />
            <p className="text-white mt-4 text-center">Apunte la cámara al código QR de su cédula de identidad.</p>
            <Button onClick={() => setIsScanning(false)} variant="secondary" className="mt-6">Cancelar Escaneo</Button>
        </div>
    )
  }

  if (status === 'submitted') {
    return (
        <div className="min-h-screen bg-muted/40 p-4 md:p-8 flex items-center justify-center">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle>Inducción de Seguridad Requerida</CardTitle>
                    <CardDescription>Por favor, lea o escuche atentamente la siguiente información de seguridad antes de ingresar.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {audioUrl && (
                        <div>
                            <Label>Escuchar Inducción</Label>
                            <audio controls src={audioUrl} className="w-full mt-1">Tu navegador no soporta audio.</audio>
                        </div>
                    )}
                    <div className="p-4 bg-slate-100 rounded-md border text-sm max-h-60 overflow-y-auto">
                        <pre className="whitespace-pre-wrap font-sans">{inductionText}</pre>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleConfirmInduction} className="w-full" disabled={isConfirming}>
                        {isConfirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Declaro haber leído/escuchado y entiendo la información
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 p-4 md:p-8 flex items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
            <div className="w-20 mx-auto"><PcgLogo /></div>
          <CardTitle>Control de Acceso</CardTitle>
          <CardDescription>Registro de ingreso para: <strong>{obra?.nombreFaena}</strong></CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <Button type="button" onClick={() => setIsScanning(true)} variant="outline" className="w-full">
                <QrCode className="mr-2 h-5 w-5"/>
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
              <Label htmlFor="motivo">Tarea a realizar hoy*</Label>
              <Input id="motivo" name="motivo" value={formData.motivo} onChange={handleInputChange} required />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="tipoPersona">Tipo de Ingreso</Label>
                    <Select name="tipoPersona" value={formData.tipoPersona} onValueChange={(v) => setFormData(p => ({...p, tipoPersona: v as any}))}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="visita">Visita</SelectItem>
                            <SelectItem value="subcontratista">Subcontratista</SelectItem>
                            <SelectItem value="trabajador">Trabajador</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="duracionIngreso">Duración Estimada</Label>
                    <Select name="duracionIngreso" value={formData.duracionIngreso} onValueChange={(v) => setFormData(p => ({...p, duracionIngreso: v as any}))}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="visita breve">Visita Breve (menos de 2h)</SelectItem>
                            <SelectItem value="jornada parcial">Jornada Parcial (2-4h)</SelectItem>
                            <SelectItem value="jornada completa">Jornada Completa</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="archivo">Adjuntar Cédula de Identidad (opcional si escaneó)</Label>
                <Input id="archivo" name="archivo" type="file" onChange={handleFileChange} />
                <p className="text-xs text-muted-foreground">Alternativa si no puede usar el escáner.</p>
            </div>
            
            <Button type="submit" className="w-full" disabled={status === 'submitting'}>
              {status === 'submitting' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar y Continuar a Inducción
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
