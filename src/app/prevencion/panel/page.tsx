// src/app/prevencion/panel/page.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CalendarClock, ListChecks, UserX, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

// --- TIPOS DE DATOS (simulando firestore) ---
type TareaTipo = "charla" | "iper" | "induccion" | "capacitacion" | "seguimiento";
type TareaEstado = "pendiente" | "en_progreso" | "resuelta" | "vencida";
type TareaPrioridad = "alta" | "media" | "baja";

type TareaPrevencion = {
  id: string;
  obraId: string;
  tipo: TareaTipo;
  titulo: string;
  descripcion: string;
  relacionId: string;
  estado: TareaEstado;
  prioridad: TareaPrioridad;
  fechaCreacion: Timestamp;
  fechaLimite: Timestamp;
  creadaAutomaticamente: boolean;
  responsableUid: string;
};

// --- DATOS MOCK ---
const mockTareas: TareaPrevencion[] = [
  {
    id: "1", obraId: "OBRA-123", tipo: "charla", titulo: "Realizar charla: Riesgo eléctrico",
    descripcion: "Charla asociada al IPER crítico sobre trabajos en tableros eléctricos.",
    relacionId: "CHARLA-001", estado: "pendiente", prioridad: "alta",
    fechaCreacion: Timestamp.fromDate(new Date()),
    fechaLimite: Timestamp.fromDate(new Date()), // Tarea para hoy
    creadaAutomaticamente: true, responsableUid: "prev1"
  },
  {
    id: "2", obraId: "OBRA-123", tipo: "iper", titulo: "Revisar IPER de excavaciones",
    descripcion: "Actualizar la matriz de riesgos para la nueva fase de excavación.",
    relacionId: "IPER-045", estado: "en_progreso", prioridad: "media",
    fechaCreacion: Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
    fechaLimite: Timestamp.fromDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
    creadaAutomaticamente: false, responsableUid: "prev1"
  },
  {
    id: "3", obraId: "OBRA-456", tipo: "induccion", titulo: "Inducción nuevo personal: Contratista A",
    descripcion: "Realizar inducción de seguridad a 5 nuevos trabajadores del subcontrato de pintura.",
    relacionId: "CONTR-A", estado: "pendiente", prioridad: "alta",
    fechaCreacion: Timestamp.fromDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)),
    fechaLimite: Timestamp.fromDate(new Date()), // Tarea para hoy
    creadaAutomaticamente: true, responsableUid: "prev1"
  },
  {
    id: "4", obraId: "OBRA-123", tipo: "seguimiento", titulo: "Seguimiento acción correctiva Incidente #012",
    descripcion: "Verificar implementación de nueva señalética en zona de acopio.",
    relacionId: "INC-012", estado: "resuelta", prioridad: "media",
    fechaCreacion: Timestamp.fromDate(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)),
    fechaLimite: Timestamp.fromDate(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)),
    creadaAutomaticamente: true, responsableUid: "prev1"
  },
  {
    id: "5", obraId: "OBRA-123", tipo: "charla", titulo: "Charla de 5 min: Orden y Aseo",
    descripcion: "Charla programada vencida de la semana pasada.",
    relacionId: "CHARLA-002", estado: "vencida", prioridad: "baja",
    fechaCreacion: Timestamp.fromDate(new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)),
    fechaLimite: Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
    creadaAutomaticamente: true, responsableUid: "prev1"
  }
];

// --- COMPONENTES INTERNOS ---

const PrevencionKpiCard = ({ icon: Icon, title, value, description, colorClass }: { icon: React.ElementType, title: string, value: string | number, description: string, colorClass: string }) => (
  <Card className={`${colorClass} border-l-4`}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-5 w-5 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-4xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const TareasHoyList = ({ tareas }: { tareas: TareaPrevencion[] }) => {
    const prioridadColor: Record<TareaPrioridad, string> = {
        alta: "bg-red-100 text-red-800",
        media: "bg-yellow-100 text-yellow-800",
        baja: "bg-blue-100 text-blue-800",
    };
    return (
        <Card>
            <CardHeader>
                <CardTitle>Lo que debes hacer HOY</CardTitle>
                <CardDescription>Tareas urgentes que requieren tu atención inmediata.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {tareas.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                        <p className="mt-2 font-semibold">¡Todo al día!</p>
                        <p className="text-sm">No tienes tareas urgentes para hoy.</p>
                    </div>
                ) : (
                    tareas.map(tarea => (
                        <div key={tarea.id} className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                                <p className="font-semibold">{tarea.titulo}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{tarea.tipo.charAt(0).toUpperCase() + tarea.tipo.slice(1)}</span>
                                    <Badge variant="outline" className={prioridadColor[tarea.prioridad]}>Prioridad {tarea.prioridad}</Badge>
                                </div>
                            </div>
                            <Button size="sm" onClick={() => console.log("Ir a tarea", tarea.id)}>
                                Ir a tarea <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}

const TareaCard = ({ tarea }: { tarea: TareaPrevencion }) => {
    const estadoConfig: Record<TareaEstado, { color: string, label: string, icon: React.ElementType }> = {
        pendiente: { color: "border-yellow-500 bg-yellow-50", label: "Pendiente", icon: Clock },
        en_progreso: { color: "border-blue-500 bg-blue-50", label: "En Progreso", icon: ListChecks },
        resuelta: { color: "border-green-500 bg-green-50", label: "Resuelta", icon: CheckCircle },
        vencida: { color: "border-red-500 bg-red-50", label: "Vencida", icon: AlertTriangle },
    };
    const config = estadoConfig[tarea.estado];

    return (
        <Card className={`transition-all hover:shadow-md ${config.color}`}>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="text-base">{tarea.titulo}</CardTitle>
                    <Badge variant="outline" className={`${config.color} text-xs`}>
                        <config.icon className="mr-1 h-3 w-3" />
                        {config.label}
                    </Badge>
                </div>
                <CardDescription>{tarea.descripcion}</CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
                 <div className="flex justify-between">
                    <span><strong>Tipo:</strong> {tarea.tipo}</span>
                    <span><strong>Prioridad:</strong> {tarea.prioridad}</span>
                </div>
                <div className="flex justify-between">
                    <span><strong>Fecha Límite:</strong> {tarea.fechaLimite.toDate().toLocaleDateString('es-CL')}</span>
                </div>
            </CardContent>
        </Card>
    );
}


// --- COMPONENTE PRINCIPAL DE LA PÁGINA ---
export default function PanelPrevencionistaPage() {
    
    // En una implementación real, esto vendría de un useEffect con una consulta a Firestore.
    const kpis = [
        { title: "Charlas atrasadas", value: 3, description: "Charlas en borrador con fecha vencida.", icon: CalendarClock, colorClass: "border-red-500 bg-red-50" },
        { title: "Charlas de esta semana", value: 5, description: "Programadas para los próximos 7 días.", icon: CalendarClock, colorClass: "border-blue-500 bg-blue-50" },
        { title: "IPER críticos sin charla", value: 2, description: "Riesgos altos que no tienen charla asociada.", icon: AlertTriangle, colorClass: "border-yellow-500 bg-yellow-50" },
        { title: "Trabajadores sin inducción", value: 4, description: "Personal nuevo pendiente de inducción.", icon: UserX, colorClass: "border-orange-500 bg-orange-50" },
    ];
    
    const tareasHoy = mockTareas.filter(t => t.estado === 'pendiente' && t.fechaLimite.toDate().toDateString() === new Date().toDateString());
    const otrasTareas = mockTareas.filter(t => !(t.estado === 'pendiente' && t.fechaLimite.toDate().toDateString() === new Date().toDateString()));

    return (
        <div className="space-y-8">
            {/* Encabezado */}
            <header>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Panel del Prevencionista</h1>
                <p className="mt-2 text-lg text-muted-foreground">Gestión diaria de riesgos, charlas y cumplimiento operativo.</p>
            </header>

            {/* KPIs */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {kpis.map(kpi => <PrevencionKpiCard key={kpi.title} {...kpi} />)}
            </section>

            {/* Tareas */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-1">
                    <TareasHoyList tareas={tareasHoy} />
                </div>
                <div className="lg:col-span-2">
                     <Card>
                        <CardHeader>
                            <CardTitle>Tareas de Prevención</CardTitle>
                            <CardDescription>Listado general de todas tus tareas pendientes, en progreso y resueltas.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           {otrasTareas.map(tarea => <TareaCard key={tarea.id} tarea={tarea} />)}
                        </CardContent>
                    </Card>
                </div>
            </section>
        </div>
    );
}