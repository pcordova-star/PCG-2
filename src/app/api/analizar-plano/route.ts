// src/app/api/analizar-plano/route.ts
import { NextResponse } from "next/server";
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";

// Definimos la estructura esperada de las variables de entorno
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
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
