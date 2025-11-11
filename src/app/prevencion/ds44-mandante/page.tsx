"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

type ObraPrevencion = {
  id: string;
  nombreFaena: string;
};

const OBRAS_PREVENCION: ObraPrevencion[] = [
  { id: "obra-1", nombreFaena: "Edificio Los Álamos" },
  { id: "obra-2", nombreFaena: "Condominio Cuatro Vientos" },
  { id: "obra-3", nombreFaena: "Mejoramiento Vial Ruta 5" },
];

type EstadoGlobalDS44Obra =
  | "EN_IMPLEMENTACION"
  | "CUMPLE"
  | "CON_OBSERVACIONES"
  | "CRITICO";

type FichaDS44Obra = {
  id: string;
  obraId: string;

  mandanteRazonSocial: string;
  mandanteRut: string;
  representanteLegal: string;

  responsableCoordinacionNombre: string;
  responsableCoordinacionCargo: string;
  responsableCoordinacionContacto: string;

  mutualidad: string;
  fechaInicioObra: string;       // YYYY-MM-DD
  fechaTerminoEstimado: string;  // YYYY-MM-DD

  existeReglamentoEspecial: boolean;
  existePlanUnicoSeguridad: boolean;
  existeProgramaCoordinacion: boolean;
  frecuenciaReunionesCoordinacion: string; // ej: semanal, quincenal
  mecanismosComunicacion: string;          // texto libre

  estadoGlobal: EstadoGlobalDS44Obra;
  observacionesGenerales: string;

  fechaUltimaRevision: string;  // YYYY-MM-DD
  revisadoPor: string;
};

const FICHAS_INICIALES: FichaDS44Obra[] = [
  {
    id: "ficha-obra-1",
    obraId: "obra-1",
    mandanteRazonSocial: "Constructora PCG S.A.",
    mandanteRut: "76.123.456-7",
    representanteLegal: "Juan Mandante",
    responsableCoordinacionNombre: "María Prevencionista",
    responsableCoordinacionCargo: "Experta en Prevención de Riesgos",
    responsableCoordinacionContacto: "+56 9 1234 5678 / maria@pcg.cl",
    mutualidad: "Mutual de Seguridad CChC",
    fechaInicioObra: "2025-01-15",
    fechaTerminoEstimado: "2026-01-15",
    existeReglamentoEspecial: true,
    existePlanUnicoSeguridad: true,
    existeProgramaCoordinacion: true,
    frecuenciaReunionesCoordinacion: "Semanal",
    mecanismosComunicacion:
      "Reuniones presenciales en obra, correo electrónico y actas firmadas.",
    estadoGlobal: "CUMPLE",
    observacionesGenerales:
      "La obra cuenta con coordinación formalizada y reuniones periódicas. Mantener seguimiento de empresas nuevas.",
    fechaUltimaRevision: "2025-11-10",
    revisadoPor: "María Prevencionista",
  },
];

export default function DS44MandanteObraPage() {
  const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>(
    OBRAS_PREVENCION[0]?.id ?? ""
  );

  const [fichas, setFichas] = useState<FichaDS44Obra[]>(FICHAS_INICIALES);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fichaActual =
    fichas.find((f) => f.obraId === obraSeleccionadaId) ?? null;

  const [formFicha, setFormFicha] = useState<FichaDS44Obra | null>(null);

  useEffect(() => {
    const existente =
      fichas.find((f) => f.obraId === obraSeleccionadaId) ?? null;
      
    if (existente) {
      setFormFicha(existente);
    } else {
      setFormFicha({
        id: "temp-" + obraSeleccionadaId,
        obraId: obraSeleccionadaId,
        mandanteRazonSocial: "",
        mandanteRut: "",
        representanteLegal: "",
        responsableCoordinacionNombre: "",
        responsableCoordinacionCargo: "",
        responsableCoordinacionContacto: "",
        mutualidad: "",
        fechaInicioObra: "",
        fechaTerminoEstimado: "",
        existeReglamentoEspecial: false,
        existePlanUnicoSeguridad: false,
        existeProgramaCoordinacion: false,
        frecuenciaReunionesCoordinacion: "",
        mecanismosComunicacion: "",
        estadoGlobal: "EN_IMPLEMENTACION",
        observacionesGenerales: "",
        fechaUltimaRevision: new Date().toISOString().slice(0, 10),
        revisadoPor: "",
      });
    }
  }, [obraSeleccionadaId, fichas]);
  
  const handleInputChange = (field: keyof FichaDS44Obra, value: any) => {
    if (formFicha) {
      setFormFicha({ ...formFicha, [field]: value });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm(null);
    setSuccessMessage(null);

    if (!formFicha) {
      setErrorForm("No hay datos en el formulario para guardar.");
      return;
    }
    if (!obraSeleccionadaId) {
      setErrorForm("Debe seleccionar una obra.");
      return;
    }
    if (!formFicha.mandanteRazonSocial.trim() || !formFicha.mandanteRut.trim()) {
      setErrorForm("La Razón Social y el RUT del mandante son obligatorios.");
      return;
    }
    if (!formFicha.responsableCoordinacionNombre.trim()) {
      setErrorForm("El nombre del responsable de coordinación es obligatorio.");
      return;
    }

    setFichas((prev) => {
      const yaExiste = prev.some((f) => f.obraId === obraSeleccionadaId);
      if (yaExiste) {
        return prev.map((f) =>
          f.obraId === obraSeleccionadaId ? formFicha : f
        );
      } else {
        return [
          ...prev,
          {
            ...formFicha,
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
          },
        ];
      }
    });

    setSuccessMessage("¡Ficha DS44 de la obra guardada correctamente!");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  if (!formFicha) {
      return (
          <div className="text-center p-8 text-muted-foreground">
              Cargando datos de la ficha...
          </div>
      );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold font-headline tracking-tight">DS44 – Mandante / Obra</h1>
        <p className="text-lg text-muted-foreground">
          Ficha global de cumplimiento de la obligación de coordinar las actividades preventivas en la obra, desde la perspectiva del mandante (DS44, Art. 3).
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Selección de Obra</CardTitle>
          <CardDescription>Seleccione la obra para la cual desea ver o editar la ficha DS44 global.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <Label htmlFor="obra-select">Obra / Faena</Label>
            <Select value={obraSeleccionadaId} onValueChange={setObraSeleccionadaId}>
              <SelectTrigger id="obra-select">
                <SelectValue placeholder="Seleccione una obra" />
              </SelectTrigger>
              <SelectContent>
                {OBRAS_PREVENCION.map((obra) => (
                  <SelectItem key={obra.id} value={obra.id}>
                    {obra.nombreFaena}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>A. Datos del Mandante y de la Obra</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2"><Label>Razón Social Mandante</Label><Input value={formFicha.mandanteRazonSocial} onChange={e => handleInputChange('mandanteRazonSocial', e.target.value)} /></div>
                <div className="space-y-2"><Label>RUT Mandante</Label><Input value={formFicha.mandanteRut} onChange={e => handleInputChange('mandanteRut', e.target.value)} /></div>
                <div className="space-y-2"><Label>Representante Legal</Label><Input value={formFicha.representanteLegal} onChange={e => handleInputChange('representanteLegal', e.target.value)} /></div>
                <div className="space-y-2"><Label>Mutualidad</Label><Input value={formFicha.mutualidad} onChange={e => handleInputChange('mutualidad', e.target.value)} /></div>
                <div className="space-y-2"><Label>Fecha de Inicio de Obra</Label><Input type="date" value={formFicha.fechaInicioObra} onChange={e => handleInputChange('fechaInicioObra', e.target.value)} /></div>
                <div className="space-y-2"><Label>Fecha de Término Estimado</Label><Input type="date" value={formFicha.fechaTerminoEstimado} onChange={e => handleInputChange('fechaTerminoEstimado', e.target.value)} /></div>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>B. Responsable de Coordinación DS44</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2"><Label>Nombre</Label><Input value={formFicha.responsableCoordinacionNombre} onChange={e => handleInputChange('responsableCoordinacionNombre', e.target.value)} /></div>
                <div className="space-y-2"><Label>Cargo</Label><Input value={formFicha.responsableCoordinacionCargo} onChange={e => handleInputChange('responsableCoordinacionCargo', e.target.value)} /></div>
                <div className="space-y-2"><Label>Contacto (Teléfono / Email)</Label><Input value={formFicha.responsableCoordinacionContacto} onChange={e => handleInputChange('responsableCoordinacionContacto', e.target.value)} /></div>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>C. Documentos y Coordinación DS44</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2"><Checkbox id="reglamento" checked={formFicha.existeReglamentoEspecial} onCheckedChange={c => handleInputChange('existeReglamentoEspecial', !!c)} /><Label htmlFor="reglamento">Existe Reglamento Especial de Faena</Label></div>
                    <div className="flex items-center space-x-2"><Checkbox id="plan" checked={formFicha.existePlanUnicoSeguridad} onCheckedChange={c => handleInputChange('existePlanUnicoSeguridad', !!c)} /><Label htmlFor="plan">Existe Plan de Seguridad Coordinado</Label></div>
                    <div className="flex items-center space-x-2"><Checkbox id="programa" checked={formFicha.existeProgramaCoordinacion} onCheckedChange={c => handleInputChange('existeProgramaCoordinacion', !!c)} /><Label htmlFor="programa">Existe Programa de Coordinación</Label></div>
                </div>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><Label>Frecuencia de Reuniones de Coordinación</Label><Input value={formFicha.frecuenciaReunionesCoordinacion} onChange={e => handleInputChange('frecuenciaReunionesCoordinacion', e.target.value)} placeholder="Ej: Semanal, Quincenal" /></div>
                    <div className="space-y-2"><Label>Mecanismos de Comunicación</Label><Textarea value={formFicha.mecanismosComunicacion} onChange={e => handleInputChange('mecanismosComunicacion', e.target.value)} placeholder="Ej: Correo, reuniones, actas..." /></div>
                </div>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>D. Estado Global y Observaciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Estado Global de Cumplimiento DS44</Label>
                        <Select value={formFicha.estadoGlobal} onValueChange={v => handleInputChange('estadoGlobal', v as EstadoGlobalDS44Obra)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EN_IMPLEMENTACION">En implementación</SelectItem>
                            <SelectItem value="CUMPLE">Cumple</SelectItem>
                            <SelectItem value="CON_OBSERVACIONES">Cumple con observaciones</SelectItem>
                            <SelectItem value="CRITICO">Crítico</SelectItem>
                          </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Observaciones Generales</Label>
                        <Textarea value={formFicha.observacionesGenerales} onChange={e => handleInputChange('observacionesGenerales', e.target.value)} />
                    </div>
                </div>
                <Separator />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Fecha de Última Revisión</Label>
                        <Input type="date" value={formFicha.fechaUltimaRevision} onChange={e => handleInputChange('fechaUltimaRevision', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Revisado Por</Label>
                        <Input value={formFicha.revisadoPor} onChange={e => handleInputChange('revisadoPor', e.target.value)} placeholder="Nombre del Prevencionista / Comité" />
                    </div>
                 </div>
            </CardContent>
        </Card>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
            <Button type="submit" className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90">Guardar Ficha DS44 de la Obra</Button>
            {errorForm && <p className="text-sm font-medium text-destructive">{errorForm}</p>}
            {successMessage && <p className="text-sm font-medium text-green-600">{successMessage}</p>}
        </div>
      </form>
    </div>
  );
}