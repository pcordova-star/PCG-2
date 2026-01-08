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
exports.testGoogleAi = void 0;
// functions/src/test-google-ai.ts
const functions = __importStar(require("firebase-functions"));
const logger = __importStar(require("firebase-functions/logger"));
const genkit_config_1 = require("./genkit-config");
exports.testGoogleAi = functions.region("southamerica-west1")
    .runWith({ secrets: ["GEMINI_API_KEY"] })
    .https.onCall(async (data, context) => {
    const prompt = data?.prompt;
    if (!prompt || typeof prompt !== "string") {
        throw new functions.https.HttpsError("invalid-argument", 'Formato requerido: {"data":{"prompt":"..."}}');
    }
    logger.info("GenAI env check", {
        hasGEMINI: !!process.env.GEMINI_API_KEY,
        geminiLen: process.env.GEMINI_API_KEY?.length ?? 0,
        hasAuth: !!context.auth,
        uid: context.auth?.uid ?? null,
    });
    try {
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
        logger.error("Genkit call failed", {
            message: e?.message,
            name: e?.name,
            stack: e?.stack,
            cause: e?.cause,
        });
        throw new functions.https.HttpsError("internal", "Genkit call failed", {
            message: e?.message ?? "unknown",
            name: e?.name ?? "unknown",
        });
    }
});
