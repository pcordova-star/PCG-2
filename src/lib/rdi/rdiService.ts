// src/lib/rdi/rdiService.ts
import { firebaseDb } from "@/lib/firebaseClient";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
  Timestamp,
} from "firebase/firestore";
import type { Rdi, RdiAdjunto } from "@/types/pcg";

/**
 * Devuelve la referencia a la colección de RDI para una obra específica.
 * @param companyId - El ID de la empresa.
 * @param obraId - El ID de la obra.
 * @returns La ruta de la colección de RDI.
 */
export function getRdiCollectionPath(companyId: string, obraId: string) {
  return `/companies/${companyId}/obras/${obraId}/rdi`;
}

/**
 * Obtiene todos los RDI de una obra específica.
 * @param companyId - El ID de la empresa.
 * @param obraId - El ID de la obra.
 * @returns Un array de documentos Rdi.
 */
export async function getAllRdiForObra(companyId: string, obraId: string): Promise<Rdi[]> {
  const collectionPath = getRdiCollectionPath(companyId, obraId);
  const rdiCollection = collection(firebaseDb, collectionPath);
  const q = query(rdiCollection, orderBy("fechaEmision", "desc"));

  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return [];
  }

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rdi));
}

/**
 * Obtiene un RDI específico por su ID.
 * @param companyId - El ID de la empresa.
 * @param obraId - El ID de la obra.
 * @param rdiId - El ID del RDI.
 * @returns El documento RDI o null si no se encuentra.
 */
export async function getRdiById(companyId: string, obraId: string, rdiId: string): Promise<Rdi | null> {
  const collectionPath = getRdiCollectionPath(companyId, obraId);
  const rdiDocRef = doc(firebaseDb, collectionPath, rdiId);
  const docSnap = await getDoc(rdiDocRef);

  if (!docSnap.exists()) {
    return null;
  }

  return { id: docSnap.id, ...docSnap.data() } as Rdi;
}

/**
 * Crea un nuevo documento RDI.
 * @param companyId - El ID de la empresa.
 * @param obraId - El ID de la obra.
 * @param rdiData - Los datos para el nuevo RDI (sin el id).
 * @returns El ID del nuevo RDI creado.
 */
export async function createRdi(companyId: string, obraId: string, rdiData: Omit<Rdi, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const collectionPath = getRdiCollectionPath(companyId, obraId);
  const rdiCollection = collection(firebaseDb, collectionPath);
  
  const docToCreate = {
    ...rdiData,
    companyId, // Aseguramos que el companyId esté en el documento
    obraId,    // Aseguramos que el obraId esté en el documento
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(rdiCollection, docToCreate);
  return docRef.id;
}

/**
 * Actualiza un documento RDI existente.
 * @param companyId - El ID de la empresa.
 * @param obraId - El ID de la obra.
 * @param rdiId - El ID del RDI a actualizar.
 * @param dataToUpdate - Los campos del RDI a actualizar.
 */
export async function updateRdi(companyId: string, obraId: string, rdiId: string, dataToUpdate: Partial<Omit<Rdi, 'id'>>): Promise<void> {
  const collectionPath = getRdiCollectionPath(companyId, obraId);
  const rdiDocRef = doc(firebaseDb, collectionPath, rdiId);

  await updateDoc(rdiDocRef, {
    ...dataToUpdate,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Añade un adjunto a un RDI existente.
 * @param companyId - El ID de la empresa.
 * @param obraId - El ID de la obra.
 * @param rdiId - El ID del RDI.
 * @param adjunto - El objeto de adjunto a añadir.
 */
export async function addAdjuntoToRdi(companyId: string, obraId: string, rdiId: string, adjunto: RdiAdjunto): Promise<void> {
  const rdi = await getRdiById(companyId, obraId, rdiId);
  if (!rdi) {
    throw new Error("El RDI no existe.");
  }

  const adjuntosActualizados = [...(rdi.adjuntos || []), adjunto];

  await updateRdi(companyId, obraId, rdiId, {
    adjuntos: adjuntosActualizados,
    tieneAdjuntos: true,
  });
}
