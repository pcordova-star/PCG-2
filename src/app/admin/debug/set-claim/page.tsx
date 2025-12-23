// src/app/admin/debug/set-claim/page.tsx
"use client";

import { useState } from "react";
import { firebaseFunctions } from "@/lib/firebaseClient";
import { httpsCallable } from "firebase/functions";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function SetSuperAdminClaimPage() {
  const { user, role } = useAuth();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const emailToSet = "pauloandrescordova@gmail.com";

  const runSetClaim = async () => {
    if (role !== 'superadmin') {
        setResult({ ok: false, message: "Error: Solo un superadmin puede ejecutar esta acción."});
        return;
    }

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
  
  if (role !== 'superadmin') {
      return (
          <div className="p-8 text-center">
              <p className="text-destructive">No tienes permisos para ver esta página.</p>
               <Button asChild variant="link"><Link href="/dashboard">Volver al dashboard</Link></Button>
          </div>
      )
  }

  return (
    <div className="container mx-auto p-8 max-w-2xl">
        <Card>
            <CardHeader>
                <CardTitle>Asignar Rol de Superadministrador</CardTitle>
                <CardDescription>
                    Esta página es una herramienta de un solo uso para asignar el custom claim `{"role": "superadmin"}`
                    a un usuario y sincronizar los permisos del backend.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <p>
                    Se asignará el rol de superadministrador al usuario: <br />
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
