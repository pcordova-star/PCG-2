"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testGoogleAi = void 0;
// functions/src/test-google-ai.ts
const https_1 = require("firebase-functions/v2/https");
const firebase_functions_1 = require("firebase-functions");
const genkit_config_1 = require("./genkit-config");
exports.testGoogleAi = (0, https_1.onCall)({
    region: "southamerica-west1",
    secrets: ["GEMINI_API_KEY"],
}, async (request) => {
    const prompt = request.data?.prompt;
    if (!prompt || typeof prompt !== "string") {
        throw new https_1.HttpsError("invalid-argument", 'Formato requerido: {"data":{"prompt":"..."}}');
    }
    // Diagnóstico de secret/env (SIN exponer la key)
    firebase_functions_1.logger.info("GenAI env check", {
        hasGEMINI: !!process.env.GEMINI_API_KEY,
        geminiLen: process.env.GEMINI_API_KEY?.length ?? 0,
        hasGOOGLE: !!process.env.GOOGLE_API_KEY,
        googleLen: process.env.GOOGLE_API_KEY?.length ?? 0,
        hasAuth: !!request.auth,
        uid: request.auth?.uid ?? null,
    });
    try {
        // Nota: si el nombre del modelo no existe/está mal, esto va a tirar error y ahora lo veremos.
        const resp = await genkit_config_1.ai.generate({
            model: "googleai/gemini-2.5-flash",
            prompt,
        });
        const text = typeof resp.text === "function"
            ? resp.text()
            : resp.text;
        return { ok: true, text: String(text ?? "") };
    }
    catch (e) {
        // Log REAL del error (esto es lo que hoy te falta)
        firebase_functions_1.logger.error("Genkit call failed", {
            message: e?.message,
            name: e?.name,
            stack: e?.stack,
            cause: e?.cause,
        });
        throw new https_1.HttpsError("internal", "Genkit call failed", {
            message: e?.message ?? "unknown",
            name: e?.name ?? "unknown",
        });
    }
});
//# sourceMappingURL=test-google-ai.js.map