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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


export default function DashboardPage() {
  const summaryCards = [
    {
      title: 'Obras Activas',
      value: '3',
      icon: Building2,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Tareas en Progreso',
      value: '15',
      icon: ListChecks,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      title: 'Alertas de Seguridad',
      value: '8',
      icon: AlertTriangle,
      bgColor: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
    },
  ];

  const modules = [
    {
      title: 'Obras',
      description:
        'Gestione los datos centrales de cada obra, desde la planificación hasta la ejecución. Este es el corazón de la plataforma.',
      href: '/obras',
      icon: HardHat,
    },
    {
      title: 'Operaciones',
      description:
        'Planifique, programe y controle el avance diario de sus faenas.',
      href: '/operaciones',
      icon: Activity,
    },
    {
      title: 'Prevención de Riesgos',
      description:
        'Administre la seguridad y salud ocupacional. Un módulo especializado para un aspecto crítico de la construcción.',
      href: '/prevencion',
      icon: ShieldCheck,
    },
    {
      title: 'Personal de Obra',
      description: 'Gestione el plantel de trabajadores y su estado para cada obra.',
      href: '/operaciones/personal',
      icon: Users,
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-8">
      <header>
        <h2 className="text-3xl font-bold tracking-tight">
          Hola, Bienvenido de vuelta!
        </h2>
        <p className="text-muted-foreground">
          Aquí tienes un resumen de la actividad reciente en tus obras.
        </p>
      </header>
      
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={cn('p-2 rounded-full', card.bgColor)}>
                <card.icon className={cn('h-4 w-4', card.iconColor)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                +2.1% desde el mes pasado
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Action Cards */}
      <div>
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
                        <CardTitle>Actualizar Avance</CardTitle>
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
