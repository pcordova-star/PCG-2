// src/app/admin/documentos/corporativos/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, MoreVertical, Loader2 } from "lucide-react";
import { CompanyDocument } from '@/types/pcg';

export default function DocumentosCorporativosPage() {
    const { companyId, role } = useAuth();
    const [documents, setDocuments] = useState<CompanyDocument[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!companyId && role !== 'superadmin') {
            setLoading(false);
            setDocuments([]);
            return;
        }

        const getCompanyIdForQuery = async (): Promise<string | null> => {
            if (role === 'superadmin') {
                // Superadmin ve los de la primera empresa como vista general
                const companiesSnap = await getDocs(query(collection(firebaseDb, 'companies'), orderBy('createdAt', 'desc'), limit(1)));
                return companiesSnap.empty ? null : companiesSnap.docs[0].id;
            }
            return companyId;
        };

        const fetchDocuments = async () => {
            setLoading(true);
            const finalCompanyId = await getCompanyIdForQuery();

            if (!finalCompanyId) {
                setDocuments([]);
                setLoading(false);
                return;
            }

            const q = query(
                collection(firebaseDb, "companyDocuments"),
                where("companyId", "==", finalCompanyId),
                orderBy("code", "asc")
            );
            const snapshot = await getDocs(q);
            const docsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompanyDocument));
            setDocuments(docsData);
            setLoading(false);
        };

        fetchDocuments();
    }, [companyId, role]);


    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Documentos Corporativos</h1>
                    <p className="text-muted-foreground">Gestión de documentos maestros de la empresa.</p>
                </div>
                {role !== 'prevencionista' && (
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nuevo Documento
                    </Button>
                )}
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Listado de Documentos</CardTitle>
                    <CardDescription>
                        {loading ? "Cargando documentos..." : documents.length > 0 
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
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">
                                        <Loader2 className="animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                documents.map((doc) => (
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
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
