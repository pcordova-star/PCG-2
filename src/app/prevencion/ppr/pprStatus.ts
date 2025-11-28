// src/app/prevencion/ppr/pprStatus.ts
import { IPERRegistro, Charla } from "@/types/pcg";
import { differenceInDays } from 'date-fns';

export type PprStatusLevel = "verde" | "amarillo" | "rojo";

export type PprStatus = {
  nivel: PprStatusLevel;
  titulo: string;
  mensajes: string[];
};

interface CalcularPprStatusParams {
  iperRegistros: IPERRegistro[];
  charlas: Charla[];
}

export function calcularPprStatus({ iperRegistros, charlas }: CalcularPprStatusParams): PprStatus {
  const mensajes: string[] = [];
  
  // --- CONDICIONES PARA ESTADO ROJO (CRÍTICO) ---

  // 1. No hay IPER registrados
  if (iperRegistros.length === 0) {
    mensajes.push("No existen registros IPER para esta obra. Es fundamental identificar peligros y evaluar riesgos para iniciar la gestión preventiva.");
    return { nivel: "rojo", titulo: "PPR Crítico: Sin Matriz de Riesgos", mensajes };
  }

  // 2. Riesgos críticos sin charla asociada
  const riesgosCriticos = iperRegistros.filter(iper => 
    (iper.nivel_riesgo_hombre || 0) >= 15 || (iper.nivel_riesgo_mujer || 0) >= 15
  );

  const iperConCharla = new Set(charlas.map(c => c.iperId));
  const riesgosCriticosSinCharla = riesgosCriticos.filter(iper => !iperConCharla.has(iper.id));

  if (riesgosCriticosSinCharla.length > 0) {
    mensajes.push(`Hay ${riesgosCriticosSinCharla.length} riesgo(s) de nivel alto/crítico que no tienen una charla de seguridad asociada.`);
    riesgosCriticosSinCharla.slice(0, 2).forEach(iper => {
        mensajes.push(`- Riesgo Crítico: "${iper.peligro}" en la tarea "${iper.tarea}".`);
    });
  }
  
  // 3. No hay ninguna charla realizada
  const charlasRealizadas = charlas.filter(c => c.estado === 'realizada');
  if (charlas.length > 0 && charlasRealizadas.length === 0) {
    mensajes.push("Existen charlas creadas, pero ninguna ha sido marcada como 'realizada'. Es importante registrar la ejecución de las capacitaciones.");
  }

  if (mensajes.length > 0) {
      return { nivel: 'rojo', titulo: 'PPR Crítico: Riesgos Altos sin Control Comunicado', mensajes };
  }
  
  // --- CONDICIONES PARA ESTADO AMARILLO (CON OBSERVACIONES) ---
  
  // 1. Charlas en borrador por más de 7 días
  const hoy = new Date();
  const charlasBorradorAntiguas = charlas.filter(c => 
    c.estado === 'borrador' && 
    c.fechaCreacion && 
    differenceInDays(hoy, c.fechaCreacion.toDate()) > 7
  );

  if (charlasBorradorAntiguas.length > 0) {
    mensajes.push(`Existen ${charlasBorradorAntiguas.length} charlas en borrador con más de 7 días de antigüedad sin ser marcadas como realizadas.`);
  }

  // Lógica para Plan de Capacitación DS44 (a futuro)
  // Por ahora, es un placeholder.
  // const temasDs44Pendientes = planCapacitacion.filter(p => p.estado === 'pendiente').length;
  // if (temasDs44Pendientes > 0) {
  //   mensajes.push(`El Plan de Capacitación DS 44 tiene ${temasDs44Pendientes} temas pendientes de cubrir.`);
  // }
  
  if (mensajes.length > 0) {
      return { nivel: 'amarillo', titulo: 'PPR con Observaciones', mensajes };
  }

  // --- CONDICIÓN PARA ESTADO VERDE (AL DÍA) ---
  mensajes.push("El Programa de Prevención de Riesgos se encuentra al día según la información registrada en IPER y charlas de seguridad.");
  mensajes.push("Todos los riesgos críticos identificados tienen al menos una charla de seguridad asociada.");
  
  return { nivel: 'verde', titulo: 'PPR al Día', mensajes };
}
