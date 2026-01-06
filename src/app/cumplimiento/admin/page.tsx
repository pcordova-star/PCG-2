// src/app/cumplimiento/admin/page.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function AdminCumplimientoPage() {
    const { role, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && role !== 'admin_empresa' && role !== 'superadmin') {
            router.replace('/dashboard');
        }
    }, [role, loading, router]);

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (role !== 'admin_empresa' && role !== 'superadmin') {
        return null; // O un mensaje de acceso denegado mientras redirige
    }

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold">Panel de Cumplimiento Legal</h1>
                <p className="text-muted-foreground">Gestión de programas y revisión de documentación de subcontratistas.</p>
            </header>
            <Card>
                <CardHeader>
                    <CardTitle>Acciones rápidas</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Button asChild variant="outline">
                            <Link href="/cumplimiento/admin/programa">Configurar Programa</Link>
                        </Button>
                        <Button asChild>
                            <Link href="/cumplimiento/admin/subcontratistas">Gestionar Subcontratistas</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
