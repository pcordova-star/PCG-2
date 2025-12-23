// src/app/prevencion/formularios-dinamicos/plantillas/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, PlusCircle, Loader2, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface ChecklistTemplate {
    id: string;
    titulo: string;
    descripcion: string;
    categoria: "prevencion" | "operaciones" | "general";
    secciones: {
        id: string;
        titulo: string;
        items: {
            id: string;
            texto: string;
            tipo: "ok_nok" | "texto" | "numero";
        }[];
    }[];
    createdAt: any;
    createdBy: string;
}

const initialFormState: Omit<ChecklistTemplate, 'id' | 'createdAt' | 'createdBy'> = {
    titulo: '',
    descripcion: '',
    categoria: 'general',
    secciones: [{ id: crypto.randomUUID(), titulo: 'Sección 1', items: [] }],
};

const TemplateList = ({ templates, onEdit, onDelete }: { templates: ChecklistTemplate[], onEdit: (template: ChecklistTemplate) => void, onDelete: (id: string) => void }) => {
    if (templates.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <p>No hay plantillas en esta categoría.</p>
            </div>
        );
    }
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(template => (
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
                                    <AlertDialogAction onClick={() => onDelete(template.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <Button variant="outline" size="sm" onClick={() => onEdit(template)}><Edit className="mr-2 h-4 w-4" />Editar</Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
};


export default function PlantillasChecklistPage() {
    const { user, role } = useAuth();
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
        const q = query(templatesRef, orderBy("createdAt", "desc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChecklistTemplate));
            setPlantillas(data);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching templates:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las plantillas.' });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, toast]);

    const filteredTemplates = useMemo(() => {
        if (role === 'prevencionista') {
            return plantillas.filter(p => p.categoria === 'prevencion');
        }
        return plantillas;
    }, [plantillas, role]);

    const plantillasPrevencion = filteredTemplates.filter(p => p.categoria === 'prevencion');
    const plantillasOperaciones = filteredTemplates.filter(p => p.categoria === 'operaciones' || p.categoria === 'general');
    
    const handleOpenForm = (template?: ChecklistTemplate) => {
        setCurrentTemplate(template || { ...initialFormState });
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
        <div className="space-y-6">
            <header className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/prevencion"><ArrowLeft /></Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Gestión de Plantillas de Checklists</h1>
                    <p className="text-muted-foreground">Crea y administra las plantillas para los formularios dinámicos.</p>
                </div>
            </header>

            <Card>
                <CardHeader className="flex-row justify-between items-center">
                    <CardTitle>Plantillas Disponibles</CardTitle>
                    <Button onClick={() => handleOpenForm()}>
                        <PlusCircle className="mr-2" /> Nueva Plantilla
                    </Button>
                </CardHeader>
                <CardContent>
                   <Tabs defaultValue="prevencion" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                           <TabsTrigger value="prevencion">Prevención de Riesgos</TabsTrigger>
                           <TabsTrigger value="operaciones" disabled={role === 'prevencionista'}>Operaciones y General</TabsTrigger>
                        </TabsList>
                        <TabsContent value="prevencion" className="mt-4">
                           {loading ? (
                                <div className="text-center"><Loader2 className="animate-spin mx-auto" /></div>
                            ) : (
                                <TemplateList templates={plantillasPrevencion} onEdit={handleOpenForm} onDelete={handleDeleteTemplate} />
                            )}
                        </TabsContent>
                         <TabsContent value="operaciones" className="mt-4">
                           {loading ? (
                                <div className="text-center"><Loader2 className="animate-spin mx-auto" /></div>
                            ) : role !== 'prevencionista' ? (
                                <TemplateList templates={plantillasOperaciones} onEdit={handleOpenForm} onDelete={handleDeleteTemplate} />
                            ) : null}
                        </TabsContent>
                   </Tabs>
                </CardContent>
            </Card>

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
                            <Select value={currentTemplate.categoria || 'general'} onValueChange={(v) => handleInputChange('categoria', v)} disabled={role === 'prevencionista'}>
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
        </div>
    );
}
