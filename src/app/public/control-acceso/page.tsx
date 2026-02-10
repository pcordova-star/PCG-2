// src/app/public/control-acceso/page.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AccesoSinObraPage() {
  return (
    <Card className="max-w-lg text-center">
      <CardHeader>
        <CardTitle className="flex items-center justify-center gap-2"><AlertTriangle className="h-6 w-6 text-destructive"/> Falta ID de Obra</CardTitle>
        <CardDescription>
          Este enlace de control de acceso es inválido porque no especifica a qué obra se está intentando ingresar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Por favor, asegúrate de escanear el código QR correcto proporcionado en la obra. Si el problema persiste, contacta al administrador del sitio.
        </p>
         <Button variant="outline" asChild className="mt-4">
            <Link href="/">Volver a la página principal</Link>
        </Button>
      </CardContent>
    </Card>
  );
}