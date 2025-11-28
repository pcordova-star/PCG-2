"use client";
// src/app/prevencion/ppr/components/sections/PprSection5MedidasControl.tsx
import { IPERRegistro } from "@/types/pcg";
import { PprSectionContainer } from "../PprSectionContainer";
import { PprControlesList } from "../PprControlesList";

interface Props {
  iperData: IPERRegistro[];
}

export function PprSection5MedidasControl({ iperData }: Props) {
  return (
    <PprSectionContainer
      title="Medidas de Control por cada Peligro"
      description="Descripción de los controles a implementar, generados automáticamente desde la matriz IPER."
    >
      {iperData.length === 0 ? (
        <p className="text-muted-foreground">No hay registros IPER para mostrar las medidas de control.</p>
      ) : (
        <PprControlesList iperData={iperData} />
      )}
    </PprSectionContainer>
  );
}
