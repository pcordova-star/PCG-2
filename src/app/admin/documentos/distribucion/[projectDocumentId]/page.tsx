// src/app/admin/documentos/distribucion/[projectDocumentId]/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DocumentDistribution } from '@/types/pcg';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function DistribucionDocumentoPage() {
    const params = useParams();
    const projectDocumentId = params.projectDocumentId as string;
    const { companyId, role } = useAuth();
    
    const [documentName, setDocumentName] = useState<string>('');
    const [distributions, setDistributions] = useState<DocumentDistribution[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!projectDocumentId || (!companyId && role !== 'superadmin')) {
            setLoading(false);
            return;
        }

        const getDistributionData = async () => {
            setLoading(true);
            setError(null);
            try {
                // 1. Get document details and verify access
                const docRef = doc(firebaseDb, "projectDocuments", projectDocumentId);
                const docSnap = await getDoc(docRef);

                if (!docSnap.exists()) {
                    throw new Error("El documento del proyecto no fue encontrado.");
                }
                const docData = docSnap.data() as { name: string, companyId: string };
                
                if (role !== 'superadmin' && docData.companyId !== companyId) {
                    throw new Error("No tienes permiso para ver la distribución de este documento.");
                }
                
                setDocumentName(docData.name);

                // 2. Get distribution records
                const q = query(
                    collection(firebaseDb, "documentDistribution"),
                    where("projectDocumentId", "==", projectDocumentId),
                    orderBy("sentAt", "desc")
                );
                const snapshot = await getDocs(q);

                const dists = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DocumentDistribution));
                setDistributions(dists);

            } catch (err: any) {
                console.error("Error fetching distribution data:", err);
                setError(err.message || "Ocurrió un error al cargar los datos.");
            } finally {
                setLoading(false);
            }
        };

        getDistributionData();
    }, [projectDocumentId, companyId, role]);

    return (
        <div className="space-y-6">
            <Button variant="outline" asChild>
                <Link href="/admin/documentos/proyecto"><ArrowLeft className="mr-2 h-4 w-4"/>Volver a Documentos de Proyecto</Link>
            </Button>
            <header>
                <h1 className="text-2xl font-bold">Evidencia de Distribución</h1>
                <p className="text-muted-foreground">{documentName || 'Cargando nombre...'}</p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Registros de Envío</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center h-24">
                            <Loader2 className="animate-spin" />
                        </div>
                    ) : error ? (
                        <p className="text-destructive text-center">{error}</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha de Envío</TableHead>
                                    <TableHead>Email Notificado</TableHead>
                                    <TableHead>ID Usuario</TableHead>
                                    <TableHead>Versión</TableHead>
                                    <TableHead>Método</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {distributions.length > 0 ? distributions.map((dist) => (
                                    <TableRow key={dist.id}>
                                        <TableCell>{dist.sentAt.toDate().toLocaleString('es-CL')}</TableCell>
                                        <TableCell className="font-medium">{dist.email}</TableCell>
                                        <TableCell className="font-mono text-xs">{dist.notifiedUserId}</TableCell>
                                        <TableCell>{dist.version}</TableCell>
                                        <TableCell>{dist.method}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">No hay registros de distribución para este documento.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
