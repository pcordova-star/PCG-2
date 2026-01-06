// src/app/prevencion/obras/[obraId]/qr-induccion/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2, ShieldX } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function QrInduccionPage() {
  const { obraId } = useParams<{ obraId: string }>();
  const [url, setUrl] = useState<string | null>(null);
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();

  const allowedRoles = ['superadmin', 'admin_empresa', 'prevencionista'];
  
  useEffect(() => {
    if (authLoading) {
      return; // Esperar a que la autenticación termine
    }
    if (!user || !allowedRoles.includes(role)) {
      // Si después de cargar no hay usuario o el rol no es válido, no hacer nada.
      // El renderizado se encargará de mostrar el error.
      return;
    }

    if (!obraId) {
      return;
    }

    const publicBaseUrl = 
      process.env.NEXT_PUBLIC_PUBLIC_BASE_URL || 
      'https://pcg-2.vercel.app';
      
    const generadorId = user.uid;
    const finalUrl = `${publicBaseUrl}/public/induccion/${obraId}?g=${encodeURIComponent(generadorId)}`;
    setUrl(finalUrl);

  }, [obraId, user, authLoading, role, router]);

  // Manejo explícito del estado de carga
  if (authLoading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Verificando permisos...</p>
        </div>
    );
  }
  
  // Una vez que no está cargando, verificamos los permisos
  const canGenerate = user && allowedRoles.includes(role);

  if (!canGenerate) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
            <ShieldX className="h-16 w-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold">Acceso Denegado</h1>
            <p className="text-muted-foreground mt-2">
                Solo el Prevencionista, Administrador de Empresa o Superadmin pueden generar esta inducción de acceso.
            </p>
             <Button asChild variant="outline" className="mt-6">
                <Link href="/prevencion/capacitacion/induccion-acceso">
                    Volver al panel
                </Link>
           </Button>
        </div>
    );
  }

  if (!obraId) {
    return <div className="p-8 text-center">No se encontró el ID de la obra.</div>;
  }

  return (
    <div className="min-h-screen bg-muted flex flex-col items-center justify-center p-4">
      <div className="bg-card shadow rounded-lg p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-primary mb-2">
          QR – Inducción de Acceso a Faena
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Escanea este código desde el teléfono del visitante, proveedor o
          inspector para que complete su inducción de acceso.
        </p>

        <div className="bg-white p-4 inline-block rounded-lg border-4 border-primary mb-6 min-h-[288px] flex items-center justify-center">
          {url ? (
            <QRCode value={url} size={256} />
          ) : (
            <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
          )}
        </div>

        {url ? (
            <p className="text-xs text-muted-foreground break-words bg-muted p-2 rounded-md">
                {url}
            </p>
        ) : (
             <p className="text-xs text-muted-foreground">Generando URL...</p>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          Sugerencia: imprime este QR y colócalo en portería o en el acceso a la obra.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-2 justify-center">
           <Button onClick={() => window.print()} disabled={!url}>Imprimir QR</Button>
           <Button variant="outline" asChild>
                <Link href="/prevencion/capacitacion/induccion-acceso">
                    Volver al panel
                </Link>
           </Button>
        </div>
      </div>
    </div>
  );
}
