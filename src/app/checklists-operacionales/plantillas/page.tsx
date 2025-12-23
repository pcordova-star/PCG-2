"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Edit, Trash2, PlusCircle, ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { OperationalChecklistTemplate } from '@/types/pcg';
import Link from 'next/link';

const initialFormState: Omit<OperationalChecklistTemplate, 'id' | 'createdAt' | 'createdBy' | 'companyId'> = {
    titulo: '',
    descripcion: '',
    secciones: [{ id: crypto.randomUUID(), titulo: 'Sección 1', items: [] }],
};

export default function OperationalChecklistTemplatesPage() {
    const { user, companyId } = useAuth();
    const { toast } = useToast();
    const [plantillas, setPlantillas] = useState<OperationalChecklistTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [currentTemplate, setCurrentTemplate] = useState<Partial<OperationalChecklistTemplate>>(initialFormState);

    useEffect(() => {
        if (!user || !companyId) {
            setLoading(false);
            return;
        };
        setLoading(true);

        const templatesRef = collection(firebaseDb, "operationalChecklists");
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

    const handleOpenForm = (template?: OperationalChecklistTemplate) => {
        setCurrentTemplate(template || initialFormState);
        setIsFormOpen(true);
    };

    const handleSaveTemplate = async () => {
        if (!user || !companyId || !currentTemplate.titulo) {
            toast({ variant: 'destructive', title: 'Error', description: 'El título es obligatorio.' });
            return;
        }
        setIsSaving(true);
        try {
            if (currentTemplate.id) {
                const docRef = doc(firebaseDb, "operationalChecklists", currentTemplate.id);
                await updateDoc(docRef, { ...currentTemplate, updatedAt: serverTimestamp() });
                toast({ title: 'Plantilla actualizada' });
            } else {
                await addDoc(collection(firebaseDb, "operationalChecklists"), {
                    ...currentTemplate,
                    companyId,
                    createdBy: user.uid,
                    createdAt: serverTimestamp(),
                });
                toast({ title: 'Plantilla creada' });
            }
            setIsFormOpen(false);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la plantilla.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeleteTemplate = async (id: string) => {
        try {
            await deleteDoc(doc(firebaseDb, "operationalChecklists", id));
            toast({ title: 'Plantilla eliminada' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la plantilla.' });
        }
    }

    const handleInputChange = (field: keyof Omit<OperationalChecklistTemplate, 'id' | 'secciones' | 'createdAt' | 'createdBy' | 'companyId'>, value: any) => {
        setCurrentTemplate(prev => ({...prev, [field]: value}));
    };

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
                    <Button onClick={() => handleOpenForm()}>
                        <PlusCircle className="mr-2" />
                        Nueva Plantilla
                    </Button>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8"><Loader2 className="animate-spin mx-auto" /></div>
                    ) : plantillas.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>No hay plantillas operacionales. ¡Crea la primera!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {plantillas.map(template => (
                                <Card key={template.id}>
                                    <CardHeader>
                                        <CardTitle className="text-lg">{template.titulo}</CardTitle>
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
                                                    <AlertDialogAction onClick={() => handleDeleteTemplate(template.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                        <Button variant="outline" size="sm" onClick={() => handleOpenForm(template)}><Edit className="mr-2 h-4 w-4" />Editar</Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

             <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{currentTemplate.id ? 'Editar Plantilla Operacional' : 'Crear Nueva Plantilla Operacional'}</DialogTitle>
                        <DialogDescription>Define la estructura de tu checklist.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="titulo">Título*</Label>
                            <Input id="titulo" value={currentTemplate.titulo || ''} onChange={(e) => handleInputChange('titulo', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="descripcion">Descripción</Label>
                            <Textarea id="descripcion" value={currentTemplate.descripcion || ''} onChange={(e) => handleInputChange('descripcion', e.target.value)} />
                        </div>
                        <div className="text-center p-4 border-dashed border-2 rounded-md">
                            <p className="text-sm text-muted-foreground">La edición de secciones e ítems del checklist se implementará próximamente.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveTemplate} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 animate-spin" />}
                            Guardar Plantilla
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
