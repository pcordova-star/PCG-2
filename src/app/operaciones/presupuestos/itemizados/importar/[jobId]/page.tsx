// src/app/operaciones/presupuestos/itemizados/importar/[jobId]/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, CheckCircle, FileText, ArrowLeft, Redo } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ItemizadoImportOutput } from '@/types/itemizados-import';
import { motion, AnimatePresence } from 'framer-motion';

type JobStatus = 'queued' | 'processing' | 'done' | 'error';
type JobResponse = {
  status: JobStatus;
  result?: ItemizadoImportOutput | null;
  error?: string | null;
};

export default function ImportStatusPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const [status, setStatus] = useState<JobStatus>('queued');
  const [result, setResult] = useState<ItemizadoImportOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!jobId) return;

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/itemizados/importar/${jobId}`);
        if (!res.ok) {
          throw new Error('No se pudo obtener el estado del trabajo.');
        }
        const data: JobResponse = await res.json();
        
        setStatus(data.status);

        if (data.status === 'done') {
          setResult(data.result || null);
          setProgress(100);
        } else if (data.status === 'error') {
          setError(data.error || 'Ocurrió un error desconocido.');
          setProgress(100);
        } else if (data.status === 'processing') {
            setProgress(prev => Math.min(prev + 5, 90)); // Simula progreso
        }

      } catch (err: any) {
        setError(err.message);
        setStatus('error');
      }
    };

    if (status === 'queued' || status === 'processing') {
      const interval = setInterval(pollStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [jobId, status]);

  const renderContent = () => {
    switch (status) {
      case 'queued':
        return (
          <div className="text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 font-semibold">En cola para análisis...</p>
            <p className="text-sm text-muted-foreground">Tu documento está esperando ser procesado por la IA.</p>
          </div>
        );
      case 'processing':
        return (
            <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="text-center">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 font-semibold">Procesando con IA...</p>
                <p className="text-sm text-muted-foreground">Analizando estructura y extrayendo datos. Esto puede tardar hasta 2 minutos.</p>
                <Progress value={progress} className="w-full max-w-sm mx-auto mt-4" />
            </motion.div>
        );
      case 'done':
        return (
          <div className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <p className="mt-4 font-semibold">¡Análisis completado!</p>
            {result && (
                <p className="text-sm text-muted-foreground">
                    Se encontraron {result.chapters.length} capítulos y {result.rows.length} partidas.
                </p>
            )}
             <div className="mt-6 flex justify-center gap-4">
                <Button>Ver Itemizado (Próximamente)</Button>
                <Button variant="outline">Descargar JSON</Button>
            </div>
          </div>
        );
      case 'error':
        return (
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
            <p className="mt-4 font-semibold">Error en el análisis</p>
            <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
            <Button onClick={() => router.push('/operaciones/presupuestos/itemizados/importar')} className="mt-4">
                <Redo className="mr-2"/> Intentar de Nuevo
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
       <Button variant="outline" size="sm" onClick={() => router.push('/operaciones/presupuestos')}>
            <ArrowLeft className="mr-2"/> Volver a Presupuestos
        </Button>
      <Card className="min-h-[300px] flex items-center justify-center">
        <CardContent className="pt-6">
            <AnimatePresence mode="wait">
                <motion.div key={status} initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -10}}>
                    {renderContent()}
                </motion.div>
            </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
