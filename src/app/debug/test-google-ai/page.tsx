// src/app/debug/test-google-ai/page.tsx
import { Button } from "@/components/ui/button";
import { revalidatePath } from 'next/cache';

type TestResult = {
    ok: boolean;
    status?: number;
    source: "env" | "google-ai-api";
    body: any;
};

// Esta es la Server Action que se ejecutará en el servidor.
async function testModel(): Promise<TestResult> {
    'use server';

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return {
            ok: false,
            source: "env",
            body: { error: "GEMINI_API_KEY no está definida en el servidor." }
        };
    }
    
    if(apiKey === "LA_CLAVE_NUEVA_DEL_PROYECTO_PCG-IA"){
         return {
            ok: false,
            source: "env",
            body: { error: "La API Key parece ser un placeholder. Revisa el archivo .env." }
        };
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest?key=${apiKey}`
        );

        const body = await response.json();

        return {
            ok: response.ok,
            status: response.status,
            source: "google-ai-api",
            body: body
        };
    } catch (error: any) {
        return {
            ok: false,
            source: "google-ai-api",
            body: {
                error: "Fetch falló",
                message: error.message,
                cause: error.cause
            }
        };
    }
}


export default async function TestGoogleAIPage({
  searchParams,
}: {
  searchParams: { result?: string };
}) {

  let result: TestResult | null = null;
  if (searchParams.result) {
    try {
      result = JSON.parse(searchParams.result);
    } catch {
      result = { ok: false, source: 'google-ai-api', body: { error: 'Error al parsear el resultado' } };
    }
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-bold">Página de Debug: Google AI API</h1>
      <p className="text-muted-foreground">
        Esta página prueba la conexión directa con la API de Google, sin pasar por Genkit, para verificar si la API Key y el modelo están accesibles.
      </p>

      <form action={async () => {
        'use server';
        const actionResult = await testModel();
        // El resultado se pasa como un searchParam para ser mostrado en la misma página.
        const searchParams = new URLSearchParams({ result: JSON.stringify(actionResult) });
        const url = `/debug/test-google-ai?${searchParams.toString()}`;
        revalidatePath(url); // Invalida la caché de la ruta
        // No hay redirect aquí, la página se re-renderizará con los nuevos searchParams
      }}>
        <Button type="submit">Probar modelo gemini-1.5-flash-latest</Button>
      </form>

      {result && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold">Resultado:</h2>
          <pre className="mt-2 p-4 border rounded-lg bg-slate-50 text-sm overflow-x-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
          <div className="mt-4 p-4 border rounded-lg bg-card">
            <h3 className="font-semibold">Análisis del resultado:</h3>
            {result.ok ? (
                 <p className="text-green-600 mt-2">✅ Conexión exitosa. El modelo y la API Key son correctos.</p>
            ) : (
                <div className="text-red-600 mt-2 space-y-1">
                    <p>❌ La prueba falló.</p>
                    {result.source === 'env' && <p><strong>Causa:</strong> La variable de entorno `GEMINI_API_KEY` no se está cargando correctamente en el servidor.</p>}
                    {result.source === 'google-ai-api' && result.body?.error?.message.includes("API key not valid") && <p><strong>Causa:</strong> La API Key es inválida o no tiene permisos para usar la API 'generativelanguage'.</p>}
                    {result.source === 'google-ai-api' && result.status === 404 && <p><strong>Causa:</strong> El modelo 'gemini-1.5-flash-latest' no fue encontrado. Puede que no esté disponible en la región de tu proyecto de Google Cloud.</p>}
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}