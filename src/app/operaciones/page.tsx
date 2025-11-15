import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, GanttChartSquare, DollarSign } from 'lucide-react';

export default function OperacionesPage() {
  const modules = [
    {
      title: "Programación de Obras",
      description: "Define y revisa la programación de actividades por obra.",
      href: "/operaciones/programacion",
      icon: GanttChartSquare,
      linkText: "Ir a Programación"
    },
    {
      title: "Estados de Pago",
      description: "Gestiona y visualiza el avance económico de tus obras.",
      href: "/operaciones/estados-de-pago",
      icon: DollarSign,
      linkText: "Ir a Estados de Pago"
    },
    {
      title: "Personal de Obra",
      description: "Asigna y gestiona el personal asociado a cada obra.",
      href: "/operaciones/personal",
      icon: Users,
      linkText: "Ir a Personal"
    }
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-4xl font-bold font-headline tracking-tight">Módulo de Operaciones</h1>
        <p className="text-lg text-muted-foreground">
          Desde aquí puedes acceder a la programación de obras, la gestión de estados de pago y el control del personal en terreno.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {modules.map((mod) => (
          <Card key={mod.title} className="flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <CardHeader className="flex-row items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <mod.icon className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="font-headline text-xl">{mod.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <CardDescription>
                {mod.description}
              </CardDescription>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href={mod.href}>{mod.linkText}</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
