"use client";
// src/app/prevencion/ppr/components/sections/PprSection1InfoGeneral.tsx
import { Obra } from "@/types/pcg";
import { PprSectionContainer, PprPlaceholderField } from "../PprSectionContainer";

interface Props {
  obra: Obra | null;
}

export function PprSection1InfoGeneral({ obra }: Props) {
  if (!obra) {
    return (
      <PprSectionContainer
        title="Información General de la Obra"
        description="Datos base del Programa de Prevención de Riesgos. Seleccione una obra para cargar los datos."
      >
        <p className="text-muted-foreground">Seleccione una obra para ver la información.</p>
      </PprSectionContainer>
    );
  }

  return (
    <PprSectionContainer
      title="Información General de la Obra"
      description="Datos base del Programa de Prevención de Riesgos, obtenidos desde el módulo de Obras."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PprPlaceholderField label="Nombre de la obra" value={obra.nombreFaena} />
        <PprPlaceholderField label="Ubicación" value={obra.direccion || 'No especificada'} />
        <PprPlaceholderField label="Empresa mandante" value={obra.mandanteRazonSocial || 'No especificada'} />
        <PprPlaceholderField label="Empresa contratista" value={obra.empresa?.nombre || 'Constructora PCG Ltda.'} />
        <PprPlaceholderField label="Fecha de inicio" value={obra.fechaInicio ? new Date(obra.fechaInicio + 'T00:00:00').toLocaleDateString('es-CL') : 'No especificada'} />
        <PprPlaceholderField label="Fecha de término estimada" value={obra.fechaTermino ? new Date(obra.fechaTermino + 'T00:00:00').toLocaleDateString('es-CL') : 'No especificada'} />
        <PprPlaceholderField label="Dotación proyectada (promedio)" value={obra.dotacionProyectada?.toString() || 'No especificada'} />
        <PprPlaceholderField label="Prevencionista responsable" value={obra.prevencionistaNombre || 'No especificado'} />
      </div>
    </PprSectionContainer>
  );
}
