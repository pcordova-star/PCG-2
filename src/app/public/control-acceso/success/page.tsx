// src/app/public/control-acceso/success/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import Link from "next/link";
import { PcgLogo } from "@/components/branding/PcgLogo";

export default function InductionSuccessPage() {
    return (
        <div className="min-h-screen bg-muted/40 p-4 flex items-center justify-center">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto w-fit mb-4"><PcgLogo /></div>
                    <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                    <CardTitle className="pt-4">¡Registro Exitoso!</CardTitle>
                    <CardDescription>Tu ingreso ha sido registrado correctamente.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Por favor, preséntate en la portería o con el encargado de la obra para continuar con tu acceso.
                    </p>
                </CardContent>
                <CardFooter>
                    <Button asChild className="w-full" variant="outline">
                        <Link href="/">Volver a la página principal</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
