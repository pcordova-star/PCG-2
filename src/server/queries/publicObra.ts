// src/server/queries/publicObra.ts
import { getAdminApp } from "@/server/firebaseAdmin";

const db = getAdminApp().firestore();

/**
 * Obtiene los datos públicos de una obra por su ID.
 * @param shareId El ID del documento de la obra en Firestore.
 * @returns Los datos de la obra o null si no se encuentra.
 */
export async function getPublicObraByShareId(shareId: string) {
  if (!shareId) return null;

  try {
    const ref = db.collection("obras").doc(shareId);
    const snap = await ref.get();

    if (!snap.exists) {
      console.warn(`[publicObra] Obra no encontrada con shareId: ${shareId}`);
      return null;
    }

    const data = snap.data();
    if (!data) return null;

    return {
      id: snap.id,
      ...data,
    };
  } catch (error) {
    console.error(`[publicObra] Error al obtener la obra con shareId ${shareId}:`, error);
    return null;
  }
}
