
"use client";

import { useState } from "react";
import { firebaseFunctions } from "@/lib/firebaseClient";
import { httpsCallable } from "firebase/functions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SetClaimPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Datos del formulario
  const [targetUid, setTargetUid] = useState("9Bmvi7VxSgMTrT5T3YWYtM0WbD2");
  const [targetRole, setTargetRole] = useState("admin_empresa");
  const [targetCompanyId, setTargetCompanyId] = useState("ips_construccion");


  const handleSetClaim = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    if (!user) {
      setError("Debes estar autenticado como superadmin para esta acción.");
      setLoading(false);
      return;
    }

    try {
      const setClaimsFn = httpsCallable(firebaseFunctions, 'setCompanyClaims');
      const response = await setClaimsFn({
        uid: targetUid,
        role: targetRole,
        companyId: targetCompanyId,
      });
      setResult(response.data);
      toast({
        title: "Éxito",
        description: (response.data as any).message || "Claims asignados."
      })
    } catch (err: any) {
      console.error("Error calling setCompanyClaims:", err);
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message
      })
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Asignación de Custom Claims (Debug)</CardTitle>
          <CardDescription>
            Esta página asigna un `role` y `companyId` a un usuario por su UID. 
            Recuerda que el usuario afectado debe <strong>cerrar y volver a iniciar sesión</strong> para que los cambios surtan efecto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="uid">UID del Usuario</Label>
                <Input id="uid" value={targetUid} onChange={e => setTargetUid(e.target.value)} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <Input id="role" value={targetRole} onChange={e => setTargetRole(e.target.value)} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="companyId">ID de la Empresa</Label>
                <Input id="companyId" value={targetCompanyId} onChange={e => setTargetCompanyId(e.target.value)} />
            </div>

            <Button onClick={handleSetClaim} disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Asignando Claims..." : "Ejecutar Asignación de Claims"}
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
