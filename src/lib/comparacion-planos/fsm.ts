// src/lib/comparacion-planos/fsm.ts

export type ComparacionJobStatus =
  | "pending-upload"
  | "uploaded"
  | "processing"
  | "analyzing-diff"
  | "analyzing-cubicacion"
  | "generating-impactos"
  | "completed"
  | "error";

export const ComparacionPlanosFSM = {
  validStatuses: [
    "pending-upload",
    "uploaded",
    "processing",
    "analyzing-diff",
    "analyzing-cubicacion",
    "generating-impactos",
    "completed",
    "error",
  ],
  transitions: {
    "pending-upload": ["uploaded", "error"],
    "uploaded": ["processing", "error"],
    "processing": ["analyzing-diff", "error"],
    "analyzing-diff": ["analyzing-cubicacion", "error"],
    "analyzing-cubicacion": ["generating-impactos", "error"],
    "generating-impactos": ["completed", "error"],
    "completed": [],
    "error": [],
  } as const,
};
