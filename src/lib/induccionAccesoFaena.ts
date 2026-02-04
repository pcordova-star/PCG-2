import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { firebaseDb } from "./firebaseClient";
import { Timestamp } from "firebase/firestore";

// 👉 Datos comunes del evento (lo que comparten los 3 formularios)
export interface InduccionAccesoFaena {
  id?: string;

  // Datos de la obra
  obraId: string;
  obraNombre?: string;
  generadorId?: string | null;

  // Datos de la persona
  tipoVisita: "VISITA" | "PROVEEDOR" | "INSPECTOR" | "OTRO";
  nombreCompleto: string;
  rut: string;
  empresa: string;
  cargo: string;
  telefono: string;
  correo: string;

  // Datos de ingreso
  fechaIngreso: string; // yyyy-mm-dd
  horaIngreso: string;  // hh:mm

  // Preguntas de comprensión (pueden ser tipo SI/NO)
  respuestaPregunta1?: "SI" | "NO";
  respuestaPregunta2?: "SI" | "NO";
  respuestaPregunta3?: "SI" | "NO";

  // Aceptaciones
  aceptaReglamento: boolean;
  aceptaEpp: boolean;
  aceptaTratamientoDatos: boolean;

  // Firma digital (data URL en base64, opcional)
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

// 🔹 Guardar inducción desde el QR público
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
