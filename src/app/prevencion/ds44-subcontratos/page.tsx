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

// --- Tipos ---
type Obra = {
  id: string;
  nombreFaena: string;
};

type EstadoIngreso = "Pendiente" | "Aprobado" | "Rechazado";

type IngresoEmpresa = {
  id: string;
  obraId: string;
  fechaIngreso: string;
  razonSocial: string;
  rutEmpresa: string;
  representante: string;
  mutualidad: string;
  tipoTrabajo: string;
  cantidadTrabajadores: number;
  docContratoOC: boolean;
  docMutualAlDia: boolean;
  docListadoPersonal: boolean;
  docInduccionRealizada: boolean;
  docReglamentoFirmado: boolean;
  docMatrizRiesgos: boolean;
  estadoIngreso: EstadoIngreso;
  observaciones: string;
};

const ESTADOS_INGRESO: EstadoIngreso[] = ["Pendiente", "Aprobado", "Rechazado"];

// --- Datos Simulados ---
const OBRAS_SIMULADAS: Obra[] = [
  { id: '1', nombreFaena: 'Edificio Central' },
  { id: '2', nombreFaena: 'Condominio El Roble' },
  { id: '3', nombreFaena: 'Remodelación Oficinas Corp' },
];

const INGRESOS_INICIALES: IngresoEmpresa[] = [
  {
    id: 'ing1',
    obraId: '1',
    fechaIngreso: '2025-11-10',
    razonSocial: 'Movimientos de Tierra del Sur Ltda.',
    rutEmpresa: '77.890.123-K',
    representante: 'Pedro Pascal',
    mutualidad: 'Mutual CChC',
    tipoTrabajo: 'Excavaciones',
    cantidadTrabajadores: 10,
    docContratoOC: true,
    docMutualAlDia: true,
    docListadoPersonal: true,
    docInduccionRealizada: false,
    docReglamentoFirmado: true,
    docMatrizRiesgos: false,
    estadoIngreso: 'Pendiente',
    observaciones: 'Falta ODI y Matriz de Riesgos para aprobar ingreso.',
  },
];

// --- Componentes Auxiliares ---
function EstadoBadge({ estado }: { estado: EstadoIngreso }) {
  const className = {
    "Aprobado": "bg-green-100 text-green-800 border-green-200",
    "Pendiente": "bg-yellow-100 text-yellow-800 border-yellow-200",
    "Rechazado": "bg-red-100 text-red-800 border-red-200",
  }[estado];
  return <Badge variant="outline" className={cn("font-semibold", className)}>{estado}</Badge>;
}

// --- Componente Principal ---
export default function IngresoEmpresaSubcontratistaPage() {
  const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>(OBRAS_SIMULADAS[0]?.id ?? "");
  const [ingresos, setIngresos] = useState<IngresoEmpresa[]>(INGRESOS_INICIALES);

  // Estados del formulario
  const [razonSocial, setRazonSocial] = useState('');
  const [rutEmpresa, setRutEmpresa] = useState('');
  const [representante, setRepresentante] = useState('');
  const [mutualidad, setMutualidad] = useState('');
  const [tipoTrabajo, setTipoTrabajo] = useState('');
  const [cantidadTrabajadores, setCantidadTrabajadores] = useState('');
  const [fechaIngreso, setFechaIngreso] = useState(new Date().toISOString().split('T')[0]);
  const [estadoIngreso, setEstadoIngreso] = useState<EstadoIngreso>('Pendiente');
  const [observaciones, setObservaciones] = useState('');

  const [docContratoOC, setDocContratoOC] = useState(false);
  const [docMutualAlDia, setDocMutualAlDia] = useState(false);
  const [docListadoPersonal, setDocListadoPersonal] = useState(false);
  const [docInduccionRealizada, setDocInduccionRealizada] = useState(false);
  const [docReglamentoFirmado, setDocReglamentoFirmado] = useState(false);
  const [docMatrizRiesgos, setDocMatrizRiesgos] = useState(false);
  
  const [error, setError] = useState('');

  const ingresosFiltrados = useMemo(() => 
    ingresos.filter((i) => i.obraId === obraSeleccionadaId),
    [ingresos, obraSeleccionadaId]
  );
  
  const resetForm = () => {
    setRazonSocial('');
    setRutEmpresa('');
    setRepresentante('');
    setMutualidad('');
    setTipoTrabajo('');
    setCantidadTrabajadores('');
    setFechaIngreso(new Date().toISOString().split('T')[0]);
    setEstadoIngreso('Pendiente');
    setObservaciones('');
    setDocContratoOC(false);
    setDocMutualAlDia(false);
    setDocListadoPersonal(false);
    setDocInduccionRealizada(false);
    setDocReglamentoFirmado(false);
    setDocMatrizRiesgos(false);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!obraSeleccionadaId || !razonSocial || !rutEmpresa || !mutualidad || !tipoTrabajo || !fechaIngreso || !estadoIngreso) {
      setError('Faltan datos clave de la empresa. Por favor, complete todos los campos requeridos.');
      return;
    }
    setError('');

    const nuevoIngreso: IngresoEmpresa = {
      id: `ing-${Date.now()}`,
      obraId: obraSeleccionadaId,
      fechaIngreso,
      razonSocial,
      rutEmpresa,
      representante,
      mutualidad,
      tipoTrabajo,
      cantidadTrabajadores: Number(cantidadTrabajadores) || 0,
      docContratoOC,
      docMutualAlDia,
      docListadoPersonal,
      docInduccionRealizada,
      docReglamentoFirmado,
      docMatrizRiesgos,
      estadoIngreso,
      observaciones,
    };

    setIngresos((prev) => [nuevoIngreso, ...prev]);
    resetForm();
  };
  
  const countDocsOk = (ingreso: IngresoEmpresa) => {
    let count = 0;
    if (ingreso.docContratoOC) count++;
    if (ingreso.docMutualAlDia) count++;
    if (ingreso.docListadoPersonal) count++;
    if (ingreso.docInduccionRealizada) count++;
    if (ingreso.docReglamentoFirmado) count++;
    if (ingreso.docMatrizRiesgos) count++;
    return count;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-headline tracking-tight">Ingreso empresa subcontratista – DS44</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Este formulario guía al prevencionista en los requisitos de ingreso a obra según DS44. Los datos son simulados.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Obra a Evaluar</CardTitle></CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-2">
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
        </CardContent>
      </Card>
      
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Formulario de Ingreso de Empresa</CardTitle>
            <CardDescription>Complete los datos de la empresa y el checklist de requisitos documentales y de gestión.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">1. Datos de la Empresa y del Trabajo</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2"><Label htmlFor="razonSocial">Razón Social*</Label><Input id="razonSocial" value={razonSocial} onChange={e => setRazonSocial(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="rutEmpresa">RUT Empresa*</Label><Input id="rutEmpresa" value={rutEmpresa} onChange={e => setRutEmpresa(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="representante">Representante Legal</Label><Input id="representante" value={representante} onChange={e => setRepresentante(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="mutualidad">Mutualidad*</Label><Input id="mutualidad" value={mutualidad} onChange={e => setMutualidad(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="tipoTrabajo">Tipo de Trabajo*</Label><Input id="tipoTrabajo" value={tipoTrabajo} onChange={e => setTipoTrabajo(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="cantidadTrabajadores">Nº aprox. de trabajadores</Label><Input id="cantidadTrabajadores" type="number" value={cantidadTrabajadores} onChange={e => setCantidadTrabajadores(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="fechaIngreso">Fecha de Ingreso*</Label><Input id="fechaIngreso" type="date" value={fechaIngreso} onChange={e => setFechaIngreso(e.target.value)} /></div>
              </div>
            </div>

            <Separator />
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">2. Checklist de Requisitos DS44</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <div className="flex items-center space-x-2"><Checkbox id="docContratoOC" checked={docContratoOC} onCheckedChange={c => setDocContratoOC(!!c)} /><Label htmlFor="docContratoOC">Contrato u orden de compra vigente</Label></div>
                <div className="flex items-center space-x-2"><Checkbox id="docMutualAlDia" checked={docMutualAlDia} onCheckedChange={c => setDocMutualAlDia(!!c)} /><Label htmlFor="docMutualAlDia">Afiliación a mutual y cotizaciones al día</Label></div>
                <div className="flex items-center space-x-2"><Checkbox id="docListadoPersonal" checked={docListadoPersonal} onCheckedChange={c => setDocListadoPersonal(!!c)} /><Label htmlFor="docListadoPersonal">Listado de personal que ingresará a la obra</Label></div>
                <div className="flex items-center space-x-2"><Checkbox id="docInduccionRealizada" checked={docInduccionRealizada} onCheckedChange={c => setDocInduccionRealizada(!!c)} /><Label htmlFor="docInduccionRealizada">Inducción de seguridad realizada / programada</Label></div>
                <div className="flex items-center space-x-2"><Checkbox id="docReglamentoFirmado" checked={docReglamentoFirmado} onCheckedChange={c => setDocReglamentoFirmado(!!c)} /><Label htmlFor="docReglamentoFirmado">Reglamento interno / especial entregado y firmado</Label></div>
                <div className="flex items-center space-x-2"><Checkbox id="docMatrizRiesgos" checked={docMatrizRiesgos} onCheckedChange={c => setDocMatrizRiesgos(!!c)} /><Label htmlFor="docMatrizRiesgos">Matriz de riesgos / análisis de trabajo entregado</Label></div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">3. Evaluación y Registro</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="estadoIngreso">Estado de Ingreso*</Label>
                  <Select value={estadoIngreso} onValueChange={(v) => setEstadoIngreso(v as EstadoIngreso)}>
                    <SelectTrigger id="estadoIngreso"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ESTADOS_INGRESO.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <Textarea id="observaciones" value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Ej: Falta documento de cotizaciones de mutualidad. Se rechaza ingreso hasta regularizar." />
                </div>
              </div>
            </div>

            {error && <p className="text-sm font-medium text-destructive mt-4">{error}</p>}
            
            <Button type="submit" className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90">Registrar Ingreso de Empresa</Button>
          </CardContent>
        </Card>
      </form>
      
      <Card>
        <CardHeader>
          <CardTitle>Historial de Ingresos Registrados</CardTitle>
          <CardDescription>Empresas evaluadas para la obra "{OBRAS_SIMULADAS.find(o => o.id === obraSeleccionadaId)?.nombreFaena}".</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha Ingreso</TableHead>
                  <TableHead>Razón Social / RUT</TableHead>
                  <TableHead>Mutualidad</TableHead>
                  <TableHead>Trabajo</TableHead>
                  <TableHead className="text-center">Nº Trab.</TableHead>
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
                        <div className="font-medium">{ingreso.razonSocial}</div>
                        <div className="text-xs text-muted-foreground">{ingreso.rutEmpresa}</div>
                      </TableCell>
                      <TableCell>{ingreso.mutualidad}</TableCell>
                      <TableCell>{ingreso.tipoTrabajo}</TableCell>
                      <TableCell className="text-center">{ingreso.cantidadTrabajadores}</TableCell>
                      <TableCell className="text-center font-medium">{countDocsOk(ingreso)}/6</TableCell>
                      <TableCell><EstadoBadge estado={ingreso.estadoIngreso} /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No hay ingresos de empresas registrados para esta obra.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
