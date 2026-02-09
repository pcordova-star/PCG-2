
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { PcgLogo } from "@/components/branding/PcgLogo";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AccesoSuccessPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
             <Card className="w-full max-w-md text-center">
                <CardHeader className="space-y-4">
                    <div className="mx-auto w-fit">
                        <PcgLogo />
                    </div>
                     <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                    <CardTitle className="text-2xl">¡Registro Exitoso!</CardTitle>
                    <CardDescription>
                        Tu información ha sido enviada correctamente.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                       Ya puedes presentarte en la portería para completar tu ingreso. Gracias por tu cooperación.
                    </p>
                </CardContent>
                 <CardFooter>
                    <Button variant="link" asChild className="mx-auto">
                        <Link href="/">Volver al sitio principal</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
