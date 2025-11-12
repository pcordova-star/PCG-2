"use client";

import React, { useState, useMemo, useEffect, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { X, FileText, UserCheck, Shield, MessageSquare } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { firebaseDb } from "@/lib/firebaseClient";
import {
  collection,
  addDoc,
  Timestamp,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

// --- Tipos ---
type Obra = {
  id: string;
  nombreFaena: string;
};

// Se importa desde el otro módulo para consistencia
import { EmpresaContratista, TipoEmpresaPrevencion } from '../empresas-contratistas/page';


type TipoRelacionPersonal = "Empresa" | "Subcontrato";
type EstadoIngresoPersonal = "Pendiente" | "Autorizado" | "Rechazado";
type PasoDS44 = "Reglamento" | "Induccion" | "EPP" | "Charla" | null;

// Tipo de datos que se guarda en Firestore
type IngresoPersonal = {
  id?: string;
  obraId: string;
  tipoRelacion: TipoRelacionPersonal;
  nombre: string;
  rut: string;
  empresa: string;
  cargo: string;
  fechaIngreso: string;
  observaciones?: string;
  fechaRegistro: Timestamp;
  // Checklist DS44
  docContrato: boolean;
  docMutualAlDia: boolean;
  docExamenMedico: boolean;
  docInduccion: boolean;
  docEPPEntregados: boolean;
  docRegistroListaPersonal: boolean;
  estadoIngreso: EstadoIngresoPersonal;
};

type RegistroInduccionTrabajador = {
  id: string;
  trabajadorId: string;
  obraId: string;
  fechaInduccion: string;   // YYYY-MM-DD
  lugar: string;
  relator: string;          // quién hizo la inducción
  contenidoReglasGenerales: boolean;
  contenidoPlanEmergencia: boolean;
  contenidoRiesgosCriticos: boolean;
  contenidoUsoEPP: boolean;
  contenidoReporteIncidentes: boolean;
  evaluacionAplicada: boolean;
  resultadoEvaluacion: "Aprobado" | "Reforzar contenidos" | "No aplica";
  observaciones: string;
  aceptaInduccion: boolean; // declara haber recibido y comprendido
  nombreFirmaTrabajador: string; // por ahora simulamos la firma con el nombre
};

type RegistroEntregaEPP = {
  id: string;
  trabajadorId: string;
  obraId: string;
  fechaEntrega: string;      // YYYY-MM-DD
  responsableEntrega: string;
  casco: boolean;
  zapatosSeguridad: boolean;
  lentesSeguridad: boolean;
  guantes: boolean;
  ropaTrabajo: boolean;
  arnes: boolean;
  otrosDescripcion: string;
  instruidoUsoCuidado: boolean;
  instruidoConsecuenciasNoUso: boolean;
  aceptaEPP: boolean;        // declara recibir y usar
  nombreFirmaTrabajador: string; // simulación de firma
  observaciones: string;
};

type TipoCharla =
  | "Charla diaria"
  | "Charla específica"
  | "Reinducción"
  | "Otra";

type RegistroCharlaSeguridad = {
  id: string;
  trabajadorId: string;
  obraId: string;
  fechaCharla: string;          // YYYY-MM-DD
  tipoCharla: TipoCharla;
  tema: string;
  relator: string;
  riesgoPrincipal: string;      // ej: altura, atrapamientos, eléctrico, etc.
  medidasReforzadas: string;    // texto libre
  asistencia: "Asiste" | "No asiste" | "Llega tarde";
  observaciones: string;
  aceptaCharla: boolean;        // declara haber participado
  nombreFirmaTrabajador: string; // simulación de firma
};

type TipoDocumentoPrevencionTrabajador =
  | "INDUCCION_OBRA"
  | "ENTREGA_EPP"
  | "CHARLA_SEGURIDAD";

type DocumentoPrevencionConfigLocal = {
  tipoDocumento: TipoDocumentoPrevencionTrabajador;
  codigo: string;
  titulo: string;
  version: string;
  fechaEmision: string; // YYYY-MM-DD
  elaboradoPor: string;
  revisadoPor?: string;
  aprobadoPor?: string;
};

// --- Datos Simulados (para UI, serán reemplazados por Firestore) ---
const REGISTROS_INDUCCION_INICIALES: RegistroInduccionTrabajador[] = [];
const REGISTROS_EPP_INICIALES: RegistroEntregaEPP[] = [];
const REGISTROS_CHARLAS_INICIALES: RegistroCharlaSeguridad[] = [];

const DOC_CONFIGS_TRABAJADOR: DocumentoPrevencionConfigLocal[] = [
  { tipoDocumento: "INDUCCION_OBRA", codigo: "PCG-PRV-IND-001", titulo: "Registro de Inducción de Seguridad de la Obra", version: "V1.0", fechaEmision: "2025-01-01", elaboradoPor: "Prevencionista de Obra", revisadoPor: "Jefe de Prevención", aprobadoPor: "Gerente de Operaciones" },
  { tipoDocumento: "ENTREGA_EPP", codigo: "PCG-PRV-EPP-001", titulo: "Registro de Entrega de Elementos de Protección Personal", version: "V1.0", fechaEmision: "2025-01-01", elaboradoPor: "Prevencionista de Obra", revisadoPor: "Jefe de Bodega", aprobadoPor: "Gerente de Operaciones" },
  { tipoDocumento: "CHARLA_SEGURIDAD", codigo: "PCG-PRV-CHR-001", titulo: "Registro de Charla de Seguridad al Trabajador", version: "V1.0", fechaEmision: "2025-01-01", elaboradoPor: "Prevencionista de Obra", revisadoPor: "Jefe de Prevención", aprobadoPor: "Gerente de Operaciones" },
];

function getDocConfigLocal(tipo: TipoDocumentoPrevencionTrabajador): DocumentoPrevencionConfigLocal {
  const found = DOC_CONFIGS_TRABAJADOR.find(c => c.tipoDocumento === tipo);
  if (!found) {
    return { tipoDocumento: tipo, codigo: "PCG-PRV-XXX-000", titulo: "Documento de Prevención", version: "V1.0", fechaEmision: "2025-01-01", elaboradoPor: "Prevención de Riesgos", revisadoPor: "", aprobadoPor: "" };
  }
  return found;
}

// --- Componentes y Funciones Auxiliares ---
function EstadoBadge({ estado }: { estado: EstadoIngresoPersonal }) {
  const className = {
    "Autorizado": "bg-green-100 text-green-800 border-green-200",
    "Pendiente": "bg-yellow-100 text-yellow-800 border-yellow-200",
    "Rechazado": "bg-red-100 text-red-800 border-red-200",
  }[estado];
  return <Badge variant="outline" className={cn("font-semibold", className)}>{estado}</Badge>;
}

function getProgresoDs44(ing: IngresoPersonal) {
  const pasos = [ ing.docContrato, ing.docMutualAlDia, ing.docExamenMedico, ing.docInduccion, ing.docEPPEntregados, ing.docRegistroListaPersonal ];
  const total = pasos.length;
  const cumplidos = pasos.filter(Boolean).length;
  return { total, cumplidos, porcentaje: total > 0 ? (cumplidos / total) * 100 : 0 };
}

function getIndicadoresObraTipo(ingresos: IngresoPersonal[], obraId: string, tipoRelacion: TipoRelacionPersonal) {
  const relevantes = ingresos.filter(i => i.obraId === obraId && i.tipoRelacion === tipoRelacion);
  const total = relevantes.length;
  const autorizados = relevantes.filter(i => i.estadoIngreso === "Autorizado").length;
  const pendientes = relevantes.filter(i => i.estadoIngreso === "Pendiente").length;
  const rechazados = relevantes.filter(i => i.estadoIngreso === "Rechazado").length;
  const pasosPorPersona = relevantes.map(ing => getProgresoDs44(ing));
  const totalPasosGlobal = pasosPorPersona.reduce((acc, p) => acc + p.total, 0);
  const cumplidosGlobal = pasosPorPersona.reduce((acc, p) => acc + p.cumplidos, 0);
  const porcentaje = totalPasosGlobal > 0 ? Math.round((cumplidosGlobal * 100) / totalPasosGlobal) : 0;
  return { total, autorizados, pendientes, rechazados, totalPasosGlobal, cumplidosGlobal, porcentaje };
}

type EncabezadoDocumentoProps = { config: DocumentoPrevencionConfigLocal; nombreObra: string; };

function EncabezadoDocumentoPrevencionLocal({ config, nombreObra }: EncabezadoDocumentoProps) {
  return (
    <header className="mb-4 rounded-xl border bg-card p-4 shadow-sm text-xs print:shadow-none print:rounded-none">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground">[Nombre de la Empresa Constructora]</p>
          <h1 className="text-sm font-bold text-card-foreground">{config.titulo}</h1>
          <p className="text-[11px] text-muted-foreground">Obra: {nombreObra}</p>
        </div>
        <div className="text-[11px] text-right text-muted-foreground space-y-0.5">
          <p><span className="font-semibold">Código:</span> {config.codigo}</p>
          <p><span className="font-semibold">Versión:</span> {config.version}</p>
          <p><span className="font-semibold">Emisión:</span> {config.fechaEmision}</p>
        </div>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <div><p className="font-semibold text-[11px] text-muted-foreground">Elaborado por</p><p className="text-[11px] text-muted-foreground">{config.elaboradoPor}</p></div>
        <div><p className="font-semibold text-[11px] text-muted-foreground">Revisado por</p><p className="text-[11px] text-muted-foreground">{config.revisadoPor || "-"}</p></div>
        <div><p className="font-semibold text-[11px] text-muted-foreground">Aprobado por</p><p className="text-[11px] text-muted-foreground">{config.aprobadoPor || "-"}</p></div>
      </div>
    </header>
  );
}

// --- Componente Principal ---
export default function IngresoPersonalPage() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [loadingObras, setLoadingObras] = useState(true);
  const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>("");
  const [tipoRelacion, setTipoRelacion] = useState<TipoRelacionPersonal>("Empresa");
  const [ingresos, setIngresos] = useState<IngresoPersonal[]>([]);
  const [trabajadorSeleccionadoId, setTrabajadorSeleccionadoId] = useState<string | null>(null);
  const [pasoActivo, setPasoActivo] = useState<PasoDS44>(null);
  
  // Lista de empresas contratistas cargadas desde Firestore
  const [empresasContratistas, setEmpresasContratistas] = useState<EmpresaContratista[]>([]);
  
  // Estados para el formulario de nuevo ingreso
  const [tipoTrabajador, setTipoTrabajador] = useState<TipoRelacionPersonal>("Empresa");
  const [nombre, setNombre] = useState("");
  const [rut, setRut] = useState("");
  const [empresaIdSeleccionada, setEmpresaIdSeleccionada] = useState("");
  const [cargo, setCargo] = useState("");
  const [fechaIngreso, setFechaIngreso] = useState(new Date().toISOString().split('T')[0]);
  const [observaciones, setObservaciones] = useState("");
  const [docContrato, setDocContrato] = useState(false);
  const [docInduccion, setDocInduccion] = useState(false);
  const [docExamenMedico, setDocExamenMedico] = useState(false);

  // Estados para carga y mensajes
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargandoIngresos, setCargandoIngresos] = useState(false);

  // Estados para subformularios de pasos
  const [subFormState, setSubFormState] = useState({ fecha: new Date().toISOString().split('T')[0], texto1: '', texto2: '' });
  const [registrosInduccion, setRegistrosInduccion] = useState<RegistroInduccionTrabajador[]>(REGISTROS_INDUCCION_INICIALES);
  const [mostrarFormInduccion, setMostrarFormInduccion] = useState<boolean>(false);
  const [formInduccion, setFormInduccion] = useState<{ fechaInduccion: string; lugar: string; relator: string; contenidoReglasGenerales: boolean; contenidoPlanEmergencia: boolean; contenidoRiesgosCriticos: boolean; contenidoUsoEPP: boolean; contenidoReporteIncidentes: boolean; evaluacionAplicada: boolean; resultadoEvaluacion: "Aprobado" | "Reforzar contenidos" | "No aplica"; observaciones: string; aceptaInduccion: boolean; nombreFirmaTrabajador: string; }>({ fechaInduccion: new Date().toISOString().slice(0, 10), lugar: "", relator: "", contenidoReglasGenerales: true, contenidoPlanEmergencia: true, contenidoRiesgosCriticos: true, contenidoUsoEPP: true, contenidoReporteIncidentes: true, evaluacionAplicada: false, resultadoEvaluacion: "No aplica", observaciones: "", aceptaInduccion: false, nombreFirmaTrabajador: "" });
  const [errorInduccion, setErrorInduccion] = useState<string | null>(null);
  const [registrosEPP, setRegistrosEPP] = useState<RegistroEntregaEPP[]>(REGISTROS_EPP_INICIALES);
  const [mostrarFormEPP, setMostrarFormEPP] = useState<boolean>(false);
  const [formEPP, setFormEPP] = useState<{ fechaEntrega: string; responsableEntrega: string; casco: boolean; zapatosSeguridad: boolean; lentesSeguridad: boolean; guantes: boolean; ropaTrabajo: boolean; arnes: boolean; otrosDescripcion: string; instruidoUsoCuidado: boolean; instruidoConsecuenciasNoUso: boolean; aceptaEPP: boolean; nombreFirmaTrabajador: string; observaciones: string; }>({ fechaEntrega: new Date().toISOString().slice(0, 10), responsableEntrega: "", casco: true, zapatosSeguridad: true, lentesSeguridad: true, guantes: false, ropaTrabajo: false, arnes: false, otrosDescripcion: "", instruidoUsoCuidado: true, instruidoConsecuenciasNoUso: true, aceptaEPP: false, nombreFirmaTrabajador: "", observaciones: "" });
  const [errorEPP, setErrorEPP] = useState<string | null>(null);
  const [registrosCharlas, setRegistrosCharlas] = useState<RegistroCharlaSeguridad[]>(REGISTROS_CHARLAS_INICIALES);
  const [mostrarFormCharla, setMostrarFormCharla] = useState<boolean>(false);
  const [formCharla, setFormCharla] = useState<{ fechaCharla: string; tipoCharla: TipoCharla; tema: string; relator: string; riesgoPrincipal: string; medidasReforzadas: string; asistencia: "Asiste" | "No asiste" | "Llega tarde"; observaciones: string; aceptaCharla: boolean; nombreFirmaTrabajador: string; }>({ fechaCharla: new Date().toISOString().slice(0, 10), tipoCharla: "Charla diaria", tema: "", relator: "", riesgoPrincipal: "", medidasReforzadas: "", asistencia: "Asiste", observaciones: "", aceptaCharla: false, nombreFirmaTrabajador: "" });
  const [errorCharla, setErrorCharla] = useState<string | null>(null);

  useEffect(() => {
    const fetchObras = async () => {
      setLoadingObras(true);
      try {
        const q = query(collection(firebaseDb, "obras"), orderBy("nombreFaena", "asc"));
        const querySnapshot = await getDocs(q);
        const obrasData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra));
        setObras(obrasData);
        if (obrasData.length > 0 && !obraSeleccionadaId) {
          setObraSeleccionadaId(obrasData[0].id);
        }
      } catch (err) {
        console.error("Error loading obras: ", err);
        setError("No se pudieron cargar las obras disponibles.");
      } finally {
        setLoadingObras(false);
      }
    };
    fetchObras();
  }, []);

  useEffect(() => {
    if (!obraSeleccionadaId) return;

    const fetchIngresos = async () => {
      setCargandoIngresos(true);
      try {
        const ingresosRef = collection(firebaseDb, "ingresosPersonal");
        const q = query(ingresosRef, where("obraId", "==", obraSeleccionadaId));
        const snap = await getDocs(q);
        const data: IngresoPersonal[] = snap.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<IngresoPersonal, "id">),
        }));
        setIngresos(data);
      } catch (err) {
        console.error("Error cargando ingresos de personal", err);
        setError("No se pudieron cargar los registros de personal.");
      } finally {
        setCargandoIngresos(false);
      }
    };
    
    // Cargar empresas contratistas de la obra seleccionada
    const empresasRef = collection(firebaseDb, "empresasContratistas");
    const qEmpresas = query(empresasRef, where("obraId", "==", obraSeleccionadaId));
    const unsubscribeEmpresas = onSnapshot(qEmpresas, (snap) => {
        const data: EmpresaContratista[] = snap.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<EmpresaContratista, "id">),
        }));
        setEmpresasContratistas(data);
    }, (err) => {
        console.error("Error cargando empresas contratistas:", err);
        setError("No se pudieron cargar las empresas para el formulario.");
    });


    fetchIngresos();
    
    return () => {
        unsubscribeEmpresas();
    }
  }, [obraSeleccionadaId]);

  const empresasDisponibles = useMemo(() => {
    if (tipoRelacion === 'Empresa') {
      return empresasContratistas.filter(e => e.tipoEmpresa === 'MANDANTE' || e.tipoEmpresa === 'CONTRATISTA_PRINCIPAL');
    }
    return empresasContratistas.filter(e => e.tipoEmpresa === 'SUBCONTRATISTA' || e.tipoEmpresa === 'SERVICIOS');
  }, [empresasContratistas, tipoRelacion]);


  const ingresosFiltrados = useMemo(() =>
    ingresos.filter((i) => i.obraId === obraSeleccionadaId && i.tipoRelacion === tipoRelacion),
    [ingresos, obraSeleccionadaId, tipoRelacion]
  );
  
  const trabajadorSeleccionado = useMemo(() => 
    ingresos.find((i) => i.id === trabajadorSeleccionadoId),
    [ingresos, trabajadorSeleccionadoId]
  );
  
  const registrosInduccionTrabajador = trabajadorSeleccionado ? registrosInduccion.filter((r) => r.trabajadorId === trabajadorSeleccionado.id).sort((a, b) => (a.fechaInduccion < b.fechaInduccion ? 1 : -1)) : [];
  const ultimoRegistroInduccion = registrosInduccionTrabajador[0] ?? null;
  const registrosEPPTrabajador = trabajadorSeleccionado ? registrosEPP.filter((r) => r.trabajadorId === trabajadorSeleccionado.id).sort((a, b) => (a.fechaEntrega < b.fechaEntrega ? 1 : -1)) : [];
  const ultimoRegistroEPP = registrosEPPTrabajador[0] ?? null;
  const registrosCharlasTrabajador = trabajadorSeleccionado ? registrosCharlas.filter((r) => r.trabajadorId === trabajadorSeleccionado.id).sort((a, b) => (a.fechaCharla < b.fechaCharla ? 1 : -1)) : [];
  const ultimaCharla = registrosCharlasTrabajador[0] ?? null;

  const progresoSeleccionado = useMemo(() => trabajadorSeleccionado ? getProgresoDs44(trabajadorSeleccionado) : null, [trabajadorSeleccionado]);
  const indicadoresActuales = useMemo(() => getIndicadoresObraTipo(ingresos, obraSeleccionadaId, tipoRelacion), [ingresos, obraSeleccionadaId, tipoRelacion]);

  const resetForm = () => {
    setRut(''); setNombre(''); setCargo(''); setEmpresaIdSeleccionada('');
    setFechaIngreso(new Date().toISOString().split('T')[0]);
    setObservaciones(''); setDocContrato(false); setDocInduccion(false); setDocExamenMedico(false);
    setError(null); setMensaje(null);
  };
  
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setGuardando(true);
    setMensaje(null);
    setError(null);

    const empresaSeleccionada = empresasDisponibles.find(emp => emp.id === empresaIdSeleccionada);

    try {
      if (!obraSeleccionadaId) throw new Error("No se encontró el ID de la obra (obraId).");
      if (!nombre || !rut || !tipoRelacion || !empresaSeleccionada) throw new Error("Faltan campos obligatorios (nombre, RUT, tipo o empresa).");

      const ingresosRef = collection(firebaseDb, "ingresosPersonal");
      const newDoc = {
        obraId: obraSeleccionadaId,
        tipoRelacion,
        nombre,
        rut,
        empresa: empresaSeleccionada.razonSocial,
        cargo,
        fechaIngreso,
        observaciones: observaciones || null,
        fechaRegistro: Timestamp.now(),
        docContrato,
        docInduccion,
        docExamenMedico,
        docEPPEntregados: false,
        docRegistroListaPersonal: false,
        estadoIngreso: "Pendiente" as EstadoIngresoPersonal
      };

      const docRef = await addDoc(ingresosRef, newDoc);

      setIngresos(prev => [{ id: docRef.id, ...newDoc }, ...prev]);
      setMensaje("Ingreso registrado correctamente.");
      resetForm();

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error al registrar el ingreso de personal.");
    } finally {
      setGuardando(false);
    }
  };


  const handlePasoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trabajadorSeleccionadoId || !pasoActivo) return;

    setIngresos(prev => prev.map(ingreso => {
      if (ingreso.id !== trabajadorSeleccionadoId) return ingreso;

      let updatedIngreso = { ...ingreso };

      switch (pasoActivo) {
        case 'Reglamento':
          updatedIngreso.docContrato = true;
          updatedIngreso.docMutualAlDia = true; 
          updatedIngreso.docExamenMedico = true;
          break;
        case 'Induccion':
          updatedIngreso.docInduccion = true;
          break;
        case 'EPP':
          updatedIngreso.docEPPEntregados = true;
          break;
        case 'Charla':
          updatedIngreso.docRegistroListaPersonal = true; 
          break;
      }
      
      const { cumplidos, total } = getProgresoDs44(updatedIngreso);
      if (cumplidos === total) {
          updatedIngreso.estadoIngreso = "Autorizado";
      }

      return updatedIngreso;
    }));

    setPasoActivo(null);
    setSubFormState({ fecha: new Date().toISOString().split('T')[0], texto1: '', texto2: '' });
  };
  
  const abrirPaso = (paso: PasoDS44) => {
    setPasoActivo(paso);
    setSubFormState({ fecha: new Date().toISOString().split('T')[0], texto1: '', texto2: '' });
  };

  const renderSubForm = () => {
    if (!pasoActivo) return null;
    
    let title, fields;
    switch(pasoActivo) {
        case 'Reglamento':
            title="Registro: Contrato, Mutualidad y Examen Médico";
            fields = <>
                <div className="space-y-2"><Label htmlFor="fecha-paso">Fecha de revisión documental</Label><Input id="fecha-paso" type="date" value={subFormState.fecha} onChange={e => setSubFormState({...subFormState, fecha: e.target.value})} /></div>
                <div className="space-y-2"><Label htmlFor="obs-paso">Observaciones (Contrato, Mutualidad, Examen)</Label><Textarea id="obs-paso" value={subFormState.texto1} onChange={e => setSubFormState({...subFormState, texto1: e.target.value})} /></div>
            </>;
            break;
        case 'Induccion':
            title="Registro de Inducción de Seguridad";
            fields = <>
                <div className="space-y-2"><Label htmlFor="fecha-paso">Fecha de inducción</Label><Input id="fecha-paso" type="date" value={subFormState.fecha} onChange={e => setSubFormState({...subFormState, fecha: e.target.value})} /></div>
                <div className="space-y-2"><Label htmlFor="tipo-induccion">Tipo de inducción (General/Específica)</Label><Input id="tipo-induccion" value={subFormState.texto1} onChange={e => setSubFormState({...subFormState, texto1: e.target.value})} /></div>
                <div className="space-y-2"><Label htmlFor="obs-paso">Observaciones</Label><Textarea id="obs-paso" value={subFormState.texto2} onChange={e => setSubFormState({...subFormState, texto2: e.target.value})} /></div>
            </>;
            break;
        case 'EPP':
            title="Registro de Entrega de EPP";
            fields = <>
                <div className="space-y-2"><Label htmlFor="fecha-paso">Fecha de entrega</Label><Input id="fecha-paso" type="date" value={subFormState.fecha} onChange={e => setSubFormState({...subFormState, fecha: e.target.value})} /></div>
                <div className="space-y-2"><Label htmlFor="epp-list">Listado de EPP entregados</Label><Textarea id="epp-list" placeholder="Casco, Lentes, Guantes, Zapatos..." value={subFormState.texto1} onChange={e => setSubFormState({...subFormState, texto1: e.target.value})} /></div>
            </>;
            break;
        case 'Charla':
            title="Registro de Charla de Seguridad e Inclusión en Listado";
            fields = <>
                <div className="space-y-2"><Label htmlFor="fecha-paso">Fecha de la charla</Label><Input id="fecha-paso" type="date" value={subFormState.fecha} onChange={e => setSubFormState({...subFormState, fecha: e.target.value})} /></div>
                <div className="space-y-2"><Label htmlFor="tema-charla">Tema de la charla (Ej: Inducción)</Label><Input id="tema-charla" value={subFormState.texto1} onChange={e => setSubFormState({...subFormState, texto1: e.target.value})} /></div>
                <div className="space-y-2"><Label htmlFor="obs-paso">Observaciones</Label><Textarea id="obs-paso" value={subFormState.texto2} onChange={e => setSubFormState({...subFormState, texto2: e.target.value})} /></div>
            </>;
            break;
        default: return null;
    }
    
    return (
        <Card className="mt-4 bg-muted/30">
            <CardHeader>
                <CardTitle className="text-lg">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handlePasoSubmit} className="space-y-4">
                    {fields}
                    <div className="flex gap-2">
                        <Button type="submit">Guardar y marcar como completado</Button>
                        <Button type="button" variant="ghost" onClick={() => setPasoActivo(null)}>Cancelar</Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
  };
  
  const pasosDS44 = [
      { id: 'Reglamento', label: 'Documentos (Contrato, Mutual, Examen)', icon: FileText, docFields: ['docContrato', 'docMutualAlDia', 'docExamenMedico'] },
      { id: 'Induccion', label: 'Inducción de Seguridad', icon: UserCheck, docFields: ['docInduccion'] },
      { id: 'EPP', label: 'Entrega de EPP', icon: Shield, docFields: ['docEPPEntregados'] },
      { id: 'Charla', label: 'Inclusión en Listados / Charlas', icon: MessageSquare, docFields: ['docRegistroListaPersonal'] },
  ] as const;
  
  const selectedObra = obras.find(o => o.id === obraSeleccionadaId);
  

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-headline tracking-tight">Ingreso de Personal – DS44</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Este módulo registra el ingreso de trabajadores a la obra, tanto propios del mandante como de subcontratos, y gestiona los pasos de cumplimiento documental.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="obra-select">Seleccione una obra</Label>
            <Select value={obraSeleccionadaId} onValueChange={(val) => { setObraSeleccionadaId(val); setTrabajadorSeleccionadoId(null); }}>
              <SelectTrigger id="obra-select">
                <SelectValue placeholder={loadingObras ? "Cargando obras..." : "Seleccione una obra"} />
              </SelectTrigger>
              <SelectContent>
                {loadingObras ? <SelectItem value="loading" disabled>Cargando...</SelectItem> : 
                  obras.map((obra) => <SelectItem key={obra.id} value={obra.id}>{obra.nombreFaena}</SelectItem>)
                }
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo de Personal a Gestionar</Label>
            <RadioGroup value={tipoRelacion} onValueChange={(val) => { setTipoRelacion(val as TipoRelacionPersonal); setTrabajadorSeleccionadoId(null); setEmpresaIdSeleccionada(''); }} className="flex items-center space-x-4 pt-2">
              <div className="flex items-center space-x-2"><RadioGroupItem value="Empresa" id="r-empresa" /><Label htmlFor="r-empresa">Personal Empresa</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="Subcontrato" id="r-subcontrato" /><Label htmlFor="r-subcontrato">Personal Subcontrato</Label></div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Indicadores DS44 – {selectedObra?.nombreFaena} / {tipoRelacion}</CardTitle>
        </CardHeader>
        <CardContent>
            {indicadoresActuales.total === 0 ? (
                 <p className="text-muted-foreground text-center py-4">No hay personal registrado aún para esta obra y tipo. Los indicadores aparecerán cuando registres trabajadores.</p>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Personas</p>
                        <p className="text-3xl font-bold">{indicadoresActuales.total}</p>
                    </div>
                     <div className="p-4 bg-green-100/60 rounded-lg">
                        <p className="text-sm text-green-800">Autorizados</p>
                        <p className="text-3xl font-bold text-green-900">{indicadoresActuales.autorizados}</p>
                    </div>
                     <div className="p-4 bg-yellow-100/60 rounded-lg">
                        <p className="text-sm text-yellow-800">Pendientes</p>
                        <p className="text-3xl font-bold text-yellow-900">{indicadoresActuales.pendientes}</p>
                    </div>
                    <div className="col-span-2 md:col-span-4 p-4 border rounded-lg mt-4">
                        <p className="text-sm text-muted-foreground">Progreso de Cumplimiento (Pasos DS44)</p>
                        <div className="flex items-center justify-center gap-4 mt-2">
                             <p className="text-2xl font-bold">{indicadoresActuales.cumplidosGlobal} / {indicadoresActuales.totalPasosGlobal}</p>
                             <div className="w-full max-w-xs">
                                <Progress value={indicadoresActuales.porcentaje} className="h-4" />
                             </div>
                             <p className="text-2xl font-bold">{indicadoresActuales.porcentaje}%</p>
                        </div>
                    </div>
                </div>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>1. Crear Ficha de Nuevo Trabajador</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2"><Label htmlFor="rut">RUT*</Label><Input id="rut" value={rut} onChange={e => setRut(e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="nombre">Nombre*</Label><Input id="nombre" value={nombre} onChange={e => setNombre(e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="cargo">Cargo*</Label><Input id="cargo" value={cargo} onChange={e => setCargo(e.target.value)} /></div>
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="empresa-select">Empresa*</Label>
                <Select value={empresaIdSeleccionada} onValueChange={setEmpresaIdSeleccionada}>
                    <SelectTrigger id="empresa-select">
                        <SelectValue placeholder={`Seleccionar ${tipoRelacion === 'Empresa' ? 'Empresa Mandante' : 'Subcontrato'}`} />
                    </SelectTrigger>
                    <SelectContent>
                        {empresasDisponibles.map(emp => (
                            <SelectItem key={emp.id} value={emp.id}>{emp.razonSocial} - {emp.rut}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
               <div className="space-y-2"><Label htmlFor="fechaIngreso">Fecha de Ingreso</Label><Input id="fechaIngreso" type="date" value={fechaIngreso} onChange={e => setFechaIngreso(e.target.value)} /></div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="observaciones-nuevo">Observaciones iniciales</Label>
              <Textarea id="observaciones-nuevo" value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Ej: Ingresa para faenas de terminaciones." />
            </div>
             <div className="flex flex-wrap gap-x-4 gap-y-2">
                <Label className="flex items-center gap-2 font-normal text-sm"><Checkbox checked={docContrato} onCheckedChange={c => setDocContrato(!!c)} /><span>Tiene contrato</span></Label>
                <Label className="flex items-center gap-2 font-normal text-sm"><Checkbox checked={docInduccion} onCheckedChange={c => setDocInduccion(!!c)} /><span>Inducción realizada</span></Label>
                <Label className="flex items-center gap-2 font-normal text-sm"><Checkbox checked={docExamenMedico} onCheckedChange={c => setDocExamenMedico(!!c)} /><span>Apto médico vigente</span></Label>
            </div>
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            {mensaje && <p className="text-sm font-medium text-green-600">{mensaje}</p>}
            <Button type="submit" disabled={guardando}>{guardando ? "Registrando..." : "Crear Ficha de Trabajador"}</Button>
          </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>2. Listado de Personal y Gestión de Fichas</CardTitle>
          <CardDescription>Mostrando personal de tipo "{tipoRelacion}" para la obra "{selectedObra?.nombreFaena}". Seleccione un trabajador para ver su ficha de cumplimiento.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
             {cargandoIngresos ? (
              <p className="text-sm text-muted-foreground text-center py-8">Cargando registros...</p>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre / RUT</TableHead>
                  <TableHead>Cargo / Empresa</TableHead>
                  <TableHead>Progreso DS44</TableHead>
                  <TableHead>Estado General</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ingresosFiltrados.length > 0 ? (
                  ingresosFiltrados.map(ingreso => {
                    const progreso = getProgresoDs44(ingreso);
                    return (
                      <TableRow key={ingreso.id} className={cn(trabajadorSeleccionadoId === ingreso.id && "bg-accent/10")}>
                        <TableCell>
                          <div className="font-medium">{ingreso.nombre}</div>
                          <div className="text-xs text-muted-foreground">{ingreso.rut}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{ingreso.cargo}</div>
                          <div className="text-xs text-muted-foreground">{ingreso.empresa}</div>
                        </TableCell>
                        <TableCell>
                            <div className='flex items-center gap-2'>
                                <Progress value={progreso.porcentaje} className="w-24 h-2" />
                                <span className="text-xs font-medium text-muted-foreground">{progreso.cumplidos}/{progreso.total}</span>
                            </div>
                        </TableCell>
                        <TableCell><EstadoBadge estado={ingreso.estadoIngreso} /></TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => setTrabajadorSeleccionadoId(ingreso.id!)}>Abrir Ficha</Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No hay trabajadores registrados para esta obra y tipo de empresa.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
            )}
          </div>
        </CardContent>
      </Card>
      
      {trabajadorSeleccionado && (
      <section className="mt-6 space-y-4">
        <div className="flex justify-between items-center gap-2 print:hidden">
            <h3 className="text-lg font-semibold text-card-foreground">
                Ficha de trabajador y formularios DS44
            </h3>
            <Button
                type="button"
                onClick={() => window.print()}
                variant="outline"
                size="sm"
            >
                Imprimir / Guardar PDF
            </Button>
        </div>

        <div id="printable-trabajador" className="space-y-4 bg-card print:bg-white print:shadow-none print:border-0 rounded-xl print:rounded-none p-4 print:p-0">
          <EncabezadoDocumentoPrevencionLocal
            config={getDocConfigLocal("INDUCCION_OBRA")}
            nombreObra={obras.find(o => o.id === trabajadorSeleccionado.obraId)?.nombreFaena ?? ''}
          />
            {progresoSeleccionado && (
                 <Card className="border-accent shadow-lg">
                    <CardHeader className="flex flex-row items-start justify-between">
                        <div className="space-y-1.5">
                            <CardTitle className="text-2xl font-bold text-accent">Ficha de Cumplimiento: {trabajadorSeleccionado.nombre}</CardTitle>
                            <CardDescription className="text-base">{trabajadorSeleccionado.rut} | {trabajadorSeleccionado.cargo} en {trabajadorSeleccionado.empresa}</CardDescription>
                            <div className="flex items-center gap-4 pt-2">
                                <EstadoBadge estado={trabajadorSeleccionado.estadoIngreso} />
                                <div className="flex items-center gap-2">
                                    <Progress value={progresoSeleccionado.porcentaje} className="w-32 h-2.5" />
                                    <span className="text-sm font-semibold">{progresoSeleccionado.cumplidos}/{progresoSeleccionado.total} pasos DS44</span>
                                </div>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setTrabajadorSeleccionadoId(null)} className="print:hidden"><X className="h-5 w-5" /></Button>
                    </CardHeader>
                    <CardContent>
                        <Separator className="my-4" />
                        <h3 className="text-lg font-semibold mb-4">3. Pasos de Cumplimiento DS44</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
                            {pasosDS44.map(paso => {
                                const isCompleted = paso.docFields.every(field => trabajadorSeleccionado[field as keyof IngresoPersonal]);
                                return (
                                    <Card key={paso.id} className={cn("flex flex-col", isCompleted ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200")}>
                                        <CardHeader className="flex-row items-center gap-3 space-y-0 pb-2">
                                            <paso.icon className={cn("h-6 w-6", isCompleted ? "text-green-600" : "text-yellow-600")} />
                                            <h4 className="font-semibold">{paso.label}</h4>
                                        </CardHeader>
                                        <CardContent className="pb-4">
                                            <Badge variant={isCompleted ? "default" : "secondary"} className={cn(isCompleted ? "bg-green-600" : "bg-yellow-600")}>
                                                {isCompleted ? "Completado" : "Pendiente"}
                                            </Badge>
                                        </CardContent>
                                        <CardFooter className="mt-auto">
                                            <Button className="w-full" size="sm" variant={isCompleted ? "outline" : "default"} onClick={() => abrirPaso(paso.id as PasoDS44)} disabled={!!isCompleted}>
                                                {isCompleted ? 'Ver Registro' : 'Abrir Formulario'}
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                );
                            })}
                        </div>
                        <div className="print:hidden">{renderSubForm()}</div>
                    </CardContent>
                </Card>
            )}

            <div className="mt-6 space-y-4">
                <header className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-card-foreground">
                    Formularios DS44 – Trabajador
                    </h3>
                    <p className="text-xs text-muted-foreground">
                    Aquí se registran los formularios clave de Prevención de Riesgos
                    asociados a este trabajador (inducción, EPP, charlas, etc.).
                    </p>
                </div>
                </header>

                {/* Tarjeta de la Inducción de seguridad */}
                <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                    <h4 className="text-sm font-semibold text-card-foreground">
                        Inducción de seguridad de la obra
                    </h4>
                    <p className="text-xs text-muted-foreground">
                        Formulario para registrar que el trabajador recibió la inducción
                        de seguridad específica de la obra, de acuerdo al DS44.
                    </p>
                    </div>
                    <div className='flex flex-col items-start md:items-end gap-1 print:hidden'>
                        {ultimoRegistroInduccion ? (
                        <>
                            <span className="text-xs font-semibold text-card-foreground">
                            Última inducción: {ultimoRegistroInduccion.fechaInduccion}
                            </span>
                            <span className="text-xs text-muted-foreground">
                            Relator: {ultimoRegistroInduccion.relator || "No registrado"}
                            </span>
                        </>
                        ) : (
                        <span className="text-xs text-muted-foreground">
                            Este trabajador aún no tiene una inducción registrada.
                        </span>
                        )}
                        <Button
                        type="button"
                        onClick={() => {
                            setErrorInduccion(null);
                            setMostrarFormInduccion((prev) => !prev);
                        }}
                        variant="outline"
                        size="sm"
                        className='mt-1'
                        >
                        {mostrarFormInduccion
                            ? "Cerrar formulario"
                            : "Registrar nueva inducción"}
                        </Button>
                    </div>
                </div>

                {mostrarFormInduccion && (
                    <form
                    className="space-y-3 border-t pt-3 text-xs print:hidden"
                    onSubmit={(e) => {
                        e.preventDefault();
                        setErrorInduccion(null);

                        if (!trabajadorSeleccionado) {
                        setErrorInduccion("Debes seleccionar un trabajador.");
                        return;
                        }
                        if (!formInduccion.fechaInduccion) {
                        setErrorInduccion("Debes indicar la fecha de la inducción.");
                        return;
                        }
                        if (!formInduccion.lugar.trim()) {
                        setErrorInduccion("Indica el lugar donde se realizó la inducción.");
                        return;
                        }
                        if (!formInduccion.relator.trim()) {
                        setErrorInduccion("Indica quién realizó la inducción.");
                        return;
                        }
                        if (!formInduccion.aceptaInduccion) {
                        setErrorInduccion(
                            "Debes marcar que el trabajador declara haber recibido y comprendido la inducción."
                        );
                        return;
                        }
                        if (!formInduccion.nombreFirmaTrabajador.trim()) {
                        setErrorInduccion(
                            "Indica el nombre del trabajador como simulación de firma."
                        );
                        return;
                        }

                        const nuevoRegistro: RegistroInduccionTrabajador = {
                        id:
                            typeof crypto !== "undefined" && crypto.randomUUID
                            ? crypto.randomUUID()
                            : Date.now().toString(),
                        trabajadorId: trabajadorSeleccionado.id!,
                        obraId: trabajadorSeleccionado.obraId,
                        fechaInduccion: formInduccion.fechaInduccion,
                        lugar: formInduccion.lugar,
                        relator: formInduccion.relator,
                        contenidoReglasGenerales:
                            formInduccion.contenidoReglasGenerales,
                        contenidoPlanEmergencia: formInduccion.contenidoPlanEmergencia,
                        contenidoRiesgosCriticos: formInduccion.contenidoRiesgosCriticos,
                        contenidoUsoEPP: formInduccion.contenidoUsoEPP,
                        contenidoReporteIncidentes:
                            formInduccion.contenidoReporteIncidentes,
                        evaluacionAplicada: formInduccion.evaluacionAplicada,
                        resultadoEvaluacion: formInduccion.resultadoEvaluacion,
                        observaciones: formInduccion.observaciones,
                        aceptaInduccion: formInduccion.aceptaInduccion,
                        nombreFirmaTrabajador: formInduccion.nombreFirmaTrabajador,
                        };

                        setRegistrosInduccion((prev) => [nuevoRegistro, ...prev]);

                        setFormInduccion((prev) => ({
                        ...prev,
                        lugar: "",
                        relator: "",
                        observaciones: "",
                        aceptaInduccion: false,
                        nombreFirmaTrabajador: "",
                        }));
                        setMostrarFormInduccion(false);
                    }}
                    >
                    {errorInduccion && (
                        <p className="text-[11px] text-red-600">{errorInduccion}</p>
                    )}

                    <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-1">
                        <Label className="font-medium text-muted-foreground">
                            Fecha de inducción
                        </Label>
                        <Input
                            type="date"
                            value={formInduccion.fechaInduccion}
                            onChange={(e) =>
                            setFormInduccion((prev) => ({
                                ...prev,
                                fechaInduccion: e.target.value,
                            }))
                            }
                        />
                        </div>
                        <div className="space-y-1">
                        <Label className="font-medium text-muted-foreground">Lugar</Label>
                        <Input
                            type="text"
                            value={formInduccion.lugar}
                            onChange={(e) =>
                            setFormInduccion((prev) => ({
                                ...prev,
                                lugar: e.target.value,
                            }))
                            }
                            placeholder="Ej: Oficina de obra, sala reuniones, terreno..."
                        />
                        </div>
                        <div className="space-y-1">
                        <Label className="font-medium text-muted-foreground">
                            Relator / Responsable
                        </Label>
                        <Input
                            type="text"
                            value={formInduccion.relator}
                            onChange={(e) =>
                            setFormInduccion((prev) => ({
                                ...prev,
                                relator: e.target.value,
                            }))
                            }
                            placeholder="Nombre del prevencionista o jefe de obra"
                        />
                        </div>
                    </div>

                    <div className="grid gap-2 md:grid-cols-2">
                        <div className="space-y-1">
                        <p className="font-medium text-muted-foreground">
                            Contenidos mínimos impartidos
                        </p>
                        <div className="space-y-1">
                            <Label className="flex items-center gap-2 font-normal">
                            <Checkbox
                                checked={formInduccion.contenidoReglasGenerales}
                                onCheckedChange={(c) =>
                                setFormInduccion((prev) => ({
                                    ...prev,
                                    contenidoReglasGenerales: !!c,
                                }))
                                }
                            />
                            <span>
                                Reglas generales de seguridad y comportamiento en la obra.
                            </span>
                            </Label>
                            <Label className="flex items-center gap-2 font-normal">
                            <Checkbox
                                checked={formInduccion.contenidoPlanEmergencia}
                                onCheckedChange={(c) =>
                                setFormInduccion((prev) => ({
                                    ...prev,
                                    contenidoPlanEmergencia: !!c,
                                }))
                                }
                            />
                            <span>
                                Plan de emergencia, rutas de evacuación y puntos de
                                encuentro.
                            </span>
                            </Label>
                            <Label className="flex items-center gap-2 font-normal">
                            <Checkbox
                                checked={formInduccion.contenidoRiesgosCriticos}
                                onCheckedChange={(c) =>
                                setFormInduccion((prev) => ({
                                    ...prev,
                                    contenidoRiesgosCriticos: !!c,
                                }))
                                }
                            />
                            <span>Riesgos críticos específicos de la obra.</span>
                            </Label>
                            <Label className="flex items-center gap-2 font-normal">
                            <Checkbox
                                checked={formInduccion.contenidoUsoEPP}
                                onCheckedChange={(c) =>
                                setFormInduccion((prev) => ({
                                    ...prev,
                                    contenidoUsoEPP: !!c,
                                }))
                                }
                            />
                            <span>Uso obligatorio y cuidado de EPP.</span>
                            </Label>
                            <Label className="flex items-center gap-2 font-normal">
                            <Checkbox
                                checked={formInduccion.contenidoReporteIncidentes}
                                onCheckedChange={(c) =>
                                setFormInduccion((prev) => ({
                                    ...prev,
                                    contenidoReporteIncidentes: !!c,
                                }))
                                }
                            />
                            <span>
                                Procedimiento para reportar incidentes, condiciones y
                                actos inseguros.
                            </span>
                            </Label>
                        </div>
                        </div>

                        <div className="space-y-2">
                        <div className="space-y-1">
                            <Label className="font-medium text-muted-foreground">
                            Evaluación / verificación
                            </Label>
                            <Label className="flex items-center gap-2 font-normal">
                            <Checkbox
                                checked={formInduccion.evaluacionAplicada}
                                onCheckedChange={(c) =>
                                setFormInduccion((prev) => ({
                                    ...prev,
                                    evaluacionAplicada: !!c,
                                }))
                                }
                            />
                            <span>Se aplicó una verificación de comprensión.</span>
                            </Label>
                            <Select
                            value={formInduccion.resultadoEvaluacion}
                            onValueChange={(v) =>
                                setFormInduccion((prev) => ({
                                ...prev,
                                resultadoEvaluacion:
                                    v as
                                    | "Aprobado"
                                    | "Reforzar contenidos"
                                    | "No aplica",
                                }))
                            }
                            >
                            <SelectTrigger className="mt-1 w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Aprobado">Aprobado</SelectItem>
                                <SelectItem value="Reforzar contenidos">
                                Reforzar contenidos
                                </SelectItem>
                                <SelectItem value="No aplica">No aplica</SelectItem>
                            </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label className="font-medium text-muted-foreground">
                            Observaciones
                            </Label>
                            <Textarea
                            value={formInduccion.observaciones}
                            onChange={(e) =>
                                setFormInduccion((prev) => ({
                                ...prev,
                                observaciones: e.target.value,
                                }))
                            }
                            rows={3}
                            />
                        </div>
                        </div>
                    </div>

                    <div className="border-t pt-3 space-y-2">
                        <Label className="flex items-center gap-2 font-normal">
                        <Checkbox
                            checked={formInduccion.aceptaInduccion}
                            onCheckedChange={(c) =>
                            setFormInduccion((prev) => ({
                                ...prev,
                                aceptaInduccion: !!c,
                            }))
                            }
                        />
                        <span>
                            El trabajador declara haber recibido y comprendido la
                            inducción de seguridad de la obra.
                        </span>
                        </Label>
                        <div className="space-y-1">
                        <Label className="font-medium text-muted-foreground">
                            Nombre del trabajador (simulación de firma)
                        </Label>
                        <Input
                            type="text"
                            value={formInduccion.nombreFirmaTrabajador}
                            onChange={(e) =>
                            setFormInduccion((prev) => ({
                                ...prev,
                                nombreFirmaTrabajador: e.target.value,
                            }))
                            }
                            placeholder="Nombre completo del trabajador"
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Más adelante se puede reemplazar por una firma digital con el
                            dedo (canvas). Por ahora se registra el nombre como
                            aceptación.
                        </p>
                        </div>
                    </div>

                    <div className="pt-2">
                        <Button
                        type="submit"
                        >
                        Guardar registro de inducción
                        </Button>
                    </div>
                    </form>
                )}

                {registrosInduccionTrabajador.length > 0 && (
                    <div className="border-t pt-3">
                    <h5 className="text-xs font-semibold text-muted-foreground mb-2">
                        Historial de inducciones registradas
                    </h5>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {registrosInduccionTrabajador.map((reg) => (
                        <article
                            key={reg.id}
                            className="rounded-lg border bg-muted/30 p-3 text-[11px] space-y-1"
                        >
                            <p className="font-semibold text-foreground">
                            {reg.fechaInduccion} – {reg.lugar}
                            </p>
                            <p className="text-muted-foreground">
                            Relator: {reg.relator || "No registrado"}
                            </p>
                            <p className="text-muted-foreground">
                            Resultado: {reg.resultadoEvaluacion}
                            </p>
                            {reg.observaciones && (
                            <p className="text-muted-foreground">
                                Observaciones: {reg.observaciones}
                            </p>
                            )}
                        </article>
                        ))}
                    </div>
                    </div>
                )}
                </div>

                {/* Tarjeta de Entrega de EPP */}
                <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                        <h4 className="text-sm font-semibold text-card-foreground">
                            Entrega de Elementos de Protección Personal (EPP)
                        </h4>
                        <p className="text-xs text-muted-foreground">
                            Registro de la entrega de EPP al trabajador, incluyendo los elementos
                            entregados y la aceptación de uso, de acuerdo a los requisitos de
                            prevención.
                        </p>
                        </div>
                        <div className="flex flex-col items-start gap-1 text-xs md:items-end print:hidden">
                        {ultimoRegistroEPP ? (
                            <>
                            <span className="font-semibold text-card-foreground">
                                Última entrega: {ultimoRegistroEPP.fechaEntrega}
                            </span>
                            <span className="text-muted-foreground">
                                Responsable:{" "}
                                {ultimoRegistroEPP.responsableEntrega || "No registrado"}
                            </span>
                            </>
                        ) : (
                            <span className="text-muted-foreground">
                            Este trabajador aún no tiene registros de entrega de EPP.
                            </span>
                        )}
                        <Button
                            type="button"
                            onClick={() => {
                            setErrorEPP(null);
                            setMostrarFormEPP((prev) => !prev);
                            }}
                            variant='outline'
                            size='sm'
                            className="mt-1"
                        >
                            {mostrarFormEPP ? "Cerrar formulario EPP" : "Registrar nueva entrega EPP"}
                        </Button>
                        </div>
                    </div>

                    {/* Formulario de Entrega de EPP */}
                    {mostrarFormEPP && (
                        <form
                        className="space-y-3 border-t pt-3 text-xs print:hidden"
                        onSubmit={(e) => {
                            e.preventDefault();
                            setErrorEPP(null);

                            if (!trabajadorSeleccionado) {
                            setErrorEPP("Debes seleccionar un trabajador.");
                            return;
                            }
                            if (!formEPP.fechaEntrega) {
                            setErrorEPP("Debes indicar la fecha de entrega.");
                            return;
                            }
                            if (!formEPP.responsableEntrega.trim()) {
                            setErrorEPP("Indica quién entrega los EPP.");
                            return;
                            }
                            if (!formEPP.aceptaEPP) {
                            setErrorEPP(
                                "Debes marcar que el trabajador acepta y se compromete a usar los EPP."
                            );
                            return;
                            }
                            if (!formEPP.nombreFirmaTrabajador.trim()) {
                            setErrorEPP(
                                "Indica el nombre del trabajador como simulación de firma."
                            );
                            return;
                            }

                            const nuevoRegistro: RegistroEntregaEPP = {
                            id:
                                typeof crypto !== "undefined" && crypto.randomUUID
                                ? crypto.randomUUID()
                                : Date.now().toString(),
                            trabajadorId: trabajadorSeleccionado.id!,
                            obraId: trabajadorSeleccionado.obraId,
                            fechaEntrega: formEPP.fechaEntrega,
                            responsableEntrega: formEPP.responsableEntrega,
                            casco: formEPP.casco,
                            zapatosSeguridad: formEPP.zapatosSeguridad,
                            lentesSeguridad: formEPP.lentesSeguridad,
                            guantes: formEPP.guantes,
                            ropaTrabajo: formEPP.ropaTrabajo,
                            arnes: formEPP.arnes,
                            otrosDescripcion: formEPP.otrosDescripcion,
                            instruidoUsoCuidado: formEPP.instruidoUsoCuidado,
                            instruidoConsecuenciasNoUso: formEPP.instruidoConsecuenciasNoUso,
                            aceptaEPP: formEPP.aceptaEPP,
                            nombreFirmaTrabajador: formEPP.nombreFirmaTrabajador,
                            observaciones: formEPP.observaciones,
                            };

                            setRegistrosEPP((prev) => [nuevoRegistro, ...prev]);

                            setFormEPP((prev) => ({
                            ...prev,
                            responsableEntrega: "",
                            otrosDescripcion: "",
                            aceptaEPP: false,
                            nombreFirmaTrabajador: "",
                            observaciones: "",
                            }));
                            setMostrarFormEPP(false);
                        }}
                        >
                        {errorEPP && (
                            <p className="text-[11px] text-red-600">{errorEPP}</p>
                        )}

                        <div className="grid gap-3 md:grid-cols-3">
                            <div className="space-y-1">
                            <Label className="font-medium text-muted-foreground">
                                Fecha de entrega
                            </Label>
                            <Input
                                type="date"
                                value={formEPP.fechaEntrega}
                                onChange={(e) =>
                                setFormEPP((prev) => ({
                                    ...prev,
                                    fechaEntrega: e.target.value,
                                }))
                                }
                            />
                            </div>
                            <div className="space-y-1 md:col-span-2">
                            <Label className="font-medium text-muted-foreground">
                                Responsable de entrega
                            </Label>
                            <Input
                                type="text"
                                value={formEPP.responsableEntrega}
                                onChange={(e) =>
                                setFormEPP((prev) => ({
                                    ...prev,
                                    responsableEntrega: e.target.value,
                                }))
                                }
                                placeholder="Nombre del prevencionista, bodeguero o jefe de obra"
                            />
                            </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-1">
                            <p className="font-medium text-muted-foreground">
                                Elementos entregados
                            </p>
                            <div className="space-y-1">
                                <Label className="flex items-center gap-2 font-normal">
                                <Checkbox
                                    checked={formEPP.casco}
                                    onCheckedChange={(c) =>
                                    setFormEPP((prev) => ({ ...prev, casco: !!c }))
                                    }
                                />
                                <span>Casco de seguridad</span>
                                </Label>
                                <Label className="flex items-center gap-2 font-normal">
                                <Checkbox
                                    checked={formEPP.zapatosSeguridad}
                                    onCheckedChange={(c) =>
                                    setFormEPP((prev) => ({
                                        ...prev,
                                        zapatosSeguridad: !!c,
                                    }))
                                    }
                                />
                                <span>Zapatos de seguridad</span>
                                </Label>
                                <Label className="flex items-center gap-2 font-normal">
                                <Checkbox
                                    checked={formEPP.lentesSeguridad}
                                    onCheckedChange={(c) =>
                                    setFormEPP((prev) => ({
                                        ...prev,
                                        lentesSeguridad: !!c,
                                    }))
                                    }
                                />
                                <span>Lentes de seguridad</span>
                                </Label>
                                <Label className="flex items-center gap-2 font-normal">
                                <Checkbox
                                    checked={formEPP.guantes}
                                    onCheckedChange={(c) =>
                                    setFormEPP((prev) => ({
                                        ...prev,
                                        guantes: !!c,
                                    }))
                                    }
                                />
                                <span>Guantes</span>
                                </Label>
                                <Label className="flex items-center gap-2 font-normal">
                                <Checkbox
                                    checked={formEPP.ropaTrabajo}
                                    onCheckedChange={(c) =>
                                    setFormEPP((prev) => ({
                                        ...prev,
                                        ropaTrabajo: !!c,
                                    }))
                                    }
                                />
                                <span>Ropa de trabajo</span>
                                </Label>
                                <Label className="flex items-center gap-2 font-normal">
                                <Checkbox
                                    checked={formEPP.arnes}
                                    onCheckedChange={(c) =>
                                    setFormEPP((prev) => ({
                                        ...prev,
                                        arnes: !!c,
                                    }))
                                    }
                                />
                                <span>Arnés de seguridad (si aplica)</span>
                                </Label>
                            </div>
                            <div className="mt-2 space-y-1">
                                <Label className="font-medium text-muted-foreground">
                                Otros elementos / detalles
                                </Label>
                                <Input
                                type="text"
                                value={formEPP.otrosDescripcion}
                                onChange={(e) =>
                                    setFormEPP((prev) => ({
                                    ...prev,
                                    otrosDescripcion: e.target.value,
                                    }))
                                }
                                placeholder="Ej: protector auditivo, mascarilla específica, etc."
                                />
                            </div>
                            </div>

                            <div className="space-y-2">
                            <div className="space-y-1">
                                <p className="font-medium text-muted-foreground">
                                Instrucción al trabajador
                                </p>
                                <Label className="flex items-center gap-2 font-normal">
                                <Checkbox
                                    checked={formEPP.instruidoUsoCuidado}
                                    onCheckedChange={(c) =>
                                    setFormEPP((prev) => ({
                                        ...prev,
                                        instruidoUsoCuidado: !!c,
                                    }))
                                    }
                                />
                                <span>Se instruye sobre uso, cuidado y reposición de EPP.</span>
                                </Label>
                                <Label className="flex items-center gap-2 font-normal">
                                <Checkbox
                                    checked={formEPP.instruidoConsecuenciasNoUso}
                                    onCheckedChange={(c) =>
                                    setFormEPP((prev) => ({
                                        ...prev,
                                        instruidoConsecuenciasNoUso: !!c,
                                    }))
                                    }
                                />
                                <span>Se informa sobre consecuencias de no usar EPP.</span>
                                </Label>
                            </div>
                            <div className="space-y-1">
                                <Label className="font-medium text-muted-foreground">
                                Observaciones
                                </Label>
                                <Textarea
                                value={formEPP.observaciones}
                                onChange={(e) =>
                                    setFormEPP((prev) => ({
                                    ...prev,
                                    observaciones: e.target.value,
                                    }))
                                }
                                rows={4}
                                />
                            </div>
                            </div>
                        </div>

                        <div className="border-t pt-3 space-y-2">
                            <Label className="flex items-center gap-2 font-normal">
                            <Checkbox
                                checked={formEPP.aceptaEPP}
                                onCheckedChange={(c) =>
                                setFormEPP((prev) => ({
                                    ...prev,
                                    aceptaEPP: !!c,
                                }))
                                }
                            />
                            <span>
                                El trabajador declara recibir y comprometerse a usar los EPP
                                entregados.
                            </span>
                            </Label>
                            <div className="space-y-1">
                            <Label className="font-medium text-muted-foreground">
                                Nombre del trabajador (simulación de firma)
                            </Label>
                            <Input
                                type="text"
                                value={formEPP.nombreFirmaTrabajador}
                                onChange={(e) =>
                                setFormEPP((prev) => ({
                                    ...prev,
                                    nombreFirmaTrabajador: e.target.value,
                                }))
                                }
                                placeholder="Nombre completo del trabajador"
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Más adelante se puede reemplazar por una firma digital con el dedo
                                (canvas). Por ahora se registra el nombre como aceptación.
                            </p>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button
                            type="submit"
                            >
                            Guardar registro de entrega de EPP
                            </Button>
                        </div>
                        </form>
                    )}

                    {/* Historial de entregas de EPP */}
                    {registrosEPPTrabajador.length > 0 && (
                        <div className="border-t pt-3">
                        <h5 className="text-xs font-semibold text-muted-foreground mb-2">
                            Historial de entregas de EPP
                        </h5>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                            {registrosEPPTrabajador.map((reg) => (
                            <article
                                key={reg.id}
                                className="rounded-lg border bg-muted/30 p-3 text-[11px] space-y-1"
                            >
                                <p className="font-semibold text-foreground">
                                {reg.fechaEntrega} – Responsable:{" "}
                                {reg.responsableEntrega || "No registrado"}
                                </p>
                                <p className="text-muted-foreground">
                                Elementos:{" "}
                                {[
                                    reg.casco && "casco",
                                    reg.zapatosSeguridad && "zapatos",
                                    reg.lentesSeguridad && "lentes",
                                    reg.guantes && "guantes",
                                    reg.ropaTrabajo && "ropa",
                                    reg.arnes && "arnés",
                                ]
                                    .filter(Boolean)
                                    .join(", ") || "No registrado"}
                                </p>
                                {reg.otrosDescripcion && (
                                <p className="text-muted-foreground">
                                    Otros: {reg.otrosDescripcion}
                                </p>
                                )}
                                {reg.observaciones && (
                                <p className="text-muted-foreground">
                                    Observaciones: {reg.observaciones}
                                </p>
                                )}
                            </article>
                            ))}
                        </div>
                        </div>
                    )}
                </div>

                {/* Tarjeta de Charla de seguridad */}
                <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-card-foreground">
                        Charla de seguridad / charla específica
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Registra la participación del trabajador en charlas de seguridad
                        (diarias, específicas o reinducciones), incluyendo tema, riesgo
                        principal y observaciones.
                      </p>
                    </div>
                    <div className="flex flex-col items-start gap-1 text-xs md:items-end print:hidden">
                      {ultimaCharla ? (
                        <>
                          <span className="font-semibold text-card-foreground">
                            Última charla: {ultimaCharla.fechaCharla}
                          </span>
                          <span className="text-muted-foreground">
                            Tema: {ultimaCharla.tema || "Sin tema registrado"}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">
                          Este trabajador aún no tiene charlas registradas en el sistema.
                        </span>
                      )}
                      <Button
                        type="button"
                        onClick={() => {
                          setErrorCharla(null);
                          setMostrarFormCharla((prev) => !prev);
                        }}
                        variant="outline"
                        size="sm"
                        className="mt-1"
                      >
                        {mostrarFormCharla
                          ? "Cerrar formulario de charla"
                          : "Registrar nueva charla"}
                      </Button>
                    </div>
                  </div>

                  {/* Formulario de Charla */}
                  {mostrarFormCharla && (
                    <form
                      className="space-y-3 border-t pt-3 text-xs print:hidden"
                      onSubmit={(e) => {
                        e.preventDefault();
                        setErrorCharla(null);

                        if (!trabajadorSeleccionado) {
                          setErrorCharla("Debes seleccionar un trabajador.");
                          return;
                        }
                        if (!formCharla.fechaCharla) {
                          setErrorCharla("Debes indicar la fecha de la charla.");
                          return;
                        }
                        if (!formCharla.tema.trim()) {
                          setErrorCharla("Indica el tema de la charla.");
                          return;
                        }
                        if (!formCharla.relator.trim()) {
                          setErrorCharla("Indica quién dictó la charla.");
                          return;
                        }
                        if (!formCharla.aceptaCharla) {
                          setErrorCharla(
                            "Debes marcar que el trabajador declara haber participado en la charla."
                          );
                          return;
                        }
                        if (!formCharla.nombreFirmaTrabajador.trim()) {
                          setErrorCharla(
                            "Indica el nombre del trabajador como simulación de firma."
                          );
                          return;
                        }

                        const nuevoRegistro: RegistroCharlaSeguridad = {
                          id:
                            typeof crypto !== "undefined" && crypto.randomUUID
                              ? crypto.randomUUID()
                              : Date.now().toString(),
                          trabajadorId: trabajadorSeleccionado.id!,
                          obraId: trabajadorSeleccionado.obraId,
                          fechaCharla: formCharla.fechaCharla,
                          tipoCharla: formCharla.tipoCharla,
                          tema: formCharla.tema,
                          relator: formCharla.relator,
                          riesgoPrincipal: formCharla.riesgoPrincipal,
                          medidasReforzadas: formCharla.medidasReforzadas,
                          asistencia: formCharla.asistencia,
                          observaciones: formCharla.observaciones,
                          aceptaCharla: formCharla.aceptaCharla,
                          nombreFirmaTrabajador: formCharla.nombreFirmaTrabajador,
                        };

                        setRegistrosCharlas((prev) => [nuevoRegistro, ...prev]);

                        setFormCharla((prev) => ({
                          ...prev,
                          tema: "",
                          relator: "",
                          riesgoPrincipal: "",
                          medidasReforzadas: "",
                          observaciones: "",
                          aceptaCharla: false,
                          nombreFirmaTrabajador: "",
                        }));
                        setMostrarFormCharla(false);
                      }}
                    >
                      {errorCharla && (
                        <p className="text-[11px] text-red-600">{errorCharla}</p>
                      )}

                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-1">
                          <Label className="font-medium text-muted-foreground">
                            Fecha de la charla
                          </Label>
                          <Input
                            type="date"
                            value={formCharla.fechaCharla}
                            onChange={(e) =>
                              setFormCharla((prev) => ({
                                ...prev,
                                fechaCharla: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="font-medium text-muted-foreground">
                            Tipo de charla
                          </Label>
                          <Select
                            value={formCharla.tipoCharla}
                            onValueChange={(v) =>
                              setFormCharla((prev) => ({
                                ...prev,
                                tipoCharla: v as TipoCharla,
                              }))
                            }
                          >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Charla diaria">Charla diaria</SelectItem>
                                <SelectItem value="Charla específica">Charla específica</SelectItem>
                                <SelectItem value="Reinducción">Reinducción</SelectItem>
                                <SelectItem value="Otra">Otra</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="font-medium text-muted-foreground">Relator</Label>
                          <Input
                            type="text"
                            value={formCharla.relator}
                            onChange={(e) =>
                              setFormCharla((prev) => ({
                                ...prev,
                                relator: e.target.value,
                              }))
                            }
                            placeholder="Nombre de quien dicta la charla"
                          />
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="font-medium text-muted-foreground">Tema de la charla</Label>
                          <Input
                            type="text"
                            value={formCharla.tema}
                            onChange={(e) =>
                              setFormCharla((prev) => ({
                                ...prev,
                                tema: e.target.value,
                              }))
                            }
                            placeholder="Ej: Trabajo en altura, orden y limpieza, etc."
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="font-medium text-muted-foreground">
                            Riesgo principal abordado
                          </Label>
                          <Input
                            type="text"
                            value={formCharla.riesgoPrincipal}
                            onChange={(e) =>
                              setFormCharla((prev) => ({
                                ...prev,
                                riesgoPrincipal: e.target.value,
                              }))
                            }
                            placeholder="Ej: Caídas de altura, atrapamientos, eléctrico..."
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="font-medium text-muted-foreground">
                          Medidas específicas reforzadas
                        </Label>
                        <Textarea
                          value={formCharla.medidasReforzadas}
                          onChange={(e) =>
                            setFormCharla((prev) => ({
                              ...prev,
                              medidasReforzadas: e.target.value,
                            }))
                          }
                          rows={3}
                        />
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="font-medium text-muted-foreground">
                            Asistencia del trabajador
                          </Label>
                          <Select
                            value={formCharla.asistencia}
                            onValueChange={(v) =>
                              setFormCharla((prev) => ({
                                ...prev,
                                asistencia: v as
                                  | "Asiste"
                                  | "No asiste"
                                  | "Llega tarde",
                              }))
                            }
                          >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Asiste">Asiste</SelectItem>
                                <SelectItem value="No asiste">No asiste</SelectItem>
                                <SelectItem value="Llega tarde">Llega tarde</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="font-medium text-muted-foreground">
                            Observaciones
                          </Label>
                          <Textarea
                            value={formCharla.observaciones}
                            onChange={(e) =>
                              setFormCharla((prev) => ({
                                ...prev,
                                observaciones: e.target.value,
                              }))
                            }
                            rows={3}
                          />
                        </div>
                      </div>

                      <div className="border-t pt-3 space-y-2">
                        <Label className="flex items-center gap-2 font-normal">
                          <Checkbox
                            checked={formCharla.aceptaCharla}
                            onCheckedChange={(c) =>
                              setFormCharla((prev) => ({
                                ...prev,
                                aceptaCharla: !!c,
                              }))
                            }
                          />
                          <span>
                            El trabajador declara haber participado en la charla de seguridad.
                          </span>
                        </Label>
                        <div className="space-y-1">
                          <Label className="font-medium text-muted-foreground">
                            Nombre del trabajador (simulación de firma)
                          </Label>
                          <Input
                            type="text"
                            value={formCharla.nombreFirmaTrabajador}
                            onChange={(e) =>
                              setFormCharla((prev) => ({
                                ...prev,
                                nombreFirmaTrabajador: e.target.value,
                              }))
                            }
                            placeholder="Nombre completo del trabajador"
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Más adelante se puede reemplazar por una firma digital con el dedo
                            (canvas). Por ahora se registra el nombre como aceptación.
                          </p>
                        </div>
                      </div>

                      <div className="pt-2">
                        <Button
                          type="submit"
                        >
                          Guardar registro de charla
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Historial de charlas */}
                  {registrosCharlasTrabajador.length > 0 && (
                    <div className="border-t pt-3">
                      <h5 className="text-xs font-semibold text-muted-foreground mb-2">
                        Historial de charlas de seguridad
                      </h5>
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {registrosCharlasTrabajador.map((reg) => (
                          <article
                            key={reg.id}
                            className="rounded-lg border bg-muted/30 p-3 text-[11px] space-y-1"
                          >
                            <p className="font-semibold text-foreground">
                              {reg.fechaCharla} – {reg.tema || "Sin tema registrado"}
                            </p>
                            <p className="text-muted-foreground">
                              Tipo: {reg.tipoCharla} · Relator:{" "}
                              {reg.relator || "No registrado"}
                            </p>
                            {reg.riesgoPrincipal && (
                              <p className="text-muted-foreground">
                                Riesgo principal: {reg.riesgoPrincipal}
                              </p>
                            )}
                            {reg.medidasReforzadas && (
                              <p className="text-muted-foreground">
                                Medidas reforzadas: {reg.medidasReforzadas}
                              </p>
                            )}
                            {reg.observaciones && (
                              <p className="text-muted-foreground">
                                Observaciones: {reg.observaciones}
                              </p>
                            )}
                          </article>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
            </div>
        </div>
      </section>
      )}
    </div>
  );
}
