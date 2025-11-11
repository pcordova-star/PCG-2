"use client";

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

// --- Tipos ---
type Obra = {
  id: string;
  nombreFaena: string;
};

type TipoRelacionPersonal = "Empresa" | "Subcontrato";

type EstadoIngresoPersonal = "Pendiente" | "Autorizado" | "Rechazado";

type IngresoPersonal = {
  id: string;
  obraId: string;
  tipoRelacion: TipoRelacionPersonal;
  fechaIngreso: string;
  rut: string;
  nombre: string;
  cargo: string;
  empresa: string;
  docContrato: boolean;
  docMutualAlDia: boolean;
  docExamenMedico: boolean;
  docInduccion: boolean;
  docEPPEntregados: boolean;
  docRegistroListaPersonal: boolean;
  estadoIngreso: EstadoIngresoPersonal;
  observaciones: string;
};

const ESTADOS_INGRESO: EstadoIngresoPersonal[] = ["Pendiente", "Autorizado", "Rechazado"];

// --- Datos Simulados ---
const OBRAS_SIMULADAS: Obra[] = [
  { id: 'obra-1', nombreFaena: 'Edificio Los Álamos' },
  { id: 'obra-2', nombreFaena: 'Condominio Cuatro Vientos' },
  { id: 'obra-3', nombreFaena: 'Mejoramiento Vial Ruta 5' },
];

const INGRESOS_INICIALES: IngresoPersonal[] = [
  {
    id: 'per1',
    obraId: 'obra-1',
    tipoRelacion: 'Empresa',
    fechaIngreso: '2025-11-15',
    rut: '15.123.456-7',
    nombre: 'Juan Pérez',
    cargo: 'Jefe de Obra',
    empresa: 'Constructora Principal S.A.',
    docContrato: true,
    docMutualAlDia: true,
    docExamenMedico: true,
    docInduccion: true,
    docEPPEntregados: true,
    docRegistroListaPersonal: true,
    estadoIngreso: 'Autorizado',
    observaciones: 'Todo en orden.',
  },
  {
    id: 'per2',
    obraId: 'obra-1',
    tipoRelacion: 'Subcontrato',
    fechaIngreso: '2025-11-20',
    rut: '18.987.654-3',
    nombre: 'Ana Gómez',
    cargo: 'Ayudante de Trazado',
    empresa: 'Topografía del Sur Ltda.',
    docContrato: true,
    docMutualAlDia: true,
    docExamenMedico: false,
    docInduccion: true,
    docEPPEntregados: true,
    docRegistroListaPersonal: true,
    estadoIngreso: 'Pendiente',
    observaciones: 'Falta examen de altura. No puede trabajar en niveles superiores hasta regularizar.',
  },
];

// --- Componentes Auxiliares ---
function EstadoBadge({ estado }: { estado: EstadoIngresoPersonal }) {
  const className = {
    "Autorizado": "bg-green-100 text-green-800 border-green-200",
    "Pendiente": "bg-yellow-100 text-yellow-800 border-yellow-200",
    "Rechazado": "bg-red-100 text-red-800 border-red-200",
  }[estado];
  return <Badge variant="outline" className={cn("font-semibold", className)}>{estado}</Badge>;
}

// --- Componente Principal ---
export default function IngresoPersonalPage() {
  const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>(OBRAS_SIMULADAS[0]?.id ?? "");
  const [tipoRelacion, setTipoRelacion] = useState<TipoRelacionPersonal>("Empresa");
  const [ingresos, setIngresos] = useState<IngresoPersonal[]>(INGRESOS_INICIALES);

  // Estados del formulario
  const [rut, setRut] = useState('');
  const [nombre, setNombre] = useState('');
  const [cargo, setCargo] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [fechaIngreso, setFechaIngreso] = useState(new Date().toISOString().split('T')[0]);
  const [estadoIngreso, setEstadoIngreso] = useState<EstadoIngresoPersonal>('Pendiente');
  const [observaciones, setObservaciones] = useState('');
  
  const [docContrato, setDocContrato] = useState(false);
  const [docMutualAlDia, setDocMutualAlDia] = useState(false);
  const [docExamenMedico, setDocExamenMedico] = useState(false);
  const [docInduccion, setDocInduccion] = useState(false);
  const [docEPPEntregados, setDocEPPEntregados] = useState(false);
  const [docRegistroListaPersonal, setDocRegistroListaPersonal] = useState(false);

  const [error, setError] = useState('');
  
  const ingresosFiltrados = useMemo(() =>
    ingresos.filter(
      (i) =>
        i.obraId === obraSeleccionadaId &&
        i.tipoRelacion === tipoRelacion
    ),
    [ingresos, obraSeleccionadaId, tipoRelacion]
  );
  
  const resumenIngresos = useMemo(() => {
    const total = ingresosFiltrados.length;
    const autorizados = ingresosFiltrados.filter(i => i.estadoIngreso === 'Autorizado').length;
    const pendientes = ingresosFiltrados.filter(i => i.estadoIngreso === 'Pendiente').length;
    const rechazados = ingresosFiltrados.filter(i => i.estadoIngreso === 'Rechazado').length;
    return { total, autorizados, pendientes, rechazados };
  }, [ingresosFiltrados]);

  const resetForm = () => {
    setRut('');
    setNombre('');
    setCargo('');
    setEmpresa('');
    setFechaIngreso(new Date().toISOString().split('T')[0]);
    setEstadoIngreso('Pendiente');
    setObservaciones('');
    setDocContrato(false);
    setDocMutualAlDia(false);
    setDocExamenMedico(false);
    setDocInduccion(false);
    setDocEPPEntregados(false);
    setDocRegistroListaPersonal(false);
    setError('');
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!obraSeleccionadaId || !tipoRelacion || !rut || !nombre || !cargo || !empresa || !fechaIngreso || !estadoIngreso) {
      setError('Faltan datos básicos del trabajador. Por favor, complete todos los campos requeridos (*).');
      return;
    }
    setError('');

    const nuevoIngreso: IngresoPersonal = {
      id: `per-${Date.now()}`,
      obraId: obraSeleccionadaId,
      tipoRelacion,
      fechaIngreso,
      rut,
      nombre,
      cargo,
      empresa,
      docContrato,
      docMutualAlDia,
      docExamenMedico,
      docInduccion,
      docEPPEntregados,
      docRegistroListaPersonal,
      estadoIngreso,
      observaciones,
    };
    
    setIngresos((prev) => [nuevoIngreso, ...prev]);
    resetForm();
  };
  
  const countDocsOk = (ingreso: IngresoPersonal) => {
    let count = 0;
    if (ingreso.docContrato) count++;
    if (ingreso.docMutualAlDia) count++;
    if (ingreso.docExamenMedico) count++;
    if (ingreso.docInduccion) count++;
    if (ingreso.docEPPEntregados) count++;
    if (ingreso.docRegistroListaPersonal) count++;
    return count;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-headline tracking-tight">Ingreso de Personal – DS44</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Este módulo registra el ingreso de trabajadores a la obra, tanto propios del mandante como de subcontratos. Los datos servirán para indicadores de cumplimiento.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="obra-select">Seleccione una obra</Label>
            <Select value={obraSeleccionadaId} onValueChange={setObraSeleccionadaId}>
              <SelectTrigger id="obra-select"><SelectValue placeholder="Seleccione una obra" /></SelectTrigger>
              <SelectContent>
                {OBRAS_SIMULADAS.map((obra) => (
                  <SelectItem key={obra.id} value={obra.id}>{obra.nombreFaena}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo de Personal a Gestionar</Label>
            <RadioGroup
              value={tipoRelacion}
              onValueChange={(value) => setTipoRelacion(value as TipoRelacionPersonal)}
              className="flex items-center space-x-4 pt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Empresa" id="r-empresa" />
                <Label htmlFor="r-empresa">Personal Empresa</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Subcontrato" id="r-subcontrato" />
                <Label htmlFor="r-subcontrato">Personal Subcontrato</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Resumen de Ingresos</CardTitle>
            <CardDescription>Personal de tipo "{tipoRelacion}" para la obra "{OBRAS_SIMULADAS.find(o => o.id === obraSeleccionadaId)?.nombreFaena}".</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-2">
                <span className="font-medium text-foreground">Total: {resumenIngresos.total}</span>
                <span className="hidden sm:inline">·</span>
                <span>Autorizados: {resumenIngresos.autorizados}</span>
                <span className="hidden sm:inline">·</span>
                <span>Pendientes: {resumenIngresos.pendientes}</span>
                <span className="hidden sm:inline">·</span>
                <span>Rechazados: {resumenIngresos.rechazados}</span>
            </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Formulario de Ingreso de Personal</CardTitle>
            <CardDescription>Complete los datos del trabajador y el checklist de requisitos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">1. Datos Básicos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2"><Label htmlFor="rut">RUT*</Label><Input id="rut" value={rut} onChange={e => setRut(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="nombre">Nombre*</Label><Input id="nombre" value={nombre} onChange={e => setNombre(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="cargo">Cargo*</Label><Input id="cargo" value={cargo} onChange={e => setCargo(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="empresa">Empresa*</Label><Input id="empresa" value={empresa} onChange={e => setEmpresa(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="fechaIngreso">Fecha de Ingreso*</Label><Input id="fechaIngreso" type="date" value={fechaIngreso} onChange={e => setFechaIngreso(e.target.value)} /></div>
                <div className="space-y-2">
                  <Label htmlFor="estadoIngreso">Estado de Ingreso*</Label>
                  <Select value={estadoIngreso} onValueChange={(v) => setEstadoIngreso(v as EstadoIngresoPersonal)}>
                    <SelectTrigger id="estadoIngreso"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ESTADOS_INGRESO.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">2. Checklist de Requisitos Personales DS44</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <div className="flex items-center space-x-2"><Checkbox id="docContrato" checked={docContrato} onCheckedChange={c => setDocContrato(!!c)} /><Label htmlFor="docContrato">Contrato / anexo vigente</Label></div>
                <div className="flex items-center space-x-2"><Checkbox id="docMutualAlDia" checked={docMutualAlDia} onCheckedChange={c => setDocMutualAlDia(!!c)} /><Label htmlFor="docMutualAlDia">Afiliación a mutual y cotizaciones al día</Label></div>
                <div className="flex items-center space-x-2"><Checkbox id="docExamenMedico" checked={docExamenMedico} onCheckedChange={c => setDocExamenMedico(!!c)} /><Label htmlFor="docExamenMedico">Examen preocupacional / apto médico</Label></div>
                <div className="flex items-center space-x-2"><Checkbox id="docInduccion" checked={docInduccion} onCheckedChange={c => setDocInduccion(!!c)} /><Label htmlFor="docInduccion">Inducción de seguridad realizada</Label></div>
                <div className="flex items-center space-x-2"><Checkbox id="docEPPEntregados" checked={docEPPEntregados} onCheckedChange={c => setDocEPPEntregados(!!c)} /><Label htmlFor="docEPPEntregados">EPP entregados y registrados</Label></div>
                <div className="flex items-center space-x-2"><Checkbox id="docRegistroListaPersonal" checked={docRegistroListaPersonal} onCheckedChange={c => setDocRegistroListaPersonal(!!c)} /><Label htmlFor="docRegistroListaPersonal">Incluido en listado de personal autorizado</Label></div>
              </div>
            </div>

            <Separator />
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">3. Observaciones</h3>
              <Textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Ej: Se autoriza ingreso, pero queda pendiente entrega de calzado de seguridad." />
            </div>

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}

            <Button type="submit" className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90">
              Registrar Ingreso de Trabajador
            </Button>
          </CardContent>
        </Card>
      </form>
      
      <Card>
        <CardHeader>
          <CardTitle>Historial de Ingresos Registrados</CardTitle>
          <CardDescription>Mostrando personal de tipo "{tipoRelacion}" para la obra seleccionada.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>RUT / Nombre</TableHead>
                  <TableHead>Cargo / Empresa</TableHead>
                  <TableHead className="text-center">Docs OK</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ingresosFiltrados.length > 0 ? (
                  ingresosFiltrados.sort((a,b) => new Date(b.fechaIngreso).getTime() - new Date(a.fechaIngreso).getTime()).map(ingreso => (
                    <TableRow key={ingreso.id}>
                      <TableCell className="whitespace-nowrap">{ingreso.fechaIngreso}</TableCell>
                      <TableCell>
                        <div className="font-medium">{ingreso.nombre}</div>
                        <div className="text-xs text-muted-foreground">{ingreso.rut}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{ingreso.cargo}</div>
                        <div className="text-xs text-muted-foreground">{ingreso.empresa}</div>
                      </TableCell>
                      <TableCell className="text-center font-medium">{countDocsOk(ingreso)}/6</TableCell>
                      <TableCell><EstadoBadge estado={ingreso.estadoIngreso} /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No hay trabajadores registrados para esta obra y tipo de empresa.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
