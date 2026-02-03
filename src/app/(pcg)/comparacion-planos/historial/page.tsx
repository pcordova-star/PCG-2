'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, PlusCircle, Eye } from 'lucide-react';
import { ComparacionJob, ComparacionJobStatus } from '@/types/comparacion-planos';
import { cn } from '@/lib/utils';

const estadoTraduccion: Record<ComparacionJobStatus, string> = {
    'pending-upload': 'Pendiente de Carga',
    'uploaded': 'Archivos Cargados',
    'queued_for_analysis': 'En cola para análisis',
    'processing': 'Procesando Imágenes',
    'running_ai': 'Analizando con IA',
    'analyzing-diff': 'Analizando Diferencias',
    'analyzing-cubicacion': 'Analizando Cubicación',
    'generating-impactos': 'Generando Impactos',
    'completed': 'Completado',
    'error': 'Error',
};

const estadoColor: Record<ComparacionJobStatus, string> = {
    'completed': 'bg-green-100 text-green-800',
    'error': 'bg-red-100 text-red-800',
    'running_ai': 'bg-blue-100 text-blue-800',
    'processing': 'bg-blue-100 text-blue-800',
    'queued_for_analysis': 'bg-yellow-100 text-yellow-800',
    'uploaded': 'bg-gray-100 text-gray-800',
    'pending-upload': 'bg-gray-100 text-gray-800',
    'analyzing-diff': 'bg-blue-100 text-blue-800',
    'analyzing-cubicacion': 'bg-blue-100 text-blue-800',
    'generating-impactos': 'bg-blue-100 text-blue-800',
};


export default function HistorialComparacionesPage() {
    const { user, companyId, role, loading: authLoading } = useAuth();
    const [jobs, setJobs] = useState<ComparacionJob[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user || (!companyId && role !== 'superadmin')) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const jobsRef = collection(firebaseDb, "comparacionPlanosJobs");
        let q;
        if (role === 'superadmin') {
            q = query(jobsRef, orderBy('createdAt', 'desc'));
        } else {
            q = query(jobsRef, where('empresaId', '==', companyId), orderBy('createdAt', 'desc'));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const jobsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() // Convert Timestamp to Date
            } as ComparacionJob));
            setJobs(jobsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching comparison jobs:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, companyId, role, authLoading]);

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button asChild variant="outline" size="sm">
                        <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Dashboard</Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Historial de Comparaciones de Planos</h1>
                        <p className="text-muted-foreground">Revisa todos los análisis de comparación que se han realizado.</p>
                    </div>
                </div>
                <Button asChild>
                    <Link href="/comparacion-planos/upload">
                        <PlusCircle className="mr-2 h-4 w-4"/>
                        Nueva Comparación
                    </Link>
                </Button>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Análisis Realizados</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p>Cargando historial...</p>
                    ) : jobs.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-muted-foreground">No se han realizado comparaciones de planos todavía.</p>
                            <Button asChild className="mt-4">
                                <Link href="/comparacion-planos/upload">Iniciar Primera Comparación</Link>
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Job ID</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {jobs.map(job => (
                                    <TableRow key={job.jobId}>
                                        <TableCell>
                                            {job.createdAt ? new Date(job.createdAt).toLocaleString('es-CL') : 'N/A'}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{job.jobId}</TableCell>
                                        <TableCell>
                                            <Badge className={cn(estadoColor[job.status])}>
                                                {estadoTraduccion[job.status] || job.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button asChild variant="outline" size="sm" disabled={job.status !== 'completed'}>
                                                <Link href={`/comparacion-planos/${job.jobId}/resultado`}>
                                                    <Eye className="mr-2 h-4 w-4"/>
                                                    Ver Resultado
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
