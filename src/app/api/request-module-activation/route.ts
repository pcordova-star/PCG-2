// src/app/api/request-module-activation/route.ts
import { NextRequest, NextResponse } from "next/server";
import admin from "@/server/firebaseAdmin";

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ success: false, error: "Unauthorized: No token provided." }, { status: 401 });
        }
        const token = authHeader.split(" ")[1];
        const decodedToken = await admin.auth().verifyIdToken(token);

        const { uid, email, name } = decodedToken;
        const userEmail = email || "No disponible";
        const userName = name || userEmail;
        let companyId = (decodedToken as any).companyId;

        if (!companyId) {
            console.log(`companyId no encontrado en los claims para UID ${uid}. Buscando en Firestore...`);
            const userDoc = await admin.firestore().collection("users").doc(uid).get();
            if (userDoc.exists) {
                companyId = userDoc.data()?.empresaId;
            }
        }

        if (!companyId) {
             return NextResponse.json({ success: false, error: "El usuario no está asociado a ninguna empresa." }, { status: 400 });
        }

        const { moduleId, moduleTitle } = await req.json();
        if (!moduleId || !moduleTitle) {
            return NextResponse.json({ success: false, error: "Faltan los parámetros 'moduleId' y 'moduleTitle'." }, { status: 400 });
        }

        const db = admin.firestore();
        const companyRef = db.collection("companies").doc(companyId);
        const companySnap = await companyRef.get();
        
        const companyName = companySnap.exists
            ? companySnap.data()?.nombreFantasia || "Empresa sin nombre"
            : "Empresa desconocida";

        const SUPERADMIN_EMAIL = "pauloandrescordova@gmail.com"; 

        const requestRef = await db.collection("moduleActivationRequests").add({
            companyId,
            companyName,
            moduleId,
            moduleTitle,
            requestedByUserId: uid,
            requestedByUserEmail: userEmail,
            requestedByUserName: userName,
            requestedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: "pending",
        });

        console.log(`Solicitud de activación registrada: ${requestRef.id}`);
        
        await db.collection("mail").add({
            to: [SUPERADMIN_EMAIL],
            message: {
                subject: `PCG: Nueva solicitud de activación de módulo - ${companyName}`,
                html: `
                    <p>Se ha recibido una nueva solicitud de activación de módulo:</p>
                    <ul>
                    <li><strong>Empresa:</strong> ${companyName} (${companyId})</li>
                    <li><strong>Módulo Solicitado:</strong> ${moduleTitle} (${moduleId})</li>
                    <li><strong>Solicitado por:</strong> ${userName} (${userEmail})</li>
                    </ul>
                `,
            },
        });

        return NextResponse.json({ success: true, message: "Solicitud registrada y notificada." });

    } catch (error: any) {
        console.error("[API /request-module-activation] Error:", error);
         if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return NextResponse.json({ error: 'Token de autenticación inválido o expirado.' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: "Ocurrió un error al procesar tu solicitud." }, { status: 500 });
    }
}
