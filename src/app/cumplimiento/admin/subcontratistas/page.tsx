// src/app/cumplimiento/admin/subcontratistas/page.tsx
"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function GestionSubcontratistasPage() {
  return (
    <div className="space-y-6">
       <header className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
            <Link href="/cumplimiento/admin">
                <ArrowLeft />
            </Link>
        </Button>
        <div>
            <h1 className="text-2xl font-bold">Gestión de Subcontratistas</h1>
            <p className="text-muted-foreground">Añade, desactiva y gestiona el acceso de tus subcontratistas.</p>
        </div>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Página en Construcción</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Aquí podrás dar de alta a las empresas subcontratistas, ingresar los datos de su contacto principal y enviarles la invitación para que accedan al portal del contratista. También podrás ver un resumen de su estado de cumplimiento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}