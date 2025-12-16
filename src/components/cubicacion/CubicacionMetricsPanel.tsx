// src/components/cubicacion/CubicacionMetricsPanel.tsx
"use client";

import { CubicacionUiMetrics } from "@/types/cubicacion-ui";

export default function CubicacionMetricsPanel({
  metrics,
}: {
  metrics: CubicacionUiMetrics | null;
}) {
  if (!metrics) return null;

  const costColor =
    metrics.estimatedCost === "bajo"
      ? "text-green-700"
      : metrics.estimatedCost === "medio"
      ? "text-yellow-700"
      : "text-red-700";

  return (
    <div className="rounded-md border bg-slate-50 p-4 text-sm space-y-2">
      <div className="font-medium">Métricas de cubicación</div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span className="text-muted-foreground">Peso imagen</span>
        <span className="font-semibold">{metrics.sizeMb} MB</span>

        <span className="text-muted-foreground">Resolución</span>
        <span className="font-semibold">
          {metrics.width} × {metrics.height}px
        </span>

        <span className="text-muted-foreground">Tipo de plano</span>
        <span className="font-semibold">{metrics.planType}</span>

        <span className="text-muted-foreground">Preset</span>
        <span className="font-semibold">
          {metrics.preset.maxWidth}px · Q{metrics.preset.quality * 100}
        </span>

        <span className="text-muted-foreground">Costo estimado</span>
        <span className={`font-bold ${costColor}`}>
          {metrics.estimatedCost.toUpperCase()}
        </span>

        <span className="text-muted-foreground">Cache probable</span>
        <span className="font-semibold">{metrics.cacheLikely ? "Sí" : "No"}</span>
      </div>

      {metrics.estimatedCost === "alto" && (
        <div className="mt-2 rounded-md bg-red-100 p-2 text-xs text-red-800 border border-red-200">
          ⚠ Imagen pesada. Considera reducir la escala o usar un preset más agresivo para evitar errores y costos elevados.
        </div>
      )}
    </div>
  );
}
