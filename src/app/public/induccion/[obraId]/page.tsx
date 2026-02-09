// src/app/public/induccion/[obraId]/page.tsx
"use client";

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { guardarInduccionQR, InduccionAccesoFaena } from '@/lib/induccionAccesoFaena';
import { Obra } from '@/types/pcg';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldQuestion, Building } from 'lucide-react';
import { PcgLogo } from '@/components/branding/PcgLogo';
import SignaturePad from '@/components/ui/SignaturePad';

type FormDataState = Omit<InduccionAccesoFaena, 'id' | 'createdAt' | 'obraId' | 'obraNombre' | 'generadorId' | 'origenRegistro'>;

const initialFormState: FormDataState = {
  tipoVisita: 'VISITA',
  nombreCompleto: '',
  rut: '',
  empresa: '',
  cargo: '',
  telefono: '',
  correo: '',
  fechaIngreso: new Date().toISOString().slice(0, 10),
  horaIngreso: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
  respuestaPregunta1: 'NO',
  respuestaPregunta2: 'SI',
  respuestaPregunta3: 'SI',
  aceptaReglamento: false,
  aceptaEpp: false,
  aceptaTratamientoDatos: false,
  firmaDataUrl: '',
};

function PublicInduccionPageInner() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const obraId = params.obraId as string;

  const [obra, setObra] = useState<Obra | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<FormDataState>(initialFormState);

  useEffect(() => {
    if (obraId) {
      const fetchObraData = async () => {
        setLoading(true);
        const obraRef = doc(firebaseDb, "obras", obraId);
        const obraSnap = await getDoc(obraRef);
        if (obraSnap.exists()) {
          setObra({ id: obraSnap.id, ...obraSnap.data() } as Obra);
        }
        setLoading(false);
      };
      fetchObraData();
    }
  }, [obraId]);
  
  const handleInputChange = (field: keyof FormDataState, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSignatureChange = (dataUrl: string | null) => {
    setFormData(prev => ({...prev, firmaDataUrl: dataUrl || ''}));
  };

  const allConsentsChecked = formData.aceptaReglamento && formData.aceptaEpp && formData.aceptaTratamientoDatos;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!obraId) return;

    if (!formData.firmaDataUrl) {
      toast({ variant: 'destructive', title: 'Firma requerida', description: 'Por favor, firme en el recuadro para continuar.' });
      return;
    }
    if (!allConsentsChecked) {
      toast({ variant: 'destructive', title: 'Consentimiento requerido', description: 'Debe aceptar todos los términos para continuar.' });
      return;
    }

    setIsSaving(true);
    try {
      await guardarInduccionQR({
        ...formData,
        obraId,
        obraNombre: obra?.nombreFaena,
      });
      router.push(`/public/induccion/success?obra=${encodeURIComponent(obra?.nombreFaena || '')}`);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error al registrar', description: error.message });
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /> Cargando...</div>;
  }

  if (!obra) {
    return <div className="text-center p-8">Obra no encontrada. Verifique el código QR.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 md:p-8 flex items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
           <div className="mx-auto w-fit mb-4">
                <PcgLogo />
           </div>
          <CardTitle className="text-2xl">Inducción de Acceso a Obra</CardTitle>
          <CardDescription>
            <p className="flex items-center justify-center gap-2"><Building className="h-4 w-4" />{obra.nombreFaena}</p>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <fieldset className="space-y-4 p-4 border rounded-md">
                <legend className="text-lg font-semibold px-1">Información del Visitante</legend>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label htmlFor="nombreCompleto">Nombre Completo*</Label><Input id="nombreCompleto" value={formData.nombreCompleto} onChange={(e) => handleInputChange('nombreCompleto', e.target.value)} required /></div>
                    <div className="space-y-2"><Label htmlFor="rut">RUT/ID*</Label><Input id="rut" value={formData.rut} onChange={(e) => handleInputChange('rut', e.target.value)} required /></div>
                    <div className="space-y-2"><Label htmlFor="empresa">Empresa*</Label><Input id="empresa" value={formData.empresa} onChange={(e) => handleInputChange('empresa', e.target.value)} required /></div>
                    <div className="space-y-2"><Label htmlFor="cargo">Cargo/Ocupación</Label><Input id="cargo" value={formData.cargo} onChange={(e) => handleInputChange('cargo', e.target.value)} /></div>
                    <div className="space-y-2"><Label htmlFor="telefono">Teléfono</Label><Input id="telefono" type="tel" value={formData.telefono} onChange={(e) => handleInputChange('telefono', e.target.value)} /></div>
                    <div className="space-y-2"><Label htmlFor="correo">Correo Electrónico</Label><Input id="correo" type="email" value={formData.correo} onChange={(e) => handleInputChange('correo', e.target.value)} /></div>
                    <div className="space-y-2"><Label htmlFor="tipoVisita">Motivo de Ingreso</Label>
                        <Select value={formData.tipoVisita} onValueChange={(v) => handleInputChange('tipoVisita', v as any)}><SelectTrigger id="tipoVisita"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="VISITA">Visita Técnica</SelectItem><SelectItem value="PROVEEDOR">Proveedor</SelectItem><SelectItem value="INSPECTOR">Inspección/Fiscalización</SelectItem><SelectItem value="OTRO">Otro</SelectItem></SelectContent></Select>
                    </div>
                </div>
            </fieldset>

            <fieldset className="space-y-4 p-4 border rounded-md">
                 <legend className="text-lg font-semibold px-1 flex items-center gap-2"><ShieldQuestion className="h-5 w-5 text-blue-600"/> Cuestionario de Seguridad</legend>
                 <div className="space-y-3 text-sm">
                    <p>1. ¿Ha sido informado de los riesgos principales de la obra?</p>
                    <p className="font-bold text-red-600">Respuesta Correcta: NO</p>
                    <p>2. ¿Se compromete a utilizar en todo momento los Elementos de Protección Personal (EPP) requeridos?</p>
                    <p className="font-bold text-green-600">Respuesta Correcta: SI</p>
                    <p>3. ¿Se compromete a respetar la señalización y las instrucciones del personal de la obra?</p>
                    <p className="font-bold text-green-600">Respuesta Correcta: SI</p>
                 </div>
            </fieldset>

            <fieldset className="space-y-4 p-4 border rounded-md">
                 <legend className="text-lg font-semibold px-1">Consentimientos y Firma</legend>
                 <div className="space-y-3">
                    <div className="flex items-start gap-2"><Checkbox id="aceptaReglamento" checked={formData.aceptaReglamento} onCheckedChange={(c) => handleInputChange('aceptaReglamento', !!c)} /><Label htmlFor="aceptaReglamento" className="text-xs">Declaro haber sido informado y me comprometo a cumplir el Reglamento Interno de Higiene y Seguridad de la obra.</Label></div>
                    <div className="flex items-start gap-2"><Checkbox id="aceptaEpp" checked={formData.aceptaEpp} onCheckedChange={(c) => handleInputChange('aceptaEpp', !!c)}/><Label htmlFor="aceptaEpp" className="text-xs">Confirmo que dispongo y utilizaré los EPP básicos (casco, zapatos de seguridad, chaleco reflectante) en todo momento.</Label></div>
                    <div className="flex items-start gap-2"><Checkbox id="aceptaTratamientoDatos" checked={formData.aceptaTratamientoDatos} onCheckedChange={(c) => handleInputChange('aceptaTratamientoDatos', !!c)}/><Label htmlFor="aceptaTratamientoDatos" className="text-xs">Autorizo el tratamiento de mis datos personales para fines de control de acceso y seguridad.</Label></div>
                 </div>
                 <div className="space-y-2 pt-4">
                    <Label>Firme en el recuadro para confirmar su identidad y aceptación:</Label>
                    <SignaturePad onChange={handleSignatureChange} />
                 </div>
            </fieldset>
            
            <Button type="submit" disabled={isSaving || !allConsentsChecked || !formData.firmaDataUrl} className="w-full">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSaving ? 'Registrando...' : 'Registrar Ingreso y Finalizar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


export default function PublicInduccionPageWrapper() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>}>
      <PublicInduccionPageInner />
    </Suspense>
  )
}
