// src/app/public/control-acceso/success/page.tsx
"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { PcgLogo } from "@/components/branding/PcgLogo";

export default function SuccessPage() {
    return (
        <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto w-fit mb-4"><PcgLogo /></div>
                    <CardTitle className="flex items-center justify-center gap-2">
                        <CheckCircle className="h-8 w-8 text-green-500" />
                        Registro Exitoso
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Tus datos han sido enviados correctamente. Por favor, espera las instrucciones del personal de la obra para continuar con tu ingreso.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
