"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSecureDownloadUrl = void 0;
// functions/src/secureDownload.ts
const https_1 = require("firebase-functions/v2/https");
// Esta función es un placeholder para evitar errores de importación.
// Implementar la lógica real de descarga segura cuando sea necesario.
exports.getSecureDownloadUrl = (0, https_1.onCall)({ region: "southamerica-west1", cors: true }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    // Lógica para verificar permisos y generar una URL firmada...
    // Ejemplo de data que podrías recibir: const { filePath } = request.data;
    return { url: "https://placeholder.com/url-insegura-por-ahora" };
});
