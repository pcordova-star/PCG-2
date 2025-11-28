"use client";
// src/app/prevencion/ppr/components/sections/PprSection7CapacitacionDs44.tsx
import { PprSectionContainer } from "../PprSectionContainer";
import { IPERRegistro } from "@/types/pcg";
import { useMemo } from "react";

interface Props {
  iperData: IPERRegistro[];
}

export function PprSection7CapacitacionDs44({ iperData }: Props) {
  const capacitaciones = useMemo(() => {
    const temas = new Set<string>();
    
    temas.add('Capacitación sobre el contenido de la matriz IPER con enfoque de género.');
    temas.add('Instrucción sobre el correcto uso y tallaje de Elementos de Protección Personal (EPP), destacando la disponibilidad de tallas para mujeres.');
    temas.add('Capacitación sobre los protocolos de protección de trabajadoras embarazadas y en período de lactancia.');

    iperData.forEach(iper => {
      if (iper.categoriaPeligro === 'Ergonómico' && !temas.has('Capacitación en ergonomía y manejo manual de cargas, con consideraciones diferenciadas.')) {
        temas.add('Capacitación en ergonomía y manejo manual de cargas, con consideraciones diferenciadas.');
      }
      if (iper.control_especifico_genero) {
        temas.add(`Capacitación sobre control de género: ${iper.control_especifico_genero}`);
      }
    });

    return Array.from(temas);
  }, [iperData]);

  return (
    <PprSectionContainer
      title="Plan de Capacitación Cumpliendo DS 44"
      description="Detalle de las capacitaciones obligatorias que incorporan el enfoque de género, según la normativa."
    >
      <div className="prose prose-sm max-w-none text-muted-foreground">
        <ul>
          {capacitaciones.map((tema, index) => (
            <li key={index}>{tema}</li>
          ))}
        </ul>
      </div>
    </PprSectionContainer>
  );
}
