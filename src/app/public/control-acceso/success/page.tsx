// src/app/public/control-acceso/success/page.tsx
"use client";

import { PcgLogo } from "@/components/branding/PcgLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import Link from "next/link";

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto w-fit mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">¡Registro Completado!</CardTitle>
          <CardDescription>
            Tu ingreso y la inducción de seguridad han sido registrados correctamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Ya puedes ingresar a la obra. Que tengas una jornada segura y productiva.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
             <PcgLogo size={80}/>
        </CardFooter>
      </Card>
    </div>
  );
}
