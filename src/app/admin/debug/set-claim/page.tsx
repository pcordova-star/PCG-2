
"use client";

import { useState } from "react";
import { firebaseFunctions } from "@/lib/firebaseClient";
import { httpsCallable }from "firebase/functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function SetClaimPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSetClaim = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    if (!user) {
      setError("Debes estar autenticado para realizar esta acción.");
      setLoading(false);
      return;
    }

    try {
      const setSuperAdmin = httpsCallable(firebaseFunctions, 'setSuperAdminClaim');
      const response = await setSuperAdmin({ email: 'pauloandrescordova@gmail.com' });
      setResult(response.data);
    } catch (err: any) {
      console.error("Error calling setSuperAdminClaim:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Asignación de Rol Superadmin (Debug)</CardTitle>
          <CardDescription>
            Esta página es una herramienta temporal para asignar el rol de superadministrador al usuario `pauloandrescordova@gmail.com`.
            Úsala solo una vez para la configuración inicial.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Al hacer clic en el botón, se invocará la Cloud Function `setSuperAdminClaim`
            para otorgar los permisos necesarios.
          </p>
          <Button onClick={handleSetClaim} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Asignando rol..." : "Ejecutar Asignación de Rol"}
          </Button>

          {error && (
            <div className="mt-4 p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
              <h3 className="font-bold">Error</h3>
              <p className="text-sm">{error}</p>
            </div>
          )}
          {result && (
            <div className="mt-4 p-4 bg-green-100/50 text-green-800 border border-green-200 rounded-md">
              <h3 className="font-bold">Éxito</h3>
              <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>
       <div className="mt-4 text-center">
            <Button variant="link" asChild>
                <Link href="/admin/dashboard">Volver al Dashboard</Link>
            </Button>
       </div>
    </div>
  );
}
