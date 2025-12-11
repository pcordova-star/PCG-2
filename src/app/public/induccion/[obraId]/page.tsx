// src/app/public/induccion/[obraId]/page.tsx
"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ShieldCheck, FileText, User, Building, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { guardarInduccionQR } from "@/lib/prevencionEventos";
import { getDoc, doc } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import SignaturePad from "@/app/prevencion/hallazgos/components/SignaturePad";

// Tipos locales para evitar importaciones complejas en un archivo público
interface Obra {
  id: string;
  nombreFaena: string;
}

export default function InduccionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const obraId = params.obraId as string;
  const prevencionistaId = searchParams.get("p") || null; // Captura el ID del prevencionista

  const [obra, setObra] = useState<Obra | null>(null);
  const [loadingObra, setLoadingObra] = useState(true);
  
  const [formState, setFormState] = useState({
    tipoVisita: "VISITA",
    nombreCompleto: "",
    rut: "",
    empresa: "",
    cargo: "",
    telefono: "",
    correo: "",
    fechaIngreso: new Date().toISOString().slice(0, 10),
    horaIngreso: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    respuestaPregunta1: "SI",
    respuestaPregunta2: "NO",
    respuestaPregunta3: "SI",
    aceptaReglamento: false,
    aceptaEpp: false,
    aceptaTratamientoDatos: false,
    firmaDataUrl: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isSignatureDrawn, setIsSignatureDrawn] = useState(false);


  useEffect(() => {
    if (obraId) {
      const fetchObra = async () => {
        try {
          const obraRef = doc(firebaseDb, "obras", obraId);
          const obraSnap = await getDoc(obraRef);
          if (obraSnap.exists()) {
            setObra({ id: obraSnap.id, ...obraSnap.data() } as Obra);
          } else {
            setError("La obra especificada para esta inducción no fue encontrada.");
          }
        } catch (err) {
          console.error("Error fetching obra:", err);
          setError("No se pudo cargar la información de la obra.");
        } finally {
          setLoadingObra(false);
        }
      };
      fetchObra();
    }
  }, [obraId]);

  const handleInputChange = (field: keyof typeof formState, value: string | boolean) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones
    if (!formState.nombreCompleto || !formState.rut || !formState.empresa || !formState.cargo) {
      setError("Por favor, complete todos los campos de datos personales.");
      return;
    }
    if (!formState.aceptaReglamento || !formState.aceptaEpp || !formState.aceptaTratamientoDatos) {
      setError("Debe aceptar todos los compromisos y declaraciones para continuar.");
      return;
    }
    if (!isSignatureDrawn || !formState.firmaDataUrl) {
      setError("La firma es obligatoria para completar el registro.");
      return;
    }

    setIsSubmitting(true);
    try {
      await guardarInduccionQR({
        obraId,
        obraNombre: obra?.nombreFaena || "Obra no especificada",
        prevencionistaId, // Guardar el ID del prevencionista
        ...formState,
      });
      setIsSuccess(true);
      toast({ title: "Registro Exitoso", description: "Su inducción de acceso ha sido guardada. ¡Bienvenido(a)!" });
    } catch (err) {
      console.error("Error al guardar inducción:", err);
      setError("No se pudo guardar el registro. Por favor, inténtelo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingObra) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="animate-spin h-8 w-8" />
        <p className="mt-2 text-muted-foreground">Cargando formulario de inducción...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
        <h2 className="text-2xl font-bold text-destructive mb-2">Error</h2>
        <p className="text-muted-foreground">{error}</p>
         <Button onClick={() => router.push('/')} className="mt-6">Volver al Inicio</Button>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
         <ShieldCheck className="h-16 w-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-primary mb-2">¡Inducción Completada!</h2>
        <p className="text-muted-foreground max-w-md">
          Gracias, {formState.nombreCompleto}. Tu registro ha sido guardado correctamente.
          Ya puedes presentarte en portería para continuar con tu acceso a la obra.
        </p>
         <Button onClick={() => window.location.reload()} className="mt-6">Registrar a otra persona</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Inducción de Acceso a Faena</CardTitle>
          <CardDescription>Obra: {obra?.nombreFaena}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <Section icon={User} title="1. Datos Personales">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectField label="Tipo de Visita" value={formState.tipoVisita} onChange={v => handleInputChange('tipoVisita', v)}>
                  <SelectItem value="VISITA">Visita</SelectItem>
                  <SelectItem value="PROVEEDOR">Proveedor</SelectItem>
                  <SelectItem value="INSPECTOR">Inspector</SelectItem>
                  <SelectItem value="OTRO">Otro</SelectItem>
                </SelectField>
                <InputField label="Nombre Completo" value={formState.nombreCompleto} onChange={e => handleInputChange('nombreCompleto', e.target.value)} required />
                <InputField label="RUT" value={formState.rut} onChange={e => handleInputChange('rut', e.target.value)} required />
                <InputField label="Empresa" value={formState.empresa} onChange={e => handleInputChange('empresa', e.target.value)} required />
                <InputField label="Cargo" value={formState.cargo} onChange={e => handleInputChange('cargo', e.target.value)} required />
                <InputField label="Teléfono" type="tel" value={formState.telefono} onChange={e => handleInputChange('telefono', e.target.value)} />
                <InputField label="Correo Electrónico" type="email" value={formState.correo} onChange={e => handleInputChange('correo', e.target.value)} />
              </div>
            </Section>

            <Section icon={FileText} title="2. Cuestionario de Seguridad">
              <p className="text-sm text-muted-foreground mb-4">Responda a las siguientes preguntas para confirmar la comprensión de las reglas básicas.</p>
              <RadioGroupField label="¿Debe respetar siempre las indicaciones de seguridad del personal de la obra?" value={formState.respuestaPregunta1} onChange={v => handleInputChange('respuestaPregunta1', v)} />
              <RadioGroupField label="¿Está permitido caminar o permanecer bajo cargas suspendidas?" value={formState.respuestaPregunta2} onChange={v => handleInputChange('respuestaPregunta2', v)} />
              <RadioGroupField label="En caso de una emergencia, ¿debe seguir las rutas de evacuación y dirigirse a la zona de seguridad?" value={formState.respuestaPregunta3} onChange={v => handleInputChange('respuestaPregunta3', v)} />
            </Section>

            <Section icon={ShieldCheck} title="3. Declaración y Firma">
               <CheckboxField label="Declaro haber leído y comprendido el Reglamento Especial para Empresas Contratistas y Subcontratistas (si aplica)." checked={formState.aceptaReglamento} onCheckedChange={c => handleInputChange('aceptaReglamento', c)} />
               <CheckboxField label="Me comprometo a utilizar todos los Elementos de Protección Personal (EPP) requeridos para ingresar y permanecer en la obra." checked={formState.aceptaEpp} onCheckedChange={c => handleInputChange('aceptaEpp', c)} />
               <CheckboxField label="Acepto el tratamiento de mis datos personales para fines de registro y seguridad de esta obra." checked={formState.aceptaTratamientoDatos} onCheckedChange={c => handleInputChange('aceptaTratamientoDatos', c)} />
               <div className="pt-4">
                  <Label className="font-semibold text-base">Firma de Conformidad</Label>
                  <SignaturePad 
                    onChange={(dataUrl) => {
                      if (dataUrl) {
                        handleInputChange('firmaDataUrl', dataUrl);
                        setIsSignatureDrawn(true);
                      }
                    }} 
                    onClear={() => {
                        handleInputChange('firmaDataUrl', '');
                        setIsSignatureDrawn(false);
                    }}
                    onDraw={() => setIsSignatureDrawn(true)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Por favor, firme en el recuadro con el dedo o el mouse.</p>
               </div>
            </Section>

            {error && <p className="text-sm font-medium text-center text-destructive">{error}</p>}
            
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Guardando Registro...' : 'Finalizar y Enviar Inducción'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


// --- Componentes de UI Locales ---
const Section = ({ icon: Icon, title, children }: { icon: React.ElementType, title: string, children: React.ReactNode }) => (
  <div className="border-t pt-6">
    <div className="flex items-center gap-3 mb-4">
      <div className="bg-primary/10 p-2 rounded-full"><Icon className="h-5 w-5 text-primary" /></div>
      <h3 className="text-lg font-semibold">{title}</h3>
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);

const InputField = ({ label, ...props }: { label: string } & React.ComponentProps<typeof Input>) => (
  <div className="space-y-1">
    <Label>{label}</Label>
    <Input {...props} />
  </div>
);

const SelectField = ({ label, children, ...props }: { label: string, children: React.ReactNode } & React.ComponentProps<typeof Select>) => (
    <div className="space-y-1">
        <Label>{label}</Label>
        <Select {...props}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{children}</SelectContent>
        </Select>
    </div>
);

const RadioGroupField = ({ label, value, onChange }: { label: string, value: 'SI' | 'NO', onChange: (value: 'SI' | 'NO') => void }) => (
  <div className="flex items-center justify-between rounded-md border p-3 bg-muted/50">
    <Label className="flex-1 pr-4">{label}</Label>
    <div className="flex items-center gap-4">
      <Label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={value === 'SI'} onCheckedChange={() => onChange('SI')} /><span>Sí</span></Label>
      <Label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={value === 'NO'} onCheckedChange={() => onChange('NO')} /><span>No</span></Label>
    </div>
  </div>
);

const CheckboxField = ({ label, ...props }: { label: string } & React.ComponentProps<typeof Checkbox>) => (
  <div className="flex items-start gap-3">
    <Checkbox {...props} className="mt-1" />
    <Label className="font-normal">{label}</Label>
  </div>
);

```
  </change>
  <change>
    <file>src/lib/prevencionEventos.ts</file>
    <content><![CDATA[import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  addDoc,
  collection
} from "firebase/firestore";
import { firebaseDb } from "./firebaseClient";

// 👉 Datos comunes del evento (lo que comparten los 3 formularios)
export interface EventoBaseData {
  obraId: string;
  eventoId: string;
  fechaEvento?: string;
  lugar?: string;
  tipoEvento?: string; // accidente, incidente, cuasi, etc.
  descripcionBreve?: string;
  trabajadorInvolucrado?: string;
  creadoPor?: string;
}

// 👉 Datos específicos de cada formulario
export interface IERData {
  fechaInforme?: string;
  horaInforme?: string;
  descripcionDetallada?: string;
  claseEvento?: string;
  consecuenciasPotenciales?: string;
  medidasInmediatas?: string;
}

export interface InvestigacionData {
  investigador?: string;
  fechaInvestigacion?: string;
  causasInmediatas?: string;
  causasBasales?: string;
  condicionesSubestandar?: string;
  actosSubestandar?: string;
  conclusiones?: string;
}

export interface PlanAccionData {
  objetivoGeneral?: string;
  acciones?: {
    accion: string;
    responsable: string;
    plazo: string;
    estado?: string;
  }[];
  fechaCompromisoCierre?: string;
  responsableSeguimiento?: string;
  observacionesSeguimiento?: string;
}

// Interfaz para la inducción
export interface InduccionAccesoFaena {
  id?: string;
  obraId: string;
  obraNombre?: string;
  prevencionistaId?: string | null; // ID del usuario que generó el QR

  tipoVisita: "VISITA" | "PROVEEDOR" | "INSPECTOR" | "OTRO";
  nombreCompleto: string;
  rut: string;
  empresa: string;
  cargo: string;
  telefono: string;
  correo: string;

  fechaIngreso: string; // yyyy-mm-dd
  horaIngreso: string;   // hh:mm

  respuestaPregunta1?: "SI" | "NO";
  respuestaPregunta2?: "SI" | "NO";
  respuestaPregunta3?: "SI" | "NO";

  aceptaReglamento: boolean;
  aceptaEpp: boolean;
  aceptaTratamientoDatos: boolean;

  firmaDataUrl?: string; // imagen de la firma en base64 (opcional)
  origenRegistro?: "panel" | "qr";
  createdAt?: any;
}


function eventoDocRef(obraId: string, eventoId: string) {
  return doc(firebaseDb, "obras", obraId, "eventosRiesgosos", eventoId);
}

// 🔹 Guardar / actualizar la parte IER (sin pisar lo demás)
export async function guardarIER(
  base: EventoBaseData,
  ier: IERData
) {
  const ref = eventoDocRef(base.obraId, base.eventoId);
  await setDoc(
    ref,
    {
      ...base,
      updatedAt: serverTimestamp(),
      ier: {
        ...ier,
        updatedAt: serverTimestamp(),
      },
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

// 🔹 Guardar / actualizar la parte de Investigación
export async function guardarInvestigacion(
  obraId: string,
  eventoId: string,
  data: InvestigacionData
) {
  const ref = eventoDocRef(obraId, eventoId);
  await setDoc(
    ref,
    {
      updatedAt: serverTimestamp(),
      investigacion: {
        ...data,
        updatedAt: serverTimestamp(),
      },
    },
    { merge: true }
  );
}

// 🔹 Guardar / actualizar la parte de Plan de Acción
export async function guardarPlanAccion(
  obraId: string,
  eventoId: string,
  data: PlanAccionData
) {
  const ref = eventoDocRef(obraId, eventoId);
  await setDoc(
    ref,
    {
      updatedAt: serverTimestamp(),
      planAccion: {
        ...data,
        updatedAt: serverTimestamp(),
      },
    },
    { merge: true }
  );
}

// 🔹 Leer todo el evento (con las 3 partes si existen)
export async function cargarEventoCompleto(
  obraId: string,
  eventoId: string
) {
  const ref = eventoDocRef(obraId, eventoId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data();
}

// 🔹 Guardar inducción desde el panel de administrador
export async function guardarInduccionAccesoFaena(
  data: Omit<InduccionAccesoFaena, "id" | "createdAt" | "origenRegistro">
): Promise<string> {
  const colRef = collection(firebaseDb, "induccionesAccesoFaena");
  const docRef = await addDoc(colRef, {
    ...data,
    origenRegistro: "panel",
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

// 🔹 Guardar inducción desde el QR público
export async function guardarInduccionQR(
  data: Omit<InduccionAccesoFaena, "id" | "createdAt" | "origenRegistro">
): Promise<string> {
  const colRef = collection(firebaseDb, "induccionesAccesoFaena");
  const docRef = await addDoc(colRef, {
    ...data,
    origenRegistro: "qr",
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}
