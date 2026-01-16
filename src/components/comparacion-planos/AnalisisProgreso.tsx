// src/components/comparacion-planos/AnalisisProgreso.tsx
// Placeholder para el indicador de progreso del análisis

export default function AnalisisProgreso() {
  const jobStatus = "pending-upload"; // Placeholder, esto vendría de una prop o estado.
  const errorMessage = "Fallo en la etapa de análisis de diferencias."; // Placeholder.

  const allStatuses = [
    "pending-upload", "uploaded", "processing", "analyzing-diff",
    "analyzing-cubicacion", "generating-impactos", "completed", "error"
  ];

  return (
    <div>
      <h3>Progreso del Análisis</h3>
      
      {/* Indicador de estado general */}
      <div>Estado actual: <strong>{jobStatus}</strong></div>

      {/* Lista visual de estados */}
      <ul className="mt-4 space-y-2">
        {allStatuses.map(status => (
          <li key={status} className="flex items-center gap-2 text-sm">
            <span className="w-4 h-4 rounded-full bg-gray-300"></span>
            <span>{status}</span>
          </li>
        ))}
      </ul>

      {/* Sección de error */}
      {jobStatus === "error" && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <h4 className="font-semibold text-red-800">El análisis no pudo completarse</h4>
          <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
          <button className="mt-2 text-sm text-blue-600 hover:underline">
            Reintentar análisis
          </button>
        </div>
      )}
    </div>
  );
}
