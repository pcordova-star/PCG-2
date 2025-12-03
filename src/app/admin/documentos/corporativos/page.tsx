// src/app/admin/documentos/corporativos/page.tsx
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, MoreVertical } from "lucide-react";
import { CompanyDocument } from '@/types/pcg';

// Asumimos que esta función obtiene el companyId del usuario autenticado en el servidor
// En un caso real, esto vendría de la sesión.
async function getCompanyIdForUser() {
    // Placeholder: En una app real, obtendrías esto de la sesión del usuario.
    // Por ahora, buscaremos la primera empresa para mostrar datos.
    const db = getAdminDb();
    const companiesSnap = await getDocs(query(collection(db, 'companies'), orderBy('createdAt', 'desc'), where('activa', '==', true)));
    if (!companiesSnap.empty) {
        return companiesSnap.docs[0].id;
    }
    return null;
}


async function getCompanyDocuments(companyId: string): Promise<CompanyDocument[]> {
    if (!companyId) return [];
    const db = getAdminDb();
    const q = query(
        collection(db, "companyDocuments"),
        where("companyId", "==", companyId),
        orderBy("code", "asc")
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompanyDocument));
}

export default async function DocumentosCorporativosPage() {
    // En una aplicación real, obtendríamos el companyId del usuario autenticado.
    const companyId = await getCompanyIdForUser();
    const documents = companyId ? await getCompanyDocuments(companyId) : [];

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Documentos Corporativos</h1>
                    <p className="text-muted-foreground">Gestión de documentos maestros de la empresa.</p>
                </div>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nuevo Documento
                </Button>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Listado de Documentos</CardTitle>
                    <CardDescription>
                        {documents.length > 0 
                            ? `Mostrando ${documents.length} documentos corporativos.`
                            : "No hay documentos corporativos para mostrar."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Categoría</TableHead>
                                <TableHead>Versión</TableHead>
                                <TableHead>Vigente</TableHead>
                                <TableHead className="text-right">Opciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {documents.map((doc) => (
                                <TableRow key={doc.id}>
                                    <TableCell className="font-mono">{doc.code}</TableCell>
                                    <TableCell className="font-medium">{doc.name}</TableCell>
                                    <TableCell>{doc.category}</TableCell>
                                    <TableCell>{doc.version}</TableCell>
                                    <TableCell>
                                        <Badge variant={doc.vigente ? 'default' : 'secondary'}>
                                            {doc.vigente ? 'Sí' : 'No'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
