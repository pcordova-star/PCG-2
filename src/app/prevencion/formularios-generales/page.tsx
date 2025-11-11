"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type ObraPrevencion = {
  id: string;
  nombreFaena: string;
};

type IPERRegistro = {
  id: string;
  obraId: string;
  area: string;              
  actividad: string;         
  peligro: string;           
  descripcionRiesgo: string; 
  consecuencias: string;     
  probabilidad: "Baja" | "Media" | "Alta";
  severidad: "Leve" | "Grave" | "Fatal";
  nivelRiesgo: "Tolerable" | "Importante" | "Intolerable";
  medidasControlExistentes: string;
  medidasControlPropuestas: string;
  responsableImplementacion: string;
  plazoImplementacion: string; 
};

const OBRAS_IPER: ObraPrevencion[] = [
  { id: "obra-1", nombreFaena: "Edificio Los Álamos" },
  { id: "obra-2", nombreFaena: "Condominio Cuatro Vientos" },
  { id: "obra-3", nombreFaena: "Mejoramiento Vial Ruta 5" },
];

const IPER_INICIAL: IPERRegistro[] = [
  {
    id: "iper-1",
    obraId: "obra-1",
    area: "Excavaciones",
    actividad: "Excavación de fundaciones con retroexcavadora",
    peligro: "Colapso de talud",
    descripcionRiesgo: "Sepultamiento de trabajador en fondo de excavación",
    consecuencias: "Atrapamiento / asfixia",
    probabilidad: "Media",
    severidad: "Grave",
    nivelRiesgo: "Importante",
    medidasControlExistentes:
      "Taludes a 45°, accesos controlados, supervisión permanente.",
    medidasControlPropuestas:
      "Instalar entibaciones en zonas inestables y señalización adicional.",
    responsableImplementacion: "Jefe de Obra",
    plazoImplementacion: "2025-11-30",
  },
];

function IPERFormSection() {
  const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>(
    OBRAS_IPER[0]?.id ?? ""
  );
  const [registrosIPER, setRegistrosIPER] = useState<IPERRegistro[]>(IPER_INICIAL);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const [formIPER, setFormIPER] = useState<{
    area: string;
    actividad: string;
    peligro: string;
    descripcionRiesgo: string;
    consecuencias: string;
    probabilidad: "Baja" | "Media" | "Alta";
    severidad: "Leve" | "Grave" | "Fatal";
    medidasControlExistentes: string;
    medidasControlPropuestas: string;
    responsableImplementacion: string;
    plazoImplementacion: string;
  }>({
    area: "",
    actividad: "",
    peligro: "",
    descripcionRiesgo: "",
    consecuencias: "",
    probabilidad: "Media",
    severidad: "Grave",
    medidasControlExistentes: "",
    medidasControlPropuestas: "",
    responsableImplementacion: "",
    plazoImplementacion: "",
  });

  const registrosDeObra = registrosIPER.filter(
    (r) => r.obraId === obraSeleccionadaId
  );

  function calcularNivelRiesgo(
    prob: "Baja" | "Media" | "Alta",
    sev: "Leve" | "Grave" | "Fatal"
  ): "Tolerable" | "Importante" | "Intolerable" {
    if (prob === "Alta" && (sev === "Grave" || sev === "Fatal")) {
      return "Intolerable";
    }
    if (prob === "Media" && sev === "Fatal") {
      return "Intolerable";
    }
    if (prob === "Media" && sev === "Grave") {
      return "Importante";
    }
    if (prob === "Alta" && sev === "Leve") {
      return "Importante";
    }
    return "Tolerable";
  }

  const handleInputChange = <K extends keyof typeof formIPER>(campo: K, valor: (typeof formIPER)[K]) => {
    setFormIPER(prev => ({ ...prev, [campo]: valor }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm(null);

    if (!obraSeleccionadaId) {
      setErrorForm("Debe seleccionar una obra.");
      return;
    }
    if (!formIPER.area.trim() || !formIPER.actividad.trim() || !formIPER.peligro.trim()) {
      setErrorForm("Los campos 'Área', 'Actividad' y 'Peligro' son obligatorios.");
      return;
    }

    const nuevoRegistro: IPERRegistro = {
      id: `iper-${Date.now()}`,
      obraId: obraSeleccionadaId,
      nivelRiesgo: calcularNivelRiesgo(formIPER.probabilidad, formIPER.severidad),
      ...formIPER,
    };

    setRegistrosIPER(prev => [nuevoRegistro, ...prev]);
    
    // Limpiar formulario parcialmente
    setFormIPER(prev => ({
        ...prev,
        area: "",
        actividad: "",
        peligro: "",
        descripcionRiesgo: "",
        consecuencias: "",
        medidasControlExistentes: "",
        medidasControlPropuestas: "",
        responsableImplementacion: "",
        plazoImplementacion: "",
    }));
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>IPER / Matriz de Riesgos por Actividad</CardTitle>
        <CardDescription>
          Identifique peligros, evalúe riesgos y proponga medidas de control para las actividades de la obra.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="max-w-xs space-y-2">
            <Label htmlFor="obra-select-iper">Obra / Faena</Label>
            <Select value={obraSeleccionadaId} onValueChange={setObraSeleccionadaId}>
              <SelectTrigger id="obra-select-iper">
                <SelectValue placeholder="Seleccione una obra" />
              </SelectTrigger>
              <SelectContent>
                {OBRAS_IPER.map((obra) => (
                  <SelectItem key={obra.id} value={obra.id}>
                    {obra.nombreFaena}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Agregar Nuevo Registro IPER</h3>
            {errorForm && <p className="text-sm font-medium text-destructive">{errorForm}</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Área/Frente de Trabajo*</Label><Input value={formIPER.area} onChange={e => handleInputChange('area', e.target.value)} /></div>
                <div className="space-y-2"><Label>Actividad*</Label><Input value={formIPER.actividad} onChange={e => handleInputChange('actividad', e.target.value)} /></div>
            </div>
            
            <div className="space-y-2"><Label>Peligro Identificado*</Label><Input value={formIPER.peligro} onChange={e => handleInputChange('peligro', e.target.value)} /></div>
            <div className="space-y-2"><Label>Descripción del Riesgo</Label><Textarea value={formIPER.descripcionRiesgo} onChange={e => handleInputChange('descripcionRiesgo', e.target.value)} rows={2}/></div>
            <div className="space-y-2"><Label>Consecuencias Potenciales</Label><Input value={formIPER.consecuencias} onChange={e => handleInputChange('consecuencias', e.target.value)} /></div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="space-y-2">
                    <Label>Probabilidad</Label>
                    <Select value={formIPER.probabilidad} onValueChange={v => handleInputChange('probabilidad', v as any)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent><SelectItem value="Baja">Baja</SelectItem><SelectItem value="Media">Media</SelectItem><SelectItem value="Alta">Alta</SelectItem></SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label>Severidad</Label>
                    <Select value={formIPER.severidad} onValueChange={v => handleInputChange('severidad', v as any)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent><SelectItem value="Leve">Leve</SelectItem><SelectItem value="Grave">Grave</SelectItem><SelectItem value="Fatal">Fatal</SelectItem></SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label>Nivel de Riesgo (calculado)</Label>
                    <Input value={calcularNivelRiesgo(formIPER.probabilidad, formIPER.severidad)} readOnly className="font-semibold bg-muted"/>
                </div>
            </div>

            <div className="space-y-2"><Label>Medidas de Control Existentes</Label><Textarea value={formIPER.medidasControlExistentes} onChange={e => handleInputChange('medidasControlExistentes', e.target.value)} rows={2}/></div>
            <div className="space-y-2"><Label>Medidas de Control Propuestas</Label><Textarea value={formIPER.medidasControlPropuestas} onChange={e => handleInputChange('medidasControlPropuestas', e.target.value)} rows={2}/></div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Responsable Implementación</Label><Input value={formIPER.responsableImplementacion} onChange={e => handleInputChange('responsableImplementacion', e.target.value)} /></div>
                <div className="space-y-2"><Label>Plazo Implementación</Label><Input type="date" value={formIPER.plazoImplementacion} onChange={e => handleInputChange('plazoImplementacion', e.target.value)} /></div>
            </div>

            <Button type="submit" className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90">Agregar a Matriz IPER</Button>
          </form>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold border-b pb-2">Registros IPER de la Obra</h3>
            {registrosDeObra.length === 0 ? (
              <p className="text-sm text-muted-foreground pt-4 text-center">
                No hay registros IPER para esta obra aún.
              </p>
            ) : (
              <div className="max-h-[600px] overflow-y-auto space-y-3 pr-2">
                {registrosDeObra.map((r) => (
                  <article key={r.id} className="rounded-lg border bg-card p-4 shadow-sm space-y-2">
                    <p className="font-semibold text-primary">{r.area} – {r.actividad}</p>
                    <p className="text-sm"><strong className="text-muted-foreground">Peligro:</strong> {r.peligro}</p>
                    <p className="text-sm"><strong className="text-muted-foreground">Riesgo:</strong> {r.descripcionRiesgo}</p>
                    <p className="text-sm"><strong className="text-muted-foreground">Consecuencias:</strong> {r.consecuencias}</p>
                    <div className="text-sm p-2 rounded-md bg-muted flex items-center justify-between">
                      <span>Nivel de Riesgo: <strong className="text-foreground">{r.nivelRiesgo}</strong></span>
                      <span className="text-xs">(Prob: {r.probabilidad} / Sev: {r.severidad})</span>
                    </div>
                    <p className="text-xs"><strong className="text-muted-foreground">Control Existente:</strong> {r.medidasControlExistentes}</p>
                    <p className="text-xs"><strong className="text-muted-foreground">Control Propuesto:</strong> {r.medidasControlPropuestas}</p>
                    <div className="text-xs pt-2 border-t mt-2 flex justify-between">
                        <span><strong className="text-muted-foreground">Responsable:</strong> {r.responsableImplementacion || "No asignado"}</span>
                        <span><strong className="text-muted-foreground">Plazo:</strong> {r.plazoImplementacion || "Sin plazo"}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


export default function FormulariosGeneralesPrevencionPage() {
  const [mostrarIPER, setMostrarIPER] = useState(true);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Formularios generales DS44
        </h1>
        <p className="text-lg text-muted-foreground">
          Herramientas transversales del sistema de gestión: IPER/matriz de riesgos,
          investigación de incidentes, planes de acción, etc. MVP con datos simulados.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="flex flex-col justify-between transition-all hover:shadow-lg hover:-translate-y-1">
          <CardHeader>
            <CardTitle>IPER / Matriz de riesgos</CardTitle>
            <CardDescription>
              Identificación de peligros y evaluación de riesgos por actividad,
              como exige el DS44 y los sistemas de gestión.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setMostrarIPER(true)}
              className="w-full"
            >
              Ver IPER / Matriz
            </Button>
          </CardContent>
        </Card>

        <Card className="border-dashed bg-muted/50 flex items-center justify-center text-center">
            <CardHeader>
                <CardTitle className="text-muted-foreground">Investigación de incidentes</CardTitle>
                <CardDescription>(Ishikawa) – Próximamente</CardDescription>
            </CardHeader>
        </Card>
        <Card className="border-dashed bg-muted/50 flex items-center justify-center text-center">
             <CardHeader>
                <CardTitle className="text-muted-foreground">Planes de acción</CardTitle>
                <CardDescription>Próximamente</CardDescription>
            </CardHeader>
        </Card>
      </div>

      {mostrarIPER && (
        <IPERFormSection />
      )}
    </section>
  );
}
