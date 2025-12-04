// src/lib/rdi/rdiService.ts
import { firebaseDb, firebaseStorage } from "@/lib/firebaseClient";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
  where,
  writeBatch,
  arrayUnion,
  runTransaction,
} from "firebase/firestore";
import type { Rdi, RdiAdjunto, RdiPrioridad, RdiEstado, RdiAdjuntoTipo } from "@/types/pcg";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

/**
 * Obtiene la referencia a la subcolección de RDI para una obra específica.
 * @param obraId - El ID de la obra.
 * @returns La referencia a la colección de Firestore.
 */
function getRdiCollectionRef(obraId: string) {
  return collection(firebaseDb, "obras", obraId, "rdi");
}

async function getNextRdiNumber(obraId: string): Promise<number> {
    const counterRef = doc(firebaseDb, "obras", obraId, "counters", "rdi");
  
    const nextNumber = await runTransaction(firebaseDb, async (tx) => {
      const snap = await tx.get(counterRef);
      let current = 0;
      if (snap.exists()) {
        const data = snap.data() as { ultimoNumero?: number };
        current = data.ultimoNumero ?? 0;
      }
      const nuevo = current + 1;
      tx.set(counterRef, { ultimoNumero: nuevo }, { merge: true });
      return nuevo;
    });
  
    return nextNumber;
}


/**
 * Crea un nuevo Requerimiento de Información (RDI).
 * @param input - Datos para la creación del RDI.
 * @returns El objeto RDI completo como fue guardado en la base de datos.
 */
export async function createRdi(input: {
  companyId: string;
  obraId: string;
  titulo: string;
  descripcion: string;
  tipo: "a_mandante" | "a_contratista" | "interna";
  especialidad: "arquitectura" | "estructuras" | "electrica" | "sanitaria" | "climatizacion" | "otra";
  prioridad: RdiPrioridad;
  solicitante: Rdi["solicitante"];
  destinatario: Rdi["destinatario"];
  planoId?: string | null;
  afectaPlazo?: boolean;
  diasAumentoSolicitados?: number | null;
  fechaLimiteRespuesta?: Date | null;
  plazoRespuestaDias?: number | null;
  paraCliente?: boolean;
}): Promise<Rdi> {
  const rdiCollection = getRdiCollectionRef(input.obraId);
  const numero = await getNextRdiNumber(input.obraId);
  const correlativo = `RDI-${String(numero).padStart(3, "0")}`;

  const newRdiData = {
    companyId: input.companyId,
    obraId: input.obraId,
    correlativo,
    titulo: input.titulo,
    descripcion: input.descripcion,
    tipo: input.tipo,
    especialidad: input.especialidad,
    prioridad: input.prioridad,
    solicitante: input.solicitante,
    destinatario: input.destinatario,
    planoId: input.planoId || null,
    afectaPlazo: input.afectaPlazo || false,
    diasAumentoSolicitados: input.diasAumentoSolicitados || null,
    fechaLimiteRespuesta: input.fechaLimiteRespuesta ? Timestamp.fromDate(input.fechaLimiteRespuesta) : null,
    plazoRespuestaDias: input.plazoRespuestaDias || null,
    paraCliente: input.paraCliente || false,
    
    // Valores iniciales por defecto
    estado: "enviada" as RdiEstado,
    respuestaTexto: null,
    clienteRespondio: false,
    fechaRespuestaCliente: null,
    adjuntos: [],
    tieneAdjuntos: false,
    emailClienteNotificado: false,
    fechaNotificacionEmail: null,
    diasAumentoAprobados: null,
    closedAt: null,
    deleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(rdiCollection, newRdiData);
  const docSnap = await getDoc(docRef);
  
  return { id: docSnap.id, ...docSnap.data() } as Rdi;
}

/**
 * Lista todos los RDI de una obra, ordenados por fecha de creación descendente.
 * @param obraId - El ID de la obra.
 * @returns Un array de documentos Rdi.
 */
export async function listRdiByObra(obraId: string): Promise<Rdi[]> {
  const rdiCollection = getRdiCollectionRef(obraId);
  const q = query(rdiCollection, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) return [];
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rdi));
}

/**
 * Obtiene un RDI específico por su ID.
 * @param obraId - El ID de la obra.
 * @param rdiId - El ID del RDI a obtener.
 * @returns El documento RDI o null si no existe.
 */
export async function getRdiById(obraId: string, rdiId: string): Promise<Rdi | null> {
  const rdiDocRef = doc(getRdiCollectionRef(obraId), rdiId);
  const docSnap = await getDoc(rdiDocRef);

  if (!docSnap.exists()) return null;
  
  return { id: docSnap.id, ...docSnap.data() } as Rdi;
}

/**
 * Actualiza un RDI existente con datos parciales.
 * @param obraId - El ID de la obra.
 * @param rdiId - El ID del RDI a actualizar.
 * @param data - Los campos a actualizar.
 */
export async function updateRdi(obraId: string, rdiId: string, data: Partial<Omit<Rdi, 'id'>>): Promise<void> {
  const rdiDocRef = doc(getRdiCollectionRef(obraId), rdiId);
  await updateDoc(rdiDocRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Sube un archivo a Firebase Storage y luego agrega su metadata como un adjunto al RDI en Firestore.
 * @param input - Datos necesarios para la subida y actualización.
 * @returns El RDI actualizado
 */
export async function uploadAndAddRdiAdjunto(input: {
    obraId: string;
    rdiId: string;
    file: File;
    subidoPorUserId: string;
}): Promise<Rdi> {
    const { obraId, rdiId, file, subidoPorUserId } = input;

    // 1. Crear una ruta única para el archivo en Storage
    const storagePath = `rdis/${obraId}/${rdiId}/${Date.now()}-${file.name}`;
    const storageRef = ref(firebaseStorage, storagePath);

    // 2. Subir el archivo
    await uploadBytes(storageRef, file);

    // 3. Obtener la URL de descarga
    const downloadUrl = await getDownloadURL(storageRef);

    // 4. Determinar el tipo de adjunto
    const getFileType = (file: File): RdiAdjuntoTipo => {
        if (file.type.startsWith("image/")) return "imagen";
        if (file.type === "application/pdf") return "pdf";
        return "otro";
    };

    // 5. Crear el objeto de metadata del adjunto
    const nuevoAdjunto: RdiAdjunto = {
        id: crypto.randomUUID(),
        nombreArchivo: file.name,
        tipo: getFileType(file),
        storagePath: storagePath,
        downloadUrl: downloadUrl,
        subidoPorUserId: subidoPorUserId,
        fechaSubida: Timestamp.now(),
    };

    // 6. Actualizar el documento RDI en Firestore
    const rdiDocRef = doc(getRdiCollectionRef(obraId), rdiId);
    await updateDoc(rdiDocRef, {
        adjuntos: arrayUnion(nuevoAdjunto),
        tieneAdjuntos: true,
        updatedAt: serverTimestamp(),
    });
    
    // 7. Devolver el documento actualizado
    const updatedDoc = await getDoc(rdiDocRef);
    return { id: updatedDoc.id, ...updatedDoc.data() } as Rdi;
}

/**
 * Registra la respuesta a un RDI.
 * @param obraId - El ID de la obra.
 * @param rdiId - El ID del RDI.
 * @param respuestaTexto - El texto de la respuesta.
 */
export async function responderRdi(obraId: string, rdiId: string, respuestaTexto: string): Promise<void> {
  const rdiDocRef = doc(getRdiCollectionRef(obraId), rdiId);
  await updateDoc(rdiDocRef, {
    respuestaTexto,
    clienteRespondio: true,
    fechaRespuestaCliente: serverTimestamp(),
    estado: "respondida",
    updatedAt: serverTimestamp(),
  });
}
