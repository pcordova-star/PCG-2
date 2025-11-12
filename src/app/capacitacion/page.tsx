import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function CapacitacionPage() {
  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Módulo de Capacitación
        </h1>
        <p className="text-lg text-muted-foreground">
          Gestión de inducciones, capacitaciones y registros de acceso a faena.
          En este MVP partimos por la inducción de acceso para visitas mediante QR.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="flex flex-col justify-between transition-all hover:shadow-lg hover:-translate-y-1">
          <CardHeader>
            <CardTitle>
              Inducción de acceso a faena (visitas / QR)
            </CardTitle>
            <CardDescription>
              Formulario simple para que visitas, proveedores o inspectores
              realicen la inducción de acceso desde su teléfono, con preguntas
              de comprensión y firma digital.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link
              href="/capacitacion/induccion-acceso"
              className="inline-flex items-center justify-center rounded-lg border border-accent px-3 py-1.5 text-sm font-medium text-accent-foreground bg-accent hover:bg-accent/90 transition w-full"
            >
              Abrir inducción de acceso
            </Link>
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
