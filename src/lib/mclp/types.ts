// src/lib/mclp/types.ts
export type Periodicidad = "mensual";

export type ComplianceProgramUpdate = {
  periodicidad?: Periodicidad;
  diaCorteCarga?: number | null;
  diaLimiteRevision?: number | null;
  diaPago?: number | null;
};

export type ComplianceRequirementInput = {
  nombreDocumento: string;
  descripcion?: string;
  esObligatorio: boolean;
};
