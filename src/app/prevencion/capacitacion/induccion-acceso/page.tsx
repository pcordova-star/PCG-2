"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { guardarInduccionAccesoFaena, InduccionAccesoFaena } from "@/lib/induccionAccesoFaena";
import { getDocs, collection } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";


// --- Tipos y Datos ---
type ObraCapacitacion = {
  id: string;
  nombreFaena: string;
};

// --- Componente de Firma ---
type SignaturePadProps = {
  onChange: (dataUrl: string | null) => void;
  onClear: () => void;
};

function SignaturePad({ onChange, onClear }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    isDrawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function handlePointerUp() {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onChange(dataUrl);
  }

  function handleClear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onClear();
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={400}
        height={160}
        className="w-full max-w-full rounded-md border bg-white touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      <Button
        type="button"
        onClick={handleClear}
        variant="outline"
        size="sm"
      >
        Limpiar firma
      </Button>
    </div>
  );
}

// --- Componente Principal ---
export default function InduccionAccesoPage() {
  const [obras, setObras] = useState<ObraCapacitacion[]>([]);
  const [obraId, setObraId] = useState("");

  const [tipoVisita, setTipoVisita] =
    useState<InduccionAccesoFaena['tipoVisita']>("VISITA");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [rut, setRut] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [cargo, setCargo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");

  const [fechaIngreso, setFechaIngreso] = useState(new Date().toISOString().slice(0, 10));
  const [horaIngreso, setHoraIngreso] = useState(new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }));
  const [autorizadorNombre, setAutorizadorNombre] = useState("");
  const [autorizadorCargo, setAutorizadorCargo] = useState("");

  const [respuestaPregunta1, setRespuestaPregunta1] =
    useState<"SI" | "NO">("SI");
  const [respuestaPregunta2, setRespuestaPregunta2] =
    useState<"SI" | "NO">("SI");
  const [respuestaPregunta3, setRespuestaPregunta3] =
    useState<"SI" | "NO">("SI");
  
  const [aceptaReglamento, setAceptaReglamento] = useState(false);
  const [aceptaEpp, setAceptaEpp] = useState(false);
  const [aceptaTratamientoDatos, setAceptaTratamientoDatos] = useState(false);

  const [firmaDataUrl, setFirmaDataUrl] = useState<string | undefined>();
  
  const [saving, setSaving] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  useEffect(() => {
    const fetchObras = async () => {
      try {
        const colRef = collection(firebaseDb, "obras");
        const snapshot = await getDocs(colRef);
        const data: ObraCapacitacion[] = snapshot.docs.map(doc => ({
          id: doc.id,
          nombreFaena: doc.data().nombreFaena ?? "",
        }));
        setObras(data);
        if (data.length > 0) {
          setObraId(data[0].id);
        }
      } catch (error) {
        console.error("Error fetching obras: ", error);
        setErrorForm("No se pudieron cargar las obras disponibles.");
      }
    };
    fetchObras();
  }, []);

  function respuestasCorrectas(): boolean {
    return respuestaPregunta1 === "SI" && respuestaPregunta2 === "NO" && respuestaPregunta3 === "SI";
  }
  
  const resetForm = () => {
    setTipoVisita("VISITA");
    setNombreCompleto("");
    setRut("");
    setEmpresa("");
    setCargo("");
    setTelefono("");
    setCorreo("");
    setFechaIngreso(new Date().toISOString().slice(0, 10));
    setHoraIngreso(new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }));
    setAutorizadorNombre("");
    setAutorizadorCargo("");
    setRespuestaPregunta1("SI");
    setRespuestaPregunta2("SI");
    setRespuestaPregunta3("SI");
    setAceptaReglamento(false);
    setAceptaEpp(false);
    setAceptaTratamientoDatos(false);
    setFirmaDataUrl(undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm(null);

    if (!obraId) {
      setErrorForm("Debes seleccionar una obra.");
      return;
    }
    if (!nombreCompleto.trim() || !rut.trim() || !empresa.trim()) {
      setErrorForm("Completa los datos básicos del visitante (nombre, RUT, empresa).");
      return;
    }
    if (!respuestasCorrectas()) {
      setErrorForm("Debes responder correctamente todas las preguntas de comprensión para continuar.");
      return;
    }
    if (!firmaDataUrl) {
      setErrorForm("Debes firmar para confirmar que entendiste la inducción.");
      return;
    }
    if(!aceptaReglamento || !aceptaEpp || !aceptaTratamientoDatos) {
      setErrorForm("Debes aceptar todas las declaraciones para continuar.");
      return;
    }

    setSaving(true);

    try {
      const obraSeleccionada = obras.find(o => o.id === obraId);

      await guardarInduccionAccesoFaena({
        obraId,
        obraNombre: obraSeleccionada?.nombreFaena ?? "N/A",
        tipoVisita,
        nombreCompleto,
        rut,
        empresa,
        cargo,
        telefono,
        correo,
        fechaIngreso,
        horaIngreso,
        autorizadorNombre,
        autorizadorCargo,
        respuestaPregunta1,
        respuestaPregunta2,
        respuestaPregunta3,
        aceptaReglamento,
        aceptaEpp,
        aceptaTratamientoDatos,
        firmaDataUrl,
      });

      alert("Inducción registrada correctamente.");
      resetForm();

    } catch (error) {
      console.error(error);
      setErrorForm("Ocurrió un error al guardar la inducción. Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  };

  const obraSeleccionada = obras.find(o => o.id === obraId);

  return (
    <section className="space-y-6 max-w-3xl mx-auto">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Inducción de acceso a faena – Visitas
        </h1>
        <p className="text-lg text-muted-foreground">
          Este formulario está pensado para que personas externas (visitas,
          proveedores, inspectores, etc.) puedan realizar la inducción básica
          de acceso a la obra desde su teléfono, mediante un código QR.
        </p>
      </header>

      <form
        className="space-y-6"
        onSubmit={handleSubmit}
      >
        <Card>
          <CardHeader>
            <CardTitle>Selección de Obra</CardTitle>
          </CardHeader>
          <CardContent>
              <div className="space-y-2">
                  <Label htmlFor="obra-select">Obra / Faena a visitar</Label>
                  <Select value={obraId} onValueChange={setObraId}>
                      <SelectTrigger id="obra-select">
                          <SelectValue placeholder="Seleccione una obra" />
                      </SelectTrigger>
                      <SelectContent>
                          {obras.map((obra) => (
                          <SelectItem key={obra.id} value={obra.id}>
                              {obra.nombreFaena}
                          </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Instrucciones básicas de seguridad</CardTitle>
                <CardDescription>Obra: {obraSeleccionada ? obraSeleccionada.nombreFaena : "No seleccionada"}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <ul className="list-disc pl-5 space-y-2 text-card-foreground/90">
              <li>Respete siempre las indicaciones del personal de la obra.</li>
              <li>No ingrese a zonas señalizadas como restringidas o de alto riesgo.</li>
              <li>Use los elementos de protección personal que se le indiquen (casco, zapatos de seguridad).</li>
              <li>No se acerque a equipos en movimiento ni a cargas suspendidas.</li>
              <li>En caso de emergencia (ej: alarma de evacuación), siga las rutas de evacuación hacia los puntos de encuentro señalizados.</li>
              </ul>
              <p className="font-semibold pt-2">
              Lea atentamente y responda las preguntas de comprensión antes de
              aceptar.
              </p>
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>A. Datos del visitante</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2"><Label htmlFor="nombre">Nombre Completo*</Label><Input id="nombre" value={nombreCompleto} onChange={(e) => setNombreCompleto(e.target.value)}/></div>
                    <div className="space-y-2"><Label htmlFor="rut">RUT*</Label><Input id="rut" value={rut} onChange={(e) => setRut(e.target.value)}/></div>
                    <div className="space-y-2"><Label htmlFor="empresa">Empresa*</Label><Input id="empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)}/></div>
                    <div className="space-y-2"><Label htmlFor="cargo">Cargo/Ocupación*</Label><Input id="cargo" value={cargo} onChange={(e) => setCargo(e.target.value)}/></div>
                    <div className="space-y-2"><Label htmlFor="telefono">Teléfono de contacto</Label><Input id="telefono" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)}/></div>
                    <div className="space-y-2"><Label htmlFor="email">Email de contacto</Label><Input id="email" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)}/></div>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>B. Datos de Ingreso</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2"><Label>Fecha de Ingreso</Label><Input type="date" value={fechaIngreso} onChange={e => setFechaIngreso(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Hora de Ingreso</Label><Input type="time" value={horaIngreso} onChange={e => setHoraIngreso(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Autorizado por (Nombre)</Label><Input value={autorizadorNombre} onChange={e => setAutorizadorNombre(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Autorizado por (Cargo)</Label><Input value={autorizadorCargo} onChange={e => setAutorizadorCargo(e.target.value)} /></div>
                </div>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>C. Preguntas de Comprensión</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="space-y-3">
                    <Label>1. ¿Debe respetar siempre las indicaciones del personal de la obra?</Label>
                    <RadioGroup value={respuestaPregunta1} onValueChange={(v) => setRespuestaPregunta1(v as "SI" | "NO")} className="flex gap-4">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="SI" id="q1-si"/><Label htmlFor="q1-si">Sí</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="NO" id="q1-no"/><Label htmlFor="q1-no">No</Label></div>
                    </RadioGroup>
                </div>
                 <div className="space-y-3">
                    <Label>2. ¿Está permitido caminar bajo cargas suspendidas?</Label>
                    <RadioGroup value={respuestaPregunta2} onValueChange={(v) => setRespuestaPregunta2(v as "SI" | "NO")} className="flex gap-4">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="SI" id="q2-si"/><Label htmlFor="q2-si">Sí</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="NO" id="q2-no"/><Label htmlFor="q2-no">No</Label></div>
                    </RadioGroup>
                </div>
                 <div className="space-y-3">
                    <Label>3. En caso de emergencia, ¿debe seguir las rutas de evacuación y puntos de encuentro señalizados?</Label>
                     <RadioGroup value={respuestaPregunta3} onValueChange={(v) => setRespuestaPregunta3(v as "SI" | "NO")} className="flex gap-4">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="SI" id="q3-si"/><Label htmlFor="q3-si">Sí</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="NO" id="q3-no"/><Label htmlFor="q3-no">No</Label></div>
                    </RadioGroup>
                </div>
            </CardContent>
        </Card>
        
        <Card>
             <CardHeader>
                <CardTitle>D. Firma de Aceptación</CardTitle>
                <CardDescription>
                    Firme con su dedo (si está en un dispositivo táctil) o con el
                    mouse, confirmando que ha leído y entendido las instrucciones de
                    seguridad de acceso a la faena.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <SignaturePad onChange={setFirmaDataUrl} onClear={() => setFirmaDataUrl(undefined)} />
            </CardContent>
        </Card>

        {errorForm && <p className="text-sm font-medium text-destructive">{errorForm}</p>}

        <div className="flex justify-end">
          <Button type="submit" size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={saving}>
            {saving ? "Guardando..." : "Finalizar Inducción"}
          </Button>
        </div>
      </form>

    </section>
  );
}
