// src/app/admin/documentos/proyecto/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Upload, MoreVertical } from "lucide-react";
import { ProjectDocument, Obra, CompanyDocument } from '@/types/pcg';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import ImportarCorporativosModal from '@/components/documentos/ImportarCorporativosModal';
import SubirDocumentoProyectoModal from '@/components/documentos/SubirDocumentoProyectoModal';

function EstadoDocumentoBadge({ vigente, obsoleto }: { vigente: boolean, obsoleto: boolean }) {
    if (obsoleto) {
        return <Badge variant="destructive">Obsoleto</Badge>;
    }
    if (vigente) {
        return <Badge variant="default">Vigente</Badge>;
    }
    return <Badge variant="secondary">No Vigente</Badge>;
}

export default function DocumentosProyectoPage() {
    const { companyId, role } = useAuth();
    const [obras, setObras] = useState<Obra[]>([]);
    const [selectedObraId, setSelectedObraId] = useState<string>('');
    const [documents, setDocuments] = useState<ProjectDocument[]>([]);
    const [corporativos, setCorporativos] = useState<CompanyDocument[]>([]);
    const [loading, setLoading] = useState(true);

    const [openImportar, setOpenImportar] = useState(false);
    const [openSubir, setOpenSubir] = useState(false);

    useEffect(() => {
        if (!companyId && role !== 'superadmin') return;

        let obrasQuery;
        if (role === 'superadmin') {
            obrasQuery = query(collection(firebaseDb, "obras"), orderBy("nombreFaena"));
        } else {
            obrasQuery = query(collection(firebaseDb, "obras"), where("empresaId", "==", companyId), orderBy("nombreFaena"));
        }

        const unsub = onSnapshot(obrasQuery, (snapshot) => {
            const obrasData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra));
            setObras(obrasData);
            if (obrasData.length > 0 && !selectedObraId) {
                setSelectedObraId(obrasData[0].id);
            }
        });
        return () => unsub();
    }, [companyId, role]);

    useEffect(() => {
        if (!selectedObraId) {
            setDocuments([]);
            return;
        }

        setLoading(true);
        const q = query(
            collection(firebaseDb, "projectDocuments"),
            where("projectId", "==", selectedObraId),
            orderBy("code", "asc")
        );
        const unsub = onSnapshot(q, (snapshot) => {
            const docsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectDocument));
            setDocuments(docsData);
            setLoading(false);
        });

        return () => unsub();
    }, [selectedObraId]);

    useEffect(() => {
        if (!companyId) return;

        const q = query(
            collection(firebaseDb, "companyDocuments"),
            where("companyId", "==", companyId),
            orderBy("code", "asc")
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const corporativosData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompanyDocument));
            setCorporativos(corporativosData);
        });

        return () => unsub();
    }, [companyId]);

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Documentos del Proyecto</h1>
                    <p className="text-muted-foreground">Documentos aplicados a una obra específica.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setOpenImportar(true)}>
                        <Upload className="mr-2 h-4 w-4" /> Importar Corporativos
                    </Button>
                    <Button onClick={() => setOpenSubir(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Subir Documento
                    </Button>
                </div>
            </header>

            <Card>
                <CardHeader>
                    <div className="max-w-md space-y-2">
                        <Label htmlFor="obra-select">Seleccione una Obra</Label>
                        <Select value={selectedObraId} onValueChange={setSelectedObraId}>
                            <SelectTrigger id="obra-select"><SelectValue placeholder="Seleccione una obra..."/></SelectTrigger>
                            <SelectContent>
                                {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nombreFaena}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Categoría</TableHead>
                                <TableHead>Versión</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Opciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={6} className="text-center">Cargando documentos...</TableCell></TableRow>
                            ) : documents.map((doc) => (
                                <TableRow key={doc.id}>
                                    <TableCell className="font-mono">{doc.code}</TableCell>
                                    <TableCell className="font-medium">{doc.name}</TableCell>
                                    <TableCell>{doc.category}</TableCell>
                                    <TableCell>{doc.versionAsignada}</TableCell>
                                    <TableCell>
                                        <EstadoDocumentoBadge vigente={doc.vigente} obsoleto={doc.obsoleto} />
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

            <ImportarCorporativosModal 
                open={openImportar}
                onClose={() => setOpenImportar(false)}
                documentos={corporativos}
            />
            <SubirDocumentoProyectoModal
                open={openSubir}
                onClose={() => setOpenSubir(false)}
            />
        </div>
    );
}
