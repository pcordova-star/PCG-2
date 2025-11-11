import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function OperacionesPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-4xl font-bold font-headline tracking-tight">Módulo de Operaciones</h1>
        <p className="text-lg text-muted-foreground">
          Este módulo será independiente del de Prevención. En el futuro aquí irán tarjetas como “Programación”, “Avances”, etc.
        </p>
        <p className="text-foreground mt-4">
          Actualmente, este módulo se encuentra en fase de planificación y desarrollo. Las funcionalidades previstas incluirán la gestión detallada de las operaciones en campo, permitiendo un seguimiento en tiempo real del progreso y los recursos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <Card className="flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <CardHeader>
            <CardTitle className="font-headline">Programación de Obras</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow">
            <CardDescription>
              Define y revisa la programación de actividades por obra.
            </CardDescription>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/operaciones/programacion">Ir a Programación</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
