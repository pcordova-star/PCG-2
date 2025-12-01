// src/lib/iperPlantillasElectricas.ts
import { IPERRegistro } from "@/types/pcg";

export interface IperPlantilla {
  id: string;
  nombre: string;
  descripcion: string;
  valores: Partial<Omit<IPERRegistro, 'id' | 'createdAt'>>;
}

export const IPER_PLANTILLAS_ELECTRICAS: IperPlantilla[] = [
  {
    id: "comisionamiento_tablero",
    nombre: "Comisionamiento de Tablero Eléctrico",
    descripcion: "Puesta en servicio de tablero BT en sala eléctrica.",
    valores: {
      tarea: "Comisionamiento y puesta en servicio de tablero eléctrico BT",
      zona: "Sala eléctrica / Tablero BT",
      categoriaPeligro: "Físico",
      peligro: "Contacto con energía eléctrica (directo/indirecto)",
      riesgo: "Electrocución, shock eléctrico, quemaduras por arco.",
      probabilidad_hombre: 4,
      consecuencia_hombre: 5,
      probabilidad_mujer: 4,
      consecuencia_mujer: 5,
      jerarquiaControl: "Control Administrativo",
      control_especifico_genero: "Procedimiento de trabajo seguro (PTS) para comisionamiento, uso de EPP dieléctrico y ropa ignífuga. Despeje y señalización del área.",
      responsable: "Supervisor Eléctrico",
      plazo: "", // Se deja vacío para que lo defina el usuario
      estadoControl: "PENDIENTE",
      probabilidad_residual: 2,
      consecuencia_residual: 4,
    }
  },
  {
    id: "energizacion_circuito",
    nombre: "Energización de Circuito",
    descripcion: "Maniobra de energización de un circuito desde un tablero.",
    valores: {
      tarea: "Energización de circuito eléctrico desde tablero",
      zona: "Sala eléctrica",
      categoriaPeligro: "Físico",
      peligro: "Arco eléctrico durante maniobra de interruptor",
      riesgo: "Quemaduras graves, proyección de partículas",
      probabilidad_hombre: 3,
      consecuencia_hombre: 5,
      probabilidad_mujer: 3,
      consecuencia_mujer: 5,
      jerarquiaControl: "EPP",
      control_especifico_genero: "Uso de traje ignífugo (Arc Flash), careta facial, guantes dieléctricos. Maniobra realizada por personal autorizado y con 2do verificador.",
      responsable: "Eléctrico de turno",
      plazo: "",
      estadoControl: "PENDIENTE",
      probabilidad_residual: 1,
      consecuencia_residual: 4,
    }
  },
  {
    id: "mantenimiento_tablero_energizado",
    nombre: "Mantenimiento en Tablero Bajo Tensión",
    descripcion: "Inspección y ajuste en tablero en servicio.",
    valores: {
      tarea: "Mantenimiento preventivo en tablero energizado",
      zona: "Sala de control",
      categoriaPeligro: "Físico",
      peligro: "Contacto con partes y piezas energizadas",
      riesgo: "Electrocución, Fibrilación ventricular",
      probabilidad_hombre: 5,
      consecuencia_hombre: 5,
      probabilidad_mujer: 5,
      consecuencia_mujer: 5,
      jerarquiaControl: "Control Administrativo",
      control_especifico_genero: "Procedimiento de trabajo en caliente, bloqueo LOTO si aplica parcialmente, delimitación de 'zona prohibida'.",
      responsable: "Jefe de Mantenimiento",
      plazo: "",
      estadoControl: "PENDIENTE",
      probabilidad_residual: 2,
      consecuencia_residual: 5,
    }
  },
];
