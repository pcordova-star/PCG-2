"use client";

import UploadPlanesForm from "@/components/comparacion-planos/UploadPlanesForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useState } from 'react';

export default function UploadPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFormSubmit = async (files: { planoA: File; planoB: File }) => {
        console.log("Archivos seleccionados:", files);
        alert("Se recibieron los archivos. Aún no se inicia el análisis.");

        // Placeholder for future logic
        // setIsSubmitting(true);
        // try {
        //     const formData = new FormData();
        //     formData.append('planoA', files.planoA);
        //     formData.append('planoB', files.planoB);
        //
        //     // ... Lógica para llamar a /api/comparacion-planos/create
        //
        // } catch (error) {
        //     console.error("Error al iniciar análisis:", error);
        // } finally {
        //     setIsSubmitting(false);
        // }
    };
    
    return (
        <div className="max-w-2xl mx-auto">
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
