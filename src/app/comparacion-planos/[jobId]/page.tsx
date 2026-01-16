// src/app/comparacion-planos/[jobId]/page.tsx
// Pantalla para mostrar el progreso del análisis
export default function JobStatusPage({ params }: { params: { jobId: string } }) {
  return <div>Progreso del Análisis para el Job ID: {params.jobId}</div>;
}
