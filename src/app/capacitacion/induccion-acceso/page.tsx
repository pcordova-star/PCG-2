"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// --- Tipos y Datos ---
type ObraCapacitacion = {
  id: string;
  nombreFaena: string;
};

type RegistroInduccionAcceso = {
  id: string;
  obraId: string;
  nombreVisitante: string;
  rutVisitante: string;
  empresaVisitante: string;
  motivoVisita: string;
  telefono: string;
  email: string;
  fechaRegistro: string; // ISO date
  respuestasCorrectas: boolean;
  firmaDataUrl: string; // imagen en base64 del canvas
};

const OBRAS_CAPACITACION: ObraCapacitacion[] = [
  { id: "obra-1", nombreFaena: "Edificio Los Álamos" },
  { id: "obra-2", nombreFaena: "Condominio Cuatro Vientos" },
  { id: "obra-3", nombreFaena: "Mejoramiento Vial Ruta 5" },
];

// --- Componente de Firma ---
type SignaturePadProps = {
  onChange: (dataUrl: string | null) => void;
};

function SignaturePad({ onChange }: SignaturePadProps) {
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
    onChange(null);
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
  const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>(
    OBRAS_CAPACITACION[0]?.id ?? ""
  );

  const [registros, setRegistros] = useState<RegistroInduccionAcceso[]>([]);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [firmaDataUrl, setFirmaDataUrl] = useState<string | null>(null);

  const [formVisitante, setFormVisitante] = useState({
    nombreVisitante: "",
    rutVisitante: "",
    empresaVisitante: "",
    motivoVisita: "",
    telefono: "",
    email: "",
  });

  const [respuesta1, setRespuesta1] = useState<string>("");
  const [respuesta2, setRespuesta2] = useState<string>("");
  const [respuesta3, setRespuesta3] = useState<string>("");

  function todasRespuestasCorrectas(): boolean {
    return respuesta1 === "SI" && respuesta2 === "NO" && respuesta3 === "SI";
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorForm(null);
    setSuccessMessage(null);

    if (!obraSeleccionadaId) {
      setErrorForm("Debes seleccionar una obra.");
      return;
    }

    if (
      !formVisitante.nombreVisitante.trim() ||
      !formVisitante.rutVisitante.trim() ||
      !formVisitante.empresaVisitante.trim() ||
      !formVisitante.motivoVisita.trim()
    ) {
      setErrorForm("Completa los datos básicos del visitante (nombre, RUT, empresa, motivo).");
      return;
    }

    if (!todasRespuestasCorrectas()) {
      setErrorForm("Debes responder correctamente todas las preguntas de comprensión para continuar.");
      return;
    }

    if (!firmaDataUrl) {
      setErrorForm("Debes firmar para confirmar que entendiste la inducción.");
      return;
    }

    const nuevoRegistro: RegistroInduccionAcceso = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      obraId: obraSeleccionadaId,
      nombreVisitante: formVisitante.nombreVisitante.trim(),
      rutVisitante: formVisitante.rutVisitante.trim(),
      empresaVisitante: formVisitante.empresaVisitante.trim(),
      motivoVisita: formVisitante.motivoVisita.trim(),
      telefono: formVisitante.telefono.trim(),
      email: formVisitante.email.trim(),
      fechaRegistro: new Date().toISOString(),
      respuestasCorrectas: true,
      firmaDataUrl: firmaDataUrl,
    };

    setRegistros((prev) => [nuevoRegistro, ...prev]);
    setSuccessMessage("¡Inducción registrada con éxito!");

    setFormVisitante({
      nombreVisitante: "",
      rutVisitante: "",
      empresaVisitante: "",
      motivoVisita: "",
      telefono: "",
      email: "",
    });
    setRespuesta1("");
    setRespuesta2("");
    setRespuesta3("");
    setFirmaDataUrl(null);
    
    // Idealmente, el canvas de la firma debería limpiarse también.
    // Esto se puede hacer llamando una función del componente SignaturePad a través de una ref.
    // Por simplicidad en este MVP, lo omitimos, pero se recomienda implementarlo.
  }

  const obraSeleccionada = OBRAS_CAPACITACION.find(
    (o) => o.id === obraSeleccionadaId
  );

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

      {/* En producción, esta página se podría invocar con un query param ?obraId=...
          desde un código QR específico por obra, para no tener que elegir la obra aquí. */}
      <Card>
        <CardHeader>
          <CardTitle>Selección de Obra</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="space-y-2">
                <Label htmlFor="obra-select">Obra / Faena a visitar</Label>
                <Select value={obraSeleccionadaId} onValueChange={setObraSeleccionadaId}>
                    <SelectTrigger id="obra-select">
                        <SelectValue placeholder="Seleccione una obra" />
                    </SelectTrigger>
                    <SelectContent>
                        {OBRAS_CAPACITACION.map((obra) => (
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

      <form
        className="space-y-6"
        onSubmit={handleSubmit}
      >
        <Card>
            <CardHeader>
                <CardTitle>A. Datos del visitante</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2"><Label htmlFor="nombre">Nombre Completo*</Label><Input id="nombre" value={formVisitante.nombreVisitante} onChange={(e) => setFormVisitante(p => ({...p, nombreVisitante: e.target.value}))}/></div>
                    <div className="space-y-2"><Label htmlFor="rut">RUT*</Label><Input id="rut" value={formVisitante.rutVisitante} onChange={(e) => setFormVisitante(p => ({...p, rutVisitante: e.target.value}))}/></div>
                    <div className="space-y-2"><Label htmlFor="empresa">Empresa*</Label><Input id="empresa" value={formVisitante.empresaVisitante} onChange={(e) => setFormVisitante(p => ({...p, empresaVisitante: e.target.value}))}/></div>
                    <div className="space-y-2"><Label htmlFor="motivo">Motivo de la visita*</Label><Input id="motivo" value={formVisitante.motivoVisita} onChange={(e) => setFormVisitante(p => ({...p, motivoVisita: e.target.value}))}/></div>
                    <div className="space-y-2"><Label htmlFor="telefono">Teléfono de contacto</Label><Input id="telefono" type="tel" value={formVisitante.telefono} onChange={(e) => setFormVisitante(p => ({...p, telefono: e.target.value}))}/></div>
                    <div className="space-y-2"><Label htmlFor="email">Email de contacto</Label><Input id="email" type="email" value={formVisitante.email} onChange={(e) => setFormVisitante(p => ({...p, email: e.target.value}))}/></div>
                </div>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>B. Preguntas de Comprensión</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="space-y-3">
                    <Label>1. ¿Debe respetar siempre las indicaciones del personal de la obra?</Label>
                    <RadioGroup value={respuesta1} onValueChange={setRespuesta1} className="flex gap-4">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="SI" id="q1-si"/><Label htmlFor="q1-si">Sí</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="NO" id="q1-no"/><Label htmlFor="q1-no">No</Label></div>
                    </RadioGroup>
                </div>
                 <div className="space-y-3">
                    <Label>2. ¿Está permitido caminar bajo cargas suspendidas?</Label>
                    <RadioGroup value={respuesta2} onValueChange={setRespuesta2} className="flex gap-4">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="SI" id="q2-si"/><Label htmlFor="q2-si">Sí</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="NO" id="q2-no"/><Label htmlFor="q2-no">No</Label></div>
                    </RadioGroup>
                </div>
                 <div className="space-y-3">
                    <Label>3. En caso de emergencia, ¿debe seguir las rutas de evacuación y puntos de encuentro señalizados?</Label>
                     <RadioGroup value={respuesta3} onValueChange={setRespuesta3} className="flex gap-4">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="SI" id="q3-si"/><Label htmlFor="q3-si">Sí</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="NO" id="q3-no"/><Label htmlFor="q3-no">No</Label></div>
                    </RadioGroup>
                </div>
            </CardContent>
        </Card>
        
        <Card>
             <CardHeader>
                <CardTitle>C. Firma de Aceptación</CardTitle>
                <CardDescription>
                    Firme con su dedo (si está en un dispositivo táctil) o con el
                    mouse, confirmando que ha leído y entendido las instrucciones de
                    seguridad de acceso a la faena.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <SignaturePad onChange={setFirmaDataUrl} />
            </CardContent>
        </Card>

        {errorForm && <p className="text-sm font-medium text-destructive">{errorForm}</p>}
        {successMessage && <p className="text-sm font-medium text-green-600">{successMessage}</p>}

        <div className="flex justify-end">
          <Button type="submit" size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
            Aceptar y Registrar Acceso
          </Button>
        </div>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Registros Recientes de Inducción</CardTitle>
          <CardDescription>Recuerda que este es solo un MVP con datos en memoria, los registros se pierden al recargar.</CardDescription>
        </CardHeader>
        <CardContent>
            {registros.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aún no hay registros en esta sesión.</p>
            ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {registros.map((reg) => (
                <article
                    key={reg.id}
                    className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1.5"
                >
                    <p className="font-semibold text-foreground">
                    {reg.nombreVisitante} ({reg.rutVisitante}) –{" "}
                    {reg.empresaVisitante}
                    </p>
                    <p className="text-xs text-muted-foreground">
                    Obra:{" "}
                    {
                        OBRAS_CAPACITACION.find((o) => o.id === reg.obraId)
                        ?.nombreFaena
                    }{" "}
                    · Motivo: {reg.motivoVisita}
                    </p>
                    <p className="text-xs text-muted-foreground">
                    Fecha: {new Date(reg.fechaRegistro).toLocaleString()}
                    </p>
                    <div className="flex items-start gap-4 pt-2">
                        <div className="text-xs text-muted-foreground">Firma:</div>
                        <img src={reg.firmaDataUrl} alt="Firma" className="h-16 w-auto border rounded-md bg-white"/>
                    </div>
                </article>
                ))}
            </div>
            )}
        </CardContent>
      </Card>
    </section>
  );
}
