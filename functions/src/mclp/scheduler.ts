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

async function processCompanyMclp(
  db: FirebaseFirestore.Firestore,
  companyId: string,
  now: Date
) {
  const programRef = db.collection("compliancePrograms").doc(companyId);
  const programSnap = await programRef.get();
  if (!programSnap.exists) return;

  const { diaCorteCarga, diaLimiteRevision, diaPago } = programSnap.data()!;
  if (!diaCorteCarga || !diaLimiteRevision || !diaPago) return;

  const periodKey = getPeriodKeyUTC(now);
  const periodId = `${companyId}_${periodKey}`;
  const periodRef = db.collection("compliancePeriods").doc(periodId);
  const periodSnap = await periodRef.get();
  if (!periodSnap.exists) return;

  const day = now.getUTCDate();
  const estado = periodSnap.get("estado");

  // 1) Marcar En Revisión (después del corte)
  if (day > diaCorteCarga && estado === "Abierto para Carga") {
    await periodRef.set(
      { estado: "En Revisión", updatedAt: admin.firestore.Timestamp.now() },
      { merge: true }
    );
  }

  // 2) Cerrar período (día de pago)
  if (day >= diaPago && estado !== "Cerrado") {
    await closeAndFinalizePeriod(db, companyId, periodId);
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
