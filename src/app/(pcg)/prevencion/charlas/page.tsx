// src/app/(pcg)/prevencion/charlas/page.tsx
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
import { Loader2, ArrowLeft, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Obra, Charla } from '@/types/pcg';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function CharlasPage() {
    const { companyId, role } = useAuth();
    const { toast } = useToast();
    const [obras, setObras] = useState<Obra[]>([]);
    const [selectedObraId, setSelectedObraId] = useState('');
    const [charlas, setCharlas] = useState<Charla[]>([]);
    const [loadingObras, setLoadingObras] = useState(true);
    const [loadingCharlas, setLoadingCharlas] = useState(false);

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

        setLoadingCharlas(true);
        const q = query(
            collection(firebaseDb, 'charlas'),
            where('obraId', '==', selectedObraId),
            orderBy('fechaCreacion', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const charlasList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Charla));
            setCharlas(charlasList);
            setLoadingCharlas(false);
        });

        return () => unsubscribe();
    }, [selectedObraId]);

    const handleDelete = async (id: string) => {
        try {
            await deleteDoc(doc(firebaseDb, "charlas", id));
            toast({
                title: "Charla eliminada",
                description: "El registro de la charla ha sido eliminado permanentemente.",
            });
        } catch (error) {
            console.error("Error deleting charla:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo eliminar la charla.",
            });
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex items-center gap-4">
                <Button asChild variant="outline" size="sm">
                    <Link href="/prevencion"><ArrowLeft className="mr-2 h-4 w-4" />Volver a Prevención</Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Charlas y Capacitaciones</h1>
                    <p className="text-muted-foreground">Gestiona y registra todas las charlas de seguridad e inducciones de la obra.</p>
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
                        <CardTitle>Historial de Charlas</CardTitle>
                        <CardDescription>
                            {loadingCharlas ? 'Cargando charlas...' : `Mostrando ${charlas.length} registros.`}
                        </CardDescription>
                    </div>
                    <Button asChild>
                        <Link href={`/prevencion/charlas/nueva?obraId=${selectedObraId}`}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Nueva Charla
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    {loadingCharlas ? (
                        <div className="text-center p-8"><Loader2 className="animate-spin" /></div>
                    ) : charlas.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No hay charlas registradas para esta obra.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Título</TableHead>
                                    <TableHead>Asistentes</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {charlas.map(charla => (
                                    <TableRow key={charla.id}>
                                        <TableCell>{charla.fechaCreacion.toDate().toLocaleDateString('es-CL')}</TableCell>
                                        <TableCell className="font-medium">{charla.titulo}</TableCell>
                                        <TableCell>{charla.asistentes?.length || 0}</TableCell>
                                        <TableCell><Badge variant="outline">{charla.estado}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-1 justify-end">
                                                <Button variant="ghost" size="icon" disabled>
                                                    <Edit className="h-4 w-4"/>
                                                </Button>
                                                 <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>¿Eliminar esta charla?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Esta acción no se puede deshacer. Se eliminará el registro de la charla "{charla.titulo}".
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(charla.id)} className="bg-destructive hover:bg-destructive/90">
                                                                Eliminar
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
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
