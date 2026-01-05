// src/functions/src/index.ts

/**
 * Este archivo es el punto de entrada para todas las Cloud Functions.
 * Cada función se importa desde su propio archivo y se exporta para que Firebase la despliegue.
 */
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Inicializa Firebase Admin SDK solo si no se ha hecho antes.
if (!admin.apps.length) {
  admin.initializeApp();
}

// Establece la región global para todas las funciones v1
const region = "southamerica-west1";

// Exporta las funciones v1 y v2
const v1Exports = {
  createCompanyUser: functions.region(region).https.onCall(async (data, context) => {
    const { createCompanyUser: createCompanyUserV2 } = await import('./createCompanyUser');
    return createCompanyUserV2(data, context);
  }),
  setSuperAdminClaim: functions.region(region).https.onCall(async (data, context) => {
    const { setSuperAdminClaim: setSuperAdminClaimV2 } = await import('./setSuperAdmin');
    return setSuperAdminClaimV2(data, context);
  }),
};

const { registrarAvanceRapido } = require('./registrarAvanceRapido');
const v2Exports = require('./index.v2');

module.exports = {
  ...v1Exports,
  ...v2Exports,
  registrarAvanceRapido,
};
