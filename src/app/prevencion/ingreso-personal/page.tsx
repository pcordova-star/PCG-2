"use client";

import React, { useState, useMemo } from 'react';
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

// --- Tipos ---
type Obra = {
  id: string;
  nombreFaena: string;
};

type TipoRelacionPersonal = "Empresa" | "Subcontrato";
type EstadoIngresoPersonal = "Pendiente" | "Autorizado" | "Rechazado";
type PasoDS44 = "Reglamento" | "Induccion" | "EPP" | "Charla" | null;
type TipoEmpresa = "Mandante" | "Contratista" | "Subcontratista";

type Empresa = {
  id: string;
  nombre: string;
  rut: string;
  tipo: TipoEmpresa;
};


type IngresoPersonal = {
  id: string;
  obraId: string;
  tipoRelacion: TipoRelacionPersonal;
  fechaIngreso: string;
  rut: string;
  nombre: string;
  cargo: string;
  empresaId: string;
  empresa: string;
  
  // Checklist DS44
  docContrato: boolean;
  docMutualAlDia: boolean;
  docExamenMedico: boolean;
  docInduccion: boolean;
  docEPPEntregados: boolean;
  docRegistroListaPersonal: boolean;
  
  // Campos de los sub-formularios
  fechaReglamento?: string;
  obsReglamento?: string;
  fechaInduccion?: string;
  tipoInduccion?: string;
  obsInduccion?: string;
  eppEntregados?: string;
  fechaEntregaEPP?: string;
  temaCharla?: string;
  fechaCharla?: string;
  obsCharla?: string;

  estadoIngreso: EstadoIngresoPersonal;
  observaciones: string;
};

// --- Datos Simulados ---
const OBRAS_SIMULADAS: Obra[] = [
  { id: 'obra-1', nombreFaena: 'Edificio Los Álamos' },
  { id: 'obra-2', nombreFaena: 'Condominio Cuatro Vientos' },
  { id: 'obra-3', nombreFaena: 'Mejoramiento Vial Ruta 5' },
];

const EMPRESAS_SIMULADAS: Empresa[] = [
  {
    id: "emp-1",
    nombre: "Constructora Principal S.A.",
    rut: "76.123.456-7",
    tipo: "Mandante",
  },
  {
    id: "emp-2",
    nombre: "Excavaciones del Sur Ltda.",
    rut: "77.234.567-8",
    tipo: "Subcontratista",
  },
  {
    id: "emp-3",
    nombre: "Montajes Estructurales Andinos SpA",
    rut: "78.345.678-9",
    tipo: "Subcontratista",
  },
  {
    id: "emp-4",
    nombre: "Instalaciones Eléctricas Norte",
    rut: "79.456.789-0",
    tipo: "Subcontratista",
  },
];

const empresasMandante = EMPRESAS_SIMULADAS.filter(
  (e) => e.tipo === "Mandante"
);

const empresasSubcontrato = EMPRESAS_SIMULADAS.filter(
  (e) => e.tipo === "Subcontratista" || e.tipo === "Contratista"
);

const INGRESOS_INICIALES: IngresoPersonal[] = [
  {
    id: 'per1',
    obraId: 'obra-1',
    tipoRelacion: 'Empresa',
    fechaIngreso: '2025-11-15',
    rut: '15.123.456-7',
    nombre: 'Juan Pérez',
    cargo: 'Jefe de Obra',
    empresaId: 'emp-1',
    empresa: 'Constructora Principal S.A.',
    docContrato: true, docMutualAlDia: true, docExamenMedico: true, docInduccion: false, docEPPEntregados: false, docRegistroListaPersonal: true,
    estadoIngreso: 'Pendiente',
    observaciones: 'Listo para iniciar inducción y entrega de EPP.',
  },
  {
    id: 'per2',
    obraId: 'obra-1',
    tipoRelacion: 'Subcontrato',
    fechaIngreso: '2025-11-20',
    rut: '18.987.654-3',
    nombre: 'Ana Gómez',
    cargo: 'Ayudante de Trazado',
    empresaId: 'emp-2',
    empresa: 'Excavaciones del Sur Ltda.',
    docContrato: true, docMutualAlDia: true, docExamenMedico: false, docInduccion: true, docEPPEntregados: true, docRegistroListaPersonal: true,
    estadoIngreso: 'Pendiente',
    observaciones: 'Falta examen de altura. No puede trabajar en niveles superiores hasta regularizar.',
    fechaInduccion: '2025-11-20', tipoInduccion: 'General de Obra',
    eppEntregados: 'Casco, Lentes, Zapatos de seguridad, Guantes', fechaEntregaEPP: '2025-11-20',
  },
];

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
  const pasos = [
    ing.docContrato,
    ing.docMutualAlDia,
    ing.docExamenMedico,
    ing.docInduccion,
    ing.docEPPEntregados,
    ing.docRegistroListaPersonal,
  ];
  const total = pasos.length;
  const cumplidos = pasos.filter(Boolean).length;
  return { total, cumplidos, porcentaje: total > 0 ? (cumplidos / total) * 100 : 0 };
}

function getIndicadoresObraTipo(
  ingresos: IngresoPersonal[],
  obraId: string,
  tipoRelacion: TipoRelacionPersonal
) {
  const relevantes = ingresos.filter(
    (i) => i.obraId === obraId && i.tipoRelacion === tipoRelacion
  );

  const total = relevantes.length;
  const autorizados = relevantes.filter(
    (i) => i.estadoIngreso === "Autorizado"
  ).length;
  const pendientes = relevantes.filter(
    (i) => i.estadoIngreso === "Pendiente"
  ).length;
  const rechazados = relevantes.filter(
    (i) => i.estadoIngreso === "Rechazado"
  ).length;

  const pasosPorPersona = relevantes.map((ing) => {
    const { total, cumplidos } = getProgresoDs44(ing);
    return { totalPasos: total, cumplidos };
  });

  const totalPasosGlobal = pasosPorPersona.reduce(
    (acc, p) => acc + p.totalPasos,
    0
  );
  const cumplidosGlobal = pasosPorPersona.reduce(
    (acc, p) => acc + p.cumplidos,
    0
  );
  
  const porcentaje = totalPasosGlobal > 0 ? Math.round((cumplidosGlobal * 100) / totalPasosGlobal) : 0;

  return {
    total,
    autorizados,
    pendientes,
    rechazados,
    totalPasosGlobal,
    cumplidosGlobal,
    porcentaje,
  };
}

// --- Componente Principal ---
export default function IngresoPersonalPage() {
  const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>(OBRAS_SIMULADAS[0]?.id ?? "");
  const [tipoRelacion, setTipoRelacion] = useState<TipoRelacionPersonal>("Empresa");
  const [ingresos, setIngresos] = useState<IngresoPersonal[]>(INGRESOS_INICIALES);
  const [trabajadorSeleccionadoId, setTrabajadorSeleccionadoId] = useState<string | null>(null);
  const [pasoActivo, setPasoActivo] = useState<PasoDS44>(null);

  // Estados del formulario de nuevo ingreso
  const [rut, setRut] = useState('');
  const [nombre, setNombre] = useState('');
  const [cargo, setCargo] = useState('');
  const [empresaIdSeleccionada, setEmpresaIdSeleccionada] = useState<string>("");
  const [fechaIngreso, setFechaIngreso] = useState(new Date().toISOString().split('T')[0]);
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState('');
  
  // Estados para subformularios de pasos
  const [subFormState, setSubFormState] = useState({
      fecha: new Date().toISOString().split('T')[0],
      texto1: '',
      texto2: ''
  });

  const ingresosFiltrados = useMemo(() =>
    ingresos.filter((i) => i.obraId === obraSeleccionadaId && i.tipoRelacion === tipoRelacion),
    [ingresos, obraSeleccionadaId, tipoRelacion]
  );
  
  const trabajadorSeleccionado = useMemo(() => 
    ingresos.find((i) => i.id === trabajadorSeleccionadoId),
    [ingresos, trabajadorSeleccionadoId]
  );
  
  const progresoSeleccionado = useMemo(() => 
    trabajadorSeleccionado ? getProgresoDs44(trabajadorSeleccionado) : null,
    [trabajadorSeleccionado]
  );
  
  const indicadoresActuales = useMemo(() => 
    getIndicadoresObraTipo(ingresos, obraSeleccionadaId, tipoRelacion),
    [ingresos, obraSeleccionadaId, tipoRelacion]
  );

  const resetForm = () => {
    setRut(''); setNombre(''); setCargo(''); setEmpresaIdSeleccionada('');
    setFechaIngreso(new Date().toISOString().split('T')[0]);
    setObservaciones(''); setError('');
  };
  
  const handleNuevoIngresoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rut || !nombre || !cargo || !empresaIdSeleccionada) {
      setError('RUT, Nombre, Cargo y Empresa son obligatorios.');
      return;
    }

    const empresaSeleccionada = EMPRESAS_SIMULADAS.find(emp => emp.id === empresaIdSeleccionada);
    if (!empresaSeleccionada) {
      setError('La empresa seleccionada no es válida.');
      return;
    }

    setError('');

    const nuevoIngreso: IngresoPersonal = {
      id: `per-${Date.now()}`,
      obraId: obraSeleccionadaId,
      tipoRelacion,
      fechaIngreso,
      rut, nombre, cargo, 
      empresaId: empresaSeleccionada.id,
      empresa: empresaSeleccionada.nombre,
      docContrato: false, docMutualAlDia: false, docExamenMedico: false, docInduccion: false, docEPPEntregados: false, docRegistroListaPersonal: false,
      estadoIngreso: 'Pendiente',
      observaciones,
    };
    
    setIngresos((prev) => [nuevoIngreso, ...prev]);
    resetForm();
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
          updatedIngreso.docMutualAlDia = true; // Asumiendo que se revisan juntos
          updatedIngreso.docExamenMedico = true;
          updatedIngreso.fechaReglamento = subFormState.fecha;
          updatedIngreso.obsReglamento = subFormState.texto1;
          break;
        case 'Induccion':
          updatedIngreso.docInduccion = true;
          updatedIngreso.fechaInduccion = subFormState.fecha;
          updatedIngreso.tipoInduccion = subFormState.texto1;
          updatedIngreso.obsInduccion = subFormState.texto2;
          break;
        case 'EPP':
          updatedIngreso.docEPPEntregados = true;
          updatedIngreso.fechaEntregaEPP = subFormState.fecha;
          updatedIngreso.eppEntregados = subFormState.texto1;
          break;
        case 'Charla':
          updatedIngreso.docRegistroListaPersonal = true; 
          updatedIngreso.fechaCharla = subFormState.fecha;
          updatedIngreso.temaCharla = subFormState.texto1;
          updatedIngreso.obsCharla = subFormState.texto2;
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
  
  const selectedObra = OBRAS_SIMULADAS.find(o => o.id === obraSeleccionadaId);
  const empresasDisponibles = tipoRelacion === 'Empresa' ? empresasMandante : empresasSubcontrato;

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
              <SelectTrigger id="obra-select"><SelectValue placeholder="Seleccione una obra" /></SelectTrigger>
              <SelectContent>{OBRAS_SIMULADAS.map((obra) => <SelectItem key={obra.id} value={obra.id}>{obra.nombreFaena}</SelectItem>)}</SelectContent>
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
          <form onSubmit={handleNuevoIngresoSubmit} className="space-y-4">
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
                            <SelectItem key={emp.id} value={emp.id}>{emp.nombre} - {emp.rut}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="observaciones-nuevo">Observaciones iniciales</Label>
              <Textarea id="observaciones-nuevo" value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Ej: Ingresa para faenas de terminaciones." />
            </div>
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <Button type="submit">Crear Ficha de Trabajador</Button>
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
                          <Button variant="outline" size="sm" onClick={() => setTrabajadorSeleccionadoId(ingreso.id)}>Abrir Ficha</Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No hay trabajadores registrados para esta obra y tipo de empresa.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {trabajadorSeleccionado && progresoSeleccionado && (
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
            <Button variant="ghost" size="icon" onClick={() => setTrabajadorSeleccionadoId(null)}><X className="h-5 w-5" /></Button>
          </CardHeader>
          <CardContent>
            <Separator className="my-4" />
            <h3 className="text-lg font-semibold mb-4">3. Pasos de Cumplimiento DS44</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            {renderSubForm()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

    