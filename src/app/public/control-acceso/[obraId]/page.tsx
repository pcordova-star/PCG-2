
"use client";
import { useState, useEffect, FormEvent, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { useToast } from "@/hooks/use-toast";
import { PcgLogo } from "@/components/branding/PcgLogo";
import { Loader2, Camera, ShieldCheck, XCircle } from "lucide-react";
import { Obra, InduccionContextualRegistro } from "@/types/pcg";
import { doc, getDoc } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import jsQR from "jsqr";
import { useZxing } from "react-zxing";

function SuccessInductionScreen({
  induction,
  audioUrl,
}: {
  induction: InduccionContextualRegistro;
  audioUrl?: string | null;
}) {
  return (
    <div className="text-center p-4">
      <ShieldCheck className="mx-auto h-16 w-16 text-green-500 mb-4" />
      <h2 className="text-2xl font-bold">¡Registro Exitoso!</h2>
      <p className="text-muted-foreground mt-2 mb-6">
        A continuación, te presentamos tu inducción de seguridad personalizada.
      </p>
      <Card className="text-left">
        <CardHeader>
          <CardTitle>Inducción de Seguridad</CardTitle>
          <CardDescription>
            Basada en la tarea: &quot;{induction.contexto.descripcionTarea}&quot;
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {audioUrl && (
            <div>
              <Label>Escuchar Inducción</Label>
              <audio controls src={audioUrl} className="w-full mt-1">
                Tu navegador no soporta la reproducción de audio.
              </audio>
            </div>
          )}
          <div className="whitespace-pre-wrap text-sm p-4 bg-muted rounded-md border">
            {induction.inductionText}
          </div>
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground">Ya puedes cerrar esta ventana y acceder a la obra.</p>
        </CardFooter>
      </Card>
    </div>
  );
}

function ControlAccesoForm() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const obraId = params.obraId as string;

  const [obra, setObra] = useState<Obra | null>(null);
  const [loadingObra, setLoadingObra] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<{
    induction: InduccionContextualRegistro;
    audioUrl?: string;
  } | null>(null);

  // Estados para el escáner
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const { ref } = useZxing({
    onDecodeResult: (result) => {
      try {
        const rawData = result.getText();
        const params = new URLSearchParams(rawData.substring(rawData.indexOf('?')));
        const run = params.get('RUN');
        const nombres = params.get('names');
        const apellidos = params.get('last_name');

        if (run && nombres && apellidos) {
          setFormData(prev => ({
            ...prev,
            nombreCompleto: `${nombres} ${apellidos}`,
            rut: run,
          }));
          toast({ title: "Datos autocompletados", description: "Cédula escaneada correctamente." });
          setIsScanning(false);
        } else {
          throw new Error("El código QR no contiene los datos esperados.");
        }
      } catch (err: any) {
        setScanError("No se pudo leer el código QR de la cédula. Intenta de nuevo o ingresa los datos manualmente.");
        console.error(err);
      }
    },
    paused: !isScanning,
  });

  const [formData, setFormData] = useState({
    nombreCompleto: "",
    rut: "",
    empresa: "",
    motivo: "",
    tipoPersona: "visita" as "trabajador" | "subcontratista" | "visita",
    duracionIngreso: "visita breve" as "visita breve" | "jornada parcial" | "jornada completa",
  });

  useEffect(() => {
    if (obraId) {
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
    }
  }, [obraId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const data = new FormData();
      for (const key in formData) {
        data.append(key, formData[key as keyof typeof formData]);
      }
      data.append("obraId", obraId);

      const response = await fetch("/api/control-acceso/submit", {
        method: "POST",
        body: data,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Ocurrió un error en el servidor.");
      }
      
      if (result.success && result.inductionText) {
          setSubmissionResult({
              induction: {
                  contexto: {
                      descripcionTarea: formData.motivo,
                      duracionIngreso: formData.duracionIngreso,
                  },
                  inductionText: result.inductionText,
                  // ... el resto de los campos de inducción no son cruciales para mostrar aquí
              } as InduccionContextualRegistro,
              audioUrl: result.audioUrl,
          });
      } else {
          // Si no hay inducción, igual mostramos un mensaje de éxito simple.
          setSubmissionResult({ induction: { contexto: {}, inductionText: 'Tu registro ha sido completado con éxito. Ya puedes acceder a la obra.' } as any, audioUrl: null });
      }

    } catch (err: any) {
      setSubmitError(err.message || "No se pudo completar el registro.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (loadingObra) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!obra) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Obra no encontrada.</p>
      </div>
    );
  }

  if (submissionResult) {
      return (
           <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
               <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                     <PcgLogo />
                </CardHeader>
                <CardContent>
                    <SuccessInductionScreen induction={submissionResult.induction} audioUrl={submissionResult.audioUrl} />
                </CardContent>
               </Card>
           </div>
      )
  }

  return (
    <>
      <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <PcgLogo />
            </div>
            <CardTitle className="text-2xl">Registro de Acceso a Obra</CardTitle>
            <CardDescription>
              Completar para: <strong>{obra.nombreFaena}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="p-4 border-2 border-dashed rounded-lg text-center space-y-2">
                <Button
                  type="button"
                  onClick={() => setIsScanning(true)}
                  variant="default"
                  size="lg"
                >
                  <Camera className="mr-2 h-5 w-5" />
                  Escanear Cédula (QR)
                </Button>
                <p className="text-xs text-muted-foreground">
                  Apunta la cámara al código QR de tu cédula para autocompletar nombre y RUT.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombreCompleto">Nombre Completo*</Label>
                  <Input id="nombreCompleto" name="nombreCompleto" value={formData.nombreCompleto} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rut">RUT*</Label>
                  <Input id="rut" name="rut" value={formData.rut} onChange={handleInputChange} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="empresa">Empresa a la que pertenece*</Label>
                <Input id="empresa" name="empresa" value={formData.empresa} onChange={handleInputChange} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivo">Tarea o motivo del ingreso*</Label>
                <Textarea id="motivo" name="motivo" value={formData.motivo} onChange={handleInputChange} required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Persona*</Label>
                  <Select name="tipoPersona" value={formData.tipoPersona} onValueChange={(v) => handleSelectChange("tipoPersona", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="visita">Visita</SelectItem>
                      <SelectItem value="subcontratista">Subcontratista</SelectItem>
                      <SelectItem value="trabajador">Trabajador Propio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Duración del Ingreso*</Label>
                  <Select name="duracionIngreso" value={formData.duracionIngreso} onValueChange={(v) => handleSelectChange("duracionIngreso", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="visita breve">Visita Breve (menos de 2 horas)</SelectItem>
                      <SelectItem value="jornada parcial">Jornada Parcial (hasta 4 horas)</SelectItem>
                      <SelectItem value="jornada completa">Jornada Completa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {submitError && (
                <p className="text-sm font-medium text-destructive">{submitError}</p>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar Registro
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {isScanning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-card rounded-lg w-full max-w-lg p-4 space-y-4 relative">
             <CardTitle className="text-center">Escanear Cédula</CardTitle>
             <CardDescription className="text-center">Apunta el recuadro al código QR de tu cédula.</CardDescription>
            <div className="relative w-full aspect-video bg-black rounded-md overflow-hidden">
                <video ref={ref} className="w-full h-full object-cover" />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2/3 h-2/3 border-4 border-white/50 rounded-lg animate-pulse"></div>
                </div>
            </div>
            {scanError && <p className="text-sm text-center text-destructive">{scanError}</p>}
            <Button variant="secondary" className="w-full" onClick={() => setIsScanning(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ControlAccesoForm />
    </Suspense>
  );
}
