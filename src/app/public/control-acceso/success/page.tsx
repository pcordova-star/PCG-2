'use client';

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import Link from "next/link";
import { PcgLogo } from "@/components/branding/PcgLogo";

export default function SuccessPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto mb-4">
                        <PcgLogo />
                    </div>
                    <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                    <CardTitle className="mt-4 text-2xl">¡Registro Exitoso!</CardTitle>
                    <CardDescription>Tu ingreso ha sido registrado correctamente.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Ya puedes cerrar esta ventana. Gracias por tu cooperación.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
