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
} from "firebase/firestore";
import type { Rdi, RdiAdjunto, RdiPrioridad, RdiEstado, RdiAdjuntoTipo } from "@/types/pcg";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

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
 * Sube un archivo a Firebase Storage y luego agrega su metadata como un adjunto al RDI en Firestore.
 * @param input - Datos necesarios para la subida y actualización.
 * @returns La metadata del adjunto que fue creado y guardado.
 */
export async function uploadAndAddRdiAdjunto(input: {
    companyId: string;
    obraId: string;
    rdiId: string;
    file: File;
    subidoPorUserId: string;
}): Promise<RdiAdjunto> {
    const { companyId, obraId, rdiId, file, subidoPorUserId } = input;

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
    const rdiDocRef = doc(getRdiCollectionRef(companyId, obraId), rdiId);
    await updateDoc(rdiDocRef, {
        adjuntos: arrayUnion(nuevoAdjunto),
        tieneAdjuntos: true,
        updatedAt: serverTimestamp(),
    });

    return nuevoAdjunto;
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
