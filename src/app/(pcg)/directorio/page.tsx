// src/app/(pcg)/directorio/page.tsx
"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function DirectorioDashboardPage() {
  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Dashboard
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Dashboard de Directorio</h1>
          <p className="text-muted-foreground">
            Vista consolidada del estado de todas las obras designadas.
          </p>
        </div>
      </header>

      <Card>
        <CardHeader>
            <CardTitle>En Construcción</CardTitle>
            <CardDescription>
                Este dashboard está siendo desarrollado y pronto mostrará los indicadores clave de sus obras.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Próximamente podrá visualizar aquí el avance general, costos y estado de seguridad de sus proyectos.</p>
        </CardContent>
      </Card>
    </div>
  );
}
