"use client";

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

// --- Tipos ---
type Obra = {
  id: string;
  nombreFaena: string;
};

type TipoEmpresa = "Mandante" | "Contratista" | "Subcontratista";

type Empresa = {
  id: string;
  nombre: string;
  rut: string;
  tipo: TipoEmpresa;
};

type EstadoItem = "Cumple" | "No cumple" | "No aplica";
const ESTADOS_ITEM: EstadoItem[] = ["Cumple", "No cumple", "No aplica"];

type ItemControl = {
  id: string;
  nombre: string;
  categoria: string;
};

type RegistroEmpresaDS44 = {
  id: string;
  obraId: string;
  empresaId: string;
  itemId: string;
  fecha: string;
  estado: EstadoItem;
  observaciones: string;
};

// --- Datos Simulados ---
const OBRAS_SIMULADAS: Obra[] = [
  { id: '1', nombreFaena: 'Edificio Central' },
  { id: '2', nombreFaena: 'Condominio El Roble' },
  { id: '3', nombreFaena: 'Remodelación Oficinas Corp' },
];

const EMPRESAS_SIMULADAS: Empresa[] = [
  { id: 'emp1', nombre: 'Constructora Principal S.A.', rut: '76.123.456-7', tipo: 'Mandante' },
  { id: 'emp2', nombre: 'Movimientos de Tierra del Sur Ltda.', rut: '77.890.123-K', tipo: 'Contratista' },
  { id: 'emp3', nombre: 'Instalaciones Eléctricas SEG SpA', rut: '78.456.789-1', tipo: 'Subcontratista' },
  { id: 'emp4', nombre: 'Estructuras Metálicas AceroForte', rut: '79.111.222-3', tipo: 'Contratista' },
];

const ITEMS_CONTROL: ItemControl[] = [
  { id: 'ic1', nombre: 'Afiliación a mutual al día', categoria: 'Documental' },
  { id: 'ic2', nombre: 'Contrato u orden de compra vigente', categoria: 'Documental' },
  { id: 'ic3', nombre: 'Listado de personal autorizado entregado', categoria: 'Ingreso a obra' },
  { id: 'ic4', nombre: 'Inducción de seguridad (ODI) realizada', categoria: 'Ingreso a obra' },
  { id: 'ic5', nombre: 'Reglamento interno / especial entregado y firmado', categoria: 'Documental' },
];

const REGISTROS_INICIALES: RegistroEmpresaDS44[] = [
  { id: 're1', obraId: '1', empresaId: 'emp2', itemId: 'ic1', fecha: '2025-11-01', estado: 'Cumple', observaciones: 'Se presenta certificado de afiliación vigente.' },
  { id: 're2', obraId: '1', empresaId: 'emp2', itemId: 'ic2', fecha: '2025-11-01', estado: 'Cumple', observaciones: '' },
  { id: 're3', obraId: '1', empresaId: 'emp3', itemId: 'ic1', fecha: '2025-11-02', estado: 'No cumple', observaciones: 'Certificado de mutualidad vencido. Se solicita regularizar.' },
  { id: 're4', obraId: '2', empresaId: 'emp4', itemId: 'ic3', fecha: '2025-11-05', estado: 'Cumple', observaciones: 'Nómina de 5 trabajadores entregada.' },
  { id: 're5', obraId: '1', empresaId: 'emp1', itemId: 'ic4', fecha: '2025-11-06', estado: 'Cumple', observaciones: 'ODI realizada a personal propio.' },
];

// --- Componentes de Badge ---
function EstadoBadge({ estado }: { estado: EstadoItem }) {
  const className = {
    "Cumple": "bg-green-100 text-green-800 border-green-200",
    "No cumple": "bg-red-100 text-red-800 border-red-200",
    "No aplica": "bg-gray-100 text-gray-800 border-gray-200",
  }[estado];
  return <Badge variant="outline" className={cn("font-semibold whitespace-nowrap", className)}>{estado}</Badge>;
}

function ResumenBadge({ noCumple, total }: { noCumple: number, total: number }) {
    if (total === 0) {
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">Sin registros</Badge>;
    }
    if (noCumple > 0) {
        return <Badge variant="destructive">Alerta</Badge>;
    }
    return <Badge className="bg-green-600 hover:bg-green-700 text-white border-green-700">Cumple</Badge>;
}


// --- Componente Principal ---
export default function DS44SubcontratosPage() {
  const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>(OBRAS_SIMULADAS[0]?.id ?? "");
  const [registros, setRegistros] = useState<RegistroEmpresaDS44[]>(REGISTROS_INICIALES);

  // Form state
  const [empresaId, setEmpresaId] = useState('');
  const [itemId, setItemId] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [estado, setEstado] = useState<EstadoItem>('Cumple');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState('');

  const getEmpresa = (id: string) => EMPRESAS_SIMULADAS.find((e) => e.id === id);
  const getItem = (id: string) => ITEMS_CONTROL.find((i) => i.id === id);

  const registrosFiltrados = useMemo(() =>
    registros.filter((r) => r.obraId === obraSeleccionadaId),
    [registros, obraSeleccionadaId]
  );
  
  const resumenPorEmpresa = useMemo(() => {
    return EMPRESAS_SIMULADAS.map(empresa => {
      const registrosEmpresa = registrosFiltrados.filter(r => r.empresaId === empresa.id);
      const total = registrosEmpresa.length;
      const cumple = registrosEmpresa.filter(r => r.estado === 'Cumple').length;
      const noCumple = registrosEmpresa.filter(r => r.estado === 'No cumple').length;
      const noAplica = registrosEmpresa.filter(r => r.estado === 'No aplica').length;
      return { ...empresa, total, cumple, noCumple, noAplica };
    });
  }, [registrosFiltrados]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId || !itemId || !fecha || !estado) {
      setError('Empresa, ítem, fecha y estado son obligatorios.');
      return;
    }
    setError('');

    const nuevoRegistro: RegistroEmpresaDS44 = {
      id: `re-${Date.now()}`,
      obraId: obraSeleccionadaId,
      empresaId,
      itemId,
      fecha,
      estado,
      observaciones,
    };
    
    setRegistros(prev => [nuevoRegistro, ...prev]);

    // Reset form
    setEmpresaId('');
    setItemId('');
    setEstado('Cumple');
    setObservaciones('');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-headline tracking-tight">DS44 – Contratistas y Subcontratos</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Controle el cumplimiento DS44 por empresa en una obra, incluyendo al mandante como empleador. Los datos son simulados.
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Selector de Obra</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-2">
            <Label htmlFor="obra-select">Obra seleccionada</Label>
            <Select value={obraSeleccionadaId} onValueChange={setObraSeleccionadaId}>
              <SelectTrigger id="obra-select">
                <SelectValue placeholder="Seleccione una obra" />
              </SelectTrigger>
              <SelectContent>
                {OBRAS_SIMULADAS.map((obra) => (
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
          <CardTitle>Resumen de Cumplimiento por Empresa en Obra</CardTitle>
          <CardDescription>
            Estado general de las empresas en "{OBRAS_SIMULADAS.find(o => o.id === obraSeleccionadaId)?.nombreFaena}".
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Estado General</TableHead>
                <TableHead className="text-center">Cumple</TableHead>
                <TableHead className="text-center">No Cumple</TableHead>
                <TableHead className="text-center">No Aplica</TableHead>
                <TableHead className="text-center">Total Ítems</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resumenPorEmpresa.map(emp => (
                <TableRow key={emp.id}>
                  <TableCell>
                    <div className="font-medium">{emp.nombre}</div>
                    <div className="text-xs text-muted-foreground">{emp.rut} ({emp.tipo})</div>
                  </TableCell>
                  <TableCell><ResumenBadge noCumple={emp.noCumple} total={emp.total} /></TableCell>
                  <TableCell className="text-center">{emp.cumple}</TableCell>
                  <TableCell className="text-center font-bold">{emp.noCumple}</TableCell>
                  <TableCell className="text-center">{emp.noAplica}</TableCell>
                  <TableCell className="text-center font-medium">{emp.total}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Registrar Control DS44 por Empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="empresa-select">Empresa</Label>
                <Select value={empresaId} onValueChange={setEmpresaId}>
                  <SelectTrigger id="empresa-select"><SelectValue placeholder="Seleccione empresa..." /></SelectTrigger>
                  <SelectContent>{EMPRESAS_SIMULADAS.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre} — {e.tipo}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="item-select">Ítem de Control DS44</Label>
                <Select value={itemId} onValueChange={setItemId}>
                  <SelectTrigger id="item-select"><SelectValue placeholder="Seleccione ítem a verificar..." /></SelectTrigger>
                  <SelectContent>{ITEMS_CONTROL.map(i => <SelectItem key={i.id} value={i.id}>{i.categoria} — {i.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha-registro">Fecha de Registro</Label>
                <Input id="fecha-registro" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado-select">Estado</Label>
                <Select value={estado} onValueChange={v => setEstado(v as EstadoItem)}>
                  <SelectTrigger id="estado-select"><SelectValue /></SelectTrigger>
                  <SelectContent>{ESTADOS_ITEM.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2 lg:col-span-3">
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea id="observaciones" value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Ej: Se solicita regularizar a la brevedad." />
              </div>
            </div>
            {error && <p className="text-sm font-medium text-destructive mt-2">{error}</p>}
            <Button type="submit" className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90">Registrar Control DS44</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Controles por Empresa</CardTitle>
          <CardDescription>Registros de cumplimiento para "{OBRAS_SIMULADAS.find(o => o.id === obraSeleccionadaId)?.nombreFaena}".</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Ítem de Control</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Observaciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrosFiltrados.length > 0 ? (
                  registrosFiltrados.sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).map(registro => {
                    const empresa = getEmpresa(registro.empresaId);
                    const item = getItem(registro.itemId);
                    if (!empresa || !item) return null;
                    return (
                      <TableRow key={registro.id}>
                        <TableCell className="whitespace-nowrap">{registro.fecha}</TableCell>
                        <TableCell>
                          <div className="font-medium">{empresa.nombre}</div>
                          <div className="text-xs text-muted-foreground">{empresa.tipo}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{item.nombre}</div>
                          <div className="text-xs text-muted-foreground">{item.categoria}</div>
                        </TableCell>
                        <TableCell><EstadoBadge estado={registro.estado} /></TableCell>
                        <TableCell className="max-w-xs truncate">{registro.observaciones || "-"}</TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No hay controles DS44 registrados para esta obra.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
