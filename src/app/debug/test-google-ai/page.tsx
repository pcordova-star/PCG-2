// src/app/debug/test-google-ai/page.tsx
import { cookies } from "next/headers";

export const dynamic = "force-dynamic"; // evita caché

async function testModel() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      ok: false,
      status: 0,
      source: "env",
      body: { message: "GEMINI_API_KEY no está definida en el servidor." }
    };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest?key=${apiKey}`;

    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    const body = await res.json();

    return {
      ok: res.ok,
      status: res.status,
      source: "google-ai-api",
      body
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      source: "network",
      body: { message: err.message }
    };
  }
}

export default async function Page() {
  // Detectar si el form hizo POST
  const cookieStore = cookies();
  const triggered = cookieStore.get("debug-trigger")?.value === "1";

  let result = null;

  if (triggered) {
    result = await testModel();
    // limpiar cookie
    cookies().set("debug-trigger", "0");
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Página de Debug: Google AI API</h1>
      <p>Botón para probar conexión directa al modelo gemini-1.5-flash-latest.</p>

      {/* Form que activa la prueba */}
      <form method="POST" action="/debug/test-google-ai">
        <input type="hidden" name="trigger" value="1" />
        <button
          type="submit"
          style={{
            padding: "12px 24px",
            background: "black",
            color: "white",
            borderRadius: 6,
            marginTop: 20,
            cursor: "pointer",
            fontWeight: "bold"
          }}
          onClick={async () => {
            "use server";
            cookies().set("debug-trigger", "1");
          }}
        >
          Probar modelo gemini-1.5-flash-latest
        </button>
      </form>

      {result && (
        <pre
          style={{
            background: "#111",
            color: "#0f0",
            padding: 20,
            marginTop: 30,
            borderRadius: 8,
            maxWidth: "100%",
            overflow: "auto"
          }}
        >
{JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
