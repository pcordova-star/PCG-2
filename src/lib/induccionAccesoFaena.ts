// src/lib/induccionAccesoFaena.ts
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

export interface InduccionAccesoFaena {
  id?: string;
  obraId: string;
  obraNombre?: string;
  generadorId?: string | null;
  tipoVisita: "VISITA" | "PROVEEDOR" | "INSPECTOR" | "OTRO";
  nombreCompleto: string;
  rut: string;
  empresa: string;
  cargo: string;
  telefono: string;
  correo: string;
  fechaIngreso: string;
  horaIngreso: string;
  respuestaPregunta1?: "SI" | "NO";
  respuestaPregunta2?: "SI" | "NO";
  respuestaPregunta3?: "SI" | "NO";
  aceptaReglamento: boolean;
  aceptaEpp: boolean;
  aceptaTratamientoDatos: boolean;
  firmaDataUrl?: string;
  origenRegistro?: "panel" | "qr";
  createdAt?: Timestamp;
}

export async function guardarInduccionAccesoFaena(
  data: Omit<InduccionAccesoFaena, "id" | "createdAt" | "origenRegistro">
): Promise<string> {
  const colRef = collection(firebaseDb, "induccionesAccesoFaena");
  const docRef = await addDoc(colRef, {
    ...data,
    origenRegistro: "panel",
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function guardarInduccionQR(
  data: Omit<InduccionAccesoFaena, "id" | "createdAt" | "origenRegistro">
): Promise<string> {
  const colRef = collection(firebaseDb, "induccionesAccesoFaena");
  const docRef = await addDoc(colRef, {
    ...data,
    origenRegistro: "qr",
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}
