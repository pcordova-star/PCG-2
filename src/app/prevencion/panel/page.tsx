// src/app/prevencion/panel/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CalendarClock, ListChecks, UserX, ArrowRight, CheckCircle, Clock, ArrowLeft } from 'lucide-react';
import { Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
                <CardTitle>Lo que debes hacer hoy</CardTitle>
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
                            <Button asChild size="sm" onClick={() => console.log("Ir a tarea", tarea.id)}>
                                <Link href={`/prevencion/formularios-generales`}>
                                 Ir a tarea <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
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
    const { user, companyId } = useAuth();
    const router = useRouter();
    const [kpis, setKpis] = useState({ charlasAtrasadas: 0, charlasProximas: 0, iperCriticosSinCharla: 0, trabajadoresSinInduccion: 0 });
    const [tareasHoy, setTareasHoy] = useState<TareaPrevencion[]>([]);
    const [otrasTareas, setOtrasTareas] = useState<TareaPrevencion[]>([]);
    
    useEffect(() => {
        if (!companyId) return;

        const fetchTareas = async () => {
            const hoy = new Date();
            hoy.setHours(0,0,0,0);
            
            // Tareas para hoy: Charlas en borrador cuya fecha de realización ya pasó.
             const charlaQuery = query(
                collection(firebaseDb, "charlas"),
                where("estado", "==", "borrador")
                // where("fechaRealizacion", "<", hoy) // Firestore no permite '<' en Timestamps para queries complejas. Filtraremos en cliente.
                // Aquí se podría filtrar por empresa si fuera necesario
            );
            
            const charlasSnap = await getDocs(charlaQuery);
            const tareasUrgentes: TareaPrevencion[] = charlasSnap.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as any))
                .filter(charla => charla.fechaRealizacion && charla.fechaRealizacion.toDate() < hoy)
                .map(charla => {
                    return {
                        id: charla.id,
                        obraId: charla.obraId,
                        tipo: 'charla',
                        titulo: `Realizar charla atrasada: ${charla.titulo}`,
                        descripcion: `La charla sobre "${charla.tarea}" estaba programada para el ${charla.fechaRealizacion.toDate().toLocaleDateString()} y sigue en borrador.`,
                        relacionId: charla.id,
                        estado: 'vencida',
                        prioridad: 'alta',
                        fechaCreacion: charla.fechaCreacion,
                        fechaLimite: charla.fechaRealizacion, // La fecha límite era la de realización
                        creadaAutomaticamente: charla.generadaAutomaticamente,
                        responsableUid: charla.creadaPorUid,
                    } as TareaPrevencion;
            });

            setTareasHoy(tareasUrgentes);

            // Cargar otras tareas (simulado por ahora)
            // setOtrasTareas(...)
        };

        fetchTareas();

    }, [companyId]);

    // En una implementación real, esto vendría de un useEffect con una consulta a Firestore.
    const kpiCards = [
        { title: "Charlas atrasadas", value: kpis.charlasAtrasadas, description: "Charlas en borrador con fecha vencida.", icon: CalendarClock, colorClass: "border-red-500 bg-red-50" },
        { title: "Charlas de esta semana", value: kpis.charlasProximas, description: "Programadas para los próximos 7 días.", icon: CalendarClock, colorClass: "border-blue-500 bg-blue-50" },
        { title: "IPER críticos sin charla", value: kpis.iperCriticosSinCharla, description: "Riesgos altos que no tienen charla asociada.", icon: AlertTriangle, colorClass: "border-yellow-500 bg-yellow-50" },
        { title: "Trabajadores sin inducción", value: kpis.trabajadoresSinInduccion, description: "Personal nuevo pendiente de inducción.", icon: UserX, colorClass: "border-orange-500 bg-orange-50" },
    ];
    
    return (
        <div className="space-y-8">
            {/* Encabezado */}
            <header className="flex items-start gap-4">
                 <Button variant="outline" size="icon" onClick={() => router.push('/prevencion')} className="flex-shrink-0">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Panel del Prevencionista</h1>
                    <p className="mt-2 text-lg text-muted-foreground">Gestión diaria de riesgos, charlas y cumplimiento operativo.</p>
                </div>
            </header>

            {/* KPIs */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {kpiCards.map(kpi => <PrevencionKpiCard key={kpi.title} {...kpi} />)}
            </section>

            {/* Tareas */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-1">
                    <TareasHoyList tareas={tareasHoy} />
                </div>
                <div className="lg:col-span-2">
                     <Card>
                        <CardHeader>
                            <CardTitle>Historial de Tareas</CardTitle>
                            <CardDescription>Listado general de todas tus tareas pendientes, en progreso y resueltas.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {otrasTareas.length > 0 ? (
                                otrasTareas.map(tarea => <TareaCard key={tarea.id} tarea={tarea} />)
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No hay más tareas en el historial.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </section>
        </div>
    );
}
