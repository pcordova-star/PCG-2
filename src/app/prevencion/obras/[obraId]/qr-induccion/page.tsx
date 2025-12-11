"use client";

import React from "react";
import QRCode from "react-qr-code";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const publicBaseUrl =
  process.env.NEXT_PUBLIC_PUBLIC_BASE_URL ?? "http://localhost:3000";

export default function QrInduccionPage() {
  const { obraId } = useParams<{ obraId: string }>();

  if (!obraId) return <div className="p-8 text-center">No se encontró el ID de la obra.</div>;

  const url = `${publicBaseUrl}/public/induccion/${obraId}`;

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

        <div className="bg-white p-4 inline-block rounded-lg border-4 border-primary mb-6">
          <QRCode value={url} size={256} />
        </div>

        <p className="text-xs text-muted-foreground break-words bg-muted p-2 rounded-md">
          {url}
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Sugerencia: imprime este QR y colócalo en portería o en el acceso a la obra.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-2 justify-center">
           <Button onClick={() => window.print()}>Imprimir QR</Button>
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
