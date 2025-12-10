// src/types/analisis-planos.ts

export type AnalisisPlanoInput = {
  photoDataUri: string; // data URI con mimetype + base64
  opcionesSeleccionadas: string[];
  notasUsuario?: string;
  obraId: string;
};

export type AnalisisPlanoElemento = {
  type: string;
  name: string;
  unit: string;
  estimatedQuantity: number;
  confidence: number; // 0 a 1
  notes: string;
};

export type AnalisisPlanoOutput = {
  summary: string;
  elements: AnalisisPlanoElemento[];
};
