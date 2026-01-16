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
import { processFileBeforeUpload } from "@/lib/comparacion-planos/convertToJpeg";

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
        toast({ title: "Preparando archivos...", description: "Convirtiendo PDFs si es necesario. Esto puede tardar un momento." });

        try {
            const [processedPlanoA, processedPlanoB] = await Promise.all([
                processFileBeforeUpload(files.planoA),
                processFileBeforeUpload(files.planoB)
            ]);

            const token = await user.getIdToken();
            const formData = new FormData();
            formData.append('planoA', processedPlanoA);
            formData.append('planoB', processedPlanoB);

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
        return <div>Cargando...</div>
    }

    if (!hasAccess) {
        return (
            <div className="max-w-2xl mx-auto text-center space-y-4">
                 <Button asChild variant="outline" size="sm">
                    <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Dashboard</Link>
                </Button>
                <Card>
                    <CardHeader className="items-center">
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
        <div className="max-w-2xl mx-auto space-y-6">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Dashboard
              </Link>
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle>Comparación de Planos con IA</CardTitle>
                    <CardDescription>
                        Sube dos versiones de un mismo plano (original y modificado) para que la IA detecte las diferencias,
                        analice el impacto en la cubicación y evalúe las consecuencias en las distintas especialidades.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <UploadPlanesForm onSubmit={handleFormSubmit} isSubmitting={isSubmitting} />
                </CardContent>
            </Card>
        </div>
    );
}
