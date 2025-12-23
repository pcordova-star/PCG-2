"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, ListChecks, FilePlus } from "lucide-react";
import Link from "next/link";

export default function ChecklistsOperacionalesPage() {
  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Listas de Chequeo Operacionales</h1>
          <p className="text-muted-foreground">
            Gestión de formularios para control de calidad, protocolos y otros procesos operativos.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/checklists-operacionales/plantillas" className="block">
          <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow h-full">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <ListChecks className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Gestionar Plantillas</h3>
                <p className="text-sm text-muted-foreground">
                  Crea y edita las plantillas de checklists que se usarán en terreno.
                </p>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/checklists-operacionales/respuestas" className="block">
          <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow h-full">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <FilePlus className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Ver Respuestas</h3>
                <p className="text-sm text-muted-foreground">
                  Revisa todos los formularios y checklists que han sido completados en las obras.
                </p>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
