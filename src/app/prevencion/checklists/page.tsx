// src/app/prevencion/checklists/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import ChecklistTemplateManager from '@/components/prevencion/ChecklistTemplateManager';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function PrevencionChecklistsPage() {
    const router = useRouter();
    const { role, loading } = useAuth();
    
    // Solo permitir acceso a prevencionistas y administradores.
    const allowedRoles = ['prevencionista', 'admin_empresa', 'superadmin'];

    useEffect(() => {
        if (!loading && !allowedRoles.includes(role)) {
            router.replace('/dashboard');
        }
    }, [loading, role, router, allowedRoles]);

    if (loading || !allowedRoles.includes(role)) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/prevencion">
                      <ArrowLeft />
                    </Link>
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
