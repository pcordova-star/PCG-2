"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import { guardarInduccionQR, InduccionAccesoFaena } from "@/lib/prevencionEventos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

type ObraInfo = {
  nombreFaena: string;
  mandante?: string;
  direccion?: string;
};

export default function PublicInduccionPage() {
  const { obraId } = useParams<{ obraId: string }>();
  const [obra, setObra] = useState<ObraInfo | null>(null);
  const [loadingObra, setLoadingObra] = useState(true);

  const [tipoVisita, setTipoVisita] = useState<InduccionAccesoFaena['tipoVisita']>("VISITA");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [rut, setRut] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [cargo, setCargo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  
  const [respuestaPregunta1, setRespuestaPregunta1] = useState<"SI" | "NO">("SI");
  const [respuestaPregunta2, setRespuestaPregunta2] = useState<"SI" | "NO">("NO");
  const [respuestaPregunta3, setRespuestaPregunta3] = useState<"SI" | "NO">("SI");

  const [aceptaReglamento, setAceptaReglamento] = useState(false);
  const [aceptaEpp, setAceptaEpp] = useState(false);
  const [aceptaTratamientoDatos, setAceptaTratamientoDatos] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!obraId) return;
    
    const fetchObra = async () => {
      setLoadingObra(true);
      try {
        const obraRef = doc(firebaseDb, "obras", obraId);
        const obraSnap = await getDoc(obraRef);
        if (obraSnap.exists()) {
          const data = obraSnap.data();
          setObra({
            nombreFaena: data.nombreFaena,
            mandante: data.mandante,
            direccion: data.direccion
          });
        }
      } catch (err) {
        console.error("Error fetching obra data:", err);
      } finally {
        setLoadingObra(false);
      }
    };
    
    fetchObra();
  }, [obraId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!aceptaReglamento || !aceptaEpp || !aceptaTratamientoDatos) {
      setError("Debes aceptar todas las declaraciones para continuar.");
      return;
    }
    if (!nombreCompleto.trim() || !rut.trim() || !empresa.trim()) {
        setError("Completa al menos tu nombre, RUT y empresa.");
        return;
    }

    setSaving(true);
    try {
      await guardarInduccionQR({
        obraId,
        obraNombre: obra?.nombreFaena ?? obraId,
        tipoVisita,
        nombreCompleto,
        rut,
        empresa,
        cargo,
        telefono,
        correo,
        fechaIngreso: new Date().toISOString().slice(0, 10),
        horaIngreso: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
        aceptaReglamento,
        aceptaEpp,
        aceptaTratamientoDatos,
        respuestaPregunta1,
        respuestaPregunta2,
        respuestaPregunta3,
      });
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError("Ocurrió un error al registrar la inducción. Por favor, intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center">
          <CardHeader>
            <CardTitle className="text-2xl text-green-600">¡Inducción Registrada!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Tu inducción de acceso a la obra ha sido registrada con éxito.</p>
            <p className="mt-4 font-semibold">Por favor, informa en portería para validar tu ingreso.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted p-4 sm:p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Inducción de Acceso a Faena</CardTitle>
            {loadingObra ? (
                 <p className="text-sm text-muted-foreground">Cargando datos de la obra...</p>
            ) : (
                <CardDescription>
                    Obra: <span className="font-semibold">{obra?.nombreFaena ?? obraId}</span>
                    {obra?.mandante && ` | Mandante: ${obra.mandante}`}
                </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              
              <section className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">1. Tus Datos Personales</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="tipoVisita">Tipo de Visita</Label>
                        <Select value={tipoVisita} onValueChange={(v) => setTipoVisita(v as InduccionAccesoFaena['tipoVisita'])}>
                            <SelectTrigger id="tipoVisita"><SelectValue /></SelectTrigger>
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
                        <Input id="nombreCompleto" value={nombreCompleto} onChange={(e) => setNombreCompleto(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="rut">RUT*</Label>
                        <Input id="rut" value={rut} onChange={(e) => setRut(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="empresa">Empresa*</Label>
                        <Input id="empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="cargo">Cargo u Ocupación</Label>
                        <Input id="cargo" value={cargo} onChange={(e) => setCargo(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="telefono">Teléfono</Label>
                        <Input id="telefono" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="correo">Correo Electrónico</Label>
                        <Input id="correo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />
                    </div>
                </div>
              </section>
              
              <section className="space-y-4">
                 <h3 className="font-semibold text-lg border-b pb-2">2. Preguntas de Comprensión</h3>
                 <div className="space-y-6">
                    <div className="space-y-3">
                        <Label>¿Debe respetar siempre las indicaciones del personal de la obra?</Label>
                        <RadioGroup value={respuestaPregunta1} onValueChange={(v) => setRespuestaPregunta1(v as "SI" | "NO")} className="flex gap-4">
                            <div className="flex items-center space-x-2"><RadioGroupItem value="SI" id="q1-si"/><Label htmlFor="q1-si">Sí</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="NO" id="q1-no"/><Label htmlFor="q1-no">No</Label></div>
                        </RadioGroup>
                    </div>
                    <div className="space-y-3">
                        <Label>¿Está permitido caminar bajo cargas suspendidas?</Label>
                        <RadioGroup value={respuestaPregunta2} onValueChange={(v) => setRespuestaPregunta2(v as "SI" | "NO")} className="flex gap-4">
                            <div className="flex items-center space-x-2"><RadioGroupItem value="SI" id="q2-si"/><Label htmlFor="q2-si">Sí</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="NO" id="q2-no"/><Label htmlFor="q2-no">No</Label></div>
                        </RadioGroup>
                    </div>
                    <div className="space-y-3">
                        <Label>En caso de emergencia, ¿debe seguir las rutas de evacuación señalizadas?</Label>
                        <RadioGroup value={respuestaPregunta3} onValueChange={(v) => setRespuestaPregunta3(v as "SI" | "NO")} className="flex gap-4">
                            <div className="flex items-center space-x-2"><RadioGroupItem value="SI" id="q3-si"/><Label htmlFor="q3-si">Sí</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="NO" id="q3-no"/><Label htmlFor="q3-no">No</Label></div>
                        </RadioGroup>
                    </div>
                 </div>
              </section>
              
              <section className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">3. Declaraciones y Compromisos</h3>
                <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                        <Checkbox id="aceptaReglamento" checked={aceptaReglamento} onCheckedChange={(c) => setAceptaReglamento(!!c)} />
                        <Label htmlFor="aceptaReglamento" className="text-sm font-normal text-muted-foreground">
                            Declaro haber recibido, leído y comprendido el Reglamento Especial para Empresas Contratistas y Subcontratistas y las normas de seguridad de esta obra.
                        </Label>
                    </div>
                    <div className="flex items-start space-x-3">
                        <Checkbox id="aceptaEpp" checked={aceptaEpp} onCheckedChange={(c) => setAceptaEpp(!!c)} />
                        <Label htmlFor="aceptaEpp" className="text-sm font-normal text-muted-foreground">
                            Me comprometo a utilizar en todo momento los Elementos de Protección Personal (EPP) requeridos para el área a la que ingreso.
                        </Label>
                    </div>
                    <div className="flex items-start space-x-3">
                        <Checkbox id="aceptaTratamientoDatos" checked={aceptaTratamientoDatos} onCheckedChange={(c) => setAceptaTratamientoDatos(!!c)} />
                        <Label htmlFor="aceptaTratamientoDatos" className="text-sm font-normal text-muted-foreground">
                            Acepto el tratamiento de mis datos personales para fines de registro y seguridad de la obra.
                        </Label>
                    </div>
                </div>
              </section>
              
              {error && <p className="text-sm font-medium text-destructive">{error}</p>}
              
              <Button type="submit" className="w-full" size="lg" disabled={saving}>
                {saving ? "Registrando Inducción..." : "Enviar y Finalizar Inducción"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
