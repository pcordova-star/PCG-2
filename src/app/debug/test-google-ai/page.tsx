// src/app/debug/test-google-ai/page.tsx

export const dynamic = "force-dynamic";

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

export default async function Page({ searchParams }: { searchParams: any }) {
  const triggered = searchParams?.run === "1";
  let result = null;

  if (triggered) {
    // Ejecuta la prueba en el servidor
    result = await testModel();
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Página de Debug: Google AI API</h1>
      <p>Presiona el botón para probar conexión directa al modelo.</p>

      <form method="GET">
        <input type="hidden" name="run" value="1" />
        <button
          type="submit"
          style={{
            padding: "12px 24px",
            background: "black",
            color: "white",
            borderRadius: 8,
            cursor: "pointer",
            marginTop: 20
          }}
        >
          Probar modelo gemini-1.5-flash-latest
        </button>
      </form>

      {result && (
        <pre
          style={{
            marginTop: 30,
            background: "#111",
            color: "#0f0",
            padding: 20,
            borderRadius: 8,
            overflow: "auto"
          }}
        >
{JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
