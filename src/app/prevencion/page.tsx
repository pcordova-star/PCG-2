import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FileCheck2 } from 'lucide-react';

export default function PrevencionPage() {
  const modules = [
    {
      title: "DS44 – Cumplimiento en Obra",
      description: "Registra y controla el cumplimiento de los ítems críticos del DS44 por obra.",
      href: "/prevencion/ds44",
      icon: FileCheck2,
      linkText: "Ir a DS44"
    }
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-4xl font-bold font-headline tracking-tight">Módulo de Prevención de Riesgos</h1>
        <p className="text-lg text-muted-foreground">
          Este módulo está orientado a apoyar la gestión y el cumplimiento normativo en materia de seguridad y salud ocupacional en cada obra.
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
