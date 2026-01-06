// src/app/cumplimiento/contratista/page.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function ContratistaDashboardPage() {
    const { role, loading, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && role !== 'contratista' && role !== 'superadmin') {
            router.replace('/dashboard');
        }
    }, [role, loading, router]);

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold">Portal del Contratista</h1>
                <p className="text-muted-foreground">Bienvenido, {user?.displayName || user?.email}.</p>
            </header>
            <Card>
                <CardHeader>
                    <CardTitle>Estado de Cumplimiento</CardTitle>
                    <CardDescription>Sube y gestiona la documentación requerida para el período actual.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">El dashboard del contratista con la lista de documentos requeridos y el formulario de carga se implementará aquí.</p>
                    <Button className="mt-4">Cargar Documentación</Button>
                </CardContent>
            </Card>
        </div>
    );
}
