// src/app/(pcg)/prevencion/formularios-generales/incidentes/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, PlusCircle, Eye } from 'lucide-react';
import { Obra, RegistroIncidente } from '@/types/pcg';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function IncidentesListPage() {
    const { companyId, role } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [obras, setObras] = useState<Obra[]>([]);
    const [selectedObraId, setSelectedObraId] = useState('');
    const [incidentes, setIncidentes] = useState<RegistroIncidente[]>([]);
    const [loadingObras, setLoadingObras] = useState(true);
    const [loadingIncidentes, setLoadingIncidentes] = useState(false);

    useEffect(() => {
        if (!companyId && role !== 'superadmin') return;

        let q;
        const obrasRef = collection(firebaseDb, "obras");
        if (role === 'superadmin') {
            q = query(obrasRef, orderBy("nombreFaena"));
        } else {
            q = query(obrasRef, where("empresaId", "==", companyId), orderBy("nombreFaena"));
        }
        
        getDocs(q).then((snapshot) => {
            const obrasList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra));
            setObras(obrasList);
            if (obrasList.length > 0) {
                setSelectedObraId(obrasList[0].id);
            }
            setLoadingObras(false);
        });
    }, [companyId, role]);

    useEffect(() => {
        if (!selectedObraId) return;

        setLoadingIncidentes(true);
        const q = query(
            collection(firebaseDb, 'incidentes'),
            where('obraId', '==', selectedObraId),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RegistroIncidente));
            setIncidentes(data);
            setLoadingIncidentes(false);
        }, (error) => {
            console.error("Error fetching incidentes:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los incidentes.' });
            setLoadingIncidentes(false);
        });

        return () => unsubscribe();
    }, [selectedObraId, toast]);

    return (
        <div className="space-y-6">
            <header className="flex items-center gap-4">
                <Button asChild variant="outline" size="sm">
                    <Link href="/prevencion/formularios-generales"><ArrowLeft className="mr-2 h-4 w-4" />Volver a Formularios</Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Gestión de Incidentes</h1>
                    <p className="text-muted-foreground">Listado de todos los incidentes y accidentes reportados en la obra.</p>
                </div>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Filtro por Obra</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="max-w-md space-y-2">
                        <Label htmlFor="obra-select">Obra</Label>
                        <Select value={selectedObraId} onValueChange={setSelectedObraId} disabled={loadingObras}>
                            <SelectTrigger id="obra-select">
                                <SelectValue placeholder={loadingObras ? "Cargando obras..." : "Selecciona una obra"} />
                            </SelectTrigger>
                            <SelectContent>
                                {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nombreFaena}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Historial de Incidentes</CardTitle>
                        <CardDescription>
                            {loadingIncidentes ? 'Cargando...' : `Mostrando ${incidentes.length} registros para la obra seleccionada.`}
                        </CardDescription>
                    </div>
                    <Button asChild>
                        <Link href="/prevencion/formularios-generales/incidentes/nuevo">
                            <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Reporte
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    {loadingIncidentes ? (
                        <div className="text-center p-8"><Loader2 className="animate-spin" /></div>
                    ) : incidentes.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No hay incidentes registrados para esta obra.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Tipo de Incidente</TableHead>
                                    <TableHead>Gravedad</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {incidentes.map(incidente => (
                                    <TableRow key={incidente.id}>
                                        <TableCell>{incidente.fecha}</TableCell>
                                        <TableCell className="font-medium">{incidente.tipoIncidente}</TableCell>
                                        <TableCell><Badge variant={incidente.gravedad === 'Leve' ? 'default' : 'destructive'}>{incidente.gravedad}</Badge></TableCell>
                                        <TableCell><Badge variant="outline">{incidente.estadoCierre}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={`/prevencion/formularios-generales/incidentes/detalle/${incidente.id}`}>
                                                    <Eye className="mr-2 h-4 w-4" /> Ver / Investigar
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