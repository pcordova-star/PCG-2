// src/functions/src/index.ts
/**
 * Punto de entrada para todas las Cloud Functions.
 * NO inicializar Firebase Admin aquí. La inicialización se centraliza
 * en la función getAdminApp() para evitar errores en el runtime.
 */

// Funciones activas
export { createCompanyUser } from "./createCompanyUser";
export { analizarPlano } from "./analizarPlano";
export { processItemizadoJob } from "./processItemizadoJob";
