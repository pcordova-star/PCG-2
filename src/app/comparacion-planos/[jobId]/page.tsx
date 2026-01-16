
// src/app/comparacion-planos/[jobId]/page.tsx
export default function ProgresoPage({ params }: { params: { jobId: string } }) {
    return (
        <div>
            <h1>Estado del análisis: {params.jobId}</h1>
            {/* AnalisisProgreso */}
        </div>
    );
}
