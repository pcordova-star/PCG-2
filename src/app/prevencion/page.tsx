import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { HardHat, Users } from 'lucide-react';

export default function PrevencionPage() {
  const modules = [
    {
      title: "Ingreso empresa subcontratista (DS44)",
      description: "Formulario guiado para revisar todos los requisitos de ingreso de una empresa a la obra según DS44.",
      href: "/prevencion/ds44-subcontratos",
      icon: Users,
      linkText: "Abrir formulario"
    }
    // Aquí se pueden agregar más tarjetas en el futuro
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-4xl font-bold font-headline tracking-tight">Módulo de Prevención de Riesgos</h1>
        <p className="text-lg text-muted-foreground">
          Herramientas para gestionar y dar cumplimiento a las normativas de seguridad y salud ocupacional en obra, con especial foco en el DS44.
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
