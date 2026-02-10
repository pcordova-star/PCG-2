// src/app/test-modelo/page.tsx
"use client";

import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function TestModeloPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runTest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/test-google-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: "Di 'funcionando' si puedes ejecutar modelos multimodales." })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unknown API error');
      }
      setResult(data);
    } catch (e: any) {
      console.error("Error calling test-google-ai API:", e);
      setResult({ ok: false, error: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-bold">Página de Prueba del Modelo de IA (vía API Route)</h1>
      <p className="text-muted-foreground">
        Esta página invoca una API Route que a su vez ejecuta una función de Genkit. Esto verifica que el modelo multimodal de Genkit está funcionando correctamente en un entorno de servidor aislado.
      </p>
      
      <Button onClick={runTest} disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
        {loading ? 'Probando Modelo...' : 'Probar Conexión con IA'}
      </Button>
      
      {result && (
        <div className="mt-6 p-4 border rounded-lg bg-slate-50">
          <h2 className="font-semibold">Resultado de la API:</h2>
          <pre className="mt-2 text-sm whitespace-pre-wrap bg-slate-100 p-2 rounded">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

       <div className="mt-6 p-4 border rounded-lg bg-slate-100">
        <h2 className="font-semibold">Instrucciones</h2>
        <ol className="list-decimal list-inside text-sm text-muted-foreground mt-2">
            <li>Haz clic en el botón &quot;Probar Conexión con IA&quot;.</li>
            <li>Observa el resultado que aparece en la sección &quot;Resultado de la API&quot;.</li>
            <li>Si `ok` es `true` y el texto incluye &apos;funcionando&apos;, la conexión es exitosa.</li>
            <li>Si ves un error, significa que la API Route no pudo ejecutar Genkit correctamente. Revisa los logs del servidor de Next.js.</li>
        </ol>
      </div>

    </div>
  );
}
