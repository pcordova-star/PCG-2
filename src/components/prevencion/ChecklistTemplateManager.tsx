// src/components/prevencion/ChecklistTemplateManager.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc, WhereFilterOp } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Edit, Trash2, PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { OperationalChecklistTemplate } from '@/types/pcg';
import Link from 'next/link';

interface ChecklistTemplateManagerProps {
    categoryFilter: "prevencion" | Array<"operaciones" | "general">;
    title: string;
    description: string;
}

export default function ChecklistTemplateManager({ categoryFilter, title, description }: ChecklistTemplateManagerProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [plantillas, setPlantillas] = useState<OperationalChecklistTemplate[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        setLoading(true);

        const templatesRef = collection(firebaseDb, "operationalChecklistTemplates");
        const operator: WhereFilterOp = Array.isArray(categoryFilter) ? 'in' : '==';
        const q = query(
            templatesRef, 
            where("categoria", operator, categoryFilter), 
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OperationalChecklistTemplate));
            setPlantillas(data);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching templates:", error);
            toast({ variant: 'destructive', title: 'Error de Carga', description: 'No se pudieron cargar las plantillas.' });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, toast, categoryFilter]);
    
    const handleDeleteTemplate = async (id: string) => {
        try {
            await deleteDoc(doc(firebaseDb, "operationalChecklistTemplates", id));
            toast({ title: 'Plantilla eliminada' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la plantilla.' });
        }
    }
    
    return (
        <Card>
            <CardHeader className="flex-row justify-between items-center">
                <div>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
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
                        <p>No hay plantillas en esta categoría. ¡Crea la primera!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {plantillas.map(template => (
                            <Card key={template.id}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg">{template.titulo}</CardTitle>
                                        <Badge variant={template.status === 'active' ? 'default' : 'secondary'}>{template.status}</Badge>
                                    </div>
                                    <CardDescription>{template.descripcion}</CardDescription>
                                </CardHeader>
                                <CardFooter className="flex justify-end gap-2">
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
                                                <AlertDialogAction onClick={() => handleDeleteTemplate(template.id!)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={`/checklists-operacionales/plantillas/${template.id}`}>
                                            <Edit className="mr-2 h-4 w-4" />Editar
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
