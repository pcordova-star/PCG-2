"use client";

import UploadPlanesForm from "@/components/comparacion-planos/UploadPlanesForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function UploadPage() {
    const router = useRouter();
    const { user, company, role, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const hasAccess = useMemo(() => {
        if (authLoading) return false;
        if (role === 'superadmin') return true;
        if (!company) return false;
        const allowedRoles = ["admin_empresa", "jefe_obra"];
        return company.feature_plan_comparison_enabled === true && allowedRoles.includes(role);
    }, [company, role, authLoading]);

    const handleFormSubmit = async (files: { planoA: File; planoB: File }) => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Error de autenticación', description: 'Debes iniciar sesión para iniciar un análisis.' });
            return;
        }

        setIsSubmitting(true);
        toast({ title: "Subiendo archivos...", description: "Por favor espere." });

        try {
            const token = await user.getIdToken();
            const formData = new FormData();
            formData.append('planoA', files.planoA);
            formData.append('planoB', files.planoB);

            const response = await fetch('/api/comparacion-planos/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Error en el servidor al subir los archivos.');
            }

            toast({
                title: "Análisis iniciado",
                description: `Job creado con ID: ${result.jobId}`,
            });

            router.push(`/comparacion-planos/${result.jobId}`);
            
        } catch (error: any) {
            console.error("Error al iniciar análisis:", error);
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (authLoading) {
        return <div className="max-w-6xl mx-auto px-4 py-8">Cargando...</div>
    }

    if (!hasAccess) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-8">
                <Button asChild variant="outline" size="sm" className="mb-4">
                    <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Dashboard</Link>
                </Button>
                <Card className="max-w-2xl mx-auto">
                    <CardHeader className="items-center text-center">
                        <ShieldAlert className="h-12 w-12 text-destructive"/>
                        <CardTitle>Acceso Denegado</CardTitle>
                        <CardDescription>
                            No tienes permisos para acceder al módulo de Comparación de Planos. Contacta a un administrador para habilitar esta función para tu empresa.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
            <header className="space-y-2">
                 <Button asChild variant="outline" size="sm">
                  <Link href="/comparacion-planos/historial">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver al Historial
                  </Link>
                </Button>
                 <h1 className="text-3xl font-semibold text-gray-900">Comparación de Planos con IA</h1>
                 <p className="text-muted-foreground">
                    Sube dos versiones de un mismo plano (original y modificado) para que la IA detecte las diferencias,
                    analice el impacto en la cubicación y evalúe las consecuencias en las distintas especialidades.
                </p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Cargar Planos</CardTitle>
                    <CardDescription>
                       Selecciona la versión original (Plano A) y la versión modificada (Plano B). Los archivos pueden ser JPG o PNG.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <UploadPlanesForm onSubmit={handleFormSubmit} isSubmitting={isSubmitting} />
                </CardContent>
            </Card>
        </div>
    );
}
