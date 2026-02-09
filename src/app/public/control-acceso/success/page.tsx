// src/app/public/control-acceso/success/page.tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import Link from "next/link";
import { PcgLogo } from "@/components/branding/PcgLogo";

export default function AccesoExitosoPage() {
  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4"><PcgLogo /></div>
          <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          <CardTitle className="mt-4">Registro Exitoso</CardTitle>
          <CardDescription>
            Tu información ha sido enviada correctamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            El administrador de la obra ha sido notificado de tu llegada. Por favor, espera instrucciones en la portería.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
