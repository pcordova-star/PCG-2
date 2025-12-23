// src/app/operaciones/checklists/page.tsx
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

// Este componente ahora redirige al nuevo módulo.
// Se mantiene por si hay enlaces antiguos apuntando aquí.
export default function OperacionesChecklistsPage() {
    const router = useRouter();
    const { loading } = useAuth();
    
    useEffect(() => {
        router.replace('/checklists-operacionales');
    }, [router]);

    if (loading) {
        return (
             <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.push('/dashboard')}>
                    <ArrowLeft />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Listas de Chequeo de Operaciones</h1>
                    <p className="text-muted-foreground">Redirigiendo al nuevo módulo...</p>
                </div>
            </header>
            <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        </div>
    );
}
