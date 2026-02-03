// src/app/comparacion-planos/[jobId]/resultado/page.tsx
"use client";

import { useEffect, useState, useMemo } from 'react';
import ResumenEjecutivo from "@/components/comparacion-planos/ResumenEjecutivo";
import ResultadoArbolImpactos from "@/components/comparacion-planos/ResultadoArbolImpactos";
import ResultadoCubicacion from "@/components/comparacion-planos/ResultadoCubicacion";
import ResultadoDiffTecnico from "@/components/comparacion-planos/ResultadoDiffTecnico";
import { Loader2, ShieldAlert, ArrowLeft, Download, FileText, RefreshCw, Save } from 'lucide-react';
import { ComparacionPlanosOutput, ComparacionError } from '@/types/comparacion-planos';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { exportAnalisisToPdf } from '@/lib/comparacion-planos/exportToPdf';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { firebaseDb, firebaseStorage } from '@/lib/firebaseClient';


type JobData = {
    jobId: string;
    status: string;
    results: ComparacionPlanosOutput | null;
    errorMessage: ComparacionError | null;
    reportUrl?: string;
};

export default function ResultadoPage({ params }: { params: { jobId: string } }) {
    const [jobData, setJobData] = useState<JobData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isReanalyzing, setIsReanalyzing] = useState(false);
    const [isSavingPdf, setIsSavingPdf] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user, company, role, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const hasAccess = useMemo(() => {
        if (authLoading) return false;
        if (role === 'superadmin') return true;
        if (!company) return false;
        const allowedRoles = ["admin_empresa", "jefe_obra"];
        return company.feature_plan_comparison_enabled === true && allowedRoles.includes(role);
    }, [company, role, authLoading]);
    
    useEffect(() => {
        if (!user || !hasAccess) {
            if(!authLoading) setLoading(false);
            return;
        };

        const fetchJobData = async () => {
            try {
                const token = await user.getIdToken();
                const response = await fetch(`/api/comparacion-planos/estado/${params.jobId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) {
                     if (response.status === 403) throw new Error("No tienes permiso para ver este análisis.");
                    throw new Error(`Error ${response.status}: No se pudo cargar el resultado del análisis.`);
                }
                const data = await response.json();
                setJobData(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchJobData();
    }, [params.jobId, user, hasAccess, authLoading]);

    const handleReanalyse = async () => {
        if (!user) return;
        setIsReanalyzing(true);
        toast({ title: "Iniciando nuevo análisis...", description: "Clonando archivos y creando un nuevo job." });
        try {
            const token = await user.getIdToken();
            const response = await fetch('/api/comparacion-planos/reanalizar', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ oldJobId: params.jobId }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "No se pudo iniciar el re-análisis.");
            
            router.push(`/comparacion-planos/${result.newJobId}`);

        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message });
            setIsReanalyzing(false);
        }
    };

    const handleDownloadJson = () => {
        if (!jobData?.results) return;
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
            JSON.stringify(jobData.results, null, 2)
        )}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = `analisis_comparacion_${params.jobId}.json`;
        link.click();
    };

    const handleSavePdf = async () => {
        if (!jobData?.results || !params.jobId) return;
        setIsSavingPdf(true);
        try {
            const pdfBuffer = await exportAnalisisToPdf({ jobId: params.jobId, results: jobData.results });
            const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });

            const storagePath = `comparacion-planos/${params.jobId}/reporte_comparativo_${Date.now()}.pdf`;
            const storageRef = ref(firebaseStorage, storagePath);
            await uploadBytes(storageRef, pdfBlob);
            const downloadUrl = await getDownloadURL(storageRef);

            const jobRef = doc(firebaseDb, 'comparacionPlanosJobs', params.jobId);
            await updateDoc(jobRef, {
                reportUrl: downloadUrl,
                reportStoragePath: storagePath,
            });

            setJobData(prev => prev ? ({ ...prev, reportUrl: downloadUrl }) : null);
            
            toast({ title: "Reporte Guardado", description: "El informe PDF ha sido guardado en la plataforma." });
            window.open(downloadUrl, '_blank');

        } catch (err: any) {
            console.error("Error al guardar el PDF:", err);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar y guardar el PDF.' });
        } finally {
            setIsSavingPdf(false);
        }
    };


    if (loading || authLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Cargando resultados del análisis...</p>
            </div>
        );
    }
    
    if (!hasAccess) {
        return (
             <div className="max-w-6xl mx-auto px-4 py-8">
                <Card className="max-w-2xl mx-auto">
                    <CardHeader className="items-center text-center"><ShieldAlert className="h-12 w-12 text-destructive"/><CardTitle>Acceso Denegado</CardTitle><CardDescription>No tienes permisos para acceder a este módulo.</CardDescription></CardHeader>
                    <CardContent className="text-center"><Button asChild variant="outline"><Link href="/dashboard">Volver al Dashboard</Link></Button></CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return <div className="max-w-6xl mx-auto px-4 py-8 text-center p-8 text-destructive bg-destructive/10 rounded-md">{error}</div>;
    }

    if (!jobData || !jobData.status) {
         return <div className="max-w-6xl mx-auto px-4 py-8 text-center p-8 text-muted-foreground">No se encontraron datos para este trabajo.</div>;
    }

    if (jobData.status !== 'completed') {
        return (
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="flex flex-col items-center justify-center min-h-[300px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="mt-4 text-muted-foreground">El análisis está en progreso. Estado actual: <span className="font-bold">{jobData.status}</span></p>
                    <p className="text-xs mt-2">La página se actualizará automáticamente cuando finalice.</p>
                </div>
            </div>
        );
    }
    
     if (jobData.status === 'error' && jobData.errorMessage) {
        return (
             <div className="max-w-6xl mx-auto px-4 py-8 text-center p-8 text-destructive bg-destructive/10 rounded-md">
                <h3 className="font-bold text-lg">Error en el Análisis</h3>
                <p className="mt-2">{jobData.errorMessage.message}</p>
                <p className="font-mono text-xs mt-1">Código: {jobData.errorMessage.code}</p>
            </div>
        );
    }

    if (!jobData.results) {
         return <div className="max-w-6xl mx-auto px-4 py-8 text-center p-8 text-muted-foreground">El análisis finalizó pero no se encontraron resultados.</div>;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <Button variant="outline" size="sm" asChild className="mb-4">
                        <Link href="/comparacion-planos/historial"><ArrowLeft className="mr-2"/>Volver al Historial</Link>
                    </Button>
                    <h1 className="text-3xl font-semibold text-gray-900">Resultados del Análisis Comparativo</h1>
                    <p className="text-muted-foreground font-mono text-sm mt-1">Job ID: {params.jobId}</p>
                </div>
                 <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={handleDownloadJson}><Download className="mr-2"/>Descargar JSON</Button>
                     {jobData.reportUrl ? (
                        <Button asChild>
                            <Link href={jobData.reportUrl} target="_blank">
                                <FileText className="mr-2 h-4 w-4"/> Ver Reporte Guardado
                            </Link>
                        </Button>
                    ) : (
                        <Button variant="secondary" onClick={handleSavePdf} disabled={isSavingPdf}>
                            {isSavingPdf ? <Loader2 className="mr-2 animate-spin h-4 w-4"/> : <Save className="mr-2 h-4 w-4"/>}
                            Guardar Reporte
                        </Button>
                    )}
                    <Button onClick={handleReanalyse} disabled={isReanalyzing}>
                         {isReanalyzing ? <Loader2 className="mr-2 animate-spin"/> : <RefreshCw className="mr-2"/>}
                        Re-analizar
                    </Button>
                </div>
            </header>

            <ResumenEjecutivo data={jobData.results} />
            
            <div className="space-y-8">
                <ResultadoDiffTecnico data={jobData.results.diffTecnico} />
                <ResultadoCubicacion data={jobData.results.cubicacionDiferencial} />
                <ResultadoArbolImpactos data={jobData.results.arbolImpactos} />
            </div>
        </div>
    );
}
