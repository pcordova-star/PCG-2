"use client";

import { useState } from "react";

export default function Page() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/test-google-ai");
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setResult({ error: e.message });
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Página de Debug: Google AI API</h1>
      <p>Prueba directa al endpoint nativo de Google mediante la API.</p>

      <button
        onClick={runTest}
        style={{
          padding: "12px 24px",
          background: "black",
          color: "white",
          borderRadius: 8,
          cursor: "pointer",
          marginTop: 20
        }}
        disabled={loading}
      >
        {loading ? "Probando..." : "Probar modelo gemini-1.5-flash-latest"}
      </button>

      {result && (
        <pre
          style={{
            marginTop: 30,
            background: "#111",
            color: result.ok ? "#0f0" : "#f87171",
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
