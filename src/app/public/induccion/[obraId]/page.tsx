// src/app/public/induccion/[obraId]/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Loader2, ShieldX, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  InduccionAccesoFaena,
  guardarInduccionQR,
} from "@/lib/induccionAccesoFaena";
import SignaturePad from "@/app/prevencion/hallazgos/components/SignaturePad";
import { PcgLogo } from "@/components/branding/PcgLogo";

interface Obra {
  id?: string;
  nombreFaena: string;
}

export default function PublicInduccionPage() {
  const params = useParams<{ obraId: string }>();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [obra, setObra] = useState<Obra | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [formState, setFormState] = useState<
    Omit<InduccionAccesoFaena, "id" | "createdAt" | "obraNombre">
  >({
    obraId: params.obraId,
    generadorId: searchParams.get("g"),
    tipoVisita: "VISITA",
    nombreCompleto: "",
    rut: "",
    empresa: "",
    cargo: "",
    telefono: "",
    correo: "",
    fechaIngreso: new Date().toISOString().slice(0, 10),
    horaIngreso: new Date().toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    respuestaPregunta1: "NO",
    respuestaPregunta2: "NO",
    respuestaPregunta3: "NO",
    aceptaReglamento: false,
    aceptaEpp: false,
    aceptaTratamientoDatos: false,
    firmaDataUrl: "",
  });

  useEffect(() => {
    const fetchObra = async () => {
      setLoading(true);
      try {
        const obraRef = doc(firebaseDb, "obras", params.obraId);
        const obraSnap = await getDoc(obraRef);
        if (!obraSnap.exists()) {
          throw new Error("La obra no fue encontrada.");
        }
        setObra({ id: obraSnap.id, ...obraSnap.data() } as Obra);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al cargar datos de la obra."
        );
      } finally {
        setLoading(false);
      }
    };
    fetchObra();
  }, [params.obraId]);

  const handleInputChange = (
    field: keyof typeof formState,
    value: string | boolean
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };
  
  const validateForm = (): boolean => {
    const { nombreCompleto, rut, empresa, correo, aceptaReglamento, aceptaEpp, aceptaTratamientoDatos, firmaDataUrl } = formState;
    if (!nombreCompleto || !rut || !empresa || !correo) {
        toast({variant: 'destructive', title: 'Campos requeridos', description: 'Nombre, RUT, empresa y correo son obligatorios.'});
        return false;
    }
    if (!aceptaReglamento || !aceptaEpp || !aceptaTratamientoDatos) {
        toast({variant: 'destructive', title: 'Aceptaciones requeridas', description: 'Debe aceptar todos los términos para continuar.'});
        return false;
    }
    if (!firmaDataUrl) {
         toast({variant: 'destructive', title: 'Firma requerida', description: 'Debe firmar el documento para registrar su ingreso.'});
        return false;
    }
    return true;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
        if (!obra) throw new Error("Datos de obra no cargados.");
        
        await guardarInduccionQR({
            ...formState,
            obraNombre: obra.nombreFaena,
        });

        setIsSubmitted(true); // Mostrar pantalla de éxito
        
    } catch (err) {
        toast({ variant: 'destructive', title: 'Error al registrar', description: err instanceof Error ? err.message : 'Ocurrió un error desconocido.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (error) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
            <ShieldX className="h-16 w-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold">Error de Carga</h1>
            <p className="text-muted-foreground mt-2">{error}</p>
        </div>
    );
  }

  if (isSubmitted) {
    return (
        <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                    <CardTitle className="text-2xl">¡Registro Exitoso!</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Tu inducción de acceso ha sido registrada correctamente. Ya puedes cerrar esta ventana.
                    </p>
                </CardContent>
                <CardFooter className="flex-col gap-4">
                    <Button onClick={() => window.close()} className="w-full">Cerrar</Button>
                    <p className="text-xs text-muted-foreground pt-2">
                        PCG - Plataforma de Control y Gestión
                    </p>
                </CardFooter>
            </Card>
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto"><PcgLogo /></div>
            <CardTitle className="text-2xl">
              Inducción de Acceso a Faena
            </CardTitle>
            <CardDescription>Obra: {obra?.nombreFaena}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <section className="space-y-4">
                 <h3 className="font-semibold border-b pb-2">1. Tus Datos</h3>
                  <div className="space-y-2">
                    <Label htmlFor="tipoVisita">Tipo de Visita*</Label>
                    <Select value={formState.tipoVisita} onValueChange={(v) => handleInputChange("tipoVisita", v as any)}>
                      <SelectTrigger id="tipoVisita"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VISITA">Visita</SelectItem>
                        <SelectItem value="PROVEEDOR">Proveedor</SelectItem>
                        <SelectItem value="INSPECTOR">Inspector</SelectItem>
                        <SelectItem value="OTRO">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label htmlFor="nombreCompleto">Nombre Completo*</Label><Input id="nombreCompleto" value={formState.nombreCompleto} onChange={(e) => handleInputChange("nombreCompleto", e.target.value)} /></div>
                    <div className="space-y-2"><Label htmlFor="rut">RUT*</Label><Input id="rut" value={formState.rut} onChange={(e) => handleInputChange("rut", e.target.value)} /></div>
                    <div className="space-y-2"><Label htmlFor="empresa">Empresa*</Label><Input id="empresa" value={formState.empresa} onChange={(e) => handleInputChange("empresa", e.target.value)} /></div>
                    <div className="space-y-2"><Label htmlFor="cargo">Cargo*</Label><Input id="cargo" value={formState.cargo} onChange={(e) => handleInputChange("cargo", e.target.value)} /></div>
                    <div className="space-y-2"><Label htmlFor="telefono">Teléfono*</Label><Input id="telefono" type="tel" value={formState.telefono} onChange={(e) => handleInputChange("telefono", e.target.value)} /></div>
                    <div className="space-y-2"><Label htmlFor="correo">Correo Electrónico*</Label><Input id="correo" type="email" value={formState.correo} onChange={(e) => handleInputChange("correo", e.target.value)} /></div>
                 </div>
              </section>
              
              <section className="space-y-4">
                  <h3 className="font-semibold border-b pb-2">2. Preguntas de Comprensión</h3>
                  <div className="space-y-3 text-sm">
                      <p><strong>1. ¿Debe respetar en todo momento las señaléticas y las indicaciones del personal de la obra?</strong></p>
                      <div className="flex gap-4"><Label className="flex items-center gap-2"><input type="radio" name="p1" value="SI" checked={formState.respuestaPregunta1 === 'SI'} onChange={() => handleInputChange("respuestaPregunta1", "SI")}/> Sí</Label><Label className="flex items-center gap-2"><input type="radio" name="p1" value="NO" checked={formState.respuestaPregunta1 === 'NO'} onChange={() => handleInputChange("respuestaPregunta1", "NO")}/> No</Label></div>
                      
                      <p><strong>2. ¿Está permitido caminar bajo cargas suspendidas o por zonas no autorizadas?</strong></p>
                      <div className="flex gap-4"><Label className="flex items-center gap-2"><input type="radio" name="p2" value="SI" checked={formState.respuestaPregunta2 === 'SI'} onChange={() => handleInputChange("respuestaPregunta2", "SI")}/> Sí</Label><Label className="flex items-center gap-2"><input type="radio" name="p2" value="NO" checked={formState.respuestaPregunta2 === 'NO'} onChange={() => handleInputChange("respuestaPregunta2", "NO")}/> No</Label></div>
                      
                      <p><strong>3. En caso de una emergencia, ¿debe seguir las rutas de evacuación señalizadas y acudir a la zona de seguridad?</strong></p>
                      <div className="flex gap-4"><Label className="flex items-center gap-2"><input type="radio" name="p3" value="SI" checked={formState.respuestaPregunta3 === 'SI'} onChange={() => handleInputChange("respuestaPregunta3", "SI")}/> Sí</Label><Label className="flex items-center gap-2"><input type="radio" name="p3" value="NO" checked={formState.respuestaPregunta3 === 'NO'} onChange={() => handleInputChange("respuestaPregunta3", "NO")}/> No</Label></div>
                  </div>
              </section>

              <section className="space-y-4">
                 <h3 className="font-semibold border-b pb-2">3. Declaración y Compromiso</h3>
                 <div className="space-y-3 text-sm">
                     <Label className="flex items-center gap-2 font-normal"><Checkbox checked={formState.aceptaReglamento} onCheckedChange={c => handleInputChange('aceptaReglamento', !!c)} /><span>Declaro haber leído y comprendido el Reglamento Especial para Empresas Contratistas y Subcontratistas (si aplica).</span></Label>
                     <Label className="flex items-center gap-2 font-normal"><Checkbox checked={formState.aceptaEpp} onCheckedChange={c => handleInputChange('aceptaEpp', !!c)} /><span>Me comprometo a utilizar en todo momento los Elementos de Protección Personal (EPP) que sean requeridos para ingresar y permanecer en la obra.</span></Label>
                     <Label className="flex items-center gap-2 font-normal"><Checkbox checked={formState.aceptaTratamientoDatos} onCheckedChange={c => handleInputChange('aceptaTratamientoDatos', !!c)} /><span>Acepto el tratamiento de mis datos personales para fines de registro, seguridad y cumplimiento normativo.</span></Label>
                 </div>
              </section>

              <section className="space-y-4">
                <h3 className="font-semibold border-b pb-2">4. Firma de Aceptación*</h3>
                <SignaturePad onChange={(url) => handleInputChange('firmaDataUrl', url || "")} onClear={() => handleInputChange('firmaDataUrl', "")} />
              </section>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? 'Registrando ingreso...' : 'Registrar Ingreso y Finalizar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
