// src/app/public/control-acceso/[obraId]/page.tsx
"use client";

import { useState, FormEvent, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ShieldCheck, Upload, Mic, AlertTriangle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { PcgLogo } from '@/components/branding/PcgLogo';

type FormState = 'form' | 'loading' | 'induction' | 'error';

function ControlAccesoForm() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const obraId = params.obraId as string;

  const [formState, setFormState] = useState<FormState>('form');
  const [error, setError] = useState<string | null>(null);

  // Induction state
  const [inductionData, setInductionData] = useState<{
    inductionText: string;
    audioUrl: string;
    evidenciaId: string;
  } | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFormState('loading');
    
    const formData = new FormData(e.currentTarget);
    formData.append('obraId', obraId);

    try {
      const response = await fetch('/api/control-acceso/submit', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ocurrió un error al procesar el registro.');
      }
      
      setInductionData(result);
      setFormState('induction');

    } catch (err: any) {
      setError(err.message);
      setFormState('error');
    }
  };

  const handleConfirmInduction = async () => {
    if (!inductionData?.evidenciaId) return;
    
    setIsSubmitting(true);
    try {
        await fetch('/api/control-acceso/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ evidenciaId: inductionData.evidenciaId }),
        });
        router.push('/public/control-acceso/success');
    } catch (err: any) {
        setError('No se pudo confirmar la inducción. Inténtalo de nuevo.');
        setFormState('error');
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const renderContent = () => {
    switch (formState) {
      case 'loading':
        return (
          <div className="text-center space-y-4 py-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="font-semibold">Generando inducción de seguridad...</p>
            <p className="text-sm text-muted-foreground">Esto puede tardar unos segundos.</p>
          </div>
        );
        
      case 'induction':
        if (!inductionData) return null;
        return (
          <div className="space-y-6 animate-in fade-in-50">
            <div className="text-center">
              <ShieldCheck className="h-10 w-10 text-primary mx-auto mb-2" />
              <h3 className="text-xl font-bold">Inducción de Seguridad Contextual</h3>
              <p className="text-muted-foreground">Por favor, lee y/o escucha la siguiente información antes de ingresar.</p>
            </div>
            
            <div className="space-y-4 max-h-[40vh] overflow-y-auto border p-4 rounded-md bg-muted/50">
                <p className="font-semibold text-sm flex items-center gap-2"><Mic className="h-4 w-4" /> Resumen de Audio</p>
                <audio controls src={inductionData.audioUrl} className="w-full">Tu navegador no soporta el elemento de audio.</audio>
                <p className="text-sm whitespace-pre-wrap font-sans">{inductionData.inductionText}</p>
            </div>
            
            <div className="space-y-4">
                <div className="flex items-center space-x-2">
                    <Checkbox id="confirm-induction" checked={isConfirmed} onCheckedChange={(checked) => setIsConfirmed(Boolean(checked))} />
                    <Label htmlFor="confirm-induction" className="text-sm font-normal text-muted-foreground">
                        Declaro haber leído y/o escuchado la inducción de seguridad.
                    </Label>
                </div>
                 <Button onClick={handleConfirmInduction} className="w-full" disabled={!isConfirmed || isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    {isSubmitting ? 'Confirmando...' : 'Confirmar e Ingresar'}
                </Button>
            </div>
          </div>
        );
      
      case 'error':
         return (
            <div className="text-center space-y-4 py-8">
                <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
                <p className="font-semibold">Error al procesar el registro</p>
                <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
                <Button onClick={() => { setError(null); setFormState('form'); }}>Volver a intentarlo</Button>
            </div>
        );

      case 'form':
      default:
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombreCompleto">Nombre Completo*</Label>
              <Input id="nombreCompleto" name="nombreCompleto" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rut">RUT*</Label>
                <Input id="rut" name="rut" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="empresa">Empresa*</Label>
                <Input id="empresa" name="empresa" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo de ingreso o tarea principal*</Label>
              <Textarea id="motivo" name="motivo" required placeholder="Ej: 'Instalación de moldajes en losa de piso 3', 'Inspección técnica de sala de bombas', 'Despacho de materiales'."/>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Tipo de Persona</Label>
                    <Select name="tipoPersona" defaultValue="visita" required>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="trabajador">Trabajador</SelectItem>
                            <SelectItem value="subcontratista">Subcontratista</SelectItem>
                            <SelectItem value="visita">Visita</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Duración del Ingreso</Label>
                     <Select name="duracionIngreso" defaultValue="visita breve" required>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="visita breve">Visita Breve (menos de 2 horas)</SelectItem>
                            <SelectItem value="jornada parcial">Jornada Parcial</SelectItem>
                            <SelectItem value="jornada completa">Jornada Completa</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
             <div className="space-y-2">
                <Label htmlFor="archivo">Cédula de Identidad (anverso)*</Label>
                <Input id="archivo" name="archivo" type="file" required accept="image/jpeg, image/png, application/pdf"/>
            </div>
            <Button type="submit" className="w-full">
              Registrar y Continuar a Inducción
            </Button>
          </form>
        );
    }
  };

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
            <div className="mx-auto w-fit mb-4">
                <PcgLogo size={80}/>
            </div>
          <CardTitle>Registro de Acceso a Obra</CardTitle>
          <CardDescription>
            Completa tus datos para registrar tu ingreso. Este proceso incluye una breve inducción de seguridad obligatoria.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <ControlAccesoForm />
        </Suspense>
    )
}
