// src/app/cumplimiento/admin/programa/page.tsx
"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ProgramaCumplimientoPage() {
  return (
    <div className="space-y-6">
       <header className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
            <Link href="/cumplimiento/admin">
                <ArrowLeft />
            </Link>
        </Button>
        <div>
            <h1 className="text-2xl font-bold">Configuración del Programa</h1>
            <p className="text-muted-foreground">Define las fechas clave y los documentos requeridos.</p>
        </div>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Página en Construcción</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Esta sección permitirá configurar la periodicidad del programa, las fechas de corte para la carga de documentos, los plazos de revisión y las fechas de pago propuestas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
