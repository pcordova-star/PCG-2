// src/app/prevencion/safety-checklists/records/page.tsx
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SafetyChecklistRecordsPage() {
  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/prevencion/safety-checklists">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Registros de Checklists de Seguridad</h1>
          <p className="text-muted-foreground">
            Historial de todos los formularios completados.
          </p>
        </div>
      </header>
      <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">La visualización de registros completados estará disponible próximamente.</p>
      </div>
    </div>
  );
}
