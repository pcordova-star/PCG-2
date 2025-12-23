// src/components/prevencion/ChecklistTemplateManager.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, WhereFilterOp } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Edit, Trash2, PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ChecklistTemplate } from '@/types/pcg';

const initialFormState: Omit<ChecklistTemplate, 'id' | 'createdAt' | 'createdBy'> = {
    titulo: '',
    descripcion: '',
    categoria: 'general',
    secciones: [{ id: crypto.randomUUID(), titulo: 'Sección 1', items: [] }],
};

interface ChecklistTemplateManagerProps {
    categoryFilter: "prevencion" | Array<"operaciones" | "general">;
    title: string;
    description: string;
}

export default function ChecklistTemplateManager({ categoryFilter, title, description }: ChecklistTemplateManagerProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [plantillas, setPlantillas] = useState<ChecklistTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [currentTemplate, setCurrentTemplate] = useState<Partial<ChecklistTemplate>>(initialFormState);

    useEffect(() => {
        if (!user) return;
        setLoading(true);

        const templatesRef = collection(firebaseDb, "checklistTemplates");
        const operator: WhereFilterOp = Array.isArray(categoryFilter) ? 'in' : '==';
        const q = query(
            templatesRef, 
            where("categoria", operator, categoryFilter), 
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChecklistTemplate));
            setPlantillas(data);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching templates:", error);
            toast({ variant: 'destructive', title: 'Error de Carga', description: 'No se pudieron cargar las plantillas. Verifique los índices de Firestore.' });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, toast, categoryFilter]);

    const handleOpenForm = (template?: ChecklistTemplate) => {
        const defaultCategory = Array.isArray(categoryFilter) ? categoryFilter[0] : categoryFilter;
        setCurrentTemplate(template || { ...initialFormState, categoria: defaultCategory });
        setIsFormOpen(true);
    };

    const handleSaveTemplate = async () => {
        if (!user || !currentTemplate.titulo) {
            toast({ variant: 'destructive', title: 'Error', description: 'El título es obligatorio.' });
            return;
        }
        setIsSaving(true);
        try {
            if (currentTemplate.id) {
                const docRef = doc(firebaseDb, "checklistTemplates", currentTemplate.id);
                await updateDoc(docRef, { ...currentTemplate, updatedAt: serverTimestamp() });
                toast({ title: 'Plantilla actualizada' });
            } else {
                await addDoc(collection(firebaseDb, "checklistTemplates"), {
                    ...currentTemplate,
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
            await deleteDoc(doc(firebaseDb, "checklistTemplates", id));
            toast({ title: 'Plantilla eliminada' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la plantilla.' });
        }
    }
    
    const handleInputChange = (field: keyof Omit<ChecklistTemplate, 'id' | 'secciones' | 'createdAt' | 'createdBy'>, value: any) => {
        setCurrentTemplate(prev => ({...prev, [field]: value}));
    };
    
    return (
        <Card>
            <CardHeader className="flex-row justify-between items-center">
                <div>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
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
                                        <Badge variant="outline">{template.categoria}</Badge>
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

             <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{currentTemplate.id ? 'Editar Plantilla' : 'Crear Nueva Plantilla'}</DialogTitle>
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
                        <div className="space-y-2">
                            <Label htmlFor="categoria">Categoría*</Label>
                            <Select value={currentTemplate.categoria || 'general'} onValueChange={(v) => handleInputChange('categoria', v)}>
                                <SelectTrigger id="categoria"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="general">General</SelectItem>
                                    <SelectItem value="operaciones">Operaciones</SelectItem>
                                    <SelectItem value="prevencion">Prevención de Riesgos</SelectItem>
                                </SelectContent>
                            </Select>
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
        </Card>
    );
}
