// src/lib/image/cubicacionMetrics.ts
import { PLAN_PRESETS, PlanType } from "@/lib/image/planPresets";

export function computeCubicacionMetrics(
  imageDataUrl: string,
  planType: PlanType,
  width: number,
  height: number
) {
  const preset = PLAN_PRESETS[planType];
  const sizeMb = (imageDataUrl.length * 3) / 4 / 1024 / 1024;

  let estimatedCost: "bajo" | "medio" | "alto" = "bajo";
  if (sizeMb > 4) estimatedCost = "medio";
  if (sizeMb > 6) estimatedCost = "alto";

  return {
    sizeMb: Number(sizeMb.toFixed(2)),
    width,
    height,
    planType,
    preset,
    estimatedCost,
    cacheLikely: true, // Asumimos que la misma imagen siempre producirá el mismo hash
  };
}
