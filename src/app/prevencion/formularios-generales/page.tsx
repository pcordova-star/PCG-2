"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import Link from 'next/link';


// --- Tipos y Datos para IPER ---
type ObraPrevencion = {
  id: string;
  nombreFaena: string;
};

type IPERRegistro = {
  id: string;
  obraId: string;
  obraNombre?: string;
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
  fecha?: string;
  createdAt?: any;
};

const OBRAS_IPER: ObraPrevencion[] = [
  { id: "obra-1", nombreFaena: "Edificio Los Álamos" },
  { id: "obra-2", nombreFaena: "Condominio Cuatro Vientos" },
  { id: "obra-3", nombreFaena: "Mejoramiento Vial Ruta 5" },
];

// --- Tipos y Datos para Investigación de Incidentes ---
type TipoIncidente =
  | "Accidente con tiempo perdido"
  | "Accidente sin tiempo perdido"
  | "Casi accidente"
  | "Daño a la propiedad";

type GravedadIncidente = "Leve" | "Grave" | "Fatal potencial";

type RegistroIncidente = {
  id: string;
  obraId: string;
  obraNombre?: string;
  fecha: string; 
  lugar: string;
  tipoIncidente: TipoIncidente;
  gravedad: GravedadIncidente;
  descripcionHecho: string;
  lesionPersona: string;
  actoInseguro: string;
  condicionInsegura: string;
  causasInmediatas: string;
  causasBasicas: string;
  analisisIshikawa: string;
  analisis5Porques: string;
  medidasCorrectivas: string;
  responsableSeguimiento: string;
  plazoCierre: string;
  estadoCierre: "Abierto" | "En seguimiento" | "Cerrado";
  createdAt?: any;
};

// --- Tipos y Datos para Plan de Acción ---
type OrigenAccion =
  | "IPER"
  | "INCIDENTE"
  | "OBSERVACION"
  | "OTRO";

type EstadoAccion = "Pendiente" | "En progreso" | "Cerrada";

type RegistroPlanAccion = {
  id: string;
  obraId: string;
  obraNombre?: string;
  origen: OrigenAccion;
  referencia: string; 
  descripcionAccion: string;
  responsable: string;
  plazo: string;
  estado: EstadoAccion;
  avance: string;
  observacionesCierre: string;
  fechaCreacion: string;
  creadoPor: string;
  createdAt?: any;
};

// Tipo para el "prefill"
type PlanAccionPrefill = {
  obraId: string;
  origen: OrigenAccion;
  referencia: string;
  descripcionSugerida?: string;
} | null;

// --- Componente IPER ---
type IPERFormSectionProps = {
  onCrearAccionDesdeIPER: (payload: {
    obraId: string;
    iperId: string;
    descripcion?: string;
  }) => void;
};

function IPERFormSection({ onCrearAccionDesdeIPER }: IPERFormSectionProps) {
  const [obras, setObras] = useState<ObraPrevencion[]>(OBRAS_IPER);
  const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>(
    OBRAS_IPER[0]?.id ?? ""
  );
  const [iperRegistros, setIperRegistros] = useState<IPERRegistro[]>([]);
  const [cargandoIper, setCargandoIper] = useState(false);
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

  const cargarObras = async () => {
     try {
        const q = query(collection(firebaseDb, "obras"), orderBy("nombreFaena"));
        const querySnapshot = await getDocs(q);
        const data: ObraPrevencion[] = querySnapshot.docs.map(doc => ({
            id: doc.id,
            nombreFaena: doc.data().nombreFaena
        } as ObraPrevencion));
        setObras(data);
        if (data.length > 0 && !obraSeleccionadaId) {
          setObraSeleccionadaId(data[0].id);
        }
    } catch (err) {
        console.error("Error al cargar obras: ", err);
    }
  }

  const cargarIperDeObra = async (obraId: string) => {
    if (!obraId) {
        setIperRegistros([]);
        return;
    }
    setCargandoIper(true);
    try {
        const q = query(
            collection(firebaseDb, "iperRegistros"),
            where("obraId", "==", obraId),
            orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        const data: IPERRegistro[] = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as IPERRegistro));
        setIperRegistros(data);
    } catch (err) {
        console.error("Error al cargar registros IPER: ", err);
        setErrorForm("No se pudieron cargar los registros IPER.");
    } finally {
        setCargandoIper(false);
    }
  };

  useEffect(() => {
    cargarObras();
  }, []);

  useEffect(() => {
    if (obraSeleccionadaId) {
      cargarIperDeObra(obraSeleccionadaId);
    }
  }, [obraSeleccionadaId]);

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

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
        const nivelRiesgo = calcularNivelRiesgo(formIPER.probabilidad, formIPER.severidad);
        const obraSeleccionada = obras.find(o => o.id === obraSeleccionadaId);
        
        await addDoc(collection(firebaseDb, "iperRegistros"), {
            ...formIPER,
            nivelRiesgo,
            obraId: obraSeleccionadaId,
            obraNombre: obraSeleccionada?.nombreFaena ?? "N/A",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            fecha: new Date().toISOString().slice(0, 10),
        });
        
        setFormIPER({
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
        
        cargarIperDeObra(obraSeleccionadaId);

    } catch (error) {
        console.error("Error al guardar el registro IPER:", error);
        setErrorForm("No se pudo guardar el registro. Intente de nuevo.");
    }
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
                {obras.map((obra) => (
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
            {cargandoIper ? (<p className="text-sm text-muted-foreground pt-4 text-center">Cargando registros IPER...</p>)
            : iperRegistros.length === 0 ? (
              <p className="text-sm text-muted-foreground pt-4 text-center">
                No hay registros IPER para esta obra aún.
              </p>
            ) : (
              <div className="max-h-[600px] overflow-y-auto space-y-3 pr-2">
                {iperRegistros.map((r) => (
                  <article key={r.id} className="rounded-lg border bg-card p-4 shadow-sm space-y-2 text-sm">
                    <p className="font-semibold text-primary">{r.area} – {r.actividad}</p>
                    <p><strong className="text-muted-foreground">Peligro:</strong> {r.peligro}</p>
                    <p><strong className="text-muted-foreground">Riesgo:</strong> {r.descripcionRiesgo}</p>
                    <p><strong className="text-muted-foreground">Consecuencias:</strong> {r.consecuencias}</p>
                    <div className="p-2 rounded-md bg-muted flex items-center justify-between">
                      <span>Nivel de Riesgo: <strong className="text-foreground">{r.nivelRiesgo}</strong></span>
                      <span className="text-xs">(Prob: {r.probabilidad} / Sev: {r.severidad})</span>
                    </div>
                    <p className="text-xs"><strong className="text-muted-foreground">Control Existente:</strong> {r.medidasControlExistentes}</p>
                    <p className="text-xs"><strong className="text-muted-foreground">Control Propuesto:</strong> {r.medidasControlPropuestas}</p>
                    <div className="text-xs pt-2 border-t mt-2 flex justify-between">
                        <span><strong className="text-muted-foreground">Responsable:</strong> {r.responsableImplementacion || "No asignado"}</span>
                        <span><strong className="text-muted-foreground">Plazo:</strong> {r.plazoImplementacion || "Sin plazo"}</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        type="button"
                        onClick={() =>
                          onCrearAccionDesdeIPER({
                            obraId: r.obraId,
                            iperId: r.id,
                            descripcion: `Acción sobre riesgo: ${r.peligro} – ${r.actividad}`,
                          })
                        }
                        variant="outline"
                        size="sm"
                      >
                        Crear acción desde este riesgo
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/prevencion/formularios-generales/iper/${r.id}/imprimir`}>
                          Ver Ficha
                        </Link>
                      </Button>
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

// --- Componente Investigación de Incidentes ---
type InvestigacionIncidenteSectionProps = {
  onCrearAccionDesdeIncidente: (payload: {
    obraId: string;
    incidenteId: string;
    descripcion?: string;
  }) => void;
};

function InvestigacionIncidenteSection({ onCrearAccionDesdeIncidente }: InvestigacionIncidenteSectionProps) {
  const [obras, setObras] = useState<ObraPrevencion[]>(OBRAS_IPER);
  const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>(
    OBRAS_IPER[0]?.id ?? ""
  );

  const [registrosIncidentes, setRegistrosIncidentes] =
    useState<RegistroIncidente[]>([]);
    
  const [cargandoIncidentes, setCargandoIncidentes] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const [formIncidente, setFormIncidente] = useState<{
    fecha: string;
    lugar: string;
    tipoIncidente: TipoIncidente;
    gravedad: GravedadIncidente;
    descripcionHecho: string;
    lesionPersona: string;
    actoInseguro: string;
    condicionInsegura: string;
    causasInmediatas: string;
    causasBasicas: string;
    analisisIshikawa: string;
    analisis5Porques: string;
    medidasCorrectivas: string;
    responsableSeguimiento: string;
    plazoCierre: string;
    estadoCierre: "Abierto" | "En seguimiento" | "Cerrado";
  }>({
    fecha: new Date().toISOString().slice(0, 10),
    lugar: "",
    tipoIncidente: "Casi accidente",
    gravedad: "Leve",
    descripcionHecho: "",
    lesionPersona: "",
    actoInseguro: "",
    condicionInsegura: "",
    causasInmediatas: "",
    causasBasicas: "",
    analisisIshikawa: "",
    analisis5Porques: "",
    medidasCorrectivas: "",
    responsableSeguimiento: "",
    plazoCierre: "",
    estadoCierre: "Abierto",
  });

  const cargarObras = async () => {
     try {
        const q = query(collection(firebaseDb, "obras"), orderBy("nombreFaena"));
        const querySnapshot = await getDocs(q);
        const data: ObraPrevencion[] = querySnapshot.docs.map(doc => ({
            id: doc.id,
            nombreFaena: doc.data().nombreFaena
        } as ObraPrevencion));
        setObras(data);
        if (data.length > 0 && !obraSeleccionadaId) {
          setObraSeleccionadaId(data[0].id);
        }
    } catch (err) {
        console.error("Error al cargar obras: ", err);
    }
  }

  const cargarIncidentes = async (obraId: string) => {
    if (!obraId) {
      setRegistrosIncidentes([]);
      return;
    }
    setCargandoIncidentes(true);
    try {
      const q = query(
        collection(firebaseDb, "investigacionesIncidentes"),
        where("obraId", "==", obraId),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const data: RegistroIncidente[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any),
      }));
      setRegistrosIncidentes(data);
    } catch (err) {
      console.error("Error cargando incidentes:", err);
      setErrorForm("No se pudieron cargar los registros de incidentes.");
    } finally {
      setCargandoIncidentes(false);
    }
  };

  useEffect(() => {
    cargarObras();
  }, []);

  useEffect(() => {
    if (obraSeleccionadaId) {
      cargarIncidentes(obraSeleccionadaId);
    }
  }, [obraSeleccionadaId]);
  
  const handleInputChange = <K extends keyof typeof formIncidente>(campo: K, valor: (typeof formIncidente)[K]) => {
    setFormIncidente(prev => ({ ...prev, [campo]: valor }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm(null);

    if (!obraSeleccionadaId) {
      setErrorForm("Debes seleccionar una obra.");
      return;
    }
    if (!formIncidente.fecha) {
      setErrorForm("Debes indicar la fecha del incidente.");
      return;
    }
    if (!formIncidente.descripcionHecho.trim()) {
      setErrorForm("Debes describir el hecho.");
      return;
    }
    
    const obraSeleccionada = obras.find(o => o.id === obraSeleccionadaId);

    try {
        await addDoc(collection(firebaseDb, "investigacionesIncidentes"), {
            ...formIncidente,
            obraId: obraSeleccionadaId,
            obraNombre: obraSeleccionada?.nombreFaena ?? "N/A",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        setFormIncidente((prev) => ({
            ...prev,
            lugar: "",
            descripcionHecho: "",
            lesionPersona: "",
            actoInseguro: "",
            condicionInsegura: "",
            causasInmediatas: "",
            causasBasicas: "",
            analisisIshikawa: "",
            analisis5Porques: "",
            medidasCorrectivas: "",
            responsableSeguimiento: "",
            plazoCierre: "",
        }));

        cargarIncidentes(obraSeleccionadaId);

    } catch (error) {
        console.error("Error guardando incidente:", error);
        setErrorForm("No se pudo guardar el incidente. Intente de nuevo.");
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Investigación de incidente / casi accidente (Ishikawa / 5 porqués)</CardTitle>
        <CardDescription>
          Registro de incidentes, causas e investigación. Conectado a Firestore.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
         <div className="max-w-xs space-y-2">
          <Label htmlFor="obra-select-incidente">Obra / Faena</Label>
          <Select value={obraSeleccionadaId} onValueChange={setObraSeleccionadaId}>
            <SelectTrigger id="obra-select-incidente">
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

      <div className="grid gap-8 md:grid-cols-2">
        <form
          className="space-y-4"
          onSubmit={handleSubmit}
        >
          <h3 className="text-lg font-semibold border-b pb-2">Registrar Nuevo Incidente</h3>
          {errorForm && (
            <p className="text-sm font-medium text-destructive">{errorForm}</p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Fecha del incidente*</Label><Input type="date" value={formIncidente.fecha} onChange={e => handleInputChange('fecha', e.target.value)} /></div>
            <div className="space-y-2"><Label>Lugar del incidente</Label><Input value={formIncidente.lugar} onChange={e => handleInputChange('lugar', e.target.value)} /></div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
               <div className="space-y-2"><Label>Tipo de incidente</Label>
                  <Select value={formIncidente.tipoIncidente} onValueChange={v => handleInputChange('tipoIncidente', v as any)}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Accidente con tiempo perdido">Accidente con tiempo perdido</SelectItem>
                          <SelectItem value="Accidente sin tiempo perdido">Accidente sin tiempo perdido</SelectItem>
                          <SelectItem value="Casi accidente">Casi accidente</SelectItem>
                          <SelectItem value="Daño a la propiedad">Daño a la propiedad</SelectItem>
                      </SelectContent>
                  </Select>
               </div>
               <div className="space-y-2"><Label>Gravedad</Label>
                  <Select value={formIncidente.gravedad} onValueChange={v => handleInputChange('gravedad', v as any)}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Leve">Leve</SelectItem>
                          <SelectItem value="Grave">Grave</SelectItem>
                          <SelectItem value="Fatal potencial">Fatal potencial</SelectItem>
                      </SelectContent>
                  </Select>
               </div>
          </div>
          <div className="space-y-2"><Label>Descripción del hecho*</Label><Textarea value={formIncidente.descripcionHecho} onChange={e => handleInputChange('descripcionHecho', e.target.value)} /></div>
          <div className="space-y-2"><Label>Lesión a la persona</Label><Input value={formIncidente.lesionPersona} onChange={e => handleInputChange('lesionPersona', e.target.value)} placeholder="Ej: Esguince tobillo, No aplica..." /></div>
          <div className="space-y-2"><Label>Acto inseguro (si aplica)</Label><Input value={formIncidente.actoInseguro} onChange={e => handleInputChange('actoInseguro', e.target.value)} /></div>
          <div className="space-y-2"><Label>Condición insegura (si aplica)</Label><Input value={formIncidente.condicionInsegura} onChange={e => handleInputChange('condicionInsegura', e.target.value)} /></div>
          <div className="space-y-2"><Label>Causas inmediatas</Label><Textarea value={formIncidente.causasInmediatas} onChange={e => handleInputChange('causasInmediatas', e.target.value)} rows={2}/></div>
          <div className="space-y-2"><Label>Causas básicas</Label><Textarea value={formIncidente.causasBasicas} onChange={e => handleInputChange('causasBasicas', e.target.value)} rows={2}/></div>
          <div className="space-y-2"><Label>Análisis Ishikawa (resumen)</Label><Textarea value={formIncidente.analisisIshikawa} onChange={e => handleInputChange('analisisIshikawa', e.target.value)} rows={2}/></div>
          <div className="space-y-2"><Label>Análisis 5 porqués (resumen)</Label><Textarea value={formIncidente.analisis5Porques} onChange={e => handleInputChange('analisis5Porques', e.target.value)} rows={2}/></div>
          <div className="space-y-2"><Label>Medidas correctivas</Label><Textarea value={formIncidente.medidasCorrectivas} onChange={e => handleInputChange('medidasCorrectivas', e.target.value)} rows={3}/></div>
          <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Responsable seguimiento</Label><Input value={formIncidente.responsableSeguimiento} onChange={e => handleInputChange('responsableSeguimiento', e.target.value)} /></div>
              <div className="space-y-2"><Label>Plazo de cierre</Label><Input type="date" value={formIncidente.plazoCierre} onChange={e => handleInputChange('plazoCierre', e.target.value)} /></div>
          </div>
           <div className="space-y-2"><Label>Estado del cierre</Label>
              <Select value={formIncidente.estadoCierre} onValueChange={v => handleInputChange('estadoCierre', v as any)}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="Abierto">Abierto</SelectItem>
                      <SelectItem value="En seguimiento">En seguimiento</SelectItem>
                      <SelectItem value="Cerrado">Cerrado</SelectItem>
                  </SelectContent>
              </Select>
           </div>

          <Button type="submit" className="w-full sm:w-auto">Registrar Incidente</Button>
        </form>

        <div className="space-y-2">
          <h4 className="text-lg font-semibold border-b pb-2">Incidentes Registrados en Obra</h4>
          {cargandoIncidentes ? <p className="text-sm text-muted-foreground pt-4 text-center">Cargando incidentes...</p> : 
          registrosIncidentes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center pt-8">
              No hay incidentes registrados para esta obra.
            </p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {registrosIncidentes.map((inc) => (
                <article
                  key={inc.id}
                  className="rounded-lg border bg-card p-3 shadow-sm text-sm space-y-2"
                >
                  <p className="font-semibold text-primary">
                    {inc.fecha} – {inc.lugar || "Sin lugar especificado"}
                  </p>
                  <div className="flex justify-between items-center text-xs">
                      <span>Tipo: {inc.tipoIncidente}</span>
                      <span>Gravedad: {inc.gravedad}</span>
                      <span>Estado: <span className="font-semibold">{inc.estadoCierre}</span></span>
                  </div>
                  <p><strong className="text-muted-foreground">Hecho:</strong> {inc.descripcionHecho}</p>
                  {inc.medidasCorrectivas && (
                    <p><strong className="text-muted-foreground">Medidas:</strong> {inc.medidasCorrectivas}</p>
                  )}
                  <div className="text-xs pt-2 border-t mt-2 flex justify-between">
                    <span><strong className="text-muted-foreground">Responsable:</strong> {inc.responsableSeguimiento || "No asignado"}</span>
                    <span><strong className="text-muted-foreground">Plazo:</strong> {inc.plazoCierre || "Sin plazo"}</span>
                  </div>
                  <Button
                    type="button"
                    onClick={() =>
                      onCrearAccionDesdeIncidente({
                        obraId: inc.obraId,
                        incidenteId: inc.id,
                        descripcion: `Acción por incidente: ${inc.descripcionHecho}`,
                      })
                    }
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    Crear acción desde este incidente
                  </Button>
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

// --- Componente Plan de Acción ---
type PlanAccionSectionProps = {
  prefill: PlanAccionPrefill;
  onPrefillConsumido: () => void;
};

function PlanAccionSection({ prefill, onPrefillConsumido }: PlanAccionSectionProps) {
    const [obras, setObras] = useState<ObraPrevencion[]>(OBRAS_IPER);
    const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>(
        OBRAS_IPER[0]?.id ?? ""
    );

    const [planesAccion, setPlanesAccion] = useState<RegistroPlanAccion[]>([]);
    const [cargandoPlanes, setCargandoPlanes] = useState(false);
    const [errorForm, setErrorForm] = useState<string | null>(null);

    const [formAccion, setFormAccion] = useState<{
        origen: OrigenAccion;
        referencia: string;
        descripcionAccion: string;
        responsable: string;
        plazo: string;
        estado: EstadoAccion;
        avance: string;
        observacionesCierre: string;
        creadoPor: string;
    }>({
        origen: "IPER",
        referencia: "",
        descripcionAccion: "",
        responsable: "",
        plazo: "",
        estado: "Pendiente",
        avance: "",
        observacionesCierre: "",
        creadoPor: "",
    });

    const cargarObras = async () => {
      try {
          const q = query(collection(firebaseDb, "obras"), orderBy("nombreFaena"));
          const querySnapshot = await getDocs(q);
          const data: ObraPrevencion[] = querySnapshot.docs.map(doc => ({
              id: doc.id,
              nombreFaena: doc.data().nombreFaena
          } as ObraPrevencion));
          setObras(data);
          if (data.length > 0 && !obraSeleccionadaId) {
            setObraSeleccionadaId(data[0].id);
          }
      } catch (err) {
          console.error("Error al cargar obras: ", err);
      }
    }

    const cargarPlanesAccion = async (obraId: string) => {
        if (!obraId) {
          setPlanesAccion([]);
          return;
        }
        setCargandoPlanes(true);
        try {
          const q = query(
            collection(firebaseDb, "planesAccion"),
            where("obraId", "==", obraId),
            orderBy("createdAt", "desc")
          );
          const querySnapshot = await getDocs(q);
          const data: RegistroPlanAccion[] = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as any),
          }));
          setPlanesAccion(data);
        } catch (err) {
          console.error("Error cargando planes de acción:", err);
          setErrorForm("No se pudieron cargar los planes de acción.");
        } finally {
          setCargandoPlanes(false);
        }
    };
    
    useEffect(() => {
      cargarObras();
    }, []);

    useEffect(() => {
      if (obraSeleccionadaId) {
        cargarPlanesAccion(obraSeleccionadaId);
      }
    }, [obraSeleccionadaId]);

    useEffect(() => {
        if (prefill && prefill.obraId) {
            setObraSeleccionadaId(prefill.obraId);
            setFormAccion((prev) => ({
            ...prev,
            origen: prefill.origen,
            referencia: prefill.referencia,
            descripcionAccion:
                prev.descripcionAccion || prefill.descripcionSugerida || "",
            }));

            onPrefillConsumido();
        }
    }, [prefill, onPrefillConsumido]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorForm(null);

        if (!obraSeleccionadaId) {
            setErrorForm("Debes seleccionar una obra.");
            return;
        }
        if (!formAccion.descripcionAccion.trim()) {
            setErrorForm("Debes describir la acción a implementar.");
            return;
        }
        if (!formAccion.responsable.trim()) {
            setErrorForm("Debes asignar un responsable.");
            return;
        }

        const obraSeleccionada = obras.find(o => o.id === obraSeleccionadaId);

        try {
            await addDoc(collection(firebaseDb, "planesAccion"), {
                ...formAccion,
                obraId: obraSeleccionadaId,
                obraNombre: obraSeleccionada?.nombreFaena ?? "N/A",
                fechaCreacion: new Date().toISOString().slice(0, 10),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            setFormAccion((prev) => ({
                ...prev,
                referencia: "",
                descripcionAccion: "",
                responsable: "",
                plazo: "",
                avance: "",
                observacionesCierre: "",
                creadoPor: "",
            }));

            cargarPlanesAccion(obraSeleccionadaId);
        } catch(error) {
            console.error("Error al guardar el plan de acción:", error);
            setErrorForm("No se pudo guardar el plan de acción. Intente de nuevo.");
        }
    };

    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle>Plan de acción y seguimiento</CardTitle>
                <CardDescription>
                    Define y gestiona acciones correctivas y preventivas asociadas a IPER,
                    incidentes u otras observaciones. Datos conectados a Firestore.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="max-w-xs space-y-2">
                    <Label htmlFor="obra-select-plan">Obra / faena</Label>
                    <Select value={obraSeleccionadaId} onValueChange={setObraSeleccionadaId}>
                        <SelectTrigger id="obra-select-plan"><SelectValue placeholder="Seleccione una obra"/></SelectTrigger>
                        <SelectContent>
                            {obras.map((obra) => (
                                <SelectItem key={obra.id} value={obra.id}>
                                    {obra.nombreFaena}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-8 md:grid-cols-2">
                    <form
                        className="space-y-4"
                        onSubmit={handleSubmit}
                    >
                        <h3 className="text-lg font-semibold border-b pb-2">Registrar Nueva Acción</h3>
                        {errorForm && <p className="text-sm font-medium text-destructive">{errorForm}</p>}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-2">
                                <Label>Origen de la Acción</Label>
                                <Select value={formAccion.origen} onValueChange={v => setFormAccion(p => ({...p, origen: v as OrigenAccion}))}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="IPER">IPER / Matriz de Riesgo</SelectItem>
                                        <SelectItem value="INCIDENTE">Investigación de Incidente</SelectItem>
                                        <SelectItem value="OBSERVACION">Observación de Seguridad</SelectItem>
                                        <SelectItem value="OTRO">Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                           </div>
                            <div className="space-y-2">
                                <Label>Referencia (ID IPER, INC, etc.)</Label>
                                <Input value={formAccion.referencia} onChange={e => setFormAccion(p => ({...p, referencia: e.target.value}))}/>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Descripción de la Acción*</Label>
                            <Textarea value={formAccion.descripcionAccion} onChange={e => setFormAccion(p => ({...p, descripcionAccion: e.target.value}))} />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Responsable*</Label>
                                <Input value={formAccion.responsable} onChange={e => setFormAccion(p => ({...p, responsable: e.target.value}))}/>
                            </div>
                             <div className="space-y-2">
                                <Label>Plazo</Label>
                                <Input type="date" value={formAccion.plazo} onChange={e => setFormAccion(p => ({...p, plazo: e.target.value}))}/>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Estado de la Acción</Label>
                            <Select value={formAccion.estado} onValueChange={v => setFormAccion(p => ({...p, estado: v as EstadoAccion}))}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                                    <SelectItem value="En progreso">En progreso</SelectItem>
                                    <SelectItem value="Cerrada">Cerrada</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Avance / Comentarios</Label>
                            <Textarea value={formAccion.avance} onChange={e => setFormAccion(p => ({...p, avance: e.target.value}))} rows={2} />
                        </div>

                         <div className="space-y-2">
                            <Label>Observaciones de Cierre</Label>
                            <Textarea value={formAccion.observacionesCierre} onChange={e => setFormAccion(p => ({...p, observacionesCierre: e.target.value}))} rows={2} />
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Creado Por</Label>
                            <Input value={formAccion.creadoPor} onChange={e => setFormAccion(p => ({...p, creadoPor: e.target.value}))}/>
                        </div>

                        <Button type="submit">Registrar Acción</Button>
                    </form>
                    
                    <div className="space-y-2">
                        <h4 className="text-lg font-semibold border-b pb-2">Acciones Registradas en la Obra</h4>
                        {cargandoPlanes ? <p className="text-sm text-muted-foreground pt-4 text-center">Cargando planes de acción...</p> :
                        planesAccion.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center pt-8">
                                No hay acciones registradas para esta obra aún.
                            </p>
                        ) : (
                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                                {planesAccion.map((p) => (
                                    <article
                                        key={p.id}
                                        className="rounded-lg border bg-card p-3 shadow-sm text-sm space-y-2"
                                    >
                                        <p className="font-semibold">
                                            {p.descripcionAccion}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Origen:{" "}
                                            {p.origen}
                                            {p.referencia && ` · Ref: ${p.referencia}`}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Responsable: {p.responsable || "No asignado"} · Plazo:{" "}
                                            {p.plazo || "Sin plazo"}
                                        </p>
                                        <p className="font-medium">
                                            Estado: {p.estado}
                                        </p>
                                        {p.avance && (
                                            <p className="text-xs">Avance: {p.avance}</p>
                                        )}
                                        {p.observacionesCierre && (
                                            <p className="text-xs">
                                                Cierre: {p.observacionesCierre}
                                            </p>
                                        )}
                                         <Button asChild variant="outline" size="sm" className="mt-2">
                                            <Link href={`/prevencion/formularios-generales/plan-accion/${p.id}/imprimir`}>
                                            Ver / Imprimir Plan
                                            </Link>
                                        </Button>
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

// --- Componente Principal ---
type FormularioGeneralActivo = "IPER" | "INCIDENTE" | "PLAN_ACCION" | null;

export default function FormulariosGeneralesPrevencionPage() {
  const [activeForm, setActiveForm] = useState<FormularioGeneralActivo>("IPER");
  const [planAccionPrefill, setPlanAccionPrefill] = useState<PlanAccionPrefill>(null);

    function handleCrearAccionDesdeIPER(payload: {
        obraId: string;
        iperId: string;
        descripcion?: string;
    }) {
        setPlanAccionPrefill({
            obraId: payload.obraId,
            origen: "IPER",
            referencia: payload.iperId,
            descripcionSugerida: payload.descripcion,
        });
        setActiveForm("PLAN_ACCION");
    }

    function handleCrearAccionDesdeIncidente(payload: {
        obraId: string;
        incidenteId: string;
        descripcion?: string;
    }) {
        setPlanAccionPrefill({
            obraId: payload.obraId,
            origen: "INCIDENTE",
            referencia: payload.incidenteId,
            descripcionSugerida: payload.descripcion,
        });
        setActiveForm("PLAN_ACCION");
    }

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
              onClick={() => setActiveForm("IPER")}
              className="w-full"
              variant={activeForm === 'IPER' ? 'default' : 'outline'}
            >
              Ver IPER / Matriz
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between transition-all hover:shadow-lg hover:-translate-y-1">
          <CardHeader>
            <CardTitle>Investigación de incidentes (Ishikawa)</CardTitle>
            <CardDescription>
              Registro estructurado de incidentes y casi accidentes usando enfoque
              Ishikawa / 5 porqués y plan de acción asociado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setActiveForm("INCIDENTE")}
              className="w-full"
              variant={activeForm === 'INCIDENTE' ? 'default' : 'outline'}
            >
              Ver investigación de incidentes
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between transition-all hover:shadow-lg hover:-translate-y-1">
          <CardHeader>
            <CardTitle>Plan de acción y seguimiento</CardTitle>
            <CardDescription>
              Registro de acciones correctivas y preventivas asociadas a IPER,
              incidentes u otras observaciones de seguridad.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
                type="button"
                onClick={() => setActiveForm("PLAN_ACCION")}
                className="w-full"
                variant={activeForm === 'PLAN_ACCION' ? 'default' : 'outline'}
            >
                Ver plan de acción
            </Button>
          </CardContent>
        </Card>
      </div>

      {activeForm === 'IPER' && <IPERFormSection onCrearAccionDesdeIPER={handleCrearAccionDesdeIPER} />}
      {activeForm === 'INCIDENTE' && <InvestigacionIncidenteSection onCrearAccionDesdeIncidente={handleCrearAccionDesdeIncidente} />}
      {activeForm === 'PLAN_ACCION' && <PlanAccionSection prefill={planAccionPrefill} onPrefillConsumido={() => setPlanAccionPrefill(null)} />}

    </section>
  );
}
