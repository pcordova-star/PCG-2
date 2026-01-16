// src/app/comparacion-planos/[jobId]/resultado/page.tsx
import ResumenEjecutivo from "@/components/comparacion-planos/ResumenEjecutivo";
import ResultadoArbolImpactos from "@/components/comparacion-planos/ResultadoArbolImpactos";
import ResultadoCubicacion from "@/components/comparacion-planos/ResultadoCubicacion";
import ResultadoDiffTecnico from "@/components/comparacion-planos/ResultadoDiffTecnico";

export default function ResultadoPage({ params }: { params: { jobId: string } }) {
    return (
        <div>
            <h1>Resultados del análisis para Job: {params.jobId}</h1>
            
            {/* 1. Resumen Ejecutivo (NUEVO) */}
            <ResumenEjecutivo />
            
            {/* 2. Resultados detallados */}
            <div className="space-y-6">
                <ResultadoDiffTecnico />
                <ResultadoCubicacion />
                <ResultadoArbolImpactos />
            </div>
        </div>
    );
}
