// src/app/operaciones/presupuestos/itemizados/importar/[jobId]/page.tsx
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, CheckCircle, ArrowLeft, Redo, Save } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ItemizadoImportOutput } from '@/types/itemizados-import';
import { motion, AnimatePresence } from 'framer-motion';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type JobStatus = 'queued' | 'uploaded' | 'processing' | 'running_ai' | 'normalizing_result' | 'completed' | 'error';
type JobResponse = {
  status: JobStatus;
  obraId?: string;
  obraNombre?: string;
  companyId?: string;
  result?: ItemizadoImportOutput | null;
  error?: string | null;
  sourceFileName?: string;
};

const statusSteps: Record<JobStatus, { progress: number; text: string; icon: React.ElementType }> = {
    queued: { progress: 5, text: "En cola...", icon: Loader2 },
    uploaded: { progress: 10, text: "Archivo subido, esperando procesador...", icon: Loader2 },
    processing: { progress: 20, text: "Procesando archivo PDF...", icon: Loader2 },
    running_ai: { progress: 50, text: "Analizando con IA (esto puede tardar hasta 2 minutos)...", icon: Loader2 },
    normalizing_result: { progress: 90, text: "Validando y finalizando resultados...", icon: Loader2 },
    completed: { progress: 100, text: "¡Análisis completado!", icon: CheckCircle },
    error: { progress: 100, text: "Error en el análisis", icon: AlertCircle },
};


export default function ImportStatusPage() {
  const params = useParams();
  const router = useRouter();
  const { user, companyId } = useAuth();
  const { toast } = useToast();
  const jobId = params.jobId as string;

  const [jobData, setJobData] = useState<JobResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/itemizados/importar/${jobId}`);
        if (!res.ok) {
          throw new Error('No se pudo obtener el estado del trabajo.');
        }
        const data: JobResponse = await res.json();
        setJobData(data);
      } catch (err: any) {
        setJobData({ status: 'error', error: err.message });
      }
    };

    if (jobData?.status !== 'completed' && jobData?.status !== 'error') {
      const interval = setInterval(pollStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [jobId, jobData?.status]);

  const handleSaveItemizado = async () => {
    if (!jobData?.result?.items || !jobData?.obraId || !user || !companyId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No hay datos suficientes para guardar el presupuesto.",
      });
      return;
    }

    setIsSaving(true);
    try {
        const sourceFileName = jobData.sourceFileName ?? "Itemizado IA";
        const nombrePresupuesto = `Presupuesto importado de ${sourceFileName} - ${new Date().toLocaleDateString()}`;
        
        const items = jobData.result.items;
        const totalPresupuesto = items.reduce((sum, item) => sum + ((item.cantidad || 0) * (item.precioUnitario || 0)), 0);
        
        const newPresupuesto = {
            obraId: jobData.obraId,
            nombre: nombrePresupuesto,
            moneda: "CLP",
            observaciones: `Generado automáticamente por IA a partir de un PDF. Job ID: ${jobId}.`,
            gastosGeneralesPorcentaje: 25,
            items: items,
            fechaCreacion: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: user.uid,
            companyId: companyId,
            source: "IA_PDF" as const,
            jobId: jobId,
            totalPresupuesto,
        };

        const docRef = await addDoc(collection(firebaseDb, "presupuestos"), newPresupuesto);
        
        toast({
            title: "Presupuesto Guardado",
            description: "El presupuesto ha sido guardado correctamente.",
        });
        setIsSaved(true);
        router.push(`/operaciones/presupuestos/${docRef.id}`);

    } catch (err: any) {
        console.error("Error saving presupuesto:", err);
        toast({
            variant: "destructive",
            title: "Error al guardar",
            description: `No se pudo crear el documento de presupuesto. Detalles: ${err.message}`,
        });
    } finally {
        setIsSaving(false);
    }
  };


  const currentStatusInfo = useMemo(() => {
    if (!jobData) return statusSteps['queued'];
    return statusSteps[jobData.status] || statusSteps['queued'];
  }, [jobData]);


  const renderContent = () => {
    if (!jobData) {
        return (
             <div className="text-center">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 font-semibold">Cargando estado del trabajo...</p>
            </div>
        );
    }
    
    const { status, result, error } = jobData;

    if (status === 'completed') {
        return (
          <div className="text-center space-y-4">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <p className="mt-2 font-semibold text-xl">{currentStatusInfo.text}</p>
            {result && (
                <p className="text-sm text-muted-foreground">
                    Se encontraron {result.items?.length || 0} filas válidas.
                </p>
            )}

             <div className="mt-6 flex justify-center gap-4">
                <Button onClick={handleSaveItemizado} disabled={isSaving || isSaved}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                    {isSaved ? "Guardado" : (isSaving ? "Guardando..." : "REVISAR Y GUARDAR ITEMIZADO")}
                </Button>
            </div>
          </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="text-center w-full">
                <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
                <p className="mt-4 font-semibold">{currentStatusInfo.text}</p>
                <pre className="mt-2 text-left text-xs text-destructive bg-destructive/10 p-3 rounded-md whitespace-pre-wrap font-mono">
                  {error}
                </pre>
                <Button onClick={() => router.push('/operaciones/presupuestos/itemizados/importar')} className="mt-4">
                    <Redo className="mr-2 h-4 w-4" /> Intentar de Nuevo
                </Button>
            </div>
        );
    }

    // Para todos los demás estados en progreso
    return (
        <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 font-semibold">{currentStatusInfo.text}</p>
            <Progress value={currentStatusInfo.progress} className="w-full max-w-sm mx-auto mt-4" />
        </motion.div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
       <Button variant="outline" size="sm" onClick={() => router.push('/operaciones/presupuestos')}>
            <ArrowLeft className="mr-2"/> Volver a Presupuestos
        </Button>
      <Card className="min-h-[300px] flex items-center justify-center">
        <CardContent className="pt-6 w-full max-w-lg">
            <AnimatePresence mode="wait">
                <motion.div key={jobData?.status || 'loading'} initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -10}}>
                    {renderContent()}
                </motion.div>
            </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
