// src/app/cuenta-bloqueada/page.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ShieldAlert, LogOut } from "lucide-react";
import { PcgLogo } from "@/components/branding/PcgLogo";
import Link from "next/link";

export default function CuentaBloqueadaPage() {
    const { logout, company } = useAuth();

    const isTrialExpired = company?.planTipo === 'trial';
    const title = isTrialExpired ? "Período de Prueba Finalizado" : "Cuenta Suspendida";
    const description = isTrialExpired 
        ? "Tu período de prueba ha terminado. Para continuar usando la plataforma, por favor, contacta a nuestro equipo de ventas."
        : "El acceso a esta cuenta ha sido suspendido. Por favor, contacta al administrador de la plataforma para más información.";

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto w-fit mb-4">
                        <PcgLogo />
                    </div>
                    <CardTitle className="text-2xl flex items-center justify-center gap-2">
                        <ShieldAlert className="h-7 w-7 text-destructive" />
                        {title}
                    </CardTitle>
                    <CardDescription>
                        {description}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-center text-sm">
                   <p>
                        Para reactivar tu cuenta o contratar un plan, puedes escribirnos a:
                   </p>
                   <p className="font-semibold text-primary">
                       <a href="mailto:ventas@pcg.cl">ventas@pcg.cl</a>
                   </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button onClick={logout} className="w-full">
                        <LogOut className="mr-2 h-4 w-4" />
                        Cerrar Sesión
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
