"use client";
// src/app/prevencion/ppr/components/sections/PprSection2Objetivo.tsx
import { PprSectionContainer } from "../PprSectionContainer";

export function PprSection2Objetivo() {
  return (
    <PprSectionContainer
      title="Objetivo del Programa"
      description="Declaración de principios y metas del Programa de Prevención de Riesgos de la obra."
    >
      <div className="prose prose-sm max-w-none text-muted-foreground">
        <p>El presente Programa de Prevención de Riesgos (PPR) tiene como objetivo principal establecer un sistema de gestión proactivo para identificar, evaluar y controlar los riesgos laborales inherentes a las actividades de la obra, con el fin de proteger la vida y salud de todos los trabajadores, tanto propios como de empresas contratistas y subcontratistas.</p>
        <p>Los objetivos específicos de este programa son:</p>
        <ul>
          <li>Prevenir la ocurrencia de accidentes del trabajo y enfermedades profesionales.</li>
          <li>Dar cumplimiento a la normativa legal vigente, incluyendo el DS 40, DS 44, DS 16 y otros cuerpos legales aplicables.</li>
          <li>Implementar y verificar la eficacia de las medidas de control definidas en la matriz IPER (Identificación de Peligros y Evaluación de Riesgos).</li>
          <li>Integrar de manera transversal el enfoque de género en toda la gestión preventiva, conforme a las modificaciones del DS 44, garantizando condiciones equitativas y seguras para todos los trabajadores y trabajadoras.</li>
          <li>Fomentar una cultura de seguridad participativa y de autocuidado en todos los niveles de la organización.</li>
        </ul>
      </div>
    </PprSectionContainer>
  );
}
