// src/app/comparacion-planos/[jobId]/resultado/page.tsx
"use client";

import { useEffect, useState } from 'react';
import ResumenEjecutivo from "@/components/comparacion-planos/ResumenEjecutivo";
import ResultadoArbolImpactos from "@/components/comparacion-planos/ResultadoArbolImpactos";
import ResultadoCubicacion from "@/components/comparacion-planos/ResultadoCubicacion";
import ResultadoDiffTecnico from "@/components/comparacion-planos/ResultadoDiffTecnico";
import { Loader2 } from 'lucide-react';
import { ComparacionPlanosOutput, ComparacionError } from '@/types/comparacion-planos';

type JobData = {
    jobId: string;
    status: string;
    results: ComparacionPlanosOutput | null;
    errorMessage: ComparacionError | null;
};

export default function ResultadoPage({ params }: { params: { jobId: string } }) {
    const [jobData, setJobData] = useState<JobData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        const fetchJobData = async () => {
            try {
                const response = await fetch(`/api/comparacion-planos/estado/${params.jobId}`);
                if (!response.ok) {
                    throw new Error(`Error ${response.status}: No se pudo cargar el resultado del análisis.`);
                }
                const data = await response.json();
                setJobData(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchJobData();
    }, [params.jobId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Cargando resultados del análisis...</p>
            </div>
        );
    }
    
    if (error) {
        return <div className="text-center p-8 text-destructive bg-destructive/10 rounded-md">{error}</div>;
    }

    if (!jobData || !jobData.status) {
         return <div className="text-center p-8 text-muted-foreground">No se encontraron datos para este trabajo.</div>;
    }

    if (jobData.status !== 'completed') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">El análisis está en progreso. Estado actual: <span className="font-bold">{jobData.status}</span></p>
                <p className="text-xs mt-2">La página se actualizará automáticamente cuando finalice.</p>
            </div>
        );
    }
    
     if (jobData.status === 'error' && jobData.errorMessage) {
        return (
             <div className="text-center p-8 text-destructive bg-destructive/10 rounded-md">
                <h3 className="font-bold text-lg">Error en el Análisis</h3>
                <p className="mt-2">{jobData.errorMessage.message}</p>
                <p className="font-mono text-xs mt-1">Código: {jobData.errorMessage.code}</p>
            </div>
        );
    }

    if (!jobData.results) {
         return <div className="text-center p-8 text-muted-foreground">El análisis finalizó pero no se encontraron resultados.</div>;
    }

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Resultados del análisis para Job: <span className="font-mono text-2xl text-primary">{params.jobId}</span></h1>
            
            {/* 1. Resumen Ejecutivo */}
            <ResumenEjecutivo data={jobData.results} />
            
            {/* 2. Resultados detallados */}
            <div className="space-y-6">
                <ResultadoDiffTecnico data={jobData.results.diffTecnico} />
                <ResultadoCubicacion data={jobData.results.cubicacionDiferencial} />
                <ResultadoArbolImpactos data={jobData.results.arbolImpactos} />
            </div>
        </div>
    );
}
