import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CapacitacionPrevencionPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Módulo de Capacitación – Prevención de Riesgos
        </h1>
        <p className="text-lg text-muted-foreground">
          Gestión de inducciones de acceso a faena y capacitaciones del sistema de gestión de seguridad y salud. En este MVP partimos por la inducción de acceso para visitas mediante código QR.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex flex-col justify-between transition-all hover:shadow-lg hover:-translate-y-1">
          <CardHeader>
            <CardTitle>
              Inducción de acceso a faena (visitas / QR)
            </CardTitle>
            <CardDescription>
              Formulario para que visitas, proveedores o inspectores realicen la
              inducción de acceso desde su teléfono, con preguntas de comprensión
              y firma digital.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              <Link
                href="/prevencion/capacitacion/induccion-acceso"
              >
                Abrir inducción de acceso
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Placeholders para futuros módulos */}
        <div className="rounded-xl border border-dashed bg-muted/50 p-4 text-sm text-muted-foreground flex items-center justify-center text-center">
          Cursos internos / Reentrenamientos – Próximamente
        </div>
        <div className="rounded-xl border border-dashed bg-muted/50 p-4 text-sm text-muted-foreground flex items-center justify-center text-center">
          Evaluación de capacitación – Próximamente
        </div>
      </div>
    </section>
  );
}
