// src/app/comparacion-planos/[jobId]/page.tsx
"use client";

import { useEffect, useState, useMemo } from 'react';
import AnalisisProgreso from '@/components/comparacion-planos/AnalisisProgreso';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Link from 'next/link';

export default function ProgresoPage({ params }: { params: { jobId: string } }) {
    const [status, setStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isAnalysisTriggered, setIsAnalysisTriggered] = useState(false);
    const router = useRouter();
    const { toast } = useToast();
    const { user, company, role, loading: authLoading } = useAuth();

    const hasAccess = useMemo(() => {
        if (authLoading) return false;
        if (role === 'superadmin') return true;
        if (!company) return false;
        const allowedRoles = ["admin_empresa", "jefe_obra"];
        return company.feature_plan_comparison_enabled === true && allowedRoles.includes(role);
    }, [company, role, authLoading]);

    // Polling effect to get status
    useEffect(() => {
        if (!user || !hasAccess) return;

        let interval: NodeJS.Timeout;

        const fetchEstado = async () => {
            try {
                const token = await user.getIdToken();
                const response = await fetch(`/api/comparacion-planos/estado/${params.jobId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) {
                    if (response.status === 403) throw new Error("No tienes permiso para ver este análisis.");
                    if (response.status === 404) throw new Error('El trabajo de análisis no fue encontrado.');
                    throw new Error('Error al consultar el estado del trabajo.');
                }

                const data = await response.json();
                setStatus(data.status);
                
                if (data.status === 'completed') {
                   if (interval) clearInterval(interval);
                   router.push(`/comparacion-planos/${params.jobId}/resultado`);
                } else if (data.status === 'error') {
                   if (interval) clearInterval(interval);
                   setError(data.errorMessage?.message || "El análisis falló. Revisa los logs del servidor para más detalles.");
                }

            } catch (err: any) {
                setError(err.message);
                if (interval) clearInterval(interval);
            }
        };

        if (status !== 'completed' && status !== 'error') {
            fetchEstado(); // Initial call
            interval = setInterval(fetchEstado, 3000);
        }

        return () => clearInterval(interval);
    }, [params.jobId, router, status, user, hasAccess]);

    const iniciarAnalisis = async () => {
        if (!user) return;
        setIsAnalysisTriggered(true);
        toast({ title: "Iniciando análisis...", description: "El servidor comenzará a procesar los planos." });
        
        try {
            const token = await user.getIdToken();
            const response = await fetch('/api/comparacion-planos/analizar', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ jobId: params.jobId })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error?.message || 'Fallo al iniciar el análisis.');
            }

        } catch (err: any) {
             toast({ variant: 'destructive', title: 'Error', description: err.message });
             setIsAnalysisTriggered(false); // Allow re-try if it fails to start
        }
    };
    
    if (authLoading) return <Loader2 className="animate-spin" />;

    if (!hasAccess) {
        return (
             <div className="max-w-2xl mx-auto text-center space-y-4">
                <Card>
                    <CardHeader className="items-center"><ShieldAlert className="h-12 w-12 text-destructive"/><CardTitle>Acceso Denegado</CardTitle><CardDescription>No tienes permisos para acceder a este módulo.</CardDescription></CardHeader>
                    <CardContent><Button asChild variant="outline"><Link href="/dashboard">Volver al Dashboard</Link></Button></CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto text-center space-y-6">
            <h1 className="text-2xl font-bold">Análisis de Planos en Progreso</h1>
            <p className="text-muted-foreground">Tu solicitud está siendo procesada. Puedes ver el estado del análisis a continuación.</p>
            
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
            
            {status === 'uploaded' && !isAnalysisTriggered && (
                 <Button onClick={iniciarAnalisis}>
                    Iniciar Análisis (simulado)
                </Button>
            )}

            <AnalisisProgreso />
            
             <Button variant="outline" onClick={() => router.back()}>Volver</Button>
        </div>
    );
}
