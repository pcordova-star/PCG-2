
// src/app/operaciones/presupuestos/itemizados/importar/[jobId]/page.tsx
"use client";

import { useEffect, useState } from 'react';
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

type JobStatus = 'queued' | 'processing' | 'done' | 'error';
type JobResponse = {
  status: JobStatus;
  obraId?: string;
  obraNombre?: string;
  companyId?: string;
  result?: ItemizadoImportOutput | null;
  error?: string | null;
  sourceFileName?: string;
};

// Función para parsear números en formato chileno (ej: "1.234,56")
function parseNumberCL(value: string | number | null | undefined): number {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string' || value.trim() === '') return 0;

    // Eliminar signo peso y puntos de miles, luego reemplazar coma decimal por punto.
    const cleanValue = value.replace(/\$/g, '').replace(/\./g, '').replace(/,/g, '.').trim();
    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? 0 : parsed;
}


// Función de normalización solicitada
function normalizeRowsToPresupuestoItems(rows: any[]): Array<{ parentId: string | null; type: "chapter" | "subchapter" | "item"; descripcion: string; unidad: string; cantidad: number; precioUnitario: number; }> {
    if (!rows) return [];

    const excludedTokens = [
        "iva", "total", "subtotal", "costo directo", "costos directos", 
        "gastos generales", "ggyu", "utilidad", "administración", 
        "imprevistos", "neto", "bruto"
    ];

    return rows
      .filter(row => {
        const descripcion = (row.descripcion ?? row.description ?? row.nombre ?? row.name ?? "").trim().toLowerCase();
        if (!descripcion) return false; // Excluir filas sin descripción
        return !excludedTokens.some(token => descripcion.includes(token));
      })
      .map(row => {
        const descripcion = row.descripcion ?? row.description ?? row.nombre ?? row.name ?? "";
        const unidad = row.unidad ?? row.unit ?? row.u ?? "";
        const cantidad = parseNumberCL(row.cantidad ?? row.qty ?? row.quantity);
        const precioUnitario = parseNumberCL(row.precioUnitario ?? row.unitPrice ?? row.price);
        
        let type: "chapter" | "subchapter" | "item";
        if (row.type && ["chapter", "subchapter", "item"].includes(row.type)) {
            type = row.type;
        } else {
            if (row.isChapter === true || row.level === 0) {
                type = "chapter";
            } else if (row.isSubchapter === true || row.level === 1) {
                type = "subchapter";
            } else {
                type = "item";
            }
        }
        
        const parentId = row.parentId ?? row.parent_id ?? null;

        return {
            parentId,
            type,
            descripcion,
            unidad,
            cantidad,
            precioUnitario
        };
    });
}


export default function ImportStatusPage() {
  const params = useParams();
  const router = useRouter();
  const { user, companyId } = useAuth();
  const { toast } = useToast();
  const jobId = params.jobId as string;

  const [jobData, setJobData] = useState<JobResponse | null>(null);
  const [progress, setProgress] = useState(0);
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

        if (data.status === 'done') {
          setProgress(100);
        } else if (data.status === 'error') {
          setProgress(100);
        } else if (data.status === 'processing') {
            setProgress(prev => Math.min(prev + 5, 90)); // Simula progreso
        }

      } catch (err: any) {
        setJobData({ status: 'error', error: err.message });
      }
    };

    if (jobData?.status !== 'done' && jobData?.status !== 'error') {
      const interval = setInterval(pollStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [jobId, jobData?.status]);

  const handleSaveItemizado = async () => {
    if (!jobData?.result || !jobData?.obraId || !user || !companyId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No hay datos suficientes para guardar el presupuesto.",
      });
      return;
    }

    setIsSaving(true);
    try {
        const sourceFileName =
          jobData.result?.meta?.sourceFileName ??
          jobData?.sourceFileName ??
          "Itemizado IA";
        const nombrePresupuesto = `Presupuesto importado de ${sourceFileName} - ${new Date().toLocaleDateString()}`;
        
        const normalizedItems = normalizeRowsToPresupuestoItems(jobData.result?.rows ?? []);
        const totalPresupuesto = normalizedItems.reduce((sum, item) => sum + (item.cantidad * item.precioUnitario), 0);
        
        const newPresupuesto = {
            obraId: jobData.obraId,
            nombre: nombrePresupuesto,
            moneda: "CLP",
            observaciones: `Generado automáticamente por IA a partir de un PDF. Job ID: ${jobId}. ${jobData.result.meta?.notes || ''}`,
            gastosGeneralesPorcentaje: 25,
            items: normalizedItems,
            fechaCreacion: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: user.uid,
            companyId: companyId,
            source: "IA_PDF",
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


  const renderContent = () => {
    if (!jobData) {
        return (
             <div className="text-center">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 font-semibold">Cargando estado del trabajo...</p>
            </div>
        );
    }

    switch (jobData.status) {
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
            {jobData.result && (
                <p className="text-sm text-muted-foreground">
                    Se encontraron {jobData.result.chapters.length} capítulos y {jobData.result.rows.length} partidas.
                </p>
            )}
             <div className="mt-6 flex justify-center gap-4">
                <Button onClick={handleSaveItemizado} disabled={isSaving || isSaved}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                    {isSaved ? "Guardado" : (isSaving ? "Guardando..." : "Guardar como Presupuesto")}
                </Button>
                <Button variant="outline">Descargar JSON</Button>
            </div>
          </div>
        );
      case 'error':
        return (
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
            <p className="mt-4 font-semibold">Error en el análisis</p>
            <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{jobData.error}</p>
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
                <motion.div key={jobData?.status || 'loading'} initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -10}}>
                    {renderContent()}
                </motion.div>
            </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
