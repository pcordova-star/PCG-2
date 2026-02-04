// src/app/public/induccion/[obraId]/page.tsx
"use client";

import { useEffect, useState, useRef, Suspense, FormEvent } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ShieldCheck } from "lucide-react";
import { PcgLogo } from "@/components/branding/PcgLogo";
import SignaturePad from "@/app/prevencion/hallazgos/components/SignaturePad";
import { getDoc, doc } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import { Obra } from "@/types/pcg";
import { InduccionAccesoFaena, guardarInduccionQR } from '@/lib/induccionAccesoFaena';
import { useToast } from "@/hooks/use-toast";

function InduccionForm() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const obraId = params.obraId as string;
  const generadorId = searchParams.get('g');

  const [obra, setObra] = useState<Obra | null>(null);
  const [loadingObra, setLoadingObra] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<InduccionAccesoFaena>>({
    tipoVisita: "VISITA",
    nombreCompleto: "",
    rut: "",
    empresa: "",
    cargo: "",
    telefono: "",
    correo: "",
    fechaIngreso: new Date().toISOString().slice(0, 10),
    horaIngreso: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
    respuestaPregunta1: undefined,
    respuestaPregunta2: undefined,
    respuestaPregunta3: undefined,
    aceptaReglamento: false,
    aceptaEpp: false,
    aceptaTratamientoDatos: false,
  });
  const [firmaDataUrl, setFirmaDataUrl] = useState<string | null>(null);


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

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({...prev, [field]: value}));
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    console.log("1️⃣ submit start");

    // Validations
    const requiredFields: (keyof typeof formData)[] = ['tipoVisita', 'nombreCompleto', 'rut', 'empresa', 'cargo', 'fechaIngreso', 'horaIngreso'];
    for (const field of requiredFields) {
        if (!formData[field]) {
            setError(`El campo "${field}" es obligatorio.`);
            toast({ variant: 'destructive', title: 'Error', description: `El campo "${field}" es obligatorio.` });
            return;
        }
    }
    if (!formData.aceptaReglamento || !formData.aceptaEpp || !formData.aceptaTratamientoDatos) {
        setError("Debe aceptar todos los compromisos para continuar.");
        toast({ variant: 'destructive', title: 'Error', description: "Debe aceptar todos los compromisos para continuar." });
        return;
    }
    if (!firmaDataUrl) {
         setError("La firma es obligatoria.");
         toast({ variant: 'destructive', title: 'Error', description: "Debe registrar su firma." });
         return;
    }
    
    setIsSubmitting(true);
    setError(null);
    console.log("2️⃣ after preventDefault");
    
    try {
        const dataToSave = {
            ...formData,
            obraId,
            obraNombre: obra?.nombreFaena,
            generadorId,
            firmaDataUrl,
        } as Omit<InduccionAccesoFaena, 'id'>;

        console.log("3️⃣ formData", dataToSave);
        
        console.log("5️⃣ before save");
        const docId = await guardarInduccionQR(dataToSave);
        
        toast({
            title: "Inducción Registrada",
            description: "Tu ingreso ha sido registrado con éxito. Ya puedes cerrar esta ventana."
        });

        // Optionally, redirect to a success page
        // router.push(`/public/induccion/success?id=${docId}`);
        // For now, just disable form
        // setFormSubmitted(true);

    } catch (err: any) {
        console.error("Error al guardar la inducción:", err);
        setError(err.message || "Ocurrió un error al enviar el formulario.");
        toast({
            variant: 'destructive',
            title: 'Error de Envío',
            description: err.message || "No se pudo guardar la inducción. Por favor, intente de nuevo."
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (loadingObra) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Cargando información de la obra...</p>
        </div>
    );
  }

  if (error) {
      return (
        <div className="text-center p-8 text-destructive bg-red-50 rounded-lg">
            <h3 className="font-bold">Error</h3>
            <p>{error}</p>
        </div>
      );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center space-y-2">
            <PcgLogo />
            <CardTitle className="text-2xl">Inducción de Acceso a Faena</CardTitle>
            <CardDescription>Obra: <span className="font-semibold">{obra?.nombreFaena}</span></CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Section 1: Datos Personales */}
                <fieldset className="space-y-4 p-4 border rounded-lg">
                    <legend className="text-lg font-semibold px-2">1. Datos Personales</legend>
                    {/* ... form fields ... */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="tipoVisita">Tipo de Visita*</Label>
                            <Select value={formData.tipoVisita} onValueChange={(v) => handleInputChange('tipoVisita', v)}>
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
                            <Label htmlFor="nombreCompleto">Nombre Completo*</Label>
                            <Input id="nombreCompleto" value={formData.nombreCompleto} onChange={(e) => handleInputChange('nombreCompleto', e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="rut">RUT*</Label>
                            <Input id="rut" value={formData.rut} onChange={(e) => handleInputChange('rut', e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="empresa">Empresa*</Label>
                            <Input id="empresa" value={formData.empresa} onChange={(e) => handleInputChange('empresa', e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="cargo">Cargo / Ocupación*</Label>
                            <Input id="cargo" value={formData.cargo} onChange={(e) => handleInputChange('cargo', e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="telefono">Teléfono de Contacto</Label>
                            <Input id="telefono" type="tel" value={formData.telefono} onChange={(e) => handleInputChange('telefono', e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="fechaIngreso">Fecha de Ingreso*</Label>
                            <Input id="fechaIngreso" type="date" value={formData.fechaIngreso} onChange={(e) => handleInputChange('fechaIngreso', e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="horaIngreso">Hora de Ingreso*</Label>
                            <Input id="horaIngreso" type="time" value={formData.horaIngreso} onChange={(e) => handleInputChange('horaIngreso', e.target.value)} />
                        </div>
                    </div>
                </fieldset>

                {/* Section 2: Comprensión */}
                <fieldset className="space-y-4 p-4 border rounded-lg">
                    <legend className="text-lg font-semibold px-2">2. Preguntas de Comprensión</legend>
                    {/* ... question fields ... */}
                    <div className="space-y-3">
                        <Label className="font-normal">¿Debe respetar siempre las indicaciones del personal de la obra (Jefe de Obra, Supervisor, Prevencionista)?</Label>
                        <Select onValueChange={(v) => handleInputChange('respuestaPregunta1', v as any)}><SelectTrigger><SelectValue placeholder="Seleccione..."/></SelectTrigger><SelectContent><SelectItem value="SI">Sí</SelectItem><SelectItem value="NO">No</SelectItem></SelectContent></Select>
                    </div>
                     <div className="space-y-3">
                        <Label className="font-normal">¿Está permitido caminar o permanecer bajo cargas suspendidas por grúas?</Label>
                        <Select onValueChange={(v) => handleInputChange('respuestaPregunta2', v as any)}><SelectTrigger><SelectValue placeholder="Seleccione..."/></SelectTrigger><SelectContent><SelectItem value="SI">Sí</SelectItem><SelectItem value="NO">No</SelectItem></SelectContent></Select>
                    </div>
                     <div className="space-y-3">
                        <Label className="font-normal">En caso de emergencia (alarma, sismo), ¿debe seguir las rutas de evacuación señalizadas hacia la zona de seguridad?</Label>
                        <Select onValueChange={(v) => handleInputChange('respuestaPregunta3', v as any)}><SelectTrigger><SelectValue placeholder="Seleccione..."/></SelectTrigger><SelectContent><SelectItem value="SI">Sí</SelectItem><SelectItem value="NO">No</SelectItem></SelectContent></Select>
                    </div>
                </fieldset>
                
                {/* Section 3: Compromisos */}
                <fieldset className="space-y-4 p-4 border rounded-lg">
                    <legend className="text-lg font-semibold px-2">3. Declaración y Compromiso</legend>
                    {/* ... commitment checkboxes ... */}
                    <div className="space-y-3">
                        <Label className="flex items-start gap-3"><Checkbox checked={formData.aceptaReglamento} onCheckedChange={(c) => handleInputChange('aceptaReglamento', !!c)} /><span>Declaro haber leído/recibido el Reglamento Especial para Empresas Contratistas y Subcontratistas y me comprometo a cumplirlo.</span></Label>
                        <Label className="flex items-start gap-3"><Checkbox checked={formData.aceptaEpp} onCheckedChange={(c) => handleInputChange('aceptaEpp', !!c)} /><span>Me comprometo a utilizar los Elementos de Protección Personal (EPP) que la obra defina como obligatorios.</span></Label>
                        <Label className="flex items-start gap-3"><Checkbox checked={formData.aceptaTratamientoDatos} onCheckedChange={(c) => handleInputChange('aceptaTratamientoDatos', !!c)} /><span>Acepto que mis datos sean registrados para fines de seguridad y control de acceso en esta obra.</span></Label>
                    </div>
                </fieldset>
                
                 {/* Section 4: Firma */}
                <fieldset className="space-y-4 p-4 border rounded-lg">
                    <legend className="text-lg font-semibold px-2">4. Firma</legend>
                    <SignaturePad onChange={setFirmaDataUrl} onClear={() => setFirmaDataUrl(null)} />
                </fieldset>

                {error && <p className="text-sm font-medium text-destructive">{error}</p>}

                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ShieldCheck className="mr-2 h-4 w-4"/>}
                    {isSubmitting ? 'Registrando...' : 'Registrar Ingreso y Finalizar'}
                </Button>
            </form>
        </CardContent>
    </Card>
  );
}


export default function Page() {
  return (
    <div className="min-h-screen bg-muted/40 p-4 md:p-8">
        <Suspense fallback={<div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>}>
            <InduccionForm />
        </Suspse>
    </div>
  );
}
