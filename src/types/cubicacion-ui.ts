// src/types/cubicacion-ui.ts
import { PlanPreset } from "@/lib/image/planPresets";

export type CubicacionUiMetrics = {
  sizeMb: number;
  width: number;
  height: number;
  planType: string;
  preset: PlanPreset;
  estimatedCost: "bajo" | "medio" | "alto";
  cacheLikely: boolean;
};
