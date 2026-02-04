// src/app/public/induccion/[obraId]/page.tsx
"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck, User, Building, Phone, Mail } from "lucide-react";
import { PcgLogo } from "@/components/branding/PcgLogo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { guardarInduccionQR } from '@/lib/induccionAccesoFaena';
import { getDoc, doc } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import SignaturePad from "@/app/prevencion/hallazgos/components/SignaturePad";

interface ObraData {
  id: string;
  nombreFaena: string;
  mandante: string;
}

const initialFormData = {
    tipoVisita: "VISITA" as "VISITA" | "PROVEEDOR" | "INSPECTOR" | "OTRO",
    nombreCompleto: "",
    rut: "",
    empresa: "",
    cargo: "",
    telefono: "",
    correo: "",
    respuestaPregunta1: "SI" as "SI" | "NO",
    respuestaPregunta2: "NO" as "SI" | "NO",
    respuestaPregunta3: "SI" as "SI" | "NO",
    aceptaReglamento: false,
    aceptaEpp: false,
    aceptaTratamientoDatos: false,
};

function PublicInduccionPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();

    const [obra, setObra] = useState<ObraData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState(initialFormData);
    const signatureRef = useRef<string | null>(null);

    const obraId = params.obraId as string;
    const token = searchParams.get("g");

    useEffect(() => {
        if (!obraId) {
            setError("ID de obra no encontrado en la URL.");
            setLoading(false);
            return;
        }

        const fetchObra = async () => {
            const obraRef = doc(firebaseDb, "obras", obraId);
            const snap = await getDoc(obraRef);
            if (snap.exists()) {
                setObra({ id: snap.id, ...snap.data() } as ObraData);
            } else {
                setError("La obra especificada no existe.");
            }
            setLoading(false);
        };

        fetchObra();
    }, [obraId]);

    const handleInputChange = (
        field: keyof typeof formData,
        value: string | boolean
    ) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const onSubmit = async (e: React.FormEvent) => {
        console.log("1️⃣ submit start");
        e.preventDefault();
        console.log("2️⃣ after preventDefault");

        if (
            !formData.aceptaReglamento ||
            !formData.aceptaEpp ||
            !formData.aceptaTratamientoDatos
        ) {
            setError("Debe aceptar todos los compromisos para continuar.");
            return;
        }

        if (!signatureRef.current) {
            setError("La firma es obligatoria para registrar el ingreso.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        console.log("3️⃣ formData", formData);
        console.log("3️⃣ token", token);
        console.log("3️⃣ obraId", obraId);

        try {
            console.log("4️⃣ before signature");
            console.log("4️⃣ signatureRef", signatureRef.current);

            const dataToSave = {
                obraId,
                obraNombre: obra?.nombreFaena || "Desconocida",
                generadorId: token,
                ...formData,
                fechaIngreso: new Date().toISOString().slice(0, 10),
                horaIngreso: new Date().toLocaleTimeString("es-CL", {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
                firmaDataUrl: signatureRef.current,
            };

            console.log("5️⃣ before save");
            await guardarInduccionQR(dataToSave);
            
            toast({
                title: "Registro Exitoso",
                description: "Tu inducción ha sido guardada. Puedes ingresar.",
            });
            
            // Simular un estado de éxito
            setTimeout(() => {
                // Aquí se podría mostrar un mensaje final o redirigir
            }, 2000);

        } catch (err: any) {
            console.error("Error al guardar la inducción:", err);
            setError(err.message || "Ocurrió un error al guardar el registro.");
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
        );
    }
    
    if (error) {
        return <div className="text-center p-8 text-destructive">{error}</div>;
    }


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted/40 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-fit mb-4">
            <PcgLogo />
          </div>
          <CardTitle>Inducción de Acceso a Faena</CardTitle>
          <CardDescription>
            Obra: {obra?.nombreFaena || 'Cargando...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            
            {/* Sección de datos personales */}
            <fieldset className="space-y-4 rounded-lg border p-4">
              <legend className="-ml-1 px-1 text-sm font-medium">
                Tus Datos
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="nombreCompleto">Nombre Completo</Label>
                  <Input id="nombreCompleto" value={formData.nombreCompleto} onChange={(e) => handleInputChange('nombreCompleto', e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rut">RUT</Label>
                  <Input id="rut" value={formData.rut} onChange={(e) => handleInputChange('rut', e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="empresa">Empresa</Label>
                  <Input id="empresa" value={formData.empresa} onChange={(e) => handleInputChange('empresa', e.target.value)} required />
                </div>
                 <div className="space-y-1">
                  <Label htmlFor="cargo">Cargo</Label>
                  <Input id="cargo" value={formData.cargo} onChange={(e) => handleInputChange('cargo', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input id="telefono" type="tel" value={formData.telefono} onChange={(e) => handleInputChange('telefono', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="correo">Correo Electrónico</Label>
                  <Input id="correo" type="email" value={formData.correo} onChange={(e) => handleInputChange('correo', e.target.value)} />
                </div>
              </div>
            </fieldset>

            {/* Sección de preguntas */}
            <fieldset className="space-y-4 rounded-lg border p-4">
               <legend className="-ml-1 px-1 text-sm font-medium">
                Cuestionario de Seguridad
              </legend>
               <div className="space-y-3">
                    <p className="text-sm">1. ¿Debe respetar siempre las indicaciones del personal de la obra?</p>
                    <Select value={formData.respuestaPregunta1} onValueChange={(v) => handleInputChange('respuestaPregunta1', v)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="SI">Sí</SelectItem>
                            <SelectItem value="NO">No</SelectItem>
                        </SelectContent>
                    </Select>
               </div>
               <div className="space-y-3">
                    <p className="text-sm">2. ¿Está permitido caminar bajo cargas suspendidas?</p>
                     <Select value={formData.respuestaPregunta2} onValueChange={(v) => handleInputChange('respuestaPregunta2', v)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="NO">No</SelectItem>
                            <SelectItem value="SI">Sí</SelectItem>
                        </SelectContent>
                    </Select>
               </div>
               <div className="space-y-3">
                    <p className="text-sm">3. En caso de emergencia, ¿debe seguir las rutas de evacuación?</p>
                     <Select value={formData.respuestaPregunta3} onValueChange={(v) => handleInputChange('respuestaPregunta3', v)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                           <SelectItem value="SI">Sí</SelectItem>
                           <SelectItem value="NO">No</SelectItem>
                        </SelectContent>
                    </Select>
               </div>
            </fieldset>

            {/* Aceptaciones y Firma */}
             <fieldset className="space-y-4 rounded-lg border p-4">
                <legend className="-ml-1 px-1 text-sm font-medium">
                    Declaración y Firma
                </legend>
                 <div className="space-y-3">
                    <Label className="flex items-center gap-3 font-normal"><Checkbox checked={formData.aceptaReglamento} onCheckedChange={(c) => handleInputChange('aceptaReglamento', !!c)} /><span>Declaro haber leído y comprendido el Reglamento Especial de Faena.</span></Label>
                    <Label className="flex items-center gap-3 font-normal"><Checkbox checked={formData.aceptaEpp} onCheckedChange={(c) => handleInputChange('aceptaEpp', !!c)} /><span>Me comprometo a utilizar los Elementos de Protección Personal (EPP) requeridos.</span></Label>
                    <Label className="flex items-center gap-3 font-normal"><Checkbox checked={formData.aceptaTratamientoDatos} onCheckedChange={(c) => handleInputChange('aceptaTratamientoDatos', !!c)} /><span>Acepto el tratamiento de mis datos personales según la política de privacidad.</span></Label>
                 </div>
                 <div>
                    <Label className="mb-2 block">Firma Digital</Label>
                    <SignaturePad onChange={(data) => (signatureRef.current = data)} onClear={() => (signatureRef.current = null)} />
                 </div>
            </fieldset>

            {error && <p className="text-sm font-medium text-destructive text-center">{error}</p>}
            
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Registrando..." : "Registrar Ingreso y Finalizar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PublicInduccionPageWrapper() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Cargando...</div>}>
            <PublicInduccionPage />
        </Suspense>
    );
}