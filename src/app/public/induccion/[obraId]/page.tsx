// src/app/public/induccion/[obraId]/page.tsx
"use client";

import React, { useState, useEffect, FormEvent, useRef, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, ShieldCheck, User, Building, Phone, Mail } from "lucide-react";
import { PcgLogo } from "@/components/branding/PcgLogo";
import { useToast } from "@/hooks/use-toast";
import { getDoc, doc } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import SignaturePad from "@/app/prevencion/hallazgos/components/SignaturePad";

// ¡IMPORTANTE! Se importa desde la ruta que causa el problema para replicar el error.
import {
  guardarInduccionQR,
  InduccionAccesoFaena,
} from "@/lib/prevencionEventos";

type Obra = {
  id: string;
  nombreFaena: string;
};

function PublicInduccionForm() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const obraId = params.obraId as string;
  const generadorId = searchParams.get("g");

  const [obra, setObra] = useState<Obra | null>(null);
  const [loadingObra, setLoadingObra] = useState(true);

  // Estados del formulario
  const [formData, setFormData] = useState<
    Omit<InduccionAccesoFaena, "id" | "createdAt" | "obraId" | "obraNombre">
  >({
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
    respuestaPregunta1: "SI",
    respuestaPregunta2: "NO",
    respuestaPregunta3: "SI",
    aceptaReglamento: false,
    aceptaEpp: false,
    aceptaTratamientoDatos: false,
    firmaDataUrl: "",
    generadorId: generadorId,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Referencia al canvas de firma, aunque usamos el estado del Data URL
  const signatureRef = useRef(null);

  useEffect(() => {
    if (obraId) {
      getDoc(doc(firebaseDb, "obras", obraId))
        .then((docSnap) => {
          if (docSnap.exists()) {
            setObra({ id: docSnap.id, ...docSnap.data() } as Obra);
          } else {
            setError("La obra especificada no existe.");
          }
        })
        .catch(() => setError("No se pudo cargar la información de la obra."))
        .finally(() => setLoadingObra(false));
    }
  }, [obraId]);

  const handleInputChange = (
    field: keyof typeof formData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSignatureChange = (dataUrl: string | null) => {
    setFormData((prev) => ({ ...prev, firmaDataUrl: dataUrl || "" }));
  };

  const handleSubmit = async (e: FormEvent) => {
    console.log("1️⃣ submit start");
    e.preventDefault();
    console.log("2️⃣ after preventDefault");

    setError(null);

    // --- Validaciones ---
    if (
      !formData.nombreCompleto ||
      !formData.rut ||
      !formData.empresa ||
      !formData.cargo
    ) {
      const newError = "Por favor, complete todos los datos personales.";
      setError(newError);
      toast({ variant: "destructive", title: "Error", description: newError });
      return;
    }
    if (!formData.aceptaReglamento || !formData.aceptaEpp) {
      const newError = "Debe aceptar el reglamento y el uso de EPP.";
      setError(newError);
      toast({ variant: "destructive", title: "Error", description: newError });
      return;
    }
    if (!formData.firmaDataUrl) {
      const newError = "La firma es obligatoria para registrar el ingreso.";
      setError(newError);
      toast({ variant: "destructive", title: "Error", description: newError });
      return;
    }

    setIsSaving(true);
    const token = "dummy-token-for-logging"; // Simulado para el log

    const dataToSave: Omit<InduccionAccesoFaena, "id" | "createdAt"> = {
      ...formData,
      obraId: obraId,
      obraNombre: obra?.nombreFaena || "No especificado",
    };

    console.log("3️⃣ formData", dataToSave);
    console.log("3️⃣ token", token);
    console.log("3️⃣ obraId", obraId);
    console.log("4️⃣ before signature");
    console.log("4️⃣ firmaDataUrl (from state)", formData.firmaDataUrl ? `${formData.firmaDataUrl.substring(0, 50)}...` : null);

    console.log("5️⃣ before save");

    try {
        await guardarInduccionQR(dataToSave);
        toast({
            title: "Registro Exitoso",
            description: "Tu inducción ha sido guardada. ¡Bienvenido(a) a la obra!",
        });
        // Aquí iría el botón de cerrar que mencionaste.
        // Por ahora, solo mostraremos un mensaje de éxito.
        document.body.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-align:center;">
          <h1 style="color:green;font-size:2rem;">✅ Registro Exitoso</h1>
          <p>Tu inducción ha sido guardada. Ya puedes cerrar esta ventana.</p>
        </div>`;
    } catch (err: any) {
        console.error("Error en handleSubmit:", err);
        setError(err.message || "Ocurrió un error al guardar. Intenta nuevamente.");
        toast({
            variant: "destructive",
            title: "Error al Guardar",
            description: err.message || "No se pudo completar el registro.",
        });
    } finally {
        setIsSaving(false);
    }
  };

  if (loadingObra) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Cargando formulario...</p>
      </div>
    );
  }

  if (error && !obra) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
        <ShieldX className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Error al Cargar la Inducción</h1>
        <p className="text-muted-foreground mt-2">{error}</p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader className="text-center">
          <PcgLogo />
          <CardTitle className="text-xl">
            Inducción de Acceso a Faena: {obra?.nombreFaena}
          </CardTitle>
          <CardDescription>
            Complete este formulario para registrar su ingreso.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ... campos del formulario ... */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="nombre">Nombre Completo*</Label>
              <Input
                id="nombre"
                value={formData.nombreCompleto}
                onChange={(e) =>
                  handleInputChange("nombreCompleto", e.target.value)
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rut">RUT*</Label>
              <Input
                id="rut"
                value={formData.rut}
                onChange={(e) => handleInputChange("rut", e.target.value)}
              />
            </div>
          </div>
          {/* ... más campos ... */}
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1"><Label htmlFor="empresa">Empresa*</Label><Input id="empresa" value={formData.empresa} onChange={e => handleInputChange('empresa', e.target.value)} /></div>
                <div className="space-y-1"><Label htmlFor="cargo">Cargo*</Label><Input id="cargo" value={formData.cargo} onChange={e => handleInputChange('cargo', e.target.value)} /></div>
            </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1"><Label htmlFor="telefono">Teléfono</Label><Input id="telefono" type="tel" value={formData.telefono} onChange={e => handleInputChange('telefono', e.target.value)} /></div>
                <div className="space-y-1"><Label htmlFor="correo">Correo</Label><Input id="correo" type="email" value={formData.correo} onChange={e => handleInputChange('correo', e.target.value)} /></div>
            </div>
        </CardContent>
      </Card>
      
       <Card>
        <CardHeader>
          <CardTitle>Preguntas de Comprensión</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>¿Debe respetar siempre las indicaciones del personal de la obra?</Label>
            <RadioGroup value={formData.respuestaPregunta1} onValueChange={v => handleInputChange('respuestaPregunta1', v)} className="flex gap-4"><Label className="flex items-center gap-2"><RadioGroupItem value="SI" />Sí</Label><Label className="flex items-center gap-2"><RadioGroupItem value="NO" />No</Label></RadioGroup>
          </div>
           <div className="space-y-2">
            <Label>¿Está permitido caminar bajo cargas suspendidas?</Label>
            <RadioGroup value={formData.respuestaPregunta2} onValueChange={v => handleInputChange('respuestaPregunta2', v)} className="flex gap-4"><Label className="flex items-center gap-2"><RadioGroupItem value="SI" />Sí</Label><Label className="flex items-center gap-2"><RadioGroupItem value="NO" />No</Label></RadioGroup>
          </div>
           <div className="space-y-2">
            <Label>En caso de emergencia, ¿debe seguir las rutas de evacuación?</Label>
            <RadioGroup value={formData.respuestaPregunta3} onValueChange={v => handleInputChange('respuestaPregunta3', v)} className="flex gap-4"><Label className="flex items-center gap-2"><RadioGroupItem value="SI" />Sí</Label><Label className="flex items-center gap-2"><RadioGroupItem value="NO" />No</Label></RadioGroup>
          </div>
        </CardContent>
      </Card>
      
       <Card>
        <CardHeader>
          <CardTitle>Declaración y Firma</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
           <Label className="flex items-center gap-2"><Checkbox checked={formData.aceptaReglamento} onCheckedChange={c => handleInputChange('aceptaReglamento', !!c)} />Declaro haber leído y comprendido el Reglamento Especial de la obra.*</Label>
           <Label className="flex items-center gap-2"><Checkbox checked={formData.aceptaEpp} onCheckedChange={c => handleInputChange('aceptaEpp', !!c)} />Me comprometo a utilizar los Elementos de Protección Personal (EPP) requeridos.*</Label>
           <div className="pt-4">
            <Label>Firma*</Label>
             <SignaturePad onChange={handleSignatureChange} onClear={() => handleSignatureChange(null)} />
           </div>
        </CardContent>
      </Card>
      
      {error && <p className="text-sm font-medium text-destructive text-center">{error}</p>}

      <Button type="submit" className="w-full text-lg py-6" disabled={isSaving}>
        {isSaving && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
        Registrar Ingreso y Finalizar
      </Button>
    </form>
  );
}

export default function PublicInduccionPageWrapper() {
  return (
    <div className="min-h-screen bg-muted/40 py-8 px-4">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            Cargando...
          </div>
        }
      >
        <PublicInduccionForm />
      </Suspense>
    </div>
  );
}
