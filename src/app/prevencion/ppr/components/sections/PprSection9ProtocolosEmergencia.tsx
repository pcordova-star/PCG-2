"use client";
// src/app/prevencion/ppr/components/sections/PprSection9ProtocolosEmergencia.tsx
import { PprSectionContainer } from "../PprSectionContainer";

export function PprSection9ProtocolosEmergencia() {
  return (
    <PprSectionContainer
      title="Protocolos de Emergencia"
      description="Planes de acción específicos para situaciones de emergencia, como incendios, sismos o accidentes graves."
    >
      <div className="prose prose-sm max-w-none text-muted-foreground">
        <ul>
            <li><strong>Plan de Evacuación:</strong> Define las vías de escape, zonas de seguridad y puntos de encuentro.</li>
            <li><strong>Protocolo de Incendios:</strong> Instrucciones sobre el uso de extintores, ubicación de la red húmeda y contacto con bomberos.</li>
            <li><strong>Protocolo de Primeros Auxilios:</strong> Pasos a seguir en caso de accidente, ubicación de botiquines y contacto de emergencia.</li>
            <li><strong>Protocolo de Rescate en Altura:</strong> Procedimiento específico para emergencias en trabajos de altura.</li>
        </ul>
      </div>
    </PprSectionContainer>
  );
}
