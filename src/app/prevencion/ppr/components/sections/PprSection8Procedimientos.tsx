"use client";
// src/app/prevencion/ppr/components/sections/PprSection8Procedimientos.tsx
import { Button } from "@/components/ui/button";
import { PprSectionContainer } from "../PprSectionContainer";

export function PprSection8Procedimientos() {
  return (
    <PprSectionContainer
      title="Procedimientos de Trabajo Seguro (PTS)"
      description="Listado de los PTS aplicables a la obra. Se pueden adjuntar documentos PDF o utilizar plantillas estandarizadas."
    >
      <div className="text-center bg-muted/50 p-8 rounded-lg">
            <p className="text-muted-foreground mb-4">Esta sección listará los Procedimientos de Trabajo Seguro. Próximamente podrás adjuntar los PDF de cada procedimiento.</p>
            <Button>Adjuntar Procedimiento</Button>
        </div>
    </PprSectionContainer>
  );
}
