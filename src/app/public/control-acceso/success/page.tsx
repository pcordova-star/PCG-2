// src/app/public/control-acceso/success/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { PcgLogo } from "@/components/branding/PcgLogo";

export default function AccesoSuccessPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-fit">
            <PcgLogo />
          </div>
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <CheckCircle className="h-7 w-7 text-green-600" />
            Registro Exitoso
          </CardTitle>
          <CardDescription>
            Tus datos han sido recibidos correctamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            Has sido registrado para el ingreso a la obra. Por favor, avisa a tu contacto que has llegado.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            PCG - Plataforma de Control y Gestión
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
