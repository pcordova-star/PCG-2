// src/app/checklists-operacionales/plantillas/page.tsx
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ChecklistTemplateManager from '@/components/prevencion/ChecklistTemplateManager';

export default function OperationalChecklistTemplatesPage() {
    return (
        <div className="space-y-6">
            <header className="flex items-center gap-4">
                <Button variant="outline" size="sm" asChild>
                    <Link href="/checklists-operacionales">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Plantillas de Checklists Operacionales</h1>
                    <p className="text-muted-foreground">Crea y gestiona formularios para calidad, protocolos de entrega y otros procesos no relacionados a prevención.</p>
                </div>
            </header>

            <ChecklistTemplateManager
                categoryFilter={["operaciones", "general"]}
                title="Plantillas Operacionales y Generales"
                description="Listado de checklists operacionales y de uso general para tu empresa."
            />
        </div>
    );
}
