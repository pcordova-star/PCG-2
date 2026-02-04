// src/app/public/induccion/[obraId]/page.tsx
"use client";

import React, { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import SignaturePad from '@/app/prevencion/hallazgos/components/SignaturePad';
import { PcgLogo } from '@/components/branding/PcgLogo';
import { InduccionAccesoFaena, guardarInduccionQR } from '@/lib/induccionAccesoFaena';
import { Obra } from '@/types/pcg';

export default function PaginaInduccionPublica() {
  const { obraId } = useParams<{ obraId: string }>();
  const searchParams = useSearchParams();
  const generadorId = searchParams.get('g');

  const [obra, setObra] = useState<Obra | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [formState, setFormState] = useState<Partial<Omit<InduccionAccesoFaena, 'id' | 'createdAt'>>>({
    tipoVisita: 'VISITA',
    aceptaReglamento: false,
    aceptaEpp: false,
    aceptaTratamientoDatos: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!obraId) {
      setError("No se ha especificado una obra.");
      setLoading(false);
      return;
    }
    const fetchObra = async () => {
      const obraRef = doc(firebaseDb, "obras", obraId);
      const obraSnap = await getDoc(obraRef);
      if (obraSnap.exists()) {
        setObra({ id: obraSnap.id, ...obraSnap.data() } as Obra);
      } else {
        setError("La obra especificada no existe.");
      }
      setLoading(false);
    };
    fetchObra();
  }, [obraId]);

  const handleInputChange = (field: keyof typeof formState, value: any) => {
    setFormState(prev => ({...prev, [field]: value}));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validar preguntas de seguridad
    if (formState.respuestaPregunta1 !== 'SI' || formState.respuestaPregunta2 !== 'NO' || formState.respuestaPregunta3 !== 'SI') {
      setError("Una o más respuestas son incorrectas. Por favor, revise el material de inducción y vuelva a intentarlo.");
      return;
    }
    if (!formState.aceptaReglamento || !formState.aceptaEpp || !formState.aceptaTratamientoDatos) {
        setError("Debe aceptar todos los términos y compromisos para continuar.");
        return;
    }
    if (!formState.firmaDataUrl) {
        setError("La firma es obligatoria para finalizar el proceso.");
        return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
        const now = new Date();
        const dataToSave = {
            ...formState,
            obraId: obraId,
            obraNombre: obra?.nombreFaena,
            generadorId: generadorId,
            fechaIngreso: now.toISOString().slice(0,10),
            horaIngreso: now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
        } as Omit<InduccionAccesoFaena, 'id' | 'createdAt'>;
        
        await guardarInduccionQR(dataToSave);
        setStep(3); // Ir a la pantalla de éxito

    } catch(err) {
        console.error("Error guardando inducción:", err);
        setError("No se pudo guardar el registro. Inténtelo de nuevo.");
    } finally {
        setIsSubmitting(false);
    }
  };


  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin"/></div>;
  if (error && step < 3) return <div className="flex items-center justify-center min-h-screen text-destructive p-4">{error}</div>;
  if (!obra) return <div className="flex items-center justify-center min-h-screen text-muted-foreground p-4">La obra no fue encontrada. Verifique el enlace.</div>;

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
             <div className="mx-auto w-fit">
                <PcgLogo />
            </div>
          <CardTitle>Inducción de Acceso a Faena</CardTitle>
          <CardDescription>Obra: {obra.nombreFaena}</CardDescription>
        </CardHeader>
        <CardContent>
            {step === 1 && (
                 <form onSubmit={() => setStep(2)} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Tipo de Visita</Label>
                        <Select value={formState.tipoVisita} onValueChange={(v) => handleInputChange('tipoVisita', v as any)} required>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="VISITA">Visita</SelectItem>
                                <SelectItem value="PROVEEDOR">Proveedor</SelectItem>
                                <SelectItem value="INSPECTOR">Inspector</SelectItem>
                                <SelectItem value="OTRO">Otro</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="nombre">Nombre Completo</Label>
                        <Input id="nombre" value={formState.nombreCompleto || ''} onChange={e => handleInputChange('nombreCompleto', e.target.value)} required/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="rut">RUT</Label>
                            <Input id="rut" value={formState.rut || ''} onChange={e => handleInputChange('rut', e.target.value)} required/>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="telefono">Teléfono</Label>
                            <Input id="telefono" type="tel" value={formState.telefono || ''} onChange={e => handleInputChange('telefono', e.target.value)} required/>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="empresa">Empresa</Label>
                        <Input id="empresa" value={formState.empresa || ''} onChange={e => handleInputChange('empresa', e.target.value)} required/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label htmlFor="cargo">Cargo</Label>
                            <Input id="cargo" value={formState.cargo || ''} onChange={e => handleInputChange('cargo', e.target.value)} required/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="correo">Correo Electrónico</Label>
                            <Input id="correo" type="email" value={formState.correo || ''} onChange={e => handleInputChange('correo', e.target.value)} required/>
                        </div>
                    </div>
                    <Button className="w-full">Siguiente</Button>
                </form>
            )}

            {step === 2 && (
                 <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="prose prose-sm max-w-none text-muted-foreground p-4 bg-muted rounded-md border">
                        <h4 className="font-semibold text-foreground">Material de Inducción (Resumen)</h4>
                        <p>Al ingresar a esta obra, usted se compromete a cumplir con todas las normas de seguridad. Los riesgos principales son: <strong>caídas de altura, riesgo eléctrico y golpes por maquinaria.</strong></p>
                        <ul>
                            <li>Use siempre su casco, zapatos de seguridad y lentes.</li>
                            <li>No ingrese a zonas no autorizadas o señalizadas como peligrosas.</li>
                            <li>Informe inmediatamente cualquier condición insegura al supervisor más cercano.</li>
                            <li>En caso de emergencia, siga las rutas de evacuación hacia la zona de seguridad.</li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <p className="font-medium">Verificación de Comprensión</p>
                        <div className="space-y-2">
                            <Label>¿Debe respetar siempre las indicaciones del personal de la obra?</Label>
                            <RadioGroup onValueChange={(v) => handleInputChange('respuestaPregunta1', v as any)} className="flex gap-4">
                                <Label className="flex items-center gap-2"><RadioGroupItem value="SI" /> Sí</Label>
                                <Label className="flex items-center gap-2"><RadioGroupItem value="NO" /> No</Label>
                            </RadioGroup>
                        </div>
                         <div className="space-y-2">
                            <Label>¿Está permitido caminar bajo cargas suspendidas?</Label>
                            <RadioGroup onValueChange={(v) => handleInputChange('respuestaPregunta2', v as any)} className="flex gap-4">
                                <Label className="flex items-center gap-2"><RadioGroupItem value="SI" /> Sí</Label>
                                <Label className="flex items-center gap-2"><RadioGroupItem value="NO" /> No</Label>
                            </RadioGroup>
                        </div>
                         <div className="space-y-2">
                            <Label>En caso de emergencia, ¿debe seguir las rutas de evacuación?</Label>
                            <RadioGroup onValueChange={(v) => handleInputChange('respuestaPregunta3', v as any)} className="flex gap-4">
                                <Label className="flex items-center gap-2"><RadioGroupItem value="SI" /> Sí</Label>
                                <Label className="flex items-center gap-2"><RadioGroupItem value="NO" /> No</Label>
                            </RadioGroup>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <p className="font-medium">Declaración y Compromiso</p>
                        <Label className="flex items-center gap-2 font-normal text-sm"><Checkbox checked={formState.aceptaReglamento} onCheckedChange={c => handleInputChange('aceptaReglamento', c)} /> Declaro haber leído y comprendido el Reglamento Especial de la obra.</Label>
                        <Label className="flex items-center gap-2 font-normal text-sm"><Checkbox checked={formState.aceptaEpp} onCheckedChange={c => handleInputChange('aceptaEpp', c)} /> Me comprometo a utilizar los Elementos de Protección Personal (EPP) requeridos.</Label>
                        <Label className="flex items-center gap-2 font-normal text-sm"><Checkbox checked={formState.aceptaTratamientoDatos} onCheckedChange={c => handleInputChange('aceptaTratamientoDatos', c)} /> Acepto el tratamiento de mis datos personales para fines de registro de acceso.</Label>
                    </div>

                    <div className="space-y-2">
                        <Label>Firma Digital</Label>
                        <SignaturePad onChange={(dataUrl) => handleInputChange('firmaDataUrl', dataUrl)} onClear={() => handleInputChange('firmaDataUrl', null)} />
                    </div>

                    {error && (
                         <Alert variant="destructive">
                           <AlertCircle className="h-4 w-4" />
                           <AlertTitle>Error</AlertTitle>
                           <AlertDescription>
                            {error}
                           </AlertDescription>
                         </Alert>
                    )}
                    
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => setStep(1)}>Volver</Button>
                        <Button type="submit" disabled={isSubmitting} className="flex-1">
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            {isSubmitting ? 'Guardando...' : 'Registrar Ingreso y Finalizar'}
                        </Button>
                    </div>
                </form>
            )}

            {step === 3 && (
                <div className="text-center space-y-4 py-8">
                    <ShieldCheck className="mx-auto h-16 w-16 text-green-500" />
                    <h2 className="text-xl font-semibold">Registro Exitoso</h2>
                    <p className="text-muted-foreground">Su inducción ha sido registrada correctamente. Ya puede notificar al personal de la obra para autorizar su ingreso.</p>
                    <Button onClick={() => window.location.reload()}>Cerrar</Button>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
