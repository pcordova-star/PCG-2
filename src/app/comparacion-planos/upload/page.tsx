"use client";

import UploadPlanesForm from "@/components/comparacion-planos/UploadPlanesForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function UploadPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFormSubmit = async (files: { planoA: File; planoB: File }) => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Error de autenticación', description: 'Debes iniciar sesión para iniciar un análisis.' });
            return;
        }

        setIsSubmitting(true);
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

            // Navegar a la página de progreso
            router.push(`/comparacion-planos/${result.jobId}`);
            
        } catch (error: any) {
            console.error("Error al iniciar análisis:", error);
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
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
