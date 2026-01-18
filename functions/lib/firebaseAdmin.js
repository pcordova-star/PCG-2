"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminApp = getAdminApp;
// functions/src/firebaseAdmin.ts
const admin = require("firebase-admin");
let app;
function getAdminApp() {
    if (!app) {
        app = admin.initializeApp();
    }
    return app;
}
//# sourceMappingURL=firebaseAdmin.js.map