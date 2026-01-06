// functions/src/notifyDocumentDistribution.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { z } from "zod";
import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = getFirestore();

// Esquema de validación para los datos de entrada de la función
const NotifyDocumentSchema = z.object({
  projectDocumentId: z.string().min(1),
  projectId: z.string().min(1),
  companyId: z.string().min(1),
  companyDocumentId: z.string().min(1),
  version: z.string().min(1),
  notifiedUserId: z.string().min(1),
  email: z.string().email(),
});

export const notifyDocumentDistribution = functions.region("southamerica-west1").https.onCall(
  async (data, context) => {
    // 1. Autenticación y autorización (básica)
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "El usuario no está autenticado.");
    }

    // 2. Validación de datos de entrada
    const parsed = NotifyDocumentSchema.safeParse(data);
    if (!parsed.success) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Los datos proporcionados son inválidos.",
        parsed.error.flatten()
      );
    }
    const {
      projectDocumentId,
      projectId,
      companyId,
      companyDocumentId,
      version,
      notifiedUserId,
      email,
    } = parsed.data;

    try {
      // 3. Obtener el nombre del documento desde projectDocuments
      const projectDocRef = db.collection("projectDocuments").doc(projectDocumentId);
      const projectDocSnap = await projectDocRef.get();

      if (!projectDocSnap.exists) {
        throw new functions.https.HttpsError("not-found", "El documento del proyecto no fue encontrado.");
      }
      const projectDocument = projectDocSnap.data() as { name: string; code: string };

      const now = admin.firestore.Timestamp.now();
      const sentAtDate = now.toDate();

      // 4. Registrar la distribución en Firestore
      await db.collection("documentDistribution").add({
        companyId,
        projectId,
        projectDocumentId,
        companyDocumentId,
        version,
        notifiedUserId,
        email,
        method: "email",
        sentAt: now,
      });

      // 5. Enviar el correo electrónico a través de la extensión "Trigger Email"
      await db.collection("mail").add({
        to: [email],
        message: {
          subject: `Notificación de Distribución de Documento: ${projectDocument.code}`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
              <h2>Notificación de Distribución de Documento</h2>
              <p>Se ha distribuido una nueva versión de un documento relevante para su conocimiento:</p>
              <ul>
                <li><strong>Nombre del Documento:</strong> ${projectDocument.name}</li>
                <li><strong>Código:</strong> ${projectDocument.code}</li>
                <li><strong>Versión:</strong> ${version}</li>
                <li><strong>Fecha de Distribución:</strong> ${sentAtDate.toLocaleDateString('es-CL')}</li>
              </ul>
              <hr>
              <p style="font-style: italic; color: #555;">
                Este correo electrónico constituye evidencia de distribución de documentos controlados según los requisitos del Sistema de Gestión de Calidad (ISO 9001).
              </p>
            </div>
          `,
        },
      });

      logger.info(`Distribución de documento ${projectDocumentId} a ${email} registrada y notificada con éxito.`);
      
      return { ok: true, message: "Distribución notificada y registrada." };

    } catch (error: any) {
      logger.error("Error en notifyDocumentDistribution:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError("internal", "Ocurrió un error inesperado al procesar la distribución.", error.message);
    }
  }
);
