import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DS44MandantePage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-4xl font-bold font-headline tracking-tight">DS44 – Mandante / Obra</h1>
        <p className="text-lg text-muted-foreground">
          Esta vista mostrará a futuro un resumen global del cumplimiento DS44 en la obra, considerando tanto al mandante como a las empresas externas, y facilitando la gestión de la obligación de coordinar.
        </p>
      </div>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Página en Desarrollo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Este módulo está actualmente en desarrollo y servirá como un dashboard consolidado para la gestión de prevención a nivel de mandante. Por ahora es solo un placeholder.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
