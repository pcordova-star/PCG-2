"use client";

import { useState } from "react";
import { firebaseFunctions } from "@/lib/firebaseClient";
import { httpsCallable } from "firebase/functions";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function Page() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    setLoading(true);
    setResult(null);

    try {
      const testGoogleAiFn = httpsCallable(firebaseFunctions, 'testGoogleAi');
      const response = await testGoogleAiFn();
      setResult(response.data);
    } catch (e: any) {
      console.error("Error calling testGoogleAi function:", e);
      setResult({ ok: false, message: e.message, code: e.code, details: e.details });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>Página de Debug: Conexión con IA (Cloud Function)</h1>
      <p>Prueba la función <code>testGoogleAi</code> para verificar si Genkit puede acceder a la API key de Gemini.</p>

      <Button
        onClick={runTest}
        style={{
          padding: "12px 24px",
          marginTop: 20
        }}
        disabled={loading}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {loading ? "Probando Conexión..." : "Ejecutar Smoke Test"}
      </Button>

      {result && (
        <pre
          style={{
            marginTop: 30,
            background: "#111",
            color: result.ok ? "#0f0" : "#f87171",
            padding: 20,
            borderRadius: 8,
            overflow: "auto",
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
