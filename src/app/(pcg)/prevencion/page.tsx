import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, HardHat } from 'lucide-react';

export default function PrevencionPage() {
  return (
    <div className="space-y-8">
       <Button asChild variant="outline" size="sm">
          <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Dashboard</Link>
      </Button>

      <div className="space-y-4 max-w-3xl">
        <h1 className="text-4xl font-bold font-headline tracking-tight">Módulo de Prevención de Riesgos</h1>
        <p className="text-lg text-muted-foreground">
          Este módulo está siendo reconstruido desde cero para mejorar su funcionalidad y alinearlo con las nuevas capacidades de la plataforma.
        </p>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <HardHat className="h-6 w-6 text-blue-700" />
            </div>
            <div>
              <CardTitle className="text-blue-900">Módulo en Reconstrucción</CardTitle>
              <CardDescription className="text-blue-800">
                Todas las funcionalidades anteriores han sido desactivadas para dar paso a una nueva versión integrada.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-blue-800">Próximamente encontrarás aquí las herramientas renovadas para la gestión de seguridad y salud ocupacional.</p>
        </CardContent>
      </Card>
    </div>
  );
}
