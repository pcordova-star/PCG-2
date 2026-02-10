// src/app/public/control-acceso/[obraId]/page.tsx
"use client";

import { useState, useEffect, FormEvent, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { z } from "zod";
import { useForm, zodResolver } from "react-hook-form";
import { Scanner } from "react-zxing";
import jsQR from "jsqr";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Camera, ShieldCheck, UserCheck, ArrowLeft, X } from "lucide-react";
import { PcgLogo } from "@/components/branding/PcgLogo";
import { doc, getDoc } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import { Obra, InduccionContextualRegistro } from "@/types/pcg";
import { Checkbox } from "@/components/ui/checkbox";
import Link from 'next/link';

// --- Esquema de validación del formulario ---
const formSchema = z.object({
  nombreCompleto: z.string().min(3, "El nombre es requerido"),
  rut: z.string().min(8, "El RUT es requerido"),
  empresa: z.string().min(2, "La empresa es requerida"),
  motivo: z.string().min(5, "El motivo o tarea es requerido"),
  tipoPersona: z.enum(["trabajador", "subcontratista", "visita"]),
  duracionIngreso: z.enum(["visita breve", "jornada parcial", "jornada completa"]),
  archivo: z.instanceof(File).optional().nullable(),
  aceptaTerminos: z.boolean().refine(val => val === true, {
    message: "Debes aceptar los términos y condiciones.",
  }),
});

type FormData = z.infer<typeof formSchema>;

// --- Componente principal de la página ---
export default function PublicControlAccesoPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const obraId = params.obraId as string;

  // --- Estados del componente ---
  const [obra, setObra] = useState<Obra | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"form" | "induction" | "success">("form");
  const [inductionData, setInductionData] = useState<{
    inductionText: string;
    audioUrl: string;
    evidenciaId: string;
  } | null>(null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipoPersona: "visita",
      duracionIngreso: "visita breve",
      aceptaTerminos: false,
    }
  });

  // --- Efecto para cargar datos de la obra ---
  useEffect(() => {
    if (!obraId) return;
    const fetchObra = async () => {
      try {
        const obraRef = doc(firebaseDb, "obras", obraId);
        const obraSnap = await getDoc(obraRef);
        if (obraSnap.exists()) {
          setObra({ id: obraSnap.id, ...obraSnap.data() } as Obra);
        } else {
          toast({ variant: "destructive", title: "Error", description: "La obra no fue encontrada." });
        }
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos de la obra." });
      } finally {
        setIsLoading(false);
      }
    };
    fetchObra();
  }, [obraId, toast]);

  // --- Lógica de escaneo de QR ---
  const handleScan = (result: any) => {
    if (result && result.getText()) {
      const qrData = result.getText();
      try {
        const parts = qrData.split('|');
        if (parts.length >= 4) {
          const run = parts[0];
          const apellidos = `${parts[1]} ${parts[2]}`;
          const nombres = parts[3];
          const nombreCompleto = `${nombres} ${apellidos}`.trim();
          
          setValue("rut", run, { shouldValidate: true });
          setValue("nombreCompleto", nombreCompleto, { shouldValidate: true });
          
          toast({ title: "Éxito", description: "Datos escaneados correctamente." });
          setIsScannerOpen(false);
        } else {
          toast({ variant: "destructive", title: "QR no reconocido", description: "El formato del QR no es el esperado para una cédula chilena." });
        }
      } catch (error) {
         toast({ variant: "destructive", title: "Error al procesar", description: "No se pudo leer la información del código QR." });
      }
    }
  };

  // --- Lógica de envío de formulario ---
  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (value instanceof File) {
            formData.append(key, value);
        } else {
            formData.append(key, String(value));
        }
      }
    });
    formData.append("obraId", obraId);

    try {
      const response = await fetch('/api/control-acceso/submit', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Ocurrió un error en el servidor.");
      }
      
      setInductionData(result);
      setStep("induction");

    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al registrar", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };
  
   const handleConfirmInduction = async () => {
    if (!inductionData) return;
    setIsSubmitting(true);
    try {
        const response = await fetch('/api/control-acceso/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ evidenciaId: inductionData.evidenciaId }),
        });
        if (!response.ok) throw new Error('No se pudo confirmar la inducción.');
        setStep("success");
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  // --- Renderizado ---
  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      {step === "form" && (
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="mx-auto mb-4 w-fit"><PcgLogo /></div>
            <CardTitle className="text-center">Registro de Acceso a Obra</CardTitle>
            <CardDescription className="text-center">
              {obra ? `Estás ingresando a: ${obra.nombreFaena}` : "Cargando datos de la obra..."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Button type="button" onClick={() => setIsScannerOpen(true)} className="w-full bg-blue-600 hover:bg-blue-700">
                <Camera className="mr-2 h-4 w-4" /> Escanear Cédula de Identidad (Recomendado)
              </Button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombreCompleto">Nombre Completo*</Label>
                  <Input id="nombreCompleto" {...register("nombreCompleto")} />
                  {errors.nombreCompleto && <p className="text-xs text-destructive">{errors.nombreCompleto.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rut">RUT*</Label>
                  <Input id="rut" {...register("rut")} />
                  {errors.rut && <p className="text-xs text-destructive">{errors.rut.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="empresa">Empresa que representa*</Label>
                  <Input id="empresa" {...register("empresa")} />
                  {errors.empresa && <p className="text-xs text-destructive">{errors.empresa.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipoPersona">Tipo de Ingreso*</Label>
                  <Select onValueChange={(val) => setValue("tipoPersona", val as any)} defaultValue="visita">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="visita">Visita</SelectItem>
                      <SelectItem value="subcontratista">Subcontratista</SelectItem>
                      <SelectItem value="trabajador">Trabajador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo o Tarea a Realizar*</Label>
                <Textarea id="motivo" {...register("motivo")} placeholder="Ej: Visita técnica a terreno, Reunión con Jefe de Obra, etc." />
                {errors.motivo && <p className="text-xs text-destructive">{errors.motivo.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="duracionIngreso">Duración Estimada del Ingreso*</Label>
                <Select onValueChange={(val) => setValue("duracionIngreso", val as any)} defaultValue="visita breve">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visita breve">Visita Breve (menos de 2 horas)</SelectItem>
                    <SelectItem value="jornada parcial">Jornada Parcial (2 a 4 horas)</SelectItem>
                    <SelectItem value="jornada completa">Jornada Completa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xs text-muted-foreground p-2 text-center">O sube una foto de tu cédula si el escaneo no funciona:</div>
              <div className="space-y-2">
                  <Label htmlFor="archivo">Adjuntar Cédula de Identidad (opcional)</Label>
                  <Input id="archivo" type="file" onChange={e => setValue('archivo', e.target.files?.[0] || null)} />
              </div>

               <div className="flex items-start space-x-2 pt-2">
                    <Checkbox id="terms" {...register("aceptaTerminos")} />
                    <Label htmlFor="terms" className="text-xs font-normal">
                        Declaro que la información es verídica y acepto los <Link href="/terminos" target="_blank" className="underline hover:text-primary">Términos y Condiciones</Link>.
                    </Label>
                </div>
                 {errors.aceptaTerminos && <p className="text-xs text-destructive">{errors.aceptaTerminos.message}</p>}
              
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Siguiente: Inducción de Seguridad
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isScannerOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Escanear Cédula de Identidad</CardTitle>
              <CardDescription>Apunta la cámara al código QR de tu cédula.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-800 p-2 rounded-md">
                <Scanner onResult={handleScan} />
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" onClick={() => setIsScannerOpen(false)}>Cancelar</Button>
            </CardFooter>
          </Card>
        </div>
      )}
      
      {step === "induction" && inductionData && (
          <Card className="w-full max-w-2xl">
              <CardHeader>
                  <CardTitle>Inducción de Seguridad Obligatoria</CardTitle>
                  <CardDescription>Lee con atención y escucha las siguientes indicaciones antes de ingresar.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-h-60 overflow-y-auto p-4 bg-muted rounded-md border text-sm whitespace-pre-wrap">
                    {inductionData.inductionText}
                </div>
                {inductionData.audioUrl && (
                    <div>
                        <Label>Escuchar Inducción</Label>
                        <audio controls src={inductionData.audioUrl} className="w-full mt-1">Tu navegador no soporta audio.</audio>
                    </div>
                )}
              </CardContent>
              <CardFooter>
                <Button onClick={handleConfirmInduction} className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Declaro haber leído y entendido la inducción
                </Button>
              </CardFooter>
          </Card>
      )}

      {step === "success" && (
          <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                        <UserCheck className="h-8 w-8"/>
                    </div>
                    <CardTitle className="mt-4">¡Registro Completado!</CardTitle>
                    <CardDescription>Tu acceso ha sido registrado y la inducción de seguridad fue confirmada. Ya puedes ingresar.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-xs text-muted-foreground">Ya puedes cerrar esta ventana.</p>
                </CardContent>
            </Card>
      )}
    </div>
  );
}
