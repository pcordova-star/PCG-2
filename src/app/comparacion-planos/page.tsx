// src/app/comparacion-planos/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, GitCompareArrows, Loader2, FileCheck2, CheckCircle, AlertTriangle } from 'lucide-react';
import { UploaderPlano } from '@/components/comparacion/UploaderPlano';
import { ComparacionJobStatus, ComparacionPlanosOutput } from '@/types/comparacion-planos';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Progress } from '@/components/ui/progress';

const statusDescriptions: Record<ComparacionJobStatus, string> = {
    pending: "Esperando para iniciar...",
    uploading: "Subiendo y preparando planos...",
    uploaded: "Planos listos. Iniciando análisis...",
    processing: "Procesando con IA...",
    'analyzing-diff': "Analizando diferencias técnicas...",
    'analyzing-cubicacion': "Calculando cubicación diferencial...",
    'generating-impactos': "Generando árbol de impactos...",
    completed: "Análisis completado.",
    error: "Ocurrió un error en el análisis."
};

export default function ComparacionPlanosPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [planoA, setPlanoA] = useState<File | null>(null);
  const [planoB, setPlanoB] = useState<File | null>(null);
  
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<ComparacionJobStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Polling
  useEffect(() => {
    if (jobId && jobStatus !== 'completed' && jobStatus !== 'error') {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/comparacion-planos/status/${jobId}`);
          if(res.ok) {
            const data = await res.json();
            setJobStatus(data.status);
            if (data.status === 'completed') {
              router.push(`/comparacion-planos/${jobId}`);
            } else if (data.status === 'error') {
              setErrorMessage(data.errorMessage || 'Error desconocido.');
            }
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 3000); // Poll cada 3 segundos
      return () => clearInterval(interval);
    }
  }, [jobId, jobStatus, router]);


  const handleAnalizar = async () => {
    if (!planoA || !planoB) {
      toast({ variant: 'destructive', title: 'Faltan archivos', description: 'Debes subir ambas versiones del plano.' });
      return;
    }

    setIsSubmitting(true);
    setJobId(null);
    setJobStatus('pending');
    setErrorMessage(null);

    try {
      // 1. Crear el Job y subir los archivos
      const formData = new FormData();
      formData.append('planoA', planoA);
      formData.append('planoB', planoB);
      
      const createRes = await fetch('/api/comparacion-planos/create', { method: 'POST', body: formData });
      if (!createRes.ok) throw new Error('Error al crear el trabajo de análisis.');
      
      const { jobId: newJobId } = await createRes.json();
      setJobId(newJobId);
      setJobStatus('uploaded');

      // 2. Disparar el análisis (fire-and-forget)
      await fetch('/api/comparacion-planos/analizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: newJobId }),
      });
      setJobStatus('processing');

    } catch (err: any) {
      setJobStatus('error');
      setErrorMessage(err.message);
      toast({ variant: 'destructive', title: 'Error de Inicio', description: err.message });
    } finally {
        // No ponemos isSubmitting a false, para que el UI quede bloqueado en el estado de "procesando"
    }
  };

  const getProgress = () => {
    if (!jobStatus) return 0;
    const progressMap: Record<ComparacionJobStatus, number> = {
        pending: 5, uploading: 20, uploaded: 30, processing: 40,
        'analyzing-diff': 60, 'analyzing-cubicacion': 75, 'generating-impactos': 90,
        completed: 100, error: 100
    };
    return progressMap[jobStatus] || 0;
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Comparación de Planos con IA</h1>
          <p className="text-muted-foreground">
            Sube dos versiones de un plano para analizar sus diferencias.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card>
          <CardHeader>
            <CardTitle>1. Cargar Planos</CardTitle>
            <CardDescription>Sube la versión original (Plano A) y la modificada (Plano B).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <UploaderPlano id="planoA" label="Plano A (Versión Original)" onFileSelect={setPlanoA} disabled={isSubmitting} />
            <UploaderPlano id="planoB" label="Plano B (Versión Modificada)" onFileSelect={setPlanoB} disabled={isSubmitting} />
          </CardContent>
        </Card>

        <div className="sticky top-24 space-y-4">
            <Button onClick={handleAnalizar} disabled={isSubmitting || !planoA || !planoB} className="w-full">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GitCompareArrows className="mr-2 h-4 w-4" />}
                {isSubmitting ? 'Analizando...' : 'Analizar Planos'}
            </Button>
            
            {jobStatus && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           {jobStatus === 'completed' ? <CheckCircle className="text-green-500"/> : jobStatus === 'error' ? <AlertTriangle className="text-destructive"/> : <Loader2 className="animate-spin text-primary"/>}
                            Estado del Análisis
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Progress value={getProgress()} className="h-2 mb-2" />
                        <p className="text-sm text-center font-medium">{statusDescriptions[jobStatus]}</p>
                        {jobStatus === 'error' && <p className="text-xs text-center text-destructive mt-1">{errorMessage}</p>}
                    </CardContent>
                </Card>
            )}
        </div>
      </div>
    </div>
  );
}
