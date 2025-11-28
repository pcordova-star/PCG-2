"use client";
// src/app/prevencion/ppr/components/sections/PprSection12EnfoqueGenero.tsx
import { PprSectionContainer } from "../PprSectionContainer";

export function PprSection12EnfoqueGenero() {
  return (
    <PprSectionContainer
      title="Enfoque de Género (Obligatorio DS 44)"
      description="Sección explícita que demuestra cómo el programa considera y aborda las diferencias de género en la gestión de riesgos."
    >
      <div className="prose prose-sm max-w-none text-muted-foreground">
        <p>Este programa integra activamente el enfoque de género en cumplimiento con el DS 44, a través de las siguientes acciones:</p>
        <ul>
            <li><strong>Evaluación de Riesgos Diferenciada:</strong> La matriz IPER incluye una evaluación separada de probabilidad y consecuencia para hombres y mujeres, considerando factores ergonómicos y de exposición.</li>
            <li><strong>Medidas de Control Específicas:</strong> Se han definido controles específicos, como la adecuación de límites de manejo manual de cargas y la provisión de EPP en tallajes adecuados.</li>
            <li><strong>Protección a la Maternidad:</strong> Se establecen protocolos claros para la protección de trabajadoras embarazadas y en período de lactancia, reasignando tareas de riesgo cuando sea necesario.</li>
            <li><strong>Capacitación Inclusiva:</strong> El plan de capacitación incluye módulos específicos sobre ergonomía y uso de EPP con perspectiva de género.</li>
        </ul>
      </div>
    </PprSectionContainer>
  );
}
