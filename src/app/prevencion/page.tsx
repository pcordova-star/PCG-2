import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building, ClipboardPlus, BookUser, LayoutDashboard, ShieldAlert, ArrowLeft, Search, Siren, Settings, FileSignature } from 'lucide-react';

export default function PrevencionPage() {
  const modules = [
    {
      title: "Panel del Prevencionista",
      description: "Dashboard con alertas, KPIs y tareas diarias para la gestión de riesgos y cumplimiento operativo.",
      href: "/prevencion/panel",
      icon: LayoutDashboard,
      linkText: "Ir al Panel"
    },
    {
      title: "Programa de Prevención de Riesgos",
      description: "Define, gestiona y genera el PPR de cada obra, integrando IPER, charlas y planes de acción en un solo lugar.",
      href: "/prevencion/ppr",
      icon: ShieldAlert,
      linkText: "Gestionar PPR"
    },
    {
      title: "Empresas contratistas – DS44",
      description: "Registrar y evaluar el cumplimiento de requisitos DS44 de empresas contratistas y subcontratistas por obra.",
      href: "/prevencion/empresas-contratistas",
      icon: Building,
      linkText: "Ir a Empresas contratistas"
    },
    {
      title: "Ingreso de personal – DS44",
      description: "Registrar el ingreso de trabajadores (propios y de subcontratos) a la obra según requisitos DS44.",
      href: "/prevencion/ingreso-personal",
      icon: Users,
      linkText: "Ir a Ingreso de Personal"
    },
    {
      title: "DS44 – Mandante / Obra",
      description: "Ficha global de coordinación y cumplimiento DS44 para cada obra.",
      href: "/prevencion/ds44-mandante",
      icon: Building,
      linkText: "Ir a DS44 – Mandante / Obra"
    },
     {
      title: "Hallazgos en Terreno",
      description: "Dashboard para visualizar y gestionar los hallazgos de seguridad reportados desde terreno.",
      href: "/prevencion/hallazgos",
      icon: Siren,
      linkText: "Ir a Hallazgos"
    },
    {
      title: "Formularios generales DS44",
      description: "IPER, investigación de incidentes, hallazgos, planes de acción y otros formularios del sistema.",
      href: "/prevencion/formularios-generales",
      icon: ClipboardPlus,
      linkText: "Ir a Formularios"
    },
    {
      title: "Listas de Chequeo (Plantillas)",
      description: "Crea y gestiona las plantillas de checklists de seguridad para inspecciones y auditorías.",
      href: "/prevencion/checklists",
      icon: FileSignature,
      linkText: "Gestionar Plantillas de Prevención"
    },
    {
      title: "Capacitación e inducciones",
      description: "Módulo para gestionar inducciones de acceso a faena para visitas y capacitaciones internas. En este MVP partimos por la inducción de acceso mediante QR.",
      href: "/prevencion/capacitacion",
      icon: BookUser,
      linkText: "Ir a Capacitación"
    }
  ];

  return (
    <div className="space-y-8">
       <Button asChild variant="outline" size="sm">
          <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Dashboard</Link>
      </Button>

      <div className="space-y-4 max-w-3xl">
        <h1 className="text-4xl font-bold font-headline tracking-tight">Módulo de Prevención de Riesgos</h1>
        <p className="text-lg text-muted-foreground">
          Herramientas para gestionar y dar cumplimiento a las normativas de seguridad y salud ocupacional en obra, con especial foco en el DS44.
        </p>
      </div>

       <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-full">
              <Settings className="h-6 w-6 text-green-700" />
            </div>
            <div>
              <CardTitle className="text-green-900">Paso Inicial: Configurar Equipo Responsable</CardTitle>
              <CardDescription className="text-green-800">
                Define quiénes son los responsables (Jefe de Obra, Supervisores, etc.) para cada obra. Este equipo se usará para asignar hallazgos y acciones.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardFooter>
          <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
            <Link href="/prevencion/hallazgos/equipo-responsable">
              <Users className="mr-2 h-4 w-4" />
              Configurar Equipo Responsable
            </Link>
          </Button>
        </CardFooter>
      </Card>

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
        </Card>
        ))}
      </div>
    </div>
  );
}
