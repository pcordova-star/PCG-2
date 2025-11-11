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

type AvanceDiario = {
  id: string;
  obraId: string;
  fecha: string;             // "YYYY-MM-DD"
  porcentajeAvance: number;  // avance acumulado a esa fecha (0-100)
  comentario: string;
  fotoUrl?: string;          // por ahora solo URL de la foto (simulado)
  visibleParaCliente: boolean;
  creadoPor: string;         // nombre o rol de quien registra
};

const AVANCES_INICIALES: AvanceDiario[] = [
  {
    id: "av-1",
    obraId: "1",
    fecha: "2025-11-10",
    porcentajeAvance: 15,
    comentario: "Inicio de excavaciones y replanteo general.",
    fotoUrl: "https://via.placeholder.com/300x180?text=Obra+Dia+1",
    visibleParaCliente: true,
    creadoPor: "Jefe de Obra",
  },
  {
    id: "av-2",
    obraId: "1",
    fecha: "2025-11-12",
    porcentajeAvance: 25,
    comentario: "Avance en excavación de fundaciones y retiro de material.",
    fotoUrl: "https://via.placeholder.com/300x180?text=Obra+Dia+2",
    visibleParaCliente: true,
    creadoPor: "Administrador de Obra",
  },
  {
    id: "av-3",
    obraId: "2",
    fecha: "2025-11-11",
    porcentajeAvance: 8,
    comentario: "Instalación de faena y cierre perimetral.",
    fotoUrl: "https://via.placeholder.com/300x180?text=Obra+Condominio",
    visibleParaCliente: false,
    creadoPor: "Jefe de Terreno",
  },
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

  const [avances, setAvances] = useState<AvanceDiario[]>(AVANCES_INICIALES);
  const [fechaAvance, setFechaAvance] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [porcentajeAvance, setPorcentajeAvance] = useState<number>(0);
  const [comentarioAvance, setComentarioAvance] = useState<string>("");
  const [fotoUrl, setFotoUrl] = useState<string>("");
  const [visibleParaCliente, setVisibleParaCliente] = useState<boolean>(true);
  const [creadoPor, setCreadoPor] = useState<string>("");
  const [errorAvance, setErrorAvance] = useState<string | null>(null);

  const clientPath = obraSeleccionadaId
  ? `/clientes/${obraSeleccionadaId}`
  : "";


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
  
    const avancesFiltrados = avances
    .filter((a) => a.obraId === obraSeleccionadaId)
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1)); // más recientes primero

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
      
      <section className="mt-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm text-sm flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
            <p className="text-xs font-semibold text-card-foreground">
                Link del panel del cliente para esta obra
            </p>
            <p className="text-[11px] text-muted-foreground">
                Este es el enlace que, en producción, podrás compartir con el mandante
                para que vea el avance diario de su obra.
            </p>
            </div>

            {obraSeleccionadaId ? (
            <div className="flex flex-col items-start gap-1 md:items-end">
                <code className="rounded-lg border bg-muted/50 px-3 py-1 text-xs font-mono text-foreground">
                {clientPath}
                </code>
                <p className="text-[11px] text-muted-foreground">
                (En este MVP es solo una URL simulada; más adelante se vinculará al
                cliente por su email.)
                </p>
            </div>
            ) : (
            <p className="text-xs text-muted-foreground">
                Selecciona una obra para ver el link del cliente.
            </p>
            )}
        </div>
      </section>

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
      
      <section className="space-y-4 mt-8">
        <header className="space-y-1">
          <h3 className="text-xl font-semibold">Avance diario de la obra</h3>
          <p className="text-sm text-muted-foreground">
            Registra el avance del día, sube una foto y deja un comentario. Esta
            información se podrá mostrar en el futuro dashboard del cliente.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Formulario de nuevo avance */}
          <form
            className="space-y-3 rounded-xl border bg-card p-4 shadow-sm"
            onSubmit={(e) => {
              e.preventDefault();
              setErrorAvance(null);

              if (!obraSeleccionadaId) {
                setErrorAvance("Debes seleccionar una obra.");
                return;
              }
              if (!fechaAvance) {
                setErrorAvance("Debes indicar la fecha del avance.");
                return;
              }
              if (porcentajeAvance < 0 || porcentajeAvance > 100) {
                setErrorAvance("El porcentaje de avance debe estar entre 0 y 100.");
                return;
              }
              if (!comentarioAvance.trim()) {
                setErrorAvance("Agrega al menos un comentario breve del avance.");
                return;
              }
              if (!creadoPor.trim()) {
                setErrorAvance("Indica quién registra este avance (ej. Jefe de Obra).");
                return;
              }

              const nuevoAvance: AvanceDiario = {
                id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
                obraId: obraSeleccionadaId,
                fecha: fechaAvance,
                porcentajeAvance,
                comentario: comentarioAvance,
                fotoUrl: fotoUrl.trim() || undefined,
                visibleParaCliente,
                creadoPor,
              };

              setAvances((prev) => [nuevoAvance, ...prev]);

              // limpiar formulario (salvo la fecha)
              setPorcentajeAvance(0);
              setComentarioAvance("");
              setFotoUrl("");
              setCreadoPor("");
              setVisibleParaCliente(true);
            }}
          >
            <h4 className="text-sm font-semibold text-card-foreground">
              Registrar avance del día
            </h4>

            {errorAvance && (
              <p className="text-xs text-red-600">{errorAvance}</p>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">
                  Fecha del avance
                </Label>
                <Input
                  type="date"
                  value={fechaAvance}
                  onChange={(e) => setFechaAvance(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">
                  Porcentaje de avance acumulado (%)
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={porcentajeAvance}
                  onChange={(e) => setPorcentajeAvance(Number(e.target.value) || 0)}
                  className="w-full"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">
                Comentario del día
              </Label>
              <textarea
                value={comentarioAvance}
                onChange={(e) => setComentarioAvance(e.target.value)}
                rows={3}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                placeholder="Describe brevemente qué se avanzó hoy en la obra..."
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">
                URL de foto (simulada)
              </Label>
              <Input
                type="text"
                value={fotoUrl}
                onChange={(e) => setFotoUrl(e.target.value)}
                className="w-full"
                placeholder="https://..."
              />
              <p className="text-[11px] text-muted-foreground">
                Más adelante esto se conectará a un almacenamiento real de fotos. Por
                ahora solo usamos una URL simulada.
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">
                Registrado por
              </Label>
              <Input
                type="text"
                value={creadoPor}
                onChange={(e) => setCreadoPor(e.target.value)}
                className="w-full"
                placeholder="Ej: Jefe de Obra, Administrador de Obra..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="visibleCliente"
                type="checkbox"
                checked={visibleParaCliente}
                onChange={(e) => setVisibleParaCliente(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label
                htmlFor="visibleCliente"
                className="text-xs text-muted-foreground"
              >
                Mostrar este avance en el futuro dashboard del cliente
              </Label>
            </div>

            <Button
              type="submit"
              className="mt-2"
            >
              Registrar avance
            </Button>
          </form>

          {/* Historial de avances */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-card-foreground">
              Historial de avances de esta obra
            </h4>
            {avancesFiltrados.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aún no hay avances registrados para esta obra.
              </p>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {avancesFiltrados.map((av) => (
                  <article
                    key={av.id}
                    className="rounded-xl border bg-card p-3 shadow-sm text-sm space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">
                          {av.fecha} · {av.porcentajeAvance}% avance
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Registrado por: {av.creadoPor}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(av.visibleParaCliente
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-100 text-slate-600"
                        )}
                      >
                        {av.visibleParaCliente
                          ? "Visible para cliente"
                          : "Solo uso interno"}
                      </Badge>
                    </div>

                    {av.fotoUrl && (
                      <div className="overflow-hidden rounded-lg border bg-muted/30">
                        <img
                          src={av.fotoUrl}
                          alt={`Avance ${av.fecha}`}
                          className="h-40 w-full object-cover"
                        />
                      </div>
                    )}

                    <p className="text-card-foreground/90 text-sm whitespace-pre-line">
                      {av.comentario}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}
