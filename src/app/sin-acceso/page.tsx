
// src/app/sin-acceso/page.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ShieldAlert, LogOut } from "lucide-react";
import { PcgLogo } from "@/components/branding/PcgLogo";
import Link from "next/link";

export default function SinAccesoPage() {
    const { logout, user } = useAuth();

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto w-fit mb-4">
                        <PcgLogo />
                    </div>
                    <CardTitle className="text-2xl flex items-center justify-center gap-2">
                        <ShieldAlert className="h-7 w-7 text-destructive" />
                        Acceso Restringido
                    </CardTitle>
                    <CardDescription>
                        No tienes los permisos necesarios para acceder a la plataforma.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-center text-sm">
                    <p>
                        Tu cuenta (<strong className="font-mono">{user?.email || '...'}</strong>) ha sido autenticada correctamente, pero no está asociada a ninguna empresa o rol dentro de PCG.
                    </p>
                    <p className="text-muted-foreground">
                        Por favor, contacta al administrador de tu empresa para que te asigne los permisos correspondientes. Una vez asignados, podrás acceder a la plataforma.
                    </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button onClick={logout} className="w-full">
                        <LogOut className="mr-2 h-4 w-4" />
                        Cerrar Sesión
                    </Button>
                     <Button variant="link" asChild className="text-xs text-muted-foreground">
                        <Link href="/login/usuario">
                            Volver a la página de inicio
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
