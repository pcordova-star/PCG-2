// src/app/comparacion-planos/[jobId]/page.tsx
import { getAdminApp } from '@/server/firebaseAdmin';
import { ComparacionPlanosJob } from '@/types/comparacion-planos';
import { notFound } from 'next/navigation';
import { ResultadoComparacion } from '@/components/comparacion/ResultadoComparacion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

async function getJobData(jobId: string): Promise<ComparacionPlanosJob | null> {
    try {
        const db = getAdminApp().firestore();
        const docRef = db.collection('comparacionPlanosJobs').doc(jobId);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            return { id: docSnap.id, ...docSnap.data() } as ComparacionPlanosJob;
        }
        return null;
    } catch (error) {
        console.error("Error fetching job data:", error);
        return null;
    }
}

export default async function JobResultPage({ params }: { params: { jobId: string } }) {
    const { jobId } = params;
    const jobData = await getJobData(jobId);

    if (!jobData) {
        return notFound();
    }

    return (
        <div className="space-y-6">
             <header className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/comparacion-planos">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Resultado de la Comparación</h1>
                        <p className="text-sm text-muted-foreground">Job ID: {jobData.jobId}</p>
                    </div>
                </div>
                 <Button asChild variant="default">
                    <Link href="/comparacion-planos">
                        Realizar otra comparación
                    </Link>
                </Button>
            </header>

            {jobData.status === 'error' && (
                <Card className="border-destructive bg-destructive/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                           <AlertTriangle/> Error en el Análisis
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-destructive font-semibold">Ocurrió un error al procesar los planos.</p>
                        <p className="text-sm text-destructive/80 mt-2">{jobData.errorMessage}</p>
                    </CardContent>
                </Card>
            )}

            {jobData.status === 'completed' && jobData.results ? (
                <ResultadoComparacion resultado={jobData.results} />
            ) : jobData.status !== 'error' ? (
                 <p>El análisis aún está en progreso. Por favor, espera.</p>
            ) : null}
        </div>
    );
}
