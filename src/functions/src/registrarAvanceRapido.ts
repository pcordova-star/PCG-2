// functions/src/registrarAvanceRapido.ts
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import cors from "cors";
import { getAuth } from "firebase-admin/auth";

const corsHandler = cors({
  origin: true,
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

const AvanceSchema = z.object({
    obraId: z.string().min(1),
    actividadId: z.string().nullable().optional(),
    porcentaje: z.coerce.number().min(0).max(1), // Espera una fracción entre 0 y 1
    comentario: z.string().optional().default(""),
    fotos: z.array(z.string()).max(5).optional().default([]),
    visibleCliente: z.coerce.boolean().optional().default(true),
});

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (m: string) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]!));
}

export const registrarAvanceRapido = onRequest(
  {
    region: "southamerica-west1",
    cpu: 1,
    memory: "256MiB",
    timeoutSeconds: 60,
    cors: true,
    invoker: "public", // Permite la invocación pública
  },
  (req, res) => {
    corsHandler(req, res, async () => {
      if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
      }
      
      if (req.method !== "POST") {
        res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
        return;
      }

      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ ok: false, error: "UNAUTHENTICATED", details: "Bearer token faltante o malformado." });
            return;
        }
        const token = authHeader.split(" ")[1];
        const decodedToken = await getAuth().verifyIdToken(token);
        const { uid } = decodedToken;
        const displayName = decodedToken.name || decodedToken.email || "";

        const parsed = AvanceSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ ok: false, error: "INVALID_ARGUMENT", details: parsed.error.flatten() });
            return;
        }

        const { obraId, actividadId, porcentaje, comentario, fotos, visibleCliente } = parsed.data;

        const db = getFirestore();
        const obraRef = db.collection("obras").doc(obraId);

        const avanceId = await db.runTransaction(async (tx) => {
          const obraSnap = await tx.get(obraRef);
          if (!obraSnap.exists) {
            // Este throw dentro de una transacción resulta en un error 500.
            // Para un control más fino, se debería manejar fuera o con un código específico.
            throw new Error(`La obra con ID ${obraId} no fue encontrada.`);
          }

          const avancesRef = obraRef.collection("avancesDiarios");
          const nuevoAvanceRef = avancesRef.doc();

          const avanceData = {
            obraId,
            actividadId: actividadId || null,
            porcentajeAvance: porcentaje * 100, // Guardamos el porcentaje en escala 0-100
            comentario: escapeHtml(comentario),
            fotos,
            visibleCliente,
            fecha: FieldValue.serverTimestamp(),
            creadoPor: { uid, displayName: escapeHtml(displayName) },
          };
          tx.set(nuevoAvanceRef, avanceData);

          // Actualizar el avance acumulado de la obra
          const currentData = obraSnap.data() || {};
          const avancePrevio = Number(currentData.avanceAcumulado || 0);

          // Aquí la lógica de cómo `porcentaje` afecta el avance general podría necesitar revisión.
          // Por ahora, asumimos que este `porcentaje` es un avance directo a sumar (si es de una actividad ponderada).
          // Esta lógica es compleja y depende del modelo de negocio (ej: peso de la actividad).
          // Se mantiene la lógica original por ahora.
          const nuevoAvanceAcumulado = Math.min(100, avancePrevio + porcentaje);
          tx.update(obraRef, {
            ultimaActualizacion: FieldValue.serverTimestamp(),
            avanceAcumulado: nuevoAvanceAcumulado,
          });

          return nuevoAvanceRef.id;
        });

        res.status(200).json({ ok: true, id: avanceId });

      } catch (error: any) {
        logger.error("Error en registrarAvanceRapido:", error);
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            res.status(401).json({ ok: false, error: "UNAUTHENTICATED", details: "Token inválido o expirado." });
        } else {
            res.status(500).json({ ok: false, error: "INTERNAL_SERVER_ERROR", details: error.message });
        }
      }
    });
  });
