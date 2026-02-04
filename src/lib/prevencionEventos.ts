import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  addDoc,
  collection,
  Timestamp,
} from "firebase/firestore";
import { firebaseDb } from "./firebaseClient";

export interface EventoBaseData {
  obraId: string;
  eventoId: string;
  fechaEvento?: string;
  lugar?: string;
  tipoEvento?: string;
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


function eventoDocRef(obraId: string, eventoId: string) {
  return doc(firebaseDb, "obras", obraId, "eventosRiesgosos", eventoId);
}

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

export async function cargarEventoCompleto(
  obraId: string,
  eventoId: string
) {
  const ref = eventoDocRef(obraId, eventoId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data();
}
