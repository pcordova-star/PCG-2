"use client";
// src/app/prevencion/ppr/components/sections/PprSection10Fiscalizacion.tsx
import { PprSectionContainer, PprPlaceholderField } from "../PprSectionContainer";
import { IPERRegistro } from "@/types/pcg";
import { useMemo } from "react";

interface Props {
  iperData: IPERRegistro[];
}

export function PprSection10Fiscalizacion({ iperData }: Props) {
  const recomendaciones = useMemo(() => {
    const riesgosCriticos = iperData.filter(iper => (iper.nivel_riesgo_hombre || 0) >= 15 || (iper.nivel_riesgo_mujer || 0) >= 15);
    
    if (riesgosCriticos.length === 0) {
      return { frecuencia: "Semanal", responsable: "Prevencionista en Terreno", checklists: "Checklist de Orden y Aseo, Checklist de EPP." };
    }
    
    const checklistItems = new Set<string>();
    riesgosCriticos.forEach(iper => {
      if (iper.peligro.toLowerCase().includes('altura')) checklistItems.add('Trabajo en Altura');
      if (iper.peligro.toLowerCase().includes('eléctrico')) checklistItems.add('Riesgo Eléctrico');
      if (iper.peligro.toLowerCase().includes('excavaci')) checklistItems.add('Excavaciones');
    });

    return {
      frecuencia: "Diaria para riesgos críticos, Semanal para generales.",
      responsable: "Supervisor de área y Prevencionista de Riesgos.",
      checklists: `Checklist Generales + Específicos para: ${Array.from(checklistItems).join(', ')}.`
    };
  }, [iperData]);


  return (
    <PprSectionContainer
      title="Plan de Fiscalización Interna"
      description="Programa de inspecciones y observaciones planeadas para verificar el cumplimiento de las medidas de seguridad en terreno."
    >
        <div className="space-y-4">
            <PprPlaceholderField label="Frecuencia de inspecciones" value={recomendaciones.frecuencia} />
            <PprPlaceholderField label="Responsable de fiscalización" value={recomendaciones.responsable} />
            <PprPlaceholderField label="Checklists aplicables" value={recomendaciones.checklists} />
        </div>
    </PprSectionContainer>
  );
}
