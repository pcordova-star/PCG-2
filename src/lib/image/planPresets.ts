
export type PlanType = "arquitectura" | "estructura" | "electrico" | "sanitario" | "otros";

export type PlanPreset = {
  maxWidth: number;
  maxHeight: number;
  quality: number;   // JPEG
  maxSizeMb: number; // guardrail duro
};

export const PLAN_PRESETS: Record<PlanType, PlanPreset> = {
  arquitectura: { maxWidth: 2200, maxHeight: 2200, quality: 0.82, maxSizeMb: 6 },
  estructura:   { maxWidth: 2400, maxHeight: 2400, quality: 0.85, maxSizeMb: 7 },
  electrico:    { maxWidth: 2000, maxHeight: 2000, quality: 0.80, maxSizeMb: 5 },
  sanitario:    { maxWidth: 2000, maxHeight: 2000, quality: 0.80, maxSizeMb: 5 },
  otros:        { maxWidth: 2000, maxHeight: 2000, quality: 0.80, maxSizeMb: 5 },
};
