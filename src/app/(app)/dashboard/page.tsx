"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  HardHat,
  Activity,
  ShieldCheck,
  Building2,
  ListChecks,
  AlertTriangle,
  BookCopy,
  GanttChartSquare,
  ClipboardPlus,
  Camera,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, collectionGroup, where } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Skeleton } from '@/components/ui/skeleton';
import { OnboardingSteps } from '@/components/dashboard/OnboardingSteps';

type SummaryData = {
  obrasActivas: number | null;
  tareasEnProgreso: number | null;
  alertasSeguridad: number | null;
};

const mainModules = [
  {
    title: 'Obras',
    description: 'Crea y gestiona tus proyectos. Asigna datos básicos, clientes y responsables para cada faena.',
    href: '/obras',
    icon: HardHat,
    linkText: 'Gestionar Obras'
  },
  {
    title: 'Presupuestos',
    description: 'Administra tu catálogo de ítems y precios. Crea y duplica presupuestos detallados por obra.',
    href: '/operaciones/presupuestos',
    icon: BookCopy,
    linkText: 'Ir a Presupuestos'
  },
  {
    title: 'Programación',
    description: 'Define actividades, plazos y recursos. Registra avances y visualiza la Curva S del proyecto.',
    href: '/operaciones/programacion',
    icon: GanttChartSquare,
    linkText: 'Ir a Programación'
  },
  {
    title: 'Prevención de Riesgos',
    description: 'Gestiona la seguridad: IPER, incidentes, charlas, DS44 y control documental de contratistas.',
    href: '/prevencion',
    icon: ShieldCheck,
    linkText: 'Ir a Prevención'
  },
];

const quickAccessModules = [
  {
    id: 'tour-step-avance-cantidad',
    title: 'Registrar Avance por Cantidad',
    description: 'Formulario rápido para registrar cantidades ejecutadas desde tu dispositivo móvil.',
    href: '/operaciones/avance-en-terreno',
    icon: ClipboardPlus,
    linkText: 'Registrar Avance'
  },
  {
    id: 'tour-step-avance-foto',
    title: 'Registro Fotográfico',
    description: 'Formulario rápido para dejar evidencia fotográfica de un hito o avance desde terreno.',
    href: '/operaciones/registro-fotografico',
    icon: Camera,
    linkText: 'Registrar Foto'
  },
];


export default function DashboardPage() {
  const [summaryData, setSummaryData] = useState<SummaryData>({
    obrasActivas: null,
    tareasEnProgreso: null,
    alertasSeguridad: null,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    async function fetchSummaryData() {
      try {
        const obrasQuery = query(collection(firebaseDb, 'obras'), where('estado', '==', 'Activa'));
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
    <div className="min-h-screen bg-slate-50">
      <div className="flex flex-col gap-4 md:gap-6 p-4 md:p-6">
        {/* Sección de bienvenida */}
        <header className='text-center md:text-left'>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Bienvenido a PCG</h1>
            <p className="text-lg text-muted-foreground mt-1">Plataforma de Control y Gestión de Obras</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl mx-auto md:mx-0">
                Administra tus obras, presupuestos, programación, calidad y prevención desde un solo lugar.
            </p>
        </header>

        {/* Componente de Onboarding */}
        <OnboardingSteps />

        {/* Accesos rápidos para Terreno */}
        <div>
            <h2 className="text-xl font-semibold mb-4">Accesos Rápidos para Terreno</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6" id="tour-step-acceso-rapido">
                {quickAccessModules.map((mod) => (
                    <Card key={mod.title} id={mod.id} className="rounded-xl border bg-white shadow-sm md:hover:shadow-md transition-shadow flex flex-col">
                        <CardHeader>
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-accent/10 rounded-full w-fit">
                                    <mod.icon className="h-6 w-6 text-accent" />
                                </div>
                                <CardTitle className="font-headline text-lg">{mod.title}</CardTitle>
                            </div>
                            <CardDescription className="pt-2 text-xs">{mod.description}</CardDescription>
                        </CardHeader>
                        <CardFooter className="mt-auto">
                            <Button asChild className="w-full" variant='secondary'>
                                <Link href={mod.href}>{mod.linkText}</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>

        {/* Accesos a módulos principales */}
        <div>
            <h2 className="text-xl font-semibold mb-4">Módulos Principales</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
                {mainModules.map((mod) => (
                    <Card key={mod.title} className="rounded-xl border bg-white shadow-sm md:hover:shadow-md transition-shadow flex flex-col">
                        <CardHeader>
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-primary/10 rounded-full w-fit">
                                    <mod.icon className="h-6 w-6 text-primary" />
                                </div>
                                <CardTitle className="font-headline text-xl">{mod.title}</CardTitle>
                            </div>
                            <CardDescription className="pt-2">{mod.description}</CardDescription>
                        </CardHeader>
                        <CardFooter className="mt-auto">
                            <Button asChild className="w-full" variant={mod.linkText === 'Próximamente' ? 'secondary' : 'default'} disabled={mod.linkText === 'Próximamente'}>
                                <Link href={mod.href}>{mod.linkText}</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>

        {/* Sección de estadísticas */}
        <div>
            <h2 className="text-xl font-semibold mb-4">Estadísticas Generales</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {summaryCards.map((card) => (
              <Card key={card.title} id={card.id} className="rounded-xl border bg-white shadow-sm md:hover:shadow-md transition-shadow">
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
        </div>

      </div>
    </div>
  );
}
