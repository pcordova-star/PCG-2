// src/app/cubicacion/analisis-planos/page.tsx
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AnalisisPlanosPage() {
  const router = useRouter();

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Análisis de planos con IA (beta)</h1>
        </div>
      </header>
      <div className="p-8 border-2 border-dashed rounded-lg text-center">
        <p className="text-lg font-semibold">La página cargó correctamente.</p>
        <p className="text-sm text-muted-foreground mt-2">Ahora podemos proceder a re-integrar la funcionalidad de IA.</p>
      </div>
    </div>
  );
}
