// src/app/admin/debug/set-claim/page.tsx
"use client";

import { useState } from "react";
import { firebaseFunctions } from "@/lib/firebaseClient";
import { httpsCallable } from "firebase/functions";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SetSuperAdminClaimPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const emailToSet = "pauloandrescordova@gmail.com";

  const runSetClaim = async () => {
    setLoading(true);
    setResult(null);

    try {
      const setSuperAdminFn = httpsCallable(firebaseFunctions, 'setSuperAdminClaim');
      const response = await setSuperAdminFn({ email: emailToSet });
      setResult(response.data);
    } catch (e: any) {
      console.error("Error calling setSuperAdminClaim function:", e);
      setResult({ ok: false, message: e.message, code: e.code, details: e.details });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-8 max-w-2xl">
        <Card>
            <CardHeader>
                <CardTitle>Asignar Rol de Superadministrador</CardTitle>
                <CardDescription>
                    Esta página es una herramienta de desarrollador para la configuración inicial del primer usuario Superadministrador.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        <strong>Atención:</strong> Esta es una página de uso único para desarrolladores. No debe ser expuesta a usuarios finales. Una vez utilizada, se recomienda eliminarla.
                    </AlertDescription>
                </Alert>
                <p>
                    Se intentará asignar el rol de superadministrador al usuario: <br />
                    <strong className="font-mono">{emailToSet}</strong>
                </p>

                <Button
                    onClick={runSetClaim}
                    disabled={loading}
                    className="w-full"
                >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? "Asignando rol..." : "Ejecutar Asignación de Rol"}
                </Button>

                {result && (
                    <pre
                    className={`mt-4 p-4 rounded-md text-sm ${result.message?.startsWith('Éxito') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}
                    >
                    {JSON.stringify(result, null, 2)}
                    </pre>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
