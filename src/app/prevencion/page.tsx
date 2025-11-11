import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, Building } from 'lucide-react';

export default function PrevencionPage() {
  const modules = [
    {
      title: "Empresas contratistas – DS44",
      description: "Registrar y evaluar el cumplimiento de requisitos DS44 de empresas contratistas y subcontratistas por obra.",
      href: "/prevencion/empresas-contratistas",
      icon: Building,
      linkText: "Ir a Empresas contratistas"
    },
    {
      title: "Ingreso de personal – Empresa (mandante)",
      description: "Registrar el ingreso de trabajadores propios del mandante a la obra según requisitos DS44.",
      href: "/prevencion/ingreso-personal",
      icon: Users,
      linkText: "Ingresar personal de la empresa"
    },
    {
      title: "Ingreso de personal – Subcontrato",
      description: "Registrar el ingreso de trabajadores de empresas contratistas/subcontratistas según requisitos DS44.",
      href: "/prevencion/ingreso-personal",
      icon: Users,
      linkText: "Ingresar personal de subcontrato"
    },
     {
      title: "Ingreso empresa subcontratista – DS44",
      description: "Este formulario guía al prevencionista en los requisitos de ingreso a obra según DS44. Los datos son simulados.",
      href: "/prevencion/ds44-subcontratos",
      icon: FileText,
      linkText: "Ir a Ingreso de Empresa"
    },
    {
      title: "DS44 – Mandante / Obra",
      description: "Dashboard de cumplimiento global a nivel de mandante y coordinación de actividades preventivas.",
      href: "/prevencion/ds44-mandante",
      icon: Building,
      linkText: "Ir al Dashboard Global"
    }
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
