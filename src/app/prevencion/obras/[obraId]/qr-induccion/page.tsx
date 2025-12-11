// src/app/prevencion/obras/[obraId]/qr-induccion/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function QrInduccionPage() {
  const { obraId } = useParams<{ obraId: string }>();
  const [url, setUrl] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    // Espera a que la autenticación termine y que tengamos un usuario y una obra.
    if (authLoading || !user || !obraId) {
      return;
    }

    // 1. Usa la variable de entorno como prioridad.
    const envBaseUrl = process.env.NEXT_PUBLIC_PUBLIC_BASE_URL;
    
    // 2. Si no existe, usa el origen de la ventana actual.
    const baseUrl = envBaseUrl || window.location.origin;

    // 3. Construye la URL pública final con el ID de la obra Y el ID del prevencionista.
    const prevencionistaId = user.uid;
    const finalUrl = `${baseUrl}/public/induccion/${obraId}?p=${prevencionistaId}`;
    setUrl(finalUrl);

  }, [obraId, user, authLoading]);

  if (authLoading) {
    return <div className="p-8 text-center"><Loader2 className="animate-spin" /> Cargando datos de usuario...</div>;
  }
  
  if (!user) {
    return <div className="p-8 text-center text-destructive">Error: Debes iniciar sesión para generar un QR.</div>;
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
