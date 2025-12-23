// src/app/prevencion/safety-checklists/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { ListChecks, FilePlus } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function SafetyChecklistsPage() {
  const { role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && role !== 'prevencionista') {
      router.replace('/dashboard');
    }
  }, [loading, role, router]);

  if (loading || role !== 'prevencionista') {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Listas de Chequeo de Seguridad</h1>
          <p className="text-muted-foreground">
            Gestión de plantillas y registros para inspecciones de seguridad y auditorías de prevención de riesgos.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/prevencion/safety-checklists/templates" className="block">
          <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow h-full">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <ListChecks className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Gestionar Plantillas de Seguridad</h3>
                <p className="text-sm text-muted-foreground">
                  Crea y edita las plantillas de checklists que se usarán en terreno para las inspecciones de seguridad.
                </p>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/prevencion/safety-checklists/records" className="block">
          <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow h-full">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <FilePlus className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Ver Registros Completados</h3>
                <p className="text-sm text-muted-foreground">
                  Revisa todos los formularios y checklists de seguridad que han sido completados en las obras.
                </p>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
