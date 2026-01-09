// src/functions/src/mclp/scheduler.ts
import * as functions from 'firebase-functions';
import * as logger from "firebase-functions/logger";
import { getAdminApp } from "../firebaseAdmin";

const admin = getAdminApp();

export const mclpDailyScheduler = functions
    .region("us-central1") // Región compatible con Cloud Scheduler
    .pubsub.schedule("every day 01:00")
    .timeZone("UTC")
    .onRun(async (context) => {
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
});

async function processCompanyMclp(db: FirebaseFirestore.Firestore, companyId: string, now: Date) {
    const periodKey = getPeriodKeyUTC(now);
    const periodRef = await ensurePeriodExists(db, companyId, periodKey);
    if (!periodRef) return;

    const periodSnap = await periodRef.get();
    if (!periodSnap.exists) return;

    const { corteCarga, limiteRevision, fechaPago, estado } = periodSnap.data()!;
    
    const corteCargaDate = (corteCarga as admin.firestore.Timestamp).toDate();
    const fechaPagoDate = (fechaPago as admin.firestore.Timestamp).toDate();
    
    if (now > corteCargaDate && estado === "Abierto para Carga") {
        await periodRef.update({
        estado: "En Revisión",
        updatedAt: admin.firestore.Timestamp.now(),
        });
        logger.info(`[${companyId}] Period ${periodKey} marked as 'En Revisión'.`);
    }

    if (now >= fechaPagoDate && estado !== "Cerrado") {
        await closeAndFinalizePeriod(db, companyId, periodRef.id);
        logger.info(`[${companyId}] Period ${periodKey} finalized and closed.`);
    }
}

function getPeriodKeyUTC(date: Date) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    return `${y}-${m}`; // YYYY-MM
}

async function closeAndFinalizePeriod(db: FirebaseFirestore.Firestore, companyId: string, periodId: string) {
    const statusRef = db.collection("compliancePeriods").doc(periodId).collection("status");
    const snap = await statusRef.get();

    for (const d of snap.docs) {
        if (d.get("estado") !== "Cumple") {
        await d.ref.set({
            estado: "No Cumple",
            fechaAsignacion: admin.firestore.Timestamp.now(),
            asignadoPorUid: "system",
        }, { merge: true });
        }
    }

    await db.collection("compliancePeriods").doc(periodId).set({
        estado: "Cerrado",
        closedAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
    }, { merge: true });
}

async function ensurePeriodExists(db: FirebaseFirestore.Firestore, companyId: string, periodKey: string) {
    const periodId = `${companyId}_${periodKey}`;
    const periodRef = db.collection("compliancePeriods").doc(periodId);
    const periodSnap = await periodRef.get();

    if (periodSnap.exists) {
        return periodRef;
    }

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
        corteCarga: monthData.corteCarga,
        limiteRevision: monthData.limiteRevision,
        fechaPago: monthData.fechaPago,
        estado: "Abierto para Carga",
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
    });

    await monthRef.update({ editable: false, updatedAt: admin.firestore.Timestamp.now() });
    
    logger.info(`[${companyId}] Period ${periodKey} created successfully.`);
    return periodRef;
}
