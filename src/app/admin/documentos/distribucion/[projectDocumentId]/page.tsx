// src/app/admin/documentos/distribucion/[projectDocumentId]/page.tsx
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DocumentDistribution } from '@/types/pcg';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

async function getDistributionData(projectDocumentId: string) {
    const db = getAdminDb();
    
    // 1. Get document name
    const docRef = doc(db, "projectDocuments", projectDocumentId);
    const docSnap = await getDoc(docRef);
    const documentName = docSnap.exists() ? docSnap.data().name : "Documento no encontrado";

    // 2. Get distribution records
    const q = query(
        collection(db, "documentDistribution"),
        where("projectDocumentId", "==", projectDocumentId),
        orderBy("sentAt", "desc")
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        return { documentName, distributions: [] };
    }
    
    const distributions = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DocumentDistribution));
    return { documentName, distributions };
}

export default async function DistribucionDocumentoPage({ params }: { params: { projectDocumentId: string } }) {
    const { documentName, distributions } = await getDistributionData(params.projectDocumentId);

    return (
        <div className="space-y-6">
            <Button variant="outline" asChild>
                <Link href="/admin/documentos/proyecto"><ArrowLeft className="mr-2 h-4 w-4"/>Volver a Documentos de Proyecto</Link>
            </Button>
            <header>
                <h1 className="text-2xl font-bold">Evidencia de Distribución</h1>
                <p className="text-muted-foreground">{documentName}</p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Registros de Envío</CardTitle>
                </CardHeader>
                <CardContent>
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
                            {distributions.map((dist) => (
                                <TableRow key={dist.id}>
                                    <TableCell>{dist.sentAt.toDate().toLocaleString('es-CL')}</TableCell>
                                    <TableCell className="font-medium">{dist.email}</TableCell>
                                    <TableCell className="font-mono text-xs">{dist.notifiedUserId}</TableCell>
                                    <TableCell>{dist.version}</TableCell>
                                    <TableCell>{dist.method}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
