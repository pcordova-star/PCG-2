// src/app/checklists-operacionales/plantillas/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Edit, Trash2, PlusCircle, ArrowLeft, Copy, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { OperationalChecklistTemplate } from '@/types/pcg';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

export default function OperationalChecklistTemplatesPage() {
    const { user, companyId } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [plantillas, setPlantillas] = useState<OperationalChecklistTemplate[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !companyId) {
            setLoading(false);
            return;
        };
        setLoading(true);

        const templatesRef = collection(firebaseDb, "operationalChecklistTemplates");
        const q = query(
            templatesRef, 
            where("companyId", "==", companyId), 
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OperationalChecklistTemplate));
            setPlantillas(data);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching operational templates:", error);
            toast({ variant: 'destructive', title: 'Error de Carga', description: 'No se pudieron cargar las plantillas.' });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, companyId, toast]);
    
    const handleDeleteTemplate = async (id: string) => {
        try {
            await deleteDoc(doc(firebaseDb, "operationalChecklistTemplates", id));
            toast({ title: 'Plantilla eliminada' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la plantilla.' });
        }
    }

    const toggleStatus = async (template: OperationalChecklistTemplate) => {
        const newStatus = template.status === 'active' ? 'draft' : 'active';
        try {
            const docRef = doc(firebaseDb, "operationalChecklistTemplates", template.id);
            await updateDoc(docRef, { status: newStatus });
            toast({ title: `Plantilla ${newStatus === 'active' ? 'activada' : 'desactivada'}` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cambiar el estado.' });
        }
    }
    
    return (
        <div className="space-y-6">
            <header className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/checklists-operacionales">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Plantillas de Checklists Operacionales</h1>
                    <p className="text-muted-foreground">Crea y gestiona formularios para calidad, protocolos de entrega y otros procesos no relacionados a prevención.</p>
                </div>
            </header>

            <Card>
                <CardHeader className="flex-row justify-between items-center">
                    <div>
                        <CardTitle>Mis Plantillas</CardTitle>
                        <CardDescription>Listado de checklists operacionales para tu empresa.</CardDescription>
                    </div>
                     <Button asChild>
                        <Link href="/checklists-operacionales/plantillas/nuevo">
                            <PlusCircle className="mr-2" />
                            Nueva Plantilla
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8"><Loader2 className="animate-spin mx-auto" /></div>
                    ) : plantillas.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                            <p>No hay plantillas operacionales. ¡Crea la primera!</p>
                             <Button asChild className="mt-4">
                                <Link href="/checklists-operacionales/plantillas/nuevo">
                                    <PlusCircle className="mr-2" />
                                    Crear Nueva Plantilla
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {plantillas.map(template => (
                                <Card key={template.id} className="flex flex-col">
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-lg">{template.titulo}</CardTitle>
                                            <Badge variant={template.status === 'active' ? 'default' : 'secondary'}>
                                                {template.status === 'active' ? 'Activa' : 'Borrador'}
                                            </Badge>
                                        </div>
                                        <CardDescription>{template.descripcion}</CardDescription>
                                    </CardHeader>
                                     <CardContent className="flex-grow">
                                        <p className="text-xs text-muted-foreground">
                                            Secciones: {template.secciones?.length || 0}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Ítems: {template.secciones?.reduce((acc, s) => acc + (s.items?.length || 0), 0) || 0}
                                        </p>
                                     </CardContent>
                                    <CardFooter className="flex justify-between gap-2">
                                        <Button variant={template.status === 'active' ? 'secondary' : 'default'} size="sm" onClick={() => toggleStatus(template)}>
                                            {template.status === 'active' ? 'Desactivar' : 'Activar'}
                                        </Button>
                                        <div className="flex gap-1">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
                                                        <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteTemplate(template.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                            <Button variant="outline" size="icon" asChild>
                                                <Link href={`/checklists-operacionales/plantillas/${template.id}`}>
                                                    <Edit className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
