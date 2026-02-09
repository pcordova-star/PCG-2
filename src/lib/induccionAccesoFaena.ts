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
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { firebaseStorage } from "./firebaseClient";


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

async function uploadSignature(firmaDataUrl: string, obraId: string, rut: string): Promise<string> {
    if (!firmaDataUrl || !firmaDataUrl.startsWith('data:image/png;base64,')) {
        // Asume que ya es una URL de storage si no es un data URI o es nulo
        return firmaDataUrl;
    }
    const storagePath = `firmas-induccion/${obraId}/${rut}_${Date.now()}.png`;
    const storageRef = ref(firebaseStorage, storagePath);
    await uploadString(storageRef, firmaDataUrl, 'data_url');
    return await getDownloadURL(storageRef);
}


export async function guardarInduccionAccesoFaena(
  data: Omit<InduccionAccesoFaena, "id" | "createdAt" | "origenRegistro">
): Promise<string> {
  const colRef = collection(firebaseDb, "induccionesAccesoFaena");
  
  const { firmaDataUrl, ...restOfData } = data;
  let finalFirmaUrl: string | null = null;

  if (firmaDataUrl && typeof firmaDataUrl === 'string' && firmaDataUrl.startsWith('data:')) {
    finalFirmaUrl = await uploadSignature(firmaDataUrl, data.obraId, data.rut);
  } else {
    finalFirmaUrl = firmaDataUrl || null;
  }

  const docRef = await addDoc(colRef, {
    ...restOfData,
    firmaDataUrl: finalFirmaUrl,
    origenRegistro: "panel",
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function guardarInduccionQR(
  data: Omit<InduccionAccesoFaena, "id" | "createdAt" | "origenRegistro">
): Promise<string> {
  const colRef = collection(firebaseDb, "induccionesAccesoFaena");

  const { firmaDataUrl, ...restOfData } = data;
  let finalFirmaUrl: string | null = null;
  
  if (firmaDataUrl && typeof firmaDataUrl === 'string' && firmaDataUrl.startsWith('data:')) {
    finalFirmaUrl = await uploadSignature(firmaDataUrl, data.obraId, data.rut);
  } else {
    finalFirmaUrl = firmaDataUrl || null;
  }

  const docRef = await addDoc(colRef, {
    ...restOfData,
    firmaDataUrl: finalFirmaUrl,
    origenRegistro: "qr",
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}
