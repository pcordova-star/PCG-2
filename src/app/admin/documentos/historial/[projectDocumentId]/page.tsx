// src/app/admin/documentos/historial/[projectDocumentId]/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ProjectDocument } from '@/types/pcg';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useParams } from 'next/navigation';

export default function HistorialDocumentoPage() {
    const params = useParams();
    const projectDocumentId = params.projectDocumentId as string;
    const { companyId, role } = useAuth();
    
    const [documentName, setDocumentName] = useState<string>('');
    const [history, setHistory] = useState<ProjectDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!projectDocumentId || (!companyId && role !== 'superadmin')) {
            setLoading(false);
            return;
        }

        const getDocumentHistory = async () => {
            setLoading(true);
            setError(null);
            try {
                // 1. Get the current project document to find its details and verify access
                const currentDocRef = doc(firebaseDb, "projectDocuments", projectDocumentId);
                const currentDocSnap = await getDoc(currentDocRef);

                if (!currentDocSnap.exists()) {
                    throw new Error("El documento del proyecto no fue encontrado.");
                }
                
                const currentDocData = currentDocSnap.data() as ProjectDocument;
                
                if (role !== 'superadmin' && currentDocData.companyId !== companyId) {
                    throw new Error("No tienes permiso para ver el historial de este documento.");
                }
                
                const { companyDocumentId, name, projectId } = currentDocData;
                setDocumentName(name);

                // 2. Find all project documents with the same companyDocumentId and projectId
                const q = query(
                    collection(firebaseDb, "projectDocuments"),
                    where("companyDocumentId", "==", companyDocumentId),
                    where("projectId", "==", projectId),
                    orderBy("assignedAt", "desc")
                );
                const snapshot = await getDocs(q);
                
                const histData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProjectDocument));
                setHistory(histData);

            } catch (err: any) {
                console.error("Error fetching document history:", err);
                setError(err.message || "Ocurrió un error al cargar el historial.");
            } finally {
                setLoading(false);
            }
        };

        getDocumentHistory();

    }, [projectDocumentId, companyId, role]);


    return (
        <div className="space-y-6">
            <Button variant="outline" asChild>
                <Link href="/admin/documentos/proyecto"><ArrowLeft className="mr-2 h-4 w-4"/>Volver a Documentos de Proyecto</Link>
            </Button>
            <header>
                <h1 className="text-2xl font-bold">Historial del Documento</h1>
                <p className="text-muted-foreground">{documentName || 'Cargando nombre...'}</p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Versiones</CardTitle>
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
                                    <TableHead>Versión</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Fecha Asignación</TableHead>
                                    <TableHead>Asignado Por</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.length > 0 ? history.map((version) => (
                                    <TableRow key={version.id}>
                                        <TableCell className="font-medium">{version.versionAsignada}</TableCell>
                                        <TableCell>
                                            {version.obsoleto ? <Badge variant="destructive">Obsoleto</Badge> 
                                            : version.vigente ? <Badge variant="default">Vigente</Badge>
                                            : <Badge variant="secondary">No Vigente</Badge>}
                                        </TableCell>
                                        <TableCell>{version.assignedAt.toDate().toLocaleDateString('es-CL')}</TableCell>
                                        <TableCell>{version.assignedById}</TableCell>
                                    </TableRow>
                                )) : (
                                     <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">No hay historial de versiones para este documento.</TableCell>
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
