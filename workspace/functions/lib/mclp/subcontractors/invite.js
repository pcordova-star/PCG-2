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
exports.runtime = void 0;
exports.POST = POST;
// workspace/functions/src/mclp/subcontractors/invite.ts
const server_1 = require("next/server");
const firebaseAdmin_1 = __importStar(require("@/server/firebaseAdmin"));
const ensureMclpEnabled_1 = require("@/server/lib/mclp/ensureMclpEnabled");
exports.runtime = "nodejs";
// POST /api/mclp/subcontractors/invite
async function POST(req) {
    try {
        // Permission check for the inviter can be added here if needed
        // For now, we assume the frontend restricts access to this API call.
        const { companyId, subcontractorId, email, nombre, password } = await req.json();
        if (!companyId || !subcontractorId || !email || !nombre || !password) {
            return server_1.NextResponse.json({ error: "Faltan parámetros requeridos (incluyendo contraseña)" }, { status: 400 });
        }
        if (password.length < 6) {
            return server_1.NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
        }
        const auth = firebaseAdmin_1.default.auth();
        await (0, ensureMclpEnabled_1.ensureMclpEnabled)(companyId);
        let user;
        try {
            user = await auth.getUserByEmail(email);
            return server_1.NextResponse.json({ error: "Ya existe un usuario con este correo electrónico." }, { status: 409 });
        }
        catch (error) {
            if (error.code === 'auth/user-not-found') {
                user = await auth.createUser({ email, password, displayName: nombre, emailVerified: false });
            }
            else {
                throw error;
            }
        }
        // --- FIX: Set Custom Claims ---
        await auth.setCustomUserClaims(user.uid, {
            role: "contratista",
            companyId: companyId,
            subcontractorId: subcontractorId,
        });
        await firebaseAdmin_1.adminDb.collection("users").doc(user.uid).set({
            uid: user.uid, email, nombre, role: "contratista", empresaId: companyId, subcontractorId,
            activo: true,
            mustChangePassword: true,
            updatedAt: firebaseAdmin_1.default.firestore.Timestamp.now(),
        }, { merge: true });
        const subcontractorRef = firebaseAdmin_1.adminDb.collection("subcontractors").doc(subcontractorId);
        const subcontractorSnap = await subcontractorRef.get();
        const subcontractorData = subcontractorSnap.data();
        const existingUserIds = subcontractorData?.userIds || [];
        await subcontractorRef.update({
            userIds: Array.from(new Set([...existingUserIds, user.uid])),
            updatedAt: firebaseAdmin_1.default.firestore.Timestamp.now(),
        });
        const loginUrl = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/login/usuario`;
        await firebaseAdmin_1.adminDb.collection("mail").add({
            to: email,
            message: {
                subject: `Invitación al Portal de Cumplimiento de PCG`,
                html: `
              <p>Hola ${nombre},</p>
              <p>Has sido invitado a unirte al portal de cumplimiento de PCG para la empresa <strong>${subcontractorData?.razonSocial || 'subcontratista'}</strong>.</p>
              <p>Puedes iniciar sesión con tu correo y la contraseña temporal proporcionada por tu administrador.</p>
              <p><strong>Por seguridad, se te pedirá que cambies tu contraseña en tu primer acceso.</strong></p>
              <p><a href="${loginUrl}">Iniciar Sesión en PCG</a></p>
            `,
            },
        });
        return server_1.NextResponse.json({ success: true, uid: user.uid });
    }
    catch (error) {
        return server_1.NextResponse.json({ error: error.message }, { status: 500 });
    }
}
//# sourceMappingURL=invite.js.map