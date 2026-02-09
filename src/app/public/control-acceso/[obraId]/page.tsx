// src/app/public/control-acceso/[obraId]/page.tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import { Obra } from "@/types/pcg";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ShieldCheck, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PcgLogo } from "@/components/branding/PcgLogo";
import { Checkbox } from "@/components/ui/checkbox";

type FormState = {
  nombreCompleto: string;
  rut: string;
  empresa: string;
  motivo: string;
  archivo: File | null;
  tipoPersona: 'trabajador' | 'subcontratista' | 'visita';
  duracionIngreso: 'visita breve' | 'jornada parcial' | 'jornada completa';
};

type InductionState = {
  text: string;
  audioUrl: string | null;
  evidenciaId: string;
};

export default function PublicAccessControlPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const obraId = params.obraId as string;

  const [obra, setObra] = useState<Obra | null>(null);
  const [formState, setFormState] = useState<FormState>({
    nombreCompleto: "", rut: "", empresa: "", motivo: "", archivo: null,
    tipoPersona: 'visita', duracionIngreso: 'visita breve',
  });
  const [stage, setStage] = useState<'form' | 'induction' | 'loading'>('loading');
  const [inductionData, setInductionData] = useState<InductionState | null>(null);
  const [inductionConfirmed, setInductionConfirmed] = useState(false);

  useEffect(() => {
    if (obraId) {
      const fetchObra = async () => {
        const obraRef = doc(firebaseDb, "obras", obraId);
        const obraSnap = await getDoc(obraRef);
        if (obraSnap.exists()) {
          setObra({ id: obraSnap.id, ...obraSnap.data() } as Obra);
          setStage('form');
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Obra no encontrada.' });
          setStage('form');
        }
      };
      fetchObra();
    }
  }, [obraId, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size > 10 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'Archivo demasiado grande', description: 'El archivo no puede superar los 10MB.' });
      return;
    }
    setFormState(prev => ({ ...prev, archivo: file || null }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!obra || !formState.archivo) {
      toast({ variant: 'destructive', title: 'Error', description: 'Faltan datos de obra o el archivo adjunto.' });
      return;
    }

    setStage('loading');

    const formData = new FormData();
    Object.entries(formState).forEach(([key, value]) => {
      if (value) formData.append(key, value);
    });
    formData.append('obraId', obraId);
    formData.append('tipoObra', obra.tipoObra || 'Edificación en altura');

    try {
      const response = await fetch('/api/control-acceso/submit', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Error en el servidor.');

      setInductionData({
        text: result.inductionText,
        audioUrl: result.audioUrl,
        evidenciaId: result.evidenciaId,
      });
      setStage('induction');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error al enviar', description: err.message });
      setStage('form');
    }
  };
  
  const handleConfirmInduction = async () => {
    if (!inductionData) return;
    setStage('loading');
    try {
      await fetch('/api/control-acceso/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidenciaId: inductionData.evidenciaId }),
      });
      router.push('/public/control-acceso/success');
    } catch (err: any) {
       toast({ variant: 'destructive', title: 'Error de confirmación', description: 'No se pudo guardar la confirmación. Inténtalo de nuevo.' });
       setStage('induction');
    }
  };

  if (!obra && stage === 'loading') {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  const renderForm = () => (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="text-center space-y-2">
        <PcgLogo />
        <CardTitle>Registro de Acceso a Obra</CardTitle>
        <CardDescription>{obra?.nombreFaena || 'Cargando nombre de la obra...'}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input name="nombreCompleto" placeholder="Nombre Completo*" onChange={handleInputChange} required />
          <Input name="rut" placeholder="RUT*" onChange={handleInputChange} required />
          <Input name="empresa" placeholder="Empresa a la que pertenece*" onChange={handleInputChange} required />
          <Select name="tipoPersona" onValueChange={(v) => setFormState(p => ({...p, tipoPersona: v as any}))} value={formState.tipoPersona} required>
            <SelectTrigger><SelectValue placeholder="Tipo de Persona"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="visita">Visita</SelectItem>
              <SelectItem value="trabajador">Trabajador</SelectItem>
              <SelectItem value="subcontratista">Subcontratista</SelectItem>
            </SelectContent>
          </Select>
           <Select name="duracionIngreso" onValueChange={(v) => setFormState(p => ({...p, duracionIngreso: v as any}))} value={formState.duracionIngreso} required>
            <SelectTrigger><SelectValue placeholder="Duración del Ingreso"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="visita breve">Visita Breve (menos de 2 hrs)</SelectItem>
              <SelectItem value="jornada parcial">Jornada Parcial</SelectItem>
              <SelectItem value="jornada completa">Jornada Completa</SelectItem>
            </SelectContent>
          </Select>
          <Textarea name="motivo" placeholder="Tarea principal a realizar hoy...*" onChange={handleInputChange} required />
          <div>
            <Label htmlFor="archivo" className="text-sm text-muted-foreground">Adjuntar Cédula de Identidad*</Label>
            <Input id="archivo" name="archivo" type="file" onChange={handleFileChange} required accept="image/*,application/pdf" />
          </div>
          <Button type="submit" className="w-full" disabled={stage === 'loading'}>
            {stage === 'loading' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
            Continuar a Inducción de Seguridad
          </Button>
        </form>
      </CardContent>
    </Card>
  );

  const renderInduction = () => {
    if (!inductionData) return null;
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <div className="flex items-center gap-3"><ShieldCheck className="h-8 w-8 text-primary"/><div><CardTitle>Inducción de Seguridad Contextual</CardTitle><CardDescription>Por favor, revisa la información antes de ingresar.</CardDescription></div></div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg max-h-60 overflow-y-auto">
            <p className="whitespace-pre-wrap text-sm">{inductionData.text}</p>
          </div>
          {inductionData.audioUrl && (
            <audio controls src={inductionData.audioUrl} className="w-full" onPlay={() => setInductionConfirmed(true)}>
              Tu navegador no soporta el elemento de audio.
            </audio>
          )}
          <div className="flex items-center space-x-2 pt-4">
            <Checkbox id="confirmacion" checked={inductionConfirmed} onCheckedChange={(c) => setInductionConfirmed(!!c)} />
            <Label htmlFor="confirmacion" className="text-sm font-normal text-muted-foreground">Declaro haber leído y/o escuchado la inducción de seguridad para la tarea de hoy.</Label>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleConfirmInduction} className="w-full" disabled={!inductionConfirmed || stage === 'loading'}>
            {stage === 'loading' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4"/>}
            Confirmar e Ingresar
          </Button>
        </CardFooter>
      </Card>
    );
  };
  
  return (
    <main className="min-h-screen bg-muted/40 p-4 flex items-center justify-center">
      {stage === 'form' ? renderForm() : stage === 'induction' ? renderInduction() : <Loader2 className="h-10 w-10 animate-spin text-primary" />}
    </main>
  );
}
