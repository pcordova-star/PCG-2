import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { HardHat, Activity, ShieldCheck } from 'lucide-react';

export default function Home() {
  const modules = [
    {
      title: "Obras",
      description: "Gestione los datos centrales de cada obra, desde la planificación hasta la ejecución. Este es el corazón de la plataforma.",
      href: "/obras",
      icon: HardHat,
    },
    {
      title: "Operaciones",
      description: "Planifique, programe y controle el avance diario de sus faenas. (Módulo en desarrollo)",
      href: "/operaciones",
      icon: Activity,
    },
    {
      title: "Prevención de Riesgos",
      description: "Administre la seguridad y salud ocupacional. Un módulo especializado para un aspecto crítico de la construcción. (Módulo en desarrollo)",
      href: "/prevencion",
      icon: ShieldCheck,
    }
  ];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-headline font-bold tracking-tight sm:text-5xl">
          Dashboard PCG 2.0
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          Seleccione un módulo para comenzar a gestionar sus proyectos. Cada sección está diseñada para optimizar un área clave de su operación.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {modules.map((mod) => (
          <Card key={mod.title} className="flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <CardHeader className="flex-row items-center gap-4">
               <div className="p-3 bg-accent/10 rounded-full">
                 <mod.icon className="h-6 w-6 text-accent" />
               </div>
              <CardTitle className="font-headline">{mod.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <CardDescription>{mod.description}</CardDescription>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href={mod.href}>Acceder al módulo</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
