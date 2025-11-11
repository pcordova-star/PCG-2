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

// --- Tipos ---
type Obra = {
  id: string;
  nombreFaena: string;
};

type EstadoCumplimiento = "Cumple" | "No cumple" | "No aplica";

const ESTADOS_CUMPLIMIENTO: EstadoCumplimiento[] = ["Cumple", "No cumple", "No aplica"];

type ItemDS44 = {
  id: string;
  codigo: string;
  descripcion: string;
  categoria: string;
};

type RegistroCumplimiento = {
  id: string;
  obraId: string;
  itemId: string;
  fecha: string;
  estado: EstadoCumplimiento;
  responsable: string;
  observaciones: string;
};

// --- Datos Simulados ---
const OBRAS_SIMULADAS: Obra[] = [
  { id: '1', nombreFaena: 'Edificio Central' },
  { id: '2', nombreFaena: 'Condominio El Roble' },
  { id: '3', nombreFaena: 'Remodelación Oficinas Corp' },
];

const ITEMS_DS44: ItemDS44[] = [
  { id: 'ds44-1', codigo: 'Art. 5', categoria: 'Excavaciones', descripcion: 'Protección de excavaciones y taludes contra derrumbes.' },
  { id: 'ds44-2', codigo: 'Art. 12', categoria: 'Trabajo en Altura', descripcion: 'Barandas y protecciones en aberturas y desniveles.' },
  { id: 'ds44-3', codigo: 'Art. 21', categoria: 'Señalización', descripcion: 'Señalización adecuada y acceso restringido a áreas de riesgo.' },
  { id: 'ds44-4', codigo: 'Art. 33', categoria: 'Condiciones Ambientales', descripcion: 'Iluminación adecuada en la zona de trabajo.' },
  { id: 'ds44-5', codigo: 'Art. 45', categoria: 'Orden y Aseo', descripcion: 'Orden y aseo en el área de la faena, incluyendo excavaciones.' },
  { id: 'ds44-6', codigo: 'Art. 60', categoria: 'EPP', descripcion: 'Uso obligatorio y correcto de Elementos de Protección Personal.' },
];

const REGISTROS_INICIALES: RegistroCumplimiento[] = [
  { id: 'reg1', obraId: '1', itemId: 'ds44-1', fecha: '2025-11-10', estado: 'Cumple', responsable: 'Luisa Marín', observaciones: 'Se verifican entibaciones y rodapiés en zanjas.' },
  { id: 'reg2', obraId: '1', itemId: 'ds44-2', fecha: '2025-11-10', estado: 'No cumple', responsable: 'Luisa Marín', observaciones: 'Faltan barandas en sector poniente del segundo piso. Se detiene el trabajo en el área.' },
  { id: 'reg3', obraId: '2', itemId: 'ds44-3', fecha: '2025-11-12', estado: 'Cumple', responsable: 'Pedro Rojas', observaciones: 'Señalética de "solo personal autorizado" instalada en acceso a faena.' },
  { id: 'reg4', obraId: '1', itemId: 'ds44-2', fecha: '2025-11-11', estado: 'Cumple', responsable: 'Luisa Marín', observaciones: 'Se instalan barandas faltantes y se libera el área.' },
];

// --- Componente Badge de Estado ---
function EstadoBadge({ estado }: { estado: EstadoCumplimiento }) {
  const className = {
    "Cumple": "bg-green-100 text-green-800 border-green-200",
    "No cumple": "bg-red-100 text-red-800 border-red-200",
    "No aplica": "bg-gray-100 text-gray-800 border-gray-200",
  }[estado];
  
  return <Badge variant="outline" className={cn("font-semibold whitespace-nowrap", className)}>{estado}</Badge>;
}

// --- Componente Principal ---
export default function DS44Page() {
  const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>(OBRAS_SIMULADAS[0]?.id ?? "");
  const [registros, setRegistros] = useState<RegistroCumplimiento[]>(REGISTROS_INICIALES);

  // Form state
  const [itemId, setItemId] = useState('');
  const [fecha, setFecha] = useState('');
  const [estado, setEstado] = useState<EstadoCumplimiento>('Cumple');
  const [responsable, setResponsable] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState('');

  const registrosFiltrados = useMemo(() =>
    registros
      .filter((r) => r.obraId === obraSeleccionadaId)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
    [registros, obraSeleccionadaId]
  );
  
  const resumenRegistros = useMemo(() => {
    const total = registrosFiltrados.length;
    const cumple = registrosFiltrados.filter(r => r.estado === 'Cumple').length;
    const noCumple = registrosFiltrados.filter(r => r.estado === 'No cumple').length;
    const noAplica = registrosFiltrados.filter(r => r.estado === 'No aplica').length;
    return { total, cumple, noCumple, noAplica };
  }, [registrosFiltrados]);

  const getItem = (id: string) => ITEMS_DS44.find((item) => item.id === id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemId || !fecha || !estado || !responsable) {
      setError('Ítem, fecha, estado y responsable son campos obligatorios.');
      return;
    }
    setError('');

    const nuevoRegistro: RegistroCumplimiento = {
      id: `reg-${Date.now()}`,
      obraId: obraSeleccionadaId,
      itemId,
      fecha,
      estado,
      responsable,
      observaciones,
    };
    
    setRegistros(prev => [nuevoRegistro, ...prev]);

    // Reset form
    setItemId('');
    setFecha('');
    setEstado('Cumple');
    setResponsable('');
    setObservaciones('');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-headline tracking-tight">DS44 – Cumplimiento en Obra</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Registro y control de ítems del DS44 por obra. Los datos son simulados y se reinician al recargar.
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
        <CardHeader><CardTitle>Resumen de Cumplimiento en Obra</CardTitle></CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-2">
            <span className="font-medium text-foreground">Total Registros: {resumenRegistros.total}</span>
            <span className="hidden sm:inline">·</span>
            <span>Cumple: {resumenRegistros.cumple}</span>
            <span className="hidden sm:inline">·</span>
            <span>No cumple: {resumenRegistros.noCumple}</span>
             <span className="hidden sm:inline">·</span>
            <span>No aplica: {resumenRegistros.noAplica}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registrar Cumplimiento</CardTitle>
          <CardDescription>Seleccione un ítem del DS44 y registre su estado de cumplimiento para la obra actual.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2 lg:col-span-3">
                <Label htmlFor="item-select">Ítem DS44</Label>
                <Select value={itemId} onValueChange={setItemId}>
                  <SelectTrigger id="item-select">
                    <SelectValue placeholder="Seleccione un ítem a verificar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEMS_DS44.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.codigo} - {item.categoria} - {item.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha-registro">Fecha de Registro</Label>
                <Input id="fecha-registro" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado-select">Estado de Cumplimiento</Label>
                <Select value={estado} onValueChange={v => setEstado(v as EstadoCumplimiento)}>
                  <SelectTrigger id="estado-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_CUMPLIMIENTO.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
               <div className="space-y-2">
                <Label htmlFor="responsable">Responsable</Label>
                <Input id="responsable" value={responsable} onChange={e => setResponsable(e.target.value)} placeholder="Ej: J. Pérez (Prevencionista)" />
              </div>
              <div className="space-y-2 lg:col-span-3">
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea id="observaciones" value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Describa hallazgos, acciones correctivas o detalles relevantes." />
              </div>
            </div>
            {error && <p className="text-sm font-medium text-destructive mt-2">{error}</p>}
            <Button type="submit" className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90">
              Registrar Cumplimiento
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Registros</CardTitle>
          <CardDescription>Registros de cumplimiento para "{OBRAS_SIMULADAS.find(o => o.id === obraSeleccionadaId)?.nombreFaena}".</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Ítem</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Observaciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrosFiltrados.length > 0 ? (
                  registrosFiltrados.map(registro => {
                    const item = getItem(registro.itemId);
                    if (!item) return null;
                    
                    return (
                      <TableRow key={registro.id}>
                        <TableCell className="whitespace-nowrap">{registro.fecha}</TableCell>
                        <TableCell className="font-medium">
                          <div>{item.codigo}</div>
                          <div className="text-xs text-muted-foreground">{item.categoria}</div>
                        </TableCell>
                        <TableCell>{item.descripcion}</TableCell>
                        <TableCell><EstadoBadge estado={registro.estado} /></TableCell>
                        <TableCell>{registro.responsable}</TableCell>
                        <TableCell className="max-w-xs truncate">{registro.observaciones}</TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No hay registros de cumplimiento DS44 para esta obra.
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
