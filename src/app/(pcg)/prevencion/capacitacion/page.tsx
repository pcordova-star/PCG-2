// src/app/(pcg)/prevencion/capacitacion/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, QrCode, ClipboardList } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CapacitacionPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/prevencion">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Capacitación e Inducciones</h1>
          <p className="text-muted-foreground">
            Gestión de inducciones de acceso y capacitaciones del personal.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/prevencion/capacitacion/induccion-acceso" className="block">
          <Card className="hover:shadow-lg transition-shadow h-full">
             <CardHeader className="flex-row items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-full">
                    <QrCode className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                    <CardTitle>Inducción de Acceso (QR)</CardTitle>
                    <CardDescription>
                    Portal para generar QR de acceso a faena y registrar visitas manualmente.
                    </CardDescription>
                </div>
            </CardHeader>
          </Card>
        </Link>
        <Card className="border-dashed">
            <CardHeader className="flex-row items-center gap-4 text-muted-foreground">
                <div className="p-3 bg-slate-100 rounded-full">
                    <ClipboardList className="h-6 w-6" />
                </div>
                 <div>
                    <CardTitle>Capacitaciones Internas</CardTitle>
                    <CardDescription>
                    Próximamente: Registro y seguimiento de capacitaciones al personal.
                    </CardDescription>
                </div>
            </CardHeader>
        </Card>
      </div>
    </div>
  );
}
