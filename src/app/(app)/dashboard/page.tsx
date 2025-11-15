"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  HardHat,
  Activity,
  ShieldCheck,
  Building2,
  ListChecks,
  AlertTriangle,
  Camera,
  Users,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, collectionGroup } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Skeleton } from '@/components/ui/skeleton';
import TourOnboarding from '@/components/onboarding/TourOnboarding';


type SummaryData = {
  obrasActivas: number | null;
  tareasEnProgreso: number | null;
  alertasSeguridad: number | null;
};

const modules = [
  {
    id: 'tour-step-modulo-obras',
    title: 'Obras',
    description: 'Crea y gestiona tus proyectos de construcción. Asigna presupuestos, personal y lleva el control de la programación y los avances.',
    href: '/obras',
    icon: HardHat,
  },
  {
    id: 'tour-step-modulo-operaciones',
    title: 'Operaciones',
    description: 'Controla el día a día: programación de actividades, registro de avances, estados de pago y gestión de personal en terreno.',
    href: '/operaciones',
    icon: Activity,
  },
  {
    id: 'tour-step-modulo-prevencion',
    title: 'Prevención de Riesgos',
    description: 'Gestiona la seguridad en obra con auditorías, registro de hallazgos, investigación de incidentes y control documental (DS44).',
    href: '/prevencion',
    icon: ShieldCheck,
  },
];


export default function DashboardPage() {
  const [summaryData, setSummaryData] = useState<SummaryData>({
    obrasActivas: null,
    tareasEnProgreso: null,
    alertasSeguridad: null,
  });
  const [loading, setLoading] = useState(false);

  const [startTour, setStartTour] = useState(false);

  useEffect(() => {
    // Iniciar tour automáticamente si no se ha completado antes
    const tourDone = localStorage.getItem('pcg-tour-done');
    if (tourDone !== 'true') {
      setStartTour(true);
    }

    setLoading(true);
    async function fetchSummaryData() {
      try {
        const obrasQuery = query(collection(firebaseDb, 'obras'));
        const obrasSnap = await getDocs(obrasQuery);
        const obrasActivas = obrasSnap.size;

        const actividadesQuery = query(collectionGroup(firebaseDb, 'actividades'), where('estado', '!=', 'Completada'));
        const actividadesSnap = await getDocs(actividadesQuery);
        const tareasEnProgreso = actividadesSnap.size;
        
        const alertasQuery = query(collection(firebaseDb, 'investigacionesIncidentes'), where('estadoCierre', '==', 'Abierto'));
        const alertasSnap = await getDocs(alertasQuery);
        const alertasSeguridad = alertasSnap.size;
        
        setSummaryData({
          obrasActivas,
          tareasEnProgreso,
          alertasSeguridad,
        });

      } catch (error) {
        console.error("Error fetching dashboard summary data:", error);
        setSummaryData({
          obrasActivas: 0,
          tareasEnProgreso: 0,
          alertasSeguridad: 0,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchSummaryData();
  }, []);
  
  const handleTourComplete = () => {
    localStorage.setItem('pcg-tour-done', 'true');
    setStartTour(false);
  }

  const summaryCards = [
    {
      id: 'tour-step-obras-activas',
      title: 'Obras Activas',
      value: summaryData.obrasActivas,
      icon: Building2,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      id: 'tour-step-tareas-progreso',
      title: 'Tareas en Progreso',
      value: summaryData.tareasEnProgreso,
      icon: ListChecks,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      id: 'tour-step-alertas-seguridad',
      title: 'Alertas de Seguridad',
      value: summaryData.alertasSeguridad,
      icon: AlertTriangle,
      bgColor: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-8">
      <TourOnboarding 
        run={startTour}
        onComplete={handleTourComplete}
      />
      <header className='flex justify-between items-center'>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Hola, Bienvenido de vuelta!
          </h2>
          <p className="text-muted-foreground">
            Aquí tienes un resumen de la actividad reciente en tus obras.
          </p>
        </div>
        <Button variant="outline" onClick={() => setStartTour(true)}>
          <Info className="mr-2 h-4 w-4" />
          Ver Tour / Guía de Inicio
        </Button>
      </header>
      
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {summaryCards.map((card) => (
          <Card key={card.title} id={card.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={cn('p-2 rounded-full', card.bgColor)}>
                <card.icon className={cn('h-4 w-4', card.iconColor)} />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-1/3" />
              ) : (
                <div className="text-2xl font-bold">{card.value ?? 0}</div>
              )}
              <p className="text-xs text-muted-foreground">
                Datos actualizados en tiempo real.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Action Cards */}
      <div id="tour-step-acceso-rapido">
        <h3 className="text-xl font-semibold mb-4">Acceso Rápido para Terreno</h3>
        <TooltipProvider>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/operaciones/registro-fotografico">
                  <Card className="group transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1">
                    <CardHeader className="flex-row items-center gap-4">
                      <div className="p-3 bg-blue-100 rounded-full">
                          <Camera className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle>Fotografiar Hito / Avance</CardTitle>
                        <CardDescription>Registra solo fotos y comentarios desde terreno.</CardDescription>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Registra solo fotos y comentarios del estado de la obra. 
                  No modifica el % de avance ni la Curva S. Ideal para dejar evidencia en terreno.
                </p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                 <Link href="/operaciones/avance-en-terreno">
                  <Card className="group transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1">
                    <CardHeader className="flex-row items-center gap-4">
                      <div className="p-3 bg-green-100 rounded-full">
                          <ListChecks className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <CardTitle>Registrar Avance por Cantidad</CardTitle>
                        <CardDescription>Registra cantidades ejecutadas por actividad.</CardDescription>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Registra la cantidad ejecutada por actividad. 
                  Actualiza el % de avance real y la Curva S del contrato.
                </p>
              </TooltipContent>
            </Tooltip>

          </div>
        </TooltipProvider>
      </div>


      {/* Module Cards */}
      <div>
         <h3 className="text-xl font-semibold mb-4">Acceso a Módulos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((mod) => (
            <Card
              key={mod.title}
              id={mod.id}
              className="flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            >
              <CardHeader>
                 <div className="mb-4">
                  <div className="p-3 bg-accent/10 rounded-full w-fit">
                    <mod.icon className="h-6 w-6 text-accent" />
                  </div>
                </div>
                <CardTitle className="font-headline text-xl">{mod.title}</CardTitle>
                <CardDescription className="pt-2">{mod.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow"></CardContent>
              <div className="p-6 pt-0">
                <Button asChild className="w-full">
                  <Link href={mod.href}>Acceder al módulo</Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
