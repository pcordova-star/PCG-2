// src/app/public/induccion/success/page.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { PcgLogo } from "@/components/branding/PcgLogo";

export default function InduccionSuccessPage() {
    return (
        <div className="min-h-screen bg-muted flex items-center justify-center p-4">
             <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto w-fit mb-4"><PcgLogo /></div>
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                    <CardTitle className="text-2xl pt-4">Registro Exitoso</CardTitle>
                    <CardDescription>Su información ha sido enviada correctamente.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Ya puede cerrar esta ventana y presentarse en la portería de la obra para continuar con su ingreso.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}