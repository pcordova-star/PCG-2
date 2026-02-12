// src/app/(pcg)/prevencion/hallazgos/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, PlusCircle, Eye } from 'lucide-react';
import { Obra, Hallazgo, Criticidad } from '@/types/pcg';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const criticidadColors: Record<Criticidad, string> = {
  baja: "bg-blue-100 text-blue-800",
  media: "bg-yellow-100 text-yellow-800",
  alta: "bg-red-100 text-red-800",
};

export default function HallazgosListPage() {
    const { companyId, role } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [obras, setObras] = useState<Obra[]>([]);
    const [selectedObraId, setSelectedObraId] = useState('');
    const [hallazgos, setHallazgos] = useState<Hallazgo[]>([]);
    const [loadingObras, setLoadingObras] = useState(true);
    const [loadingHallazgos, setLoadingHallazgos] = useState(false);

    useEffect(() => {
        if (!companyId && role !== 'superadmin') return;

        const obrasRef = collection(firebaseDb, "obras");
        const q = role === 'superadmin' 
            ? query(obrasRef, orderBy("nombreFaena"))
            : query(obrasRef, where("empresaId", "==", companyId), orderBy("nombreFaena"));
        
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

        setLoadingHallazgos(true);
        const q = query(
            collection(firebaseDb, 'hallazgos'),
            where('obraId', '==', selectedObraId),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const hallazgosList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hallazgo));
            setHallazgos(hallazgosList);
            setLoadingHallazgos(false);
        }, (error) => {
            console.error("Error fetching hallazgos:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los hallazgos.' });
            setLoadingHallazgos(false);
        });

        return () => unsubscribe();
    }, [selectedObraId, toast]);

    return (
        <div className="space-y-6">
            <header className="flex items-center gap-4">
                <Button asChild variant="outline" size="sm">
                    <Link href="/prevencion"><ArrowLeft className="mr-2 h-4 w-4" />Volver a Prevención</Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Gestión de Hallazgos en Terreno</h1>
                    <p className="text-muted-foreground">Centraliza, gestiona y haz seguimiento a todas las observaciones de seguridad.</p>
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
                        <CardTitle>Historial de Hallazgos</CardTitle>
                        <CardDescription>
                            {loadingHallazgos ? 'Cargando...' : `Mostrando ${hallazgos.length} registros para la obra seleccionada.`}
                        </CardDescription>
                    </div>
                    <Button asChild>
                        <Link href="/prevencion/hallazgos/reportar">
                            <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Reporte
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    {loadingHallazgos ? (
                        <div className="text-center p-8"><Loader2 className="animate-spin" /></div>
                    ) : hallazgos.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No hay hallazgos registrados para esta obra.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Tipo de Riesgo</TableHead>
                                    <TableHead>Descripción</TableHead>
                                    <TableHead>Criticidad</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {hallazgos.map(hallazgo => (
                                    <TableRow key={hallazgo.id}>
                                        <TableCell>{hallazgo.createdAt.toDate().toLocaleDateString('es-CL')}</TableCell>
                                        <TableCell className="font-medium">{hallazgo.tipoRiesgo}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground truncate max-w-xs">{hallazgo.descripcion}</TableCell>
                                        <TableCell><Badge className={cn(criticidadColors[hallazgo.criticidad])}>{hallazgo.criticidad}</Badge></TableCell>
                                        <TableCell><Badge variant="outline">{hallazgo.estado}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={`/prevencion/hallazgos/detalle/${hallazgo.id}`}>
                                                    <Eye className="mr-2 h-4 w-4" /> Ver
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
