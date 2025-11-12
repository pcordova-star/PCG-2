import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { firebaseDb } from "./firebaseClient";

// 👉 Datos comunes del evento (lo que comparten los 3 formularios)
export interface InduccionAccesoFaena {
  id?: string;

  // Datos de la obra
  obraId: string;
  obraNombre: string;

  // Datos de la persona
  tipoVisita: "VISITA" | "PROVEEDOR" | "INSPECTOR" | "OTRO";
  nombreCompleto: string;
  rut: string;
  empresa: string;
  cargo: string;
  telefono: string;
  correo: string;

  // Datos de ingreso
  fechaIngreso: string; // formato "YYYY-MM-DD"
  horaIngreso: string;  // formato "HH:mm"
  autorizadorNombre: string;
  autorizadorCargo: string;

  // Preguntas de comprensión (pueden ser tipo SI/NO)
  respuestaPregunta1: "SI" | "NO";
  respuestaPregunta2: "SI" | "NO";
  respuestaPregunta3: "SI" | "NO";

  // Aceptaciones
  aceptaReglamento: boolean;
  aceptaEpp: boolean;
  aceptaTratamientoDatos: boolean;

  // Firma digital (data URL en base64, opcional)
  firmaDataUrl?: string;

  createdAt?: any;
}


export async function guardarInduccionAccesoFaena(
  data: Omit<InduccionAccesoFaena, "id" | "createdAt">
): Promise<string> {
  const colRef = collection(firebaseDb, "induccionesAccesoFaena");
  const docRef = await addDoc(colRef, {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}
