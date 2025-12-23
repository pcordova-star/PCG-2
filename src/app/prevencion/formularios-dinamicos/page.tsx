// src/app/prevencion/formularios-dinamicos/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { FormSubmission, Obra } from '@/types/pcg';
import Link from 'next/link';
import { ArrowLeft, FileText, PlusCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function FormulariosDinamicosPage() {
    const { companyId, role } = useAuth();
    const [obras, setObras] = useState<Obra[]>([]);
    const [selectedObraId, setSelectedObraId] = useState('');
    const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!companyId && role !== 'superadmin') return;

        let obrasQuery;
        if (role === 'superadmin') {
            obrasQuery = query(collection(firebaseDb, "obras"), orderBy("nombreFaena"));
        } else {
            obrasQuery = query(collection(firebaseDb, "obras"), where("empresaId", "==", companyId), orderBy("nombreFaena"));
        }

        const unsubObras = onSnapshot(obrasQuery, (snapshot) => {
            const obrasList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra));
            setObras(obrasList);
            if (obrasList.length > 0 && !selectedObraId) {
                setSelectedObraId(obrasList[0].id);
            }
        });

        return () => unsubObras();
    }, [companyId, role]);

    useEffect(() => {
        if (!selectedObraId) {
            setSubmissions([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const q = query(
            collection(firebaseDb, "formSubmissions"),
            where("obraId", "==", selectedObraId),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const subs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FormSubmission));
            setSubmissions(subs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching form submissions:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [selectedObraId]);

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/prevencion"><ArrowLeft /></Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Formularios Dinámicos</h1>
                        <p className="text-muted-foreground">Listado de checklists y formularios completados en terreno.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button asChild>
                        <Link href="/prevencion/formularios-dinamicos/completar">
                            <PlusCircle className="mr-2" /> Completar Nuevo Formulario
                        </Link>
                    </Button>
                    <Button asChild variant="secondary">
                        <Link href="/prevencion/formularios-dinamicos/plantillas">
                            Gestionar Plantillas
                        </Link>
                    </Button>
                </div>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Filtros</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="max-w-sm">
                        <Label>Obra</Label>
                        <Select value={selectedObraId} onValueChange={setSelectedObraId}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar obra..." /></SelectTrigger>
                            <SelectContent>
                                {obras.map(obra => <SelectItem key={obra.id} value={obra.id}>{obra.nombreFaena}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Formularios Enviados</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Nombre del Formulario</TableHead>
                                <TableHead>Usuario</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={4} className="text-center">Cargando...</TableCell></TableRow>
                            ) : submissions.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center h-24">No hay formularios para esta obra.</TableCell></TableRow>
                            ) : (
                                submissions.map(sub => (
                                    <TableRow key={sub.id}>
                                        <TableCell>{sub.createdAt.toDate().toLocaleString('es-CL')}</TableCell>
                                        <TableCell className="font-medium">{sub.templateName}</TableCell>
                                        <TableCell>{sub.userName}</TableCell>
                                        <TableCell className="text-right">
                                            <Button asChild variant="outline" size="sm">
                                                <a href={sub.pdfUrl} target="_blank" rel="noopener noreferrer">
                                                    <FileText className="mr-2 h-4 w-4" /> Ver PDF
                                                </a>
                                            </Button>
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
