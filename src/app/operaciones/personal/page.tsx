"use client";

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';

// --- Tipos ---
type Obra = {
  id: string;
  nombreFaena: string;
};

type Trabajador = {
  id: string;
  nombre: string;
  oficio: string;
};

type EstadoAsignacion = "Activo" | "Suspendido" | "Finalizado";

const ESTADOS_ASIGNACION: EstadoAsignacion[] = ["Activo", "Suspendido", "Finalizado"];

type Asignacion = {
  id: string;
  obraId: string;
  trabajadorId: string;
  rol: string;
  estado: EstadoAsignacion;
};

// --- Datos Simulados ---
const OBRAS_SIMULADAS: Obra[] = [
  { id: '1', nombreFaena: 'Edificio Central' },
  { id: '2', nombreFaena: 'Condominio El Roble' },
  { id: '3', nombreFaena: 'Remodelación Oficinas Corp' },
];

const TRABAJADORES_SIMULADOS: Trabajador[] = [
  { id: 't1', nombre: 'Juan Pérez', oficio: 'Maestro Carpintero' },
  { id: 't2', nombre: 'Ana Gómez', oficio: 'Jornal' },
  { id: 't3', nombre: 'Carlos Soto', oficio: 'Operador de Grúa' },
  { id: 't4', nombre: 'Luisa Marín', oficio: 'Prevencionista de Riesgos' },
  { id: 't5', nombre: 'Pedro Rojas', oficio: 'Electricista' },
  { id: 't6', nombre: 'Sofía Lara', oficio: 'Jefe de Obra' },
];

const ASIGNACIONES_INICIALES: Asignacion[] = [
  { id: 'as1', obraId: '1', trabajadorId: 't1', rol: 'Jefe de cuadrilla carpintería', estado: 'Activo' },
  { id: 'as2', obraId: '1', trabajadorId: 't2', rol: 'Apoyo general', estado: 'Activo' },
  { id: 'as3', obraId: '2', trabajadorId: 't3', rol: 'Operador principal', estado: 'Activo' },
  { id: 'as4', obraId: '2', trabajadorId: 't4', rol: 'Supervisión de seguridad semanal', estado: 'Suspendido' },
];

// --- Componente de Badge ---
function EstadoBadge({ estado }: { estado: EstadoAsignacion }) {
  const className = {
    "Activo": "bg-green-100 text-green-800 border-green-200",
    "Suspendido": "bg-yellow-100 text-yellow-800 border-yellow-200",
    "Finalizado": "bg-gray-100 text-gray-800 border-gray-200",
  }[estado];
  
  return <Badge variant="outline" className={cn("font-semibold whitespace-nowrap", className)}>{estado}</Badge>;
}

// --- Componente Principal ---
export default function PersonalPage() {
  const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>(OBRAS_SIMULADAS[0]?.id ?? "");
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>(ASIGNACIONES_INICIALES);

  // Form state
  const [trabajadorId, setTrabajadorId] = useState('');
  const [rol, setRol] = useState('');
  const [estado, setEstado] = useState<EstadoAsignacion>('Activo');
  const [error, setError] = useState('');

  const getTrabajador = (id: string) => TRABAJADORES_SIMULADOS.find((t) => t.id === id);

  const asignacionesFiltradas = useMemo(() => 
    asignaciones.filter((a) => a.obraId === obraSeleccionadaId),
    [asignaciones, obraSeleccionadaId]
  );
  
  const resumenAsignaciones = useMemo(() => {
    const total = asignacionesFiltradas.length;
    const activos = asignacionesFiltradas.filter(a => a.estado === "Activo").length;
    const suspendidos = asignacionesFiltradas.filter(a => a.estado === "Suspendido").length;
    const finalizados = asignacionesFiltradas.filter(a => a.estado === "Finalizado").length;
    return { total, activos, suspendidos, finalizados };
  }, [asignacionesFiltradas]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trabajadorId || !rol) {
      setError('Debe seleccionar un trabajador y definir un rol.');
      return;
    }
    
    // Evitar duplicados del mismo trabajador en la misma obra con estado vigente
    const yaExiste = asignaciones.some(a => 
      a.obraId === obraSeleccionadaId && 
      a.trabajadorId === trabajadorId && 
      a.estado !== "Finalizado"
    );
    if (yaExiste) {
      setError('Este trabajador ya está asignado a esta obra con un estado vigente.');
      return;
    }

    setError('');
    
    const nuevaAsignacion: Asignacion = {
      id: `asg-${Date.now()}`,
      obraId: obraSeleccionadaId,
      trabajadorId,
      rol,
      estado
    };
    
    setAsignaciones(prev => [...prev, nuevaAsignacion]);
    
    // Reset form
    setTrabajadorId('');
    setRol('');
    setEstado('Activo');
  };

  const handleEliminar = (id: string) => {
    setAsignaciones((prev) => prev.filter((a) => a.id !== id));
  };
  
  const handleEstadoChange = (id: string, nuevoEstado: EstadoAsignacion) => {
    setAsignaciones((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, estado: nuevoEstado } : a
      )
    );
  };
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-headline tracking-tight">Personal de Obra - PCG 2.0</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Asigne personal a una obra. Los datos son simulados y se reinician al recargar.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selector de Obra</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-2">
            <Label htmlFor="obra-select">Seleccione una obra para gestionar su personal</Label>
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
            <CardTitle>Resumen de Personal Asignado</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-2">
                <span className="font-medium text-foreground">Total: {resumenAsignaciones.total}</span>
                <span className="hidden sm:inline">·</span>
                <span>Activos: {resumenAsignaciones.activos}</span>
                <span className="hidden sm:inline">·</span>
                <span>Suspendidos: {resumenAsignaciones.suspendidos}</span>
                <span className="hidden sm:inline">·</span>
                <span>Finalizados: {resumenAsignaciones.finalizados}</span>
            </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Asignar Nuevo Trabajador</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="trabajador-select">Trabajador</Label>
                 <Select value={trabajadorId} onValueChange={setTrabajadorId}>
                  <SelectTrigger id="trabajador-select">
                    <SelectValue placeholder="Seleccione un trabajador" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRABAJADORES_SIMULADOS.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nombre} ({t.oficio})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rol">Rol en la obra</Label>
                <Input id="rol" value={rol} onChange={e => setRol(e.target.value)} placeholder="Ej: Jefe de cuadrilla" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado-asignacion-select">Estado inicial</Label>
                 <Select value={estado} onValueChange={(v) => setEstado(v as EstadoAsignacion)}>
                  <SelectTrigger id="estado-asignacion-select">
                    <SelectValue placeholder="Seleccione estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_ASIGNACION.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
             {error && <p className="text-sm font-medium text-destructive mt-4">{error}</p>}
            <Button type="submit" className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90">
              Asignar a la obra
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Personal Asignado en Obra</CardTitle>
            <CardDescription>Lista de trabajadores asignados a "{OBRAS_SIMULADAS.find(o => o.id === obraSeleccionadaId)?.nombreFaena}".</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Oficio</TableHead>
                  <TableHead>Rol en Obra</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {asignacionesFiltradas.length > 0 ? (
                  asignacionesFiltradas.map((asignacion) => {
                    const trabajador = getTrabajador(asignacion.trabajadorId);
                    if (!trabajador) return null;
                    
                    return (
                      <TableRow key={asignacion.id}>
                        <TableCell className="font-medium">{trabajador.nombre}</TableCell>
                        <TableCell>{trabajador.oficio}</TableCell>
                        <TableCell>{asignacion.rol}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <EstadoBadge estado={asignacion.estado} />
                            <Select 
                                value={asignacion.estado}
                                onValueChange={(value) => handleEstadoChange(asignacion.id, value as EstadoAsignacion)}
                            >
                                <SelectTrigger className="text-xs h-8 w-full md:w-[120px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ESTADOS_ASIGNACION.map(e => (
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
                                <AlertDialogTitle>¿Desea eliminar esta asignación?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    La asignación de "{trabajador.nombre}" será eliminada. Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={() => handleEliminar(asignacion.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    Eliminar
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No hay personal asignado a esta obra.
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
