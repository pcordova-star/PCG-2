// src/lib/rdi/rdiService.ts
import { firebaseDb } from "@/lib/firebaseClient";
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
} from "firebase/firestore";
import type { Rdi, RdiAdjunto, RdiPrioridad, RdiEstado } from "@/types/pcg";

/**
 * Obtiene la referencia a la subcolección de RDI para una obra específica.
 * @param companyId - El ID de la empresa.
 * @param obraId - El ID de la obra.
 * @returns La referencia a la colección de Firestore.
 */
function getRdiCollectionRef(companyId: string, obraId: string) {
  // Nota: La ruta correcta según el modelo es directamente bajo /obras.
  // Si la empresa es necesaria para la seguridad, se incluye en el documento.
  return collection(firebaseDb, "obras", obraId, "rdi");
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
  const rdiCollection = getRdiCollectionRef(input.companyId, input.obraId);

  // Generar un correlativo simple
  const correlativo = `RDI-${Date.now().toString().slice(-6)}`;

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
 * @param companyId - El ID de la empresa.
 * @param obraId - El ID de la obra.
 * @returns Un array de documentos Rdi.
 */
export async function listRdiByObra(companyId: string, obraId: string): Promise<Rdi[]> {
  const rdiCollection = getRdiCollectionRef(companyId, obraId);
  const q = query(rdiCollection, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) return [];
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rdi));
}

/**
 * Obtiene un RDI específico por su ID.
 * @param companyId - El ID de la empresa.
 * @param obraId - El ID de la obra.
 * @param rdiId - El ID del RDI a obtener.
 * @returns El documento RDI o null si no existe.
 */
export async function getRdiById(companyId: string, obraId: string, rdiId: string): Promise<Rdi | null> {
  const rdiDocRef = doc(getRdiCollectionRef(companyId, obraId), rdiId);
  const docSnap = await getDoc(rdiDocRef);

  if (!docSnap.exists()) return null;
  
  return { id: docSnap.id, ...docSnap.data() } as Rdi;
}

/**
 * Actualiza un RDI existente con datos parciales.
 * @param companyId - El ID de la empresa.
 * @param obraId - El ID de la obra.
 * @param rdiId - El ID del RDI a actualizar.
 * @param data - Los campos a actualizar.
 */
export async function updateRdi(companyId: string, obraId: string, rdiId: string, data: Partial<Omit<Rdi, 'id'>>): Promise<void> {
  const rdiDocRef = doc(getRdiCollectionRef(companyId, obraId), rdiId);
  await updateDoc(rdiDocRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Agrega un nuevo adjunto a un RDI existente.
 * @param companyId - El ID de la empresa.
 * @param obraId - El ID de la obra.
 * @param rdiId - El ID del RDI.
 * @param adjuntoData - Los datos del adjunto a agregar.
 */
export async function addRdiAdjunto(companyId: string, obraId: string, rdiId: string, adjuntoData: Omit<RdiAdjunto, 'id' | 'fechaSubida'>): Promise<void> {
  const rdiDocRef = doc(getRdiCollectionRef(companyId, obraId), rdiId);

  const nuevoAdjunto: RdiAdjunto = {
    ...adjuntoData,
    id: crypto.randomUUID(),
    fechaSubida: Timestamp.now(),
  };

  await updateDoc(rdiDocRef, {
    adjuntos: arrayUnion(nuevoAdjunto),
    tieneAdjuntos: true,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Registra la respuesta a un RDI.
 * @param companyId - El ID de la empresa.
 * @param obraId - El ID de la obra.
 * @param rdiId - El ID del RDI.
 * @param respuestaTexto - El texto de la respuesta.
 */
export async function responderRdi(companyId: string, obraId: string, rdiId: string, respuestaTexto: string): Promise<void> {
  const rdiDocRef = doc(getRdiCollectionRef(companyId, obraId), rdiId);
  await updateDoc(rdiDocRef, {
    respuestaTexto,
    clienteRespondio: true,
    fechaRespuestaCliente: serverTimestamp(),
    estado: "respondida",
    updatedAt: serverTimestamp(),
  });
}
