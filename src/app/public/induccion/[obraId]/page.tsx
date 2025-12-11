// src/app/public/induccion/[obraId]/page.tsx
"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import { guardarInduccionQR } from "@/lib/prevencionEventos";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import SignaturePad from "@/app/prevencion/hallazgos/components/SignaturePad";
import { Loader2, CheckCircle, ShieldQuestion, ShieldX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PcgLogo } from "@/components/branding/PcgLogo";

interface Obra {
  id?: string;
  nombreFaena: string;
}

const initialFormState = {
  tipoVisita: "VISITA" as const,
  nombreCompleto: "", rut: "", empresa: "", cargo: "", telefono: "", correo: "",
  fechaIngreso: new Date().toISOString().slice(0, 10),
  horaIngreso: new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
  respuestaPregunta1: "SI" as const,
  respuestaPregunta2: "NO" as const,
  respuestaPregunta3: "SI" as const,
  aceptaReglamento: false, aceptaEpp: false, aceptaTratamientoDatos: false,
  firmaDataUrl: "",
};


function InduccionForm() {
  const { obraId } = useParams<{ obraId: string }>();
  const searchParams = useSearchParams();
  const generadorId = searchParams.get('g') || null;

  const [obra, setObra] = useState<Obra | null>(null);
  const [loadingObra, setLoadingObra] = useState(true);
  
  const [formState, setFormState] = useState(initialFormState);
  const [isSignatureDrawn, setIsSignatureDrawn] = useState(false);
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    if (!obraId) return;
    const fetchObra = async () => {
      setLoadingObra(true);
      const obraRef = doc(firebaseDb, "obras", obraId);
      const obraSnap = await getDoc(obraRef);
      if (obraSnap.exists()) {
        setObra({ id: obraSnap.id, ...obraSnap.data() } as Obra);
      }
      setLoadingObra(false);
    };
    fetchObra();
  }, [obraId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleRadioChange = (name: string, value: any) => {
    setFormState(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormState(prev => ({ ...prev, [name]: checked }));
  };

  const handleSignatureChange = (dataUrl: string | null) => {
    setFormState(prev => ({ ...prev, firmaDataUrl: dataUrl || "" }));
  };

  const validateStep = (currentStep: number): boolean => {
    setError(null);
    switch (currentStep) {
      case 1:
        if (!formState.nombreCompleto || !formState.rut || !formState.empresa || !formState.cargo) {
          setError("Todos los campos personales son obligatorios.");
          return false;
        }
        return true;
      case 2:
        return true; // No hay validación estricta para las preguntas
      case 3:
        if (!formState.aceptaReglamento || !formState.aceptaEpp || !formState.aceptaTratamientoDatos) {
            setError("Debe aceptar todos los compromisos para continuar.");
            return false;
        }
        if (!isSignatureDrawn || !formState.firmaDataUrl) {
            setError("La firma es obligatoria para completar el registro.");
            return false;
        }
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    setIsSubmitting(true);
    setError(null);
    try {
        await guardarInduccionQR({ ...formState, obraId, obraNombre: obra?.nombreFaena || 'Desconocida', generadorId });
        setStep(4);
    } catch(err) {
        console.error(err);
        setError("No se pudo guardar el registro. Inténtelo de nuevo.");
        toast({ variant: 'destructive', title: 'Error', description: 'Ocurrió un problema al guardar el formulario.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (loadingObra) {
    return <div className="text-center p-8"><Loader2 className="animate-spin"/> Cargando...</div>;
  }
  
  if (!obra) {
     return (
      <div className="text-center p-8 text-destructive">
        <ShieldX className="h-12 w-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Obra no encontrada</h2>
        <p>El código QR que escaneaste parece ser inválido o la obra ya no existe.</p>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-2xl">Inducción de Acceso a Faena</CardTitle>
                <CardDescription className="text-base">{obra?.nombreFaena}</CardDescription>
            </div>
            <PcgLogo size={40} />
        </div>
      </CardHeader>
      <CardContent>
        {/* Step 1: Datos Personales */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Paso 1: Sus Datos</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2"><Label>Tipo de Visita</Label><RadioGroup defaultValue="VISITA" onValueChange={val => handleRadioChange('tipoVisita', val)} className="flex gap-4"><Label className="flex items-center gap-2"><RadioGroupItem value="VISITA"/>Visita</Label><Label className="flex items-center gap-2"><RadioGroupItem value="PROVEEDOR"/>Proveedor</Label><Label className="flex items-center gap-2"><RadioGroupItem value="INSPECTOR"/>Inspector</Label></RadioGroup></div>
              <div className="space-y-2"><Label>Nombre Completo</Label><Input name="nombreCompleto" value={formState.nombreCompleto} onChange={handleInputChange} /></div>
              <div className="space-y-2"><Label>RUT</Label><Input name="rut" value={formState.rut} onChange={handleInputChange} /></div>
              <div className="space-y-2"><Label>Empresa</Label><Input name="empresa" value={formState.empresa} onChange={handleInputChange} /></div>
              <div className="space-y-2"><Label>Cargo</Label><Input name="cargo" value={formState.cargo} onChange={handleInputChange} /></div>
              <div className="space-y-2"><Label>Teléfono</Label><Input name="telefono" value={formState.telefono} onChange={handleInputChange} /></div>
              <div className="space-y-2"><Label>Correo</Label><Input name="correo" type="email" value={formState.correo} onChange={handleInputChange} /></div>
            </div>
          </div>
        )}
        
        {/* Step 2: Cuestionario */}
        {step === 2 && (
             <div className="space-y-6">
                <h3 className="font-semibold">Paso 2: Cuestionario de Seguridad</h3>
                <div className="space-y-4">
                    <ShieldQuestion className="mx-auto h-12 w-12 text-primary" />
                    <p className="text-center text-muted-foreground">Lea atentamente y responda según las reglas básicas de seguridad.</p>
                </div>
                <div className="space-y-4">
                    <Label>1. ¿Debe respetar en todo momento las indicaciones de seguridad del personal de la obra?</Label>
                    <RadioGroup value={formState.respuestaPregunta1} onValueChange={v => handleRadioChange('respuestaPregunta1', v)} className="flex gap-4"><Label className="flex items-center gap-2"><RadioGroupItem value="SI"/>Sí</Label><Label className="flex items-center gap-2"><RadioGroupItem value="NO"/>No</Label></RadioGroup>
                </div>
                <div className="space-y-4">
                    <Label>2. ¿Está permitido caminar, detenerse o trabajar bajo cargas suspendidas por grúas o maquinaria?</Label>
                    <RadioGroup value={formState.respuestaPregunta2} onValueChange={v => handleRadioChange('respuestaPregunta2', v)} className="flex gap-4"><Label className="flex items-center gap-2"><RadioGroupItem value="SI"/>Sí</Label><Label className="flex items-center gap-2"><RadioGroupItem value="NO"/>No</Label></RadioGroup>
                </div>
                 <div className="space-y-4">
                    <Label>3. En caso de una emergencia (sismo, incendio), ¿debe dirigirse a la zona de seguridad siguiendo las vías de evacuación señalizadas?</Label>
                    <RadioGroup value={formState.respuestaPregunta3} onValueChange={v => handleRadioChange('respuestaPregunta3', v)} className="flex gap-4"><Label className="flex items-center gap-2"><RadioGroupItem value="SI"/>Sí</Label><Label className="flex items-center gap-2"><RadioGroupItem value="NO"/>No</Label></RadioGroup>
                </div>
             </div>
        )}
        
        {/* Step 3: Firma */}
        {step === 3 && (
            <div className="space-y-6">
                <h3 className="font-semibold">Paso 3: Declaración y Firma</h3>
                <div className="space-y-3">
                    <Label className="flex items-center gap-2 font-normal"><Checkbox checked={formState.aceptaReglamento} onCheckedChange={c => handleCheckboxChange('aceptaReglamento', !!c)} /><span>Declaro haber sido informado sobre los riesgos de la obra y me comprometo a cumplir el Reglamento Especial de Faena.</span></Label>
                    <Label className="flex items-center gap-2 font-normal"><Checkbox checked={formState.aceptaEpp} onCheckedChange={c => handleCheckboxChange('aceptaEpp', !!c)} /><span>Me comprometo a usar en todo momento los Elementos de Protección Personal (EPP) que me sean indicados.</span></Label>
                    <Label className="flex items-center gap-2 font-normal"><Checkbox checked={formState.aceptaTratamientoDatos} onCheckedChange={c => handleCheckboxChange('aceptaTratamientoDatos', !!c)} /><span>Acepto el tratamiento de mis datos personales para fines de registro de seguridad de esta obra.</span></Label>
                </div>
                <div>
                    <Label>Firme en el recuadro:</Label>
                    <SignaturePad onChange={handleSignatureChange} onClear={() => setIsSignatureDrawn(false)} onDraw={() => setIsSignatureDrawn(true)} />
                </div>
            </div>
        )}
        
        {/* Step 4: Éxito */}
        {step === 4 && (
            <div className="text-center space-y-4 py-8">
                <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                <h3 className="text-2xl font-bold">¡Registro Exitoso!</h3>
                <p className="text-muted-foreground">Su inducción de acceso ha sido guardada. Ya puede notificar al personal de la obra para continuar con su ingreso.</p>
            </div>
        )}

      </CardContent>
      <CardFooter className="flex justify-between">
        {step > 1 && step < 4 && <Button variant="outline" onClick={() => setStep(s => s - 1)}>Volver</Button>}
        {step < 3 && <Button onClick={() => { if(validateStep(step)) setStep(s => s + 1)}}>Siguiente</Button>}
        {step === 3 && <Button onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting && <Loader2 className="animate-spin mr-2"/>}Finalizar y Guardar Inducción</Button>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardFooter>
    </Card>
  );
}


export default function PublicInduccionPage() {
    return (
        <div className="min-h-screen bg-muted flex items-center justify-center p-4">
            <Suspense fallback={<div className="text-center"><Loader2 className="animate-spin" /> Cargando formulario...</div>}>
                <InduccionForm />
            </Suspense>
        </div>
    );
}
