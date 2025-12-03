// src/app/admin/documentos/historial/[projectDocumentId]/page.tsx
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ProjectDocument } from '@/types/pcg';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';


async function getDocumentHistory(projectDocumentId: string) {
    const db = getAdminDb();
    
    // 1. Get the current project document to find its companyDocumentId
    const currentDocRef = doc(db, "projectDocuments", projectDocumentId);
    const currentDocSnap = await getDoc(currentDocRef);

    if (!currentDocSnap.exists()) {
        return { documentName: "Documento no encontrado", history: [] };
    }
    
    const currentDocData = currentDocSnap.data() as ProjectDocument;
    const { companyDocumentId, name } = currentDocData;

    // 2. Find all project documents with the same companyDocumentId
    const q = query(
        collection(db, "projectDocuments"),
        where("companyDocumentId", "==", companyDocumentId),
        where("projectId", "==", currentDocData.projectId),
        orderBy("assignedAt", "desc")
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        return { documentName: name, history: [] };
    }
    
    const history = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProjectDocument));
    return { documentName: name, history };
}


export default async function HistorialDocumentoPage({ params }: { params: { projectDocumentId: string } }) {
    const { documentName, history } = await getDocumentHistory(params.projectDocumentId);

    return (
        <div className="space-y-6">
            <Button variant="outline" asChild>
                <Link href="/admin/documentos/proyecto"><ArrowLeft className="mr-2 h-4 w-4"/>Volver a Documentos de Proyecto</Link>
            </Button>
            <header>
                <h1 className="text-2xl font-bold">Historial del Documento</h1>
                <p className="text-muted-foreground">{documentName}</p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Versiones</CardTitle>
                </CardHeader>
                <CardContent>
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
                            {history.map((version) => (
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
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
