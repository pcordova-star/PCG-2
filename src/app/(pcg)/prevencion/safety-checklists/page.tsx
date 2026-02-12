
"use client";

import ChecklistTemplateManager from '@/components/prevencion/ChecklistTemplateManager';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function SafetyChecklistsPage() {
  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Button asChild variant="outline" size="sm">
            <Link href="/prevencion"><ArrowLeft className="mr-2 h-4 w-4" />Volver a Prevención</Link>
        </Button>
        <div>
            <h1 className="text-2xl font-bold">Listas de Chequeo de Seguridad</h1>
            <p className="text-muted-foreground">Administra las plantillas para inspecciones, auditorías y observaciones de seguridad.</p>
        </div>
      </header>
      
      <ChecklistTemplateManager 
        categoryFilter="prevencion"
        title="Plantillas de Seguridad"
        description="Listado de checklists exclusivos para el módulo de prevención de riesgos."
      />
    </div>
  );
}
