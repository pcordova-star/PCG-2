// src/app/operaciones/checklists/page.tsx
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ChecklistTemplateManager from '@/components/prevencion/ChecklistTemplateManager';

export default function OperacionesChecklistsPage() {
    const router = useRouter();

    return (
        <div className="space-y-6">
            <header className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.push('/operaciones')}>
                    <ArrowLeft />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Listas de Chequeo de Operaciones</h1>
                    <p className="text-muted-foreground">Plantillas para inspecciones, controles de calidad y otros formularios operativos.</p>
                </div>
            </header>
            
            <ChecklistTemplateManager 
                categoryFilter={["operaciones", "general"]}
                title="Plantillas de Operaciones y Generales"
                description="Listado de plantillas de checklist para uso en operaciones y áreas generales."
            />
        </div>
    );
}
