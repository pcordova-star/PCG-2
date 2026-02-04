import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  addDoc,
  collection
} from "firebase/firestore";
import { firebaseDb } from "./firebaseClient";
import { Timestamp } from "firebase/firestore";

// 👉 Datos comunes del evento (lo que comparten los 3 formularios)
export interface EventoBaseData {
  obraId: string;
  eventoId: string;
  fechaEvento?: string;
  lugar?: string;
  tipoEvento?: string; // accidente, incidente, cuasi, etc.
  descripcionBreve?: string;
  trabajadorInvolucrado?: string;
  creadoPor?: string;
}

export interface IERData {
  fechaInforme?: string;
  horaInforme?: string;
  descripcionDetallada?: string;
  claseEvento?: string;
  consecuenciasPotenciales?: string;
  medidasInmediatas?: string;
}

export interface InvestigacionData {
  investigador?: string;
  fechaInvestigacion?: string;
  causasInmediatas?: string;
  causasBasales?: string;
  condicionesSubestandar?: string;
  actosSubestandar?: string;
  conclusiones?: string;
}

export interface PlanAccionData {
  objetivoGeneral?: string;
  acciones?: {
    accion: string;
    responsable: string;
    plazo: string;
    estado?: string;
  }[];
  fechaCompromisoCierre?: string;
  responsableSeguimiento?: string;
  observacionesSeguimiento?: string;
}

// Se importa la interfaz desde el archivo centralizado
import { InduccionAccesoFaena } from "./induccionAccesoFaena";
// También exportamos el tipo para mantener la compatibilidad con otros archivos que lo usen.
export type { InduccionAccesoFaena };

function eventoDocRef(obraId: string, eventoId: string) {
  return doc(firebaseDb, "obras", obraId, "eventosRiesgosos", eventoId);
}

// 🔹 Guardar / actualizar la parte IER (sin pisar lo demás)
export async function guardarIER(
  base: EventoBaseData,
  ier: IERData
) {
  const ref = eventoDocRef(base.obraId, base.eventoId);
  await setDoc(
    ref,
    {
      ...base,
      updatedAt: serverTimestamp(),
      ier: {
        ...ier,
        updatedAt: serverTimestamp(),
      },
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

// 🔹 Guardar / actualizar la parte de Investigación
export async function guardarInvestigacion(
  obraId: string,
  eventoId: string,
  data: InvestigacionData
) {
  const ref = eventoDocRef(obraId, eventoId);
  await setDoc(
    ref,
    {
      updatedAt: serverTimestamp(),
      investigacion: {
        ...data,
        updatedAt: serverTimestamp(),
      },
    },
    { merge: true }
  );
}

// 🔹 Guardar / actualizar la parte de Plan de Acción
export async function guardarPlanAccion(
  obraId: string,
  eventoId: string,
  data: PlanAccionData
) {
  const ref = eventoDocRef(obraId, eventoId);
  await setDoc(
    ref,
    {
      updatedAt: serverTimestamp(),
      planAccion: {
        ...data,
        updatedAt: serverTimestamp(),
      },
    },
    { merge: true }
  );
}

// 🔹 Leer todo el evento (con las 3 partes si existen)
export async function cargarEventoCompleto(
  obraId: string,
  eventoId: string
) {
  const ref = eventoDocRef(obraId, eventoId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data();
}

// Las funciones de inducción han sido movidas a su propio archivo `induccionAccesoFaena.ts`
// para evitar duplicidad y posibles errores de importación circular.
export { guardarInduccionAccesoFaena, guardarInduccionQR } from "./induccionAccesoFaena";