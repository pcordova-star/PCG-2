"use client";
// src/app/prevencion/ppr/components/sections/PprSection4Iper.tsx
import { Button } from "@/components/ui/button";
import { IPERRegistro } from "@/types/pcg";
import { PprSectionContainer } from "../PprSectionContainer";
import { PprIperTable } from "../PprIperTable";

interface Props {
  iperData: IPERRegistro[];
}

export function PprSection4Iper({ iperData }: Props) {
  return (
    <PprSectionContainer
      title="Identificación de Peligros y Evaluación de Riesgos (IPER)"
      description="Matriz que detalla los peligros, riesgos y controles de cada actividad de la obra, incluyendo el enfoque de género."
    >
      {iperData.length === 0 ? (
        <div className="text-center bg-muted/50 p-8 rounded-lg">
          <p className="text-muted-foreground mb-4">No hay registros IPER para esta obra. La matriz IPER se gestiona desde el módulo de Formularios Generales.</p>
          <Button>Ir a gestión de IPER</Button>
        </div>
      ) : (
        <PprIperTable iperData={iperData} />
      )}
    </PprSectionContainer>
  );
}
