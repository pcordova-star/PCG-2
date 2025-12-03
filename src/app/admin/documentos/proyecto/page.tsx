// src/app/admin/documentos/proyecto/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy, onSnapshot, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { firebaseDb, firebaseFunctions } from '@/lib/firebaseClient';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Upload, MoreVertical, ArrowLeft } from "lucide-react";
import { ProjectDocument, Obra, CompanyDocument } from '@/types/pcg';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import ImportarCorporativosModal from '@/components/documentos/ImportarCorporativosModal';
import SubirDocumentoProyectoModal from '@/components/documentos/SubirDocumentoProyectoModal';
import { httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    const { user, companyId, role } = useAuth();
    const { toast } = useToast();

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
        if (!companyId && role !== 'superadmin') return;
        
        const finalCompanyId = role === 'superadmin' ? (obras[0]?.empresaId) : companyId;

        if (!finalCompanyId) return;

        const corpQuery = query(collection(firebaseDb, "companyDocuments"), where("companyId", "==", finalCompanyId), orderBy("code", "asc"));

        const unsub = onSnapshot(corpQuery, (snapshot) => {
            const corporativosData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompanyDocument));
            setCorporativos(corporativosData);
        }, (error) => {
            console.error("Error fetching corporate documents:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los documentos corporativos.' });
        });

        return () => unsub();
    }, [companyId, role, obras]);

    const handleImportar = async (ids: string[]) => {
        if (!selectedObraId || !companyId || !user) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se ha seleccionado una obra o falta información de usuario.' });
            return;
        }

        const documentosAImportar = corporativos.filter(doc => ids.includes(doc.id!));
        if (documentosAImportar.length === 0) return;
        
        try {
            const projectDocsRef = collection(firebaseDb, "projectDocuments");
            const q = query(projectDocsRef, where("projectId", "==", selectedObraId));
            const existingDocsSnap = await getDocs(q);
            const existingCompanyDocIds = new Set(existingDocsSnap.docs.map(doc => doc.data().companyDocumentId));

            const batch = writeBatch(firebaseDb);
            const nuevosDocumentosParaNotificar = [];
            let omitidos = 0;

            for (const docCorp of documentosAImportar) {
                if (existingCompanyDocIds.has(docCorp.id!)) {
                    omitidos++;
                    continue;
                }

                const nuevoDocRef = doc(projectDocsRef);
                const nuevoProjectDocument = {
                    companyId,
                    projectId: selectedObraId,
                    companyDocumentId: docCorp.id!,
                    code: docCorp.code,
                    name: docCorp.name,
                    category: docCorp.category,
                    versionAsignada: docCorp.version,
                    vigente: true,
                    obsoleto: false,
                    assignedAt: serverTimestamp(),
                    assignedById: user.uid,
                    fileUrl: docCorp.fileUrl ?? null,
                };
                batch.set(nuevoDocRef, nuevoProjectDocument);
                
                nuevosDocumentosParaNotificar.push({
                    projectDocumentId: nuevoDocRef.id,
                    ...nuevoProjectDocument
                });
            }

            await batch.commit();

            // Notificar después de que el batch se haya completado
            const notifyFunction = httpsCallable(firebaseFunctions, 'notifyDocumentDistribution');
            for (const docToNotify of nuevosDocumentosParaNotificar) {
                try {
                    await notifyFunction({
                        projectDocumentId: docToNotify.projectDocumentId,
                        projectId: docToNotify.projectId,
                        companyId: docToNotify.companyId,
                        companyDocumentId: docToNotify.companyDocumentId,
                        version: docToNotify.versionAsignada,
                        notifiedUserId: user.uid, // Por ahora, el mismo admin
                        email: user.email,
                    });
                } catch (error) {
                    console.error(`Error al notificar para el documento ${docToNotify.projectDocumentId}:`, error);
                }
            }

            const importados = nuevosDocumentosParaNotificar.length;
            let description = `Se importaron ${importados} documentos nuevos.`;
            if (omitidos > 0) {
                description += ` Se omitieron ${omitidos} por ya existir en el proyecto.`;
            }

            toast({ title: "Importación completada", description });

        } catch (error) {
            console.error("Error al importar documentos:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron importar los documentos.' });
        } finally {
            setOpenImportar(false);
        }
    };

    return (
        <div className="space-y-6">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Dashboard</Link>
            </Button>
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Documentos del Proyecto</h1>
                    <p className="text-muted-foreground">Documentos aplicados a una obra específica.</p>
                </div>
                {role !== 'prevencionista' && (
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setOpenImportar(true)} disabled={!selectedObraId}>
                            <Upload className="mr-2 h-4 w-4" /> Importar Corporativos
                        </Button>
                        <Button onClick={() => setOpenSubir(true)} disabled={!selectedObraId}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Subir Documento
                        </Button>
                    </div>
                )}
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
                            ) : documents.length > 0 ? ( 
                                documents.map((doc) => (
                                    <TableRow key={doc.id}>
                                        <TableCell className="font-mono">{doc.code}</TableCell>
                                        <TableCell className="font-medium">{doc.name}</TableCell>
                                        <TableCell>{doc.category}</TableCell>
                                        <TableCell>{doc.versionAsignada}</TableCell>
                                        <TableCell>
                                            <EstadoDocumentoBadge vigente={doc.vigente} obsoleto={doc.obsoleto} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button variant="ghost" size="icon">
                                                <MoreVertical className="h-4 w-4" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                              {doc.fileUrl && (
                                                  <DropdownMenuItem asChild>
                                                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                                      Ver / Descargar PDF
                                                    </a>
                                                  </DropdownMenuItem>
                                                )}
                                              <DropdownMenuItem asChild>
                                                <Link href={`/admin/documentos/historial/${doc.id}`}>
                                                  Ver historial
                                                </Link>
                                              </DropdownMenuItem>
                                              <DropdownMenuItem asChild>
                                                <Link href={`/admin/documentos/distribucion/${doc.id}`}>
                                                  Evidencia de distribución
                                                </Link>
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={6} className="text-center h-24">No hay documentos para esta obra.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <ImportarCorporativosModal 
                open={openImportar}
                onClose={() => setOpenImportar(false)}
                documentos={corporativos}
                onImport={handleImportar}
            />
            <SubirDocumentoProyectoModal
                open={openSubir}
                onClose={() => setOpenSubir(false)}
            />
        </div>
    );
}
