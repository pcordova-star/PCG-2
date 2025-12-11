// src/app/public/induccion/[obraId]/page.tsx
"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { guardarInduccionQR, InduccionAccesoFaena } from "@/lib/prevencionEventos";
import { getDoc, doc } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import SignaturePad from "@/app/prevencion/hallazgos/components/SignaturePad";
import { PcgLogo } from "@/components/branding/PcgLogo";


type ObraData = {
  id: string;
  nombreFaena: string;
};

function InduccionForm() {
  const { obraId } = useParams<{ obraId: string }>();
  const router = useRouter();

  const [obra, setObra] = useState<ObraData | null>(null);
  const [loadingObra, setLoadingObra] = useState(true);

  const [tipoVisita, setTipoVisita] = useState<InduccionAccesoFaena['tipoVisita']>("VISITA");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [rut, setRut] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [cargo, setCargo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");

  const [fechaIngreso] = useState(new Date().toISOString().slice(0, 10));
  const [horaIngreso, setHoraIngreso] = useState(new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }));

  const [respuestaPregunta1, setRespuestaPregunta1] = useState<"SI" | "NO" | undefined>();
  const [respuestaPregunta2, setRespuestaPregunta2] = useState<"SI" | "NO" | undefined>();
  const [respuestaPregunta3, setRespuestaPregunta3] = useState<"SI" | "NO" | undefined>();
  
  const [aceptaReglamento, setAceptaReglamento] = useState(false);
  const [aceptaEpp, setAceptaEpp] = useState(false);
  const [aceptaTratamientoDatos, setAceptaTratamientoDatos] = useState(false);

  const [firmaDataUrl, setFirmaDataUrl] = useState<string | undefined>();
  
  const [saving, setSaving] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (obraId) {
      const fetchObra = async () => {
        setLoadingObra(true);
        try {
          const obraRef = doc(firebaseDb, "obras", obraId);
          const obraSnap = await getDoc(obraRef);
          if (obraSnap.exists()) {
            setObra({ id: obraSnap.id, nombreFaena: obraSnap.data().nombreFaena });
          } else {
            setErrorForm("La obra especificada no existe.");
          }
        } catch (error) {
          setErrorForm("No se pudieron cargar los datos de la obra.");
        } finally {
          setLoadingObra(false);
        }
      };
      fetchObra();
    }
  }, [obraId]);

  function respuestasCorrectas(): boolean {
    return respuestaPregunta1 === "SI" && respuestaPregunta2 === "NO" && respuestaPregunta3 === "SI";
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm(null);
    setHoraIngreso(new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }));

    if (!obraId) return;
    if (!nombreCompleto.trim() || !rut.trim() || !empresa.trim()) { setErrorForm("Nombre, RUT y Empresa son obligatorios."); return; }
    if (!respuestasCorrectas()) { setErrorForm("Debes responder correctamente todas las preguntas de comprensión."); return; }
    if (!aceptaReglamento || !aceptaEpp || !aceptaTratamientoDatos) { setErrorForm("Debes aceptar todas las declaraciones."); return; }
    if (!firmaDataUrl) { setErrorForm("Debes firmar para confirmar la inducción."); return; }

    setSaving(true);
    try {
      await guardarInduccionQR({
        obraId,
        obraNombre: obra?.nombreFaena ?? "N/A",
        tipoVisita, nombreCompleto, rut, empresa, cargo, telefono, correo,
        fechaIngreso, horaIngreso,
        respuestaPregunta1, respuestaPregunta2, respuestaPregunta3,
        aceptaReglamento, aceptaEpp, aceptaTratamientoDatos,
        firmaDataUrl,
      });
      setSuccess(true);
    } catch (error) {
      setErrorForm("Ocurrió un error al guardar. Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingObra) {
    return <div className="text-center p-8"><Loader2 className="animate-spin" /> Cargando...</div>;
  }

  if (success) {
    return (
        <Card className="max-w-lg mx-auto">
            <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <CardTitle className="mt-4">¡Registro Exitoso!</CardTitle>
                <CardDescription>Tu inducción ha sido guardada. Ya puedes ingresar a la obra.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-center text-sm text-muted-foreground">Puedes cerrar esta ventana.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Instrucciones de seguridad</CardTitle>
          <CardDescription>Obra: {obra?.nombreFaena ?? "Cargando..."}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-3"><ul className="list-disc pl-5 space-y-2"><li>Respete las indicaciones del personal de la obra.</li><li>No ingrese a zonas señalizadas como restringidas.</li><li>Use los elementos de protección personal que se le indiquen.</li><li>No se acerque a equipos en movimiento ni a cargas suspendidas.</li><li>En caso de emergencia, siga las rutas de evacuación hacia los puntos de encuentro.</li></ul></CardContent>
      </Card>

      <Card><CardHeader><CardTitle>A. Datos del visitante</CardTitle></CardHeader>
        <CardContent><div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="nombre">Nombre Completo*</Label><Input id="nombre" value={nombreCompleto} onChange={(e) => setNombreCompleto(e.target.value)}/></div>
            <div className="space-y-2"><Label htmlFor="rut">RUT*</Label><Input id="rut" value={rut} onChange={(e) => setRut(e.target.value)}/></div>
            <div className="space-y-2"><Label htmlFor="empresa">Empresa*</Label><Input id="empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)}/></div>
            <div className="space-y-2"><Label htmlFor="cargo">Cargo/Ocupación</Label><Input id="cargo" value={cargo} onChange={(e) => setCargo(e.target.value)}/></div>
        </div></CardContent>
      </Card>
      
      <Card><CardHeader><CardTitle>B. Preguntas de Comprensión</CardTitle></CardHeader>
        <CardContent className="space-y-6">
             <div className="space-y-3">
                <Label>1. ¿Debe respetar siempre las indicaciones del personal?</Label>
                <RadioGroup value={respuestaPregunta1} onValueChange={(v) => setRespuestaPregunta1(v as "SI" | "NO")} className="flex gap-4"><div className="flex items-center space-x-2"><RadioGroupItem value="SI" id="q1-si"/><Label htmlFor="q1-si">Sí</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="NO" id="q1-no"/><Label htmlFor="q1-no">No</Label></div></RadioGroup>
            </div>
             <div className="space-y-3">
                <Label>2. ¿Está permitido caminar bajo cargas suspendidas?</Label>
                <RadioGroup value={respuestaPregunta2} onValueChange={(v) => setRespuestaPregunta2(v as "SI" | "NO")} className="flex gap-4"><div className="flex items-center space-x-2"><RadioGroupItem value="SI" id="q2-si"/><Label htmlFor="q2-si">Sí</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="NO" id="q2-no"/><Label htmlFor="q2-no">No</Label></div></RadioGroup>
            </div>
             <div className="space-y-3">
                <Label>3. ¿Debe seguir las rutas de evacuación en caso de emergencia?</Label>
                 <RadioGroup value={respuestaPregunta3} onValueChange={(v) => setRespuestaPregunta3(v as "SI" | "NO")} className="flex gap-4"><div className="flex items-center space-x-2"><RadioGroupItem value="SI" id="q3-si"/><Label htmlFor="q3-si">Sí</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="NO" id="q3-no"/><Label htmlFor="q3-no">No</Label></div></RadioGroup>
            </div>
        </CardContent>
      </Card>

      <Card><CardHeader><CardTitle>C. Declaraciones y Compromisos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-start space-x-3"><Checkbox id="aceptaReglamento" checked={aceptaReglamento} onCheckedChange={(c) => setAceptaReglamento(!!c)} /><Label htmlFor="aceptaReglamento" className="text-sm font-normal">Declaro haber recibido, leído y comprendido el Reglamento Especial para Empresas Contratistas.</Label></div>
            <div className="flex items-start space-x-3"><Checkbox id="aceptaEpp" checked={aceptaEpp} onCheckedChange={(c) => setAceptaEpp(!!c)} /><Label htmlFor="aceptaEpp" className="text-sm font-normal">Me comprometo a utilizar los EPP requeridos para el área a la que ingreso.</Label></div>
            <div className="flex items-start space-x-3"><Checkbox id="aceptaTratamientoDatos" checked={aceptaTratamientoDatos} onCheckedChange={(c) => setAceptaTratamientoDatos(!!c)} /><Label htmlFor="aceptaTratamientoDatos" className="text-sm font-normal">Acepto el tratamiento de mis datos para fines de registro y seguridad.</Label></div>
        </CardContent>
      </Card>

      <Card><CardHeader><CardTitle>D. Firma de Aceptación</CardTitle><CardDescription>Firme con su dedo o con el mouse para confirmar.</CardDescription></CardHeader>
        <CardContent>
            <SignaturePad onChange={setFirmaDataUrl} onClear={() => setFirmaDataUrl(undefined)} />
        </CardContent>
      </Card>
      
      {errorForm && <p className="text-sm font-medium text-destructive">{errorForm}</p>}

      <Button type="submit" size="lg" className="w-full" disabled={saving}>
        {saving && <Loader2 className="mr-2 animate-spin" />}
        {saving ? "Guardando..." : "Finalizar y Enviar Inducción"}
      </Button>
    </form>
  );
}

export default function PublicInduccionPage() {
    return (
        <div className="min-h-screen bg-muted/40 p-4 py-8">
             <div className="max-w-2xl mx-auto space-y-6">
                <div className="mx-auto w-fit">
                    <PcgLogo size={80} />
                </div>
                <Suspense fallback={<div className="text-center p-8">Cargando formulario...</div>}>
                    <InduccionForm />
                </Suspense>
                 <footer className="text-center text-xs text-muted-foreground pt-4">
                    Plataforma de Control y Gestión (PCG) &copy; {new Date().getFullYear()}
                </footer>
            </div>
        </div>
    );
}
