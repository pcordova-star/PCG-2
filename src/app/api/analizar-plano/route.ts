import { NextResponse } from "next/server";
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";

// CONFIGURACIÓN CORREGIDA (Datos reales de tu proyecto)
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyBfMp_dH9XhFSXEeMxY-Cdy8MDRIgWrxR0", // CORREGIDO: Esta es la clave de Firebase, no de Gemini.
  authDomain: "pcg-2-8bf1b.firebaseapp.com",
  projectId: "pcg-2-8bf1b",
  storageBucket: "pcg-2-8bf1b.firebasestorage.app",
  messagingSenderId: "1073834543546",
  appId: "1:1073834543546:web:2f85a4a8358280f8589737",
};

// Inicializar cliente Firebase (Singleton para evitar errores de duplicidad)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const functions = getFunctions(app, "us-central1");

// Referencia a la Cloud Function llamada 'analizarPlano'
const analizarPlanoFn = httpsCallable(functions, "analizarPlano");

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("Iniciando llamada a Cloud Function analizarPlano...");
    
    // Llamar a la Cloud Function
    // Nota: Esto ejecuta la función que vive en la carpeta "functions"
    const result = await analizarPlanoFn(body);

    console.log("Respuesta recibida de Cloud Function");
    return NextResponse.json(result.data);

  } catch (err: any) {
    console.error("Error CRÍTICO en /api/analizar-plano:", err);
    
    // Devolvemos el error detallado para verlo en el navegador
    return NextResponse.json(
      { 
        error: err.message || "Error desconocido al analizar el plano",
        details: err.details || "Sin detalles adicionales" 
      },
      { status: 500 }
    );
  }
}
