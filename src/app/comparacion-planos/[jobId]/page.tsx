// src/app/comparacion-planos/[jobId]/page.tsx
"use client";

import { useEffect, useState } from 'react';
import AnalisisProgreso from '@/components/comparacion-planos/AnalisisProgreso';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProgresoPage({ params }: { params: { jobId: string } }) {
    const [status, setStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchEstado = async () => {
            try {
                const response = await fetch(`/api/comparacion-planos/estado/${params.jobId}`);
                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error('El trabajo de análisis no fue encontrado.');
                    }
                    throw new Error('Error al consultar el estado del trabajo.');
                }
                const data = await response.json();
                setStatus(data.status);
                
                // Futuro: si el estado es 'completed', navegar a la página de resultados.
                // if (data.status === 'completed') {
                //   router.push(`/comparacion-planos/${params.jobId}/resultado`);
                // }

            } catch (err: any) {
                setError(err.message);
                // Detener el polling si hay un error
                clearInterval(interval);
            }
        };

        // Iniciar polling
        fetchEstado(); // Llamada inicial
        const interval = setInterval(fetchEstado, 3000);

        // Limpiar el intervalo cuando el componente se desmonte
        return () => clearInterval(interval);
    }, [params.jobId, router]);


    return (
        <div className="max-w-2xl mx-auto text-center space-y-6">
            <h1 className="text-2xl font-bold">Análisis de Planos en Progreso</h1>
            <p className="text-muted-foreground">Tu solicitud está siendo procesada por la IA. Por favor, espera un momento.</p>
            
            <div className="p-4 border rounded-lg bg-card">
                 <h2 className="text-lg font-semibold">Job ID:</h2>
                 <p className="font-mono text-sm text-muted-foreground mb-4">{params.jobId}</p>
                <div className="flex items-center justify-center gap-4">
                    {error ? (
                        <p className="text-destructive font-semibold">{error}</p>
                    ) : !status ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="animate-spin" />
                            <span>Obteniendo estado...</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                             <span className="font-semibold">Estado actual:</span>
                             <span className="font-bold text-primary uppercase">{status}</span>
                        </div>
                    )}
                </div>
            </div>

            <AnalisisProgreso />
            
             <Button variant="outline" onClick={() => router.back()}>Volver</Button>
        </div>
    );
}
