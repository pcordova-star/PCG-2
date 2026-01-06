// functions/src/mclp/scheduler.ts
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

if (!admin.apps.length) {
    admin.initializeApp();
}

function getPeriodKeyUTC(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`; // YYYY-MM
}

async function closeAndFinalizePeriod(
  db: FirebaseFirestore.Firestore,
  companyId: string,
  periodId: string
) {
  const statusRef = db
    .collection("compliancePeriods")
    .doc(periodId)
    .collection("status");

  const snap = await statusRef.get();

  // Todo subcontratista que NO esté Cumple -> No Cumple final
  for (const d of snap.docs) {
    if (d.get("estado") !== "Cumple") {
      await d.ref.set(
        {
          estado: "No Cumple",
          fechaAsignacion: admin.firestore.Timestamp.now(),
          asignadoPorUid: "system",
        },
        { merge: true }
      );
    }
  }

  await db
    .collection("compliancePeriods")
    .doc(periodId)
    .set(
      {
        estado: "Cerrado",
        closedAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      },
      { merge: true }
    );
}

// Lógica de creación de período si no existe, leyendo desde el calendario
async function ensurePeriodExists(
  db: FirebaseFirestore.Firestore,
  companyId: string,
  periodKey: string
) {
  const periodId = `${companyId}_${periodKey}`;
  const periodRef = db.collection("compliancePeriods").doc(periodId);
  const periodSnap = await periodRef.get();

  if (periodSnap.exists) {
    return periodRef; // Retorna la referencia si ya existe
  }

  // Si no existe, lo crea a partir del calendario
  logger.info(`[${companyId}] Period ${periodKey} does not exist. Creating from calendar.`);
  const year = periodKey.split('-')[0];
  const calendarId = `${companyId}_${year}`;
  const monthRef = db.collection("complianceCalendars").doc(calendarId).collection("months").doc(periodKey);
  const monthSnap = await monthRef.get();

  if (!monthSnap.exists) {
    logger.warn(`[${companyId}] Calendar month ${periodKey} not found. Cannot create period.`);
    return null;
  }

  const monthData = monthSnap.data()!;
  
  await periodRef.set({
    companyId,
    periodo: periodKey,
    // Copia las fechas desde el calendario (snapshot inmutable)
    corteCarga: monthData.corteCarga,
    limiteRevision: monthData.limiteRevision,
    fechaPago: monthData.fechaPago,
    estado: "Abierto para Carga",
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
  });

  // Marcar el mes del calendario como no editable
  await monthRef.update({ editable: false, updatedAt: admin.firestore.Timestamp.now() });
  
  logger.info(`[${companyId}] Period ${periodKey} created successfully.`);
  return periodRef;
}


async function processCompanyMclp(
  db: FirebaseFirestore.Firestore,
  companyId: string,
  now: Date
) {
  const periodKey = getPeriodKeyUTC(now);

  // Asegura que el período del mes actual exista, creándolo si es necesario
  const periodRef = await ensurePeriodExists(db, companyId, periodKey);
  if (!periodRef) return; // No se pudo crear el período, se omite el resto

  const periodSnap = await periodRef.get();
  if (!periodSnap.exists) return; // Doble chequeo, no debería ocurrir

  const { corteCarga, limiteRevision, fechaPago, estado } = periodSnap.data()!;
  
  // Convertir timestamps de Firestore a Date de JS
  const corteCargaDate = (corteCarga as admin.firestore.Timestamp).toDate();
  const limiteRevisionDate = (limiteRevision as admin.firestore.Timestamp).toDate();
  const fechaPagoDate = (fechaPago as admin.firestore.Timestamp).toDate();
  
  // 1) Marcar En Revisión (después del corte)
  if (now > corteCargaDate && estado === "Abierto para Carga") {
    await periodRef.update({
      estado: "En Revisión",
      updatedAt: admin.firestore.Timestamp.now(),
    });
    logger.info(`[${companyId}] Period ${periodKey} marked as 'En Revisión'.`);
  }

  // 2) Cerrar período (en o después del día de pago)
  if (now >= fechaPagoDate && estado !== "Cerrado") {
    await closeAndFinalizePeriod(db, companyId, periodRef.id);
    logger.info(`[${companyId}] Period ${periodKey} finalized and closed.`);
  }
}

export const mclpDailyScheduler = onSchedule(
  { schedule: "every day 01:00", timeZone: "UTC" },
  async () => {
    const db = admin.firestore();
    const now = new Date();
    logger.info("Running MCLP Daily Scheduler", { timestamp: now.toISOString() });

    const companiesSnap = await db
      .collection("companies")
      .where("feature_compliance_module_enabled", "==", true)
      .get();

    for (const c of companiesSnap.docs) {
      logger.info(`Processing company: ${c.id}`);
      await processCompanyMclp(db, c.id, now);
    }
    
    logger.info("MCLP Daily Scheduler finished.");
  }
);
