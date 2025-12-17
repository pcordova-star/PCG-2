"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testGoogleAi = exports.processItemizadoJob = exports.getSecureDownloadUrl = exports.notifyDocumentDistribution = exports.convertHeicToJpg = exports.registrarAvanceRapido = exports.setSuperAdminClaim = exports.createCompanyUser = void 0;
// functions/src/index.ts
const v2_1 = require("firebase-functions/v2");
(0, v2_1.setGlobalOptions)({
    region: "southamerica-west1",
    // OJO: no declares serviceAccount acá a menos que exista realmente.
    // serviceAccount: "pcg-functions-sa@pcg-2-8bf1b.iam.gserviceaccount.com",
});
var createCompanyUser_1 = require("./createCompanyUser");
Object.defineProperty(exports, "createCompanyUser", { enumerable: true, get: function () { return createCompanyUser_1.createCompanyUser; } });
var setSuperAdmin_1 = require("./setSuperAdmin");
Object.defineProperty(exports, "setSuperAdminClaim", { enumerable: true, get: function () { return setSuperAdmin_1.setSuperAdminClaim; } });
var registrarAvanceRapido_1 = require("./registrarAvanceRapido");
Object.defineProperty(exports, "registrarAvanceRapido", { enumerable: true, get: function () { return registrarAvanceRapido_1.registrarAvanceRapido; } });
var convertHeic_1 = require("./convertHeic");
Object.defineProperty(exports, "convertHeicToJpg", { enumerable: true, get: function () { return convertHeic_1.convertHeicToJpg; } });
var notifyDocumentDistribution_1 = require("./notifyDocumentDistribution");
Object.defineProperty(exports, "notifyDocumentDistribution", { enumerable: true, get: function () { return notifyDocumentDistribution_1.notifyDocumentDistribution; } });
var secureDownload_1 = require("./secureDownload");
Object.defineProperty(exports, "getSecureDownloadUrl", { enumerable: true, get: function () { return secureDownload_1.getSecureDownloadUrl; } });
var processItemizadoJob_1 = require("./processItemizadoJob");
Object.defineProperty(exports, "processItemizadoJob", { enumerable: true, get: function () { return processItemizadoJob_1.processItemizadoJob; } });
var test_google_ai_1 = require("./test-google-ai");
Object.defineProperty(exports, "testGoogleAi", { enumerable: true, get: function () { return test_google_ai_1.testGoogleAi; } });
//# sourceMappingURL=index.js.map