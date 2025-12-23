// src/app/prevencion/checklists/page.tsx
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ChecklistTemplateManager from '@/components/prevencion/ChecklistTemplateManager';

export default function PrevencionChecklistsPage() {
    const router = useRouter();

    return (
        <div className="space-y-6">
            <header className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.push('/prevencion')}>
                    <ArrowLeft />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Listas de Chequeo de Prevención</h1>
                    <p className="text-muted-foreground">Plantillas para inspecciones, auditorías y controles de seguridad.</p>
                </div>
            </header>
            
            <ChecklistTemplateManager 
                categoryFilter="prevencion"
                title="Plantillas de Prevención de Riesgos"
                description="Listado de plantillas de checklist exclusivas para el área de prevención."
            />
        </div>
    );
}
