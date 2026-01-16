// src/app/comparacion-planos/[jobId]/resultado/page.tsx
// Pantalla para mostrar los resultados del análisis
export default function JobResultPage({ params }: { params: { jobId: string } }) {
  return <div>Resultados del Análisis para el Job ID: {params.jobId}</div>;
}
