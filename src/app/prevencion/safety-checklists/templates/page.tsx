// src/app/prevencion/safety-checklists/templates/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Edit, Trash2, PlusCircle, ArrowLeft, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { OperationalChecklistTemplate } from '@/types/pcg';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

export default function SafetyChecklistTemplatesPage() {
    const { user, companyId, role, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [plantillas, setPlantillas] = useState<OperationalChecklistTemplate[]>([]);
    const [loading, setLoading] = useState(true);

    const allowedRoles = ['prevencionista', 'admin_empresa', 'superadmin'];

    useEffect(() => {
        if (!authLoading && !allowedRoles.includes(role)) {
            router.replace('/dashboard');
        }
    }, [authLoading, role, router]);
    

    useEffect(() => {
        if (!user || !companyId || !allowedRoles.includes(role)) {
            setLoading(false);
            return;
        };
        setLoading(true);

        const templatesRef = collection(firebaseDb, "safetyChecklistTemplates");
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
            console.error("Error fetching safety templates:", error);
            toast({ variant: 'destructive', title: 'Error de Carga', description: 'No se pudieron cargar las plantillas de seguridad.' });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, companyId, role, toast]);
    
    const handleDeleteTemplate = async (id: string) => {
        try {
            await deleteDoc(doc(firebaseDb, "safetyChecklistTemplates", id));
            toast({ title: 'Plantilla eliminada' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la plantilla.' });
        }
    }

    const toggleStatus = async (template: OperationalChecklistTemplate) => {
        const newStatus = template.status === 'active' ? 'inactive' : 'active';
        try {
            const docRef = doc(firebaseDb, "safetyChecklistTemplates", template.id);
            await updateDoc(docRef, { status: newStatus });
            toast({ title: `Plantilla ${newStatus === 'active' ? 'activada' : 'desactivada'}` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cambiar el estado.' });
        }
    }
    
    if (authLoading || !allowedRoles.includes(role)) {
      return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/prevencion/safety-checklists">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Plantillas de Checklists de Seguridad</h1>
                    <p className="text-muted-foreground">Crea y gestiona formularios para inspecciones y auditorías de prevención.</p>
                </div>
            </header>

            <Card>
                <CardHeader className="flex-row justify-between items-center">
                    <div>
                        <CardTitle>Mis Plantillas de Seguridad</CardTitle>
                        <CardDescription>Listado de checklists de seguridad para tu empresa.</CardDescription>
                    </div>
                     <Button asChild>
                        <Link href="/prevencion/safety-checklists/templates/nuevo">
                            <PlusCircle className="mr-2" />
                            Nueva Plantilla de Seguridad
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8"><Loader2 className="animate-spin mx-auto" /></div>
                    ) : plantillas.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                            <p>No hay plantillas de seguridad. ¡Crea la primera!</p>
                             <Button asChild className="mt-4">
                                <Link href="/prevencion/safety-checklists/templates/nuevo">
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
                                                {template.status === 'active' ? 'Activa' : 'Inactiva'}
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
                                             <Button variant="outline" size="sm" asChild>
                                                <Link href={`/prevencion/safety-checklists/execute/${template.id}`}><Play className="mr-2 h-4 w-4"/>Usar</Link>
                                            </Button>
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
                                                <Link href={`/prevencion/safety-checklists/templates/${template.id}`}>
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
