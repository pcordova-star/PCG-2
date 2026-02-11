// workspace/functions/src/distributeNoticiaAlert.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { getAdminApp } from './firebaseAdmin';

const adminApp = getAdminApp();
const db = adminApp.firestore();

export const distributeNoticiaAlert = functions
  .region("us-central1")
  .firestore.document("noticiasExternas/{noticiaId}/analisisIA/{analisisId}")
  .onCreate(async (snap, context) => {
    const { noticiaId } = context.params;
    const analisisData = snap.data();

    if (!analisisData) {
      logger.warn(`[${noticiaId}] El documento de análisis está vacío. No se puede distribuir.`);
      return;
    }
    
    logger.info(`[${noticiaId}] Distribuyendo alerta de noticia a las empresas.`);

    try {
      const companiesSnap = await db.collection('companies').where('activa', '==', true).get();
      
      if (companiesSnap.empty) {
        logger.warn(`[${noticiaId}] No hay empresas activas para notificar.`);
        return;
      }
      
      const batch = db.batch();
      
      companiesSnap.forEach(companyDoc => {
        const companyId = companyDoc.id;
        // Para el MVP, distribuimos a todos. En el futuro, aquí se aplicaría la lógica de filtro.
        const alertaRef = db.collection('alertasNoticias').doc();
        batch.set(alertaRef, {
          noticiaId,
          analisisId: snap.id,
          companyId,
          rolDestino: analisisData.entidadesPcgImpactadas || ['admin_empresa'],
          estado: 'pendiente',
          esCritica: analisisData.esCritica || false,
          fechaGeneracion: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      
      await batch.commit();
      logger.info(`[${noticiaId}] Alerta distribuida a ${companiesSnap.size} empresas.`);
      
    } catch (error: any) {
      logger.error(`[${noticiaId}] Error al distribuir la alerta:`, error);
      // Opcional: Marcar la noticia o el análisis con un estado de error de distribución.
    }
  });
