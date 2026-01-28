// src/app/api/analizar-plano/route.ts
import { NextResponse } from "next/server";
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";

// Definimos la estructura esperada de las variables de entorno
const firebaseConfig: FirebaseOptions = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_AUTH_DOMAIN_HERE",
  projectId: "YOUR_PROJECT_ID_HERE",
  storageBucket: "pcg-2-8bf1b.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID_HERE",
  appId: "YOUR_APP_ID_HERE",
};

// Inicializar cliente Firebase (de forma segura, para evitar reinicializaciones)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const functions = getFunctions(app, "us-central1");
const analizarPlanoFn = httpsCallable(functions, "analizarPlano");

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Llamar a la Cloud Function v1
    const result = await analizarPlanoFn(body);

    return NextResponse.json(result.data);
  } catch (err: any) {
    console.error("Error en /api/analizar-plano:", err);
    return NextResponse.json(
      { error: err.message || "Error al analizar el plano" },
      { status: 500 }
    );
  }
}
