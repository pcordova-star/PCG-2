"use client";

import React, { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


type Obra = {
  id: string;
  nombreFaena: string;
};

type EstadoActividad = "Pendiente" | "En curso" | "Completada";

const ESTADOS_ACTIVIDAD: EstadoActividad[] = ["Pendiente", "En curso", "Completada"];


type ActividadProgramada = {
  id: string;
  obraId: string;
  nombreActividad: string;
  fechaInicio: string;
  fechaFin: string;
  responsable: string;
  estado: EstadoActividad;
};

const OBRAS_SIMULADAS: Obra[] = [
  { id: '1', nombreFaena: 'Edificio Central' },
  { id: '2', nombreFaena: 'Condominio El Roble' },
  { id: '3', nombreFaena: 'Remodelación Oficinas Corp' },
];

const ACTIVIDADES_SIMULADAS: ActividadProgramada[] = [
  { id: 'a1', obraId: '1', nombreActividad: 'Fundaciones', fechaInicio: '2025-11-01', fechaFin: '2025-11-15', responsable: 'Juan Pérez', estado: 'Completada' },
  { id: 'a2', obraId: '1', nombreActividad: 'Obra gruesa primer piso', fechaInicio: '2025-11-16', fechaFin: '2025-12-10', responsable: 'Juan Pérez', estado: 'En curso' },
  { id: 'a3', obraId: '1', nombreActividad: 'Instalaciones eléctricas', fechaInicio: '2025-12-11', fechaFin: '2025-12-20', responsable: 'Ana Gómez', estado: 'Pendiente' },
  { id: 'a4', obraId: '2', nombreActividad: 'Cierre perimetral', fechaInicio: '2025-10-20', fechaFin: '2025-10-30', responsable: 'Carlos Soto', estado: 'Completada' },
  { id: 'a5', obraId: '2', nombreActividad: 'Movimiento de tierras', fechaInicio: '2025-11-01', fechaFin: '2025-11-10', responsable: 'Carlos Soto', estado: 'En curso' },
  { id: 'a6', obraId: '3', nombreActividad: 'Demoliciones', fechaInicio: '2025-12-01', fechaFin: '2025-12-05', responsable: 'Luis Marín', estado: 'Pendiente' },
];

function EstadoBadge({ estado }: { estado: EstadoActividad }) {
  const variant: "default" | "secondary" | "outline" = {
    "Completada": "default",
    "En curso": "secondary",
    "Pendiente": "outline",
  }[estado];
  
  const className = {
    "Completada": "bg-green-100 text-green-800 border-green-200",
    "En curso": "bg-blue-100 text-blue-800 border-blue-200",
    "Pendiente": "bg-yellow-100 text-yellow-800 border-yellow-200",
  }[estado];
  
  return <Badge variant={variant} className={cn("font-semibold whitespace-nowrap", className)}>{estado}</Badge>;
}

export default function ProgramacionPage() {
  const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>(OBRAS_SIMULADAS[0].id);
  const [actividades, setActividades] = useState<ActividadProgramada[]>(ACTIVIDADES_SIMULADAS);

  // Form state
  const [nombreActividad, setNombreActividad] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [responsable, setResponsable] = useState('');
  const [estado, setEstado] = useState<EstadoActividad>('Pendiente');
  const [error, setError] = useState('');


  const actividadesFiltradas = actividades.filter(
    (act) => act.obraId === obraSeleccionadaId
  );
  
  const resumenActividades = useMemo(() => {
    const total = actividadesFiltradas.length;
    const pendientes = actividadesFiltradas.filter(a => a.estado === "Pendiente").length;
    const enCurso = actividadesFiltradas.filter(a => a.estado === "En curso").length;
    const completadas = actividadesFiltradas.filter(a => a.estado === "Completada").length;
    return { total, pendientes, enCurso, completadas };
  }, [actividadesFiltradas]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreActividad || !fechaInicio || !fechaFin || !responsable) {
      setError('Todos los campos del formulario son obligatorios.');
      return;
    }

    if (new Date(fechaFin) < new Date(fechaInicio)) {
      setError('La fecha de fin no puede ser anterior a la fecha de inicio.');
      return;
    }

    setError('');
    
    const nuevaActividad: ActividadProgramada = {
      id: Date.now().toString(),
      obraId: obraSeleccionadaId,
      nombreActividad,
      fechaInicio,
      fechaFin,
      responsable,
      estado
    };
    
    setActividades(prev => [...prev, nuevaActividad]);
    
    // Reset form
    setNombreActividad('');
    setFechaInicio('');
    setFechaFin('');
    setResponsable('');
    setEstado('Pendiente');
  };

  const handleEstadoChange = (id: string, nuevoEstado: EstadoActividad) => {
    setActividades((prev) =>
      prev.map((act) =>
        act.id === id ? { ...act, estado: nuevoEstado } : act
      )
    );
  };

  const handleEliminar = (id: string) => {
    setActividades((prev) => prev.filter((act) => act.id !== id));
  };


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-headline tracking-tight">Programación de Obras - PCG 2.0</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Seleccione una obra para ver y gestionar sus actividades programadas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selector de Obra</CardTitle>
          <CardDescription>Filtre las actividades por obra.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-2">
            <Label htmlFor="obra-select">Seleccione una obra</Label>
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
            <CardTitle>Resumen de Actividades</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-2">
                <span className="font-medium text-foreground">Total: {resumenActividades.total}</span>
                <span className="hidden sm:inline">·</span>
                <span>Pendientes: {resumenActividades.pendientes}</span>
                <span className="hidden sm:inline">·</span>
                <span>En curso: {resumenActividades.enCurso}</span>
                <span className="hidden sm:inline">·</span>
                <span>Completadas: {resumenActividades.completadas}</span>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agregar Nueva Actividad</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="nombreActividad">Nombre de la actividad</Label>
                <Input id="nombreActividad" value={nombreActividad} onChange={e => setNombreActividad(e.target.value)} placeholder="Ej: Instalación de faenas" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="responsable">Responsable</Label>
                <Input id="responsable" value={responsable} onChange={e => setResponsable(e.target.value)} placeholder="Ej: Ana Gómez" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fechaInicio">Fecha de inicio</Label>
                <Input id="fechaInicio" type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fechaFin">Fecha de término</Label>
                <Input id="fechaFin" type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado-select">Estado inicial</Label>
                 <Select value={estado} onValueChange={(v) => setEstado(v as EstadoActividad)}>
                  <SelectTrigger id="estado-select">
                    <SelectValue placeholder="Seleccione un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_ACTIVIDAD.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
             {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <Button type="submit" className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90">
              Agregar Actividad
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Actividades Programadas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Actividad</TableHead>
                        <TableHead>Inicio</TableHead>
                        <TableHead>Fin</TableHead>
                        <TableHead>Responsable</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {actividadesFiltradas.length > 0 ? (
                        actividadesFiltradas.map((actividad) => (
                        <TableRow key={actividad.id}>
                            <TableCell className="font-medium">{actividad.nombreActividad}</TableCell>
                            <TableCell>{actividad.fechaInicio}</TableCell>
                            <TableCell>{actividad.fechaFin}</TableCell>
                            <TableCell>{actividad.responsable}</TableCell>
                            <TableCell>
                                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                    <EstadoBadge estado={actividad.estado} />
                                    <Select 
                                        value={actividad.estado}
                                        onValueChange={(value) => handleEstadoChange(actividad.id, value as EstadoActividad)}
                                    >
                                        <SelectTrigger className="text-xs h-8 w-full md:w-[120px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ESTADOS_ACTIVIDAD.map(e => (
                                                <SelectItem key={e} value={e} className="text-xs">{e}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                               <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Eliminar</span>
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>¿Está seguro que desea eliminar esta actividad?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción no se puede deshacer. La actividad "{actividad.nombreActividad}" se eliminará permanentemente.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={() => handleEliminar(actividad.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                        Eliminar
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No hay actividades programadas para esta obra.
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
