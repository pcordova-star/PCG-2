"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.mclpDailyScheduler = void 0;
// src/functions/src/mclp/scheduler.ts
const functions = __importStar(require("firebase-functions/v2/scheduler"));
const logger = __importStar(require("firebase-functions/logger"));
const firebaseAdmin_1 = require("../firebaseAdmin");
const adminApp = (0, firebaseAdmin_1.getAdminApp)();
exports.mclpDailyScheduler = functions
    .onSchedule({ schedule: "every day 01:00", timeZone: "UTC" }, async (context) => {
    const db = adminApp.firestore();
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
async function processCompanyMclp(db, companyId, now) {
    const periodKey = getPeriodKeyUTC(now);
    const periodRef = await ensurePeriodExists(db, companyId, periodKey);
    if (!periodRef)
        return;
    const periodSnap = await periodRef.get();
    if (!periodSnap.exists)
        return;
    const { corteCarga, limiteRevision, fechaPago, estado } = periodSnap.data();
    const corteCargaDate = corteCarga.toDate();
    const fechaPagoDate = fechaPago.toDate();
    if (now > corteCargaDate && estado === "Abierto para Carga") {
        await periodRef.update({
            estado: "En Revisión",
            updatedAt: adminApp.firestore.Timestamp.now(),
        });
        logger.info(`[${companyId}] Period ${periodKey} marked as 'En Revisión'.`);
    }
    if (now >= fechaPagoDate && estado !== "Cerrado") {
        await closeAndFinalizePeriod(db, companyId, periodRef.id);
        logger.info(`[${companyId}] Period ${periodKey} finalized and closed.`);
    }
}
function getPeriodKeyUTC(date) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    return `${y}-${m}`; // YYYY-MM
}
async function closeAndFinalizePeriod(db, companyId, periodId) {
    const statusRef = db.collection("compliancePeriods").doc(periodId).collection("status");
    const snap = await statusRef.get();
    for (const d of snap.docs) {
        if (d.get("estado") !== "Cumple") {
            await d.ref.set({
                estado: "No Cumple",
                fechaAsignacion: adminApp.firestore.Timestamp.now(),
                asignadoPorUid: "system",
            }, { merge: true });
        }
    }
    await db.collection("compliancePeriods").doc(periodId).set({
        estado: "Cerrado",
        closedAt: adminApp.firestore.Timestamp.now(),
        updatedAt: adminApp.firestore.Timestamp.now(),
    }, { merge: true });
}
async function ensurePeriodExists(db, companyId, periodKey) {
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
    const monthData = monthSnap.data();
    await periodRef.set({
        companyId,
        periodo: periodKey,
        corteCarga: monthData.corteCarga,
        limiteRevision: monthData.limiteRevision,
        fechaPago: monthData.fechaPago,
        estado: "Abierto para Carga",
        createdAt: adminApp.firestore.Timestamp.now(),
        updatedAt: adminApp.firestore.Timestamp.now(),
    });
    await monthRef.update({ editable: false, updatedAt: adminApp.firestore.Timestamp.now() });
    logger.info(`[${companyId}] Period ${periodKey} created successfully.`);
    return periodRef;
}
