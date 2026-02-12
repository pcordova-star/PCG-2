// src/app/checklists-operacionales/plantillas/[templateId]/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, addDoc, serverTimestamp, collection } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, PlusCircle, Save, Trash2, ArrowUp, ArrowDown, Edit, X, Settings, Loader2, Play } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { OperationalChecklistTemplate, ChecklistSection, ChecklistItem } from '@/types/pcg';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';

const initialTemplate: Omit<OperationalChecklistTemplate, 'id' | 'createdAt' | 'createdBy' | 'companyId'> = {
    titulo: 'Nueva Plantilla',
    descripcion: '',
    status: 'draft',
    secciones: [],
};

const initialItem: Omit<ChecklistItem, 'id' | 'order'> = {
    label: 'Nuevo Ítem',
    type: 'boolean',
    required: false,
    options: [],
    allowComment: false,
    allowPhoto: false
};


export default function TemplateEditorPage() {
    const { templateId } = useParams();
    const router = useRouter();
    const { user, companyId } = useAuth();
    const { toast } = useToast();

    const [template, setTemplate] = useState<Partial<OperationalChecklistTemplate>>(initialTemplate);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const isNew = templateId === 'nuevo';

    const [editingSection, setEditingSection] = useState<ChecklistSection | null>(null);
    const [editingItem, setEditingItem] = useState<{ sectionId: string; item: ChecklistItem | null } | null>(null);

    useEffect(() => {
        if (!user || !companyId) return;

        if (templateId === 'nuevo') {
            setTemplate({ ...initialTemplate, companyId });
            setLoading(false);
        } else {
            const fetchTemplate = async () => {
                const docRef = doc(firebaseDb, "operationalChecklistTemplates", templateId as string);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().companyId === companyId) {
                    setTemplate({ id: docSnap.id, ...docSnap.data() } as OperationalChecklistTemplate);
                } else {
                    toast({ variant: 'destructive', title: 'Error', description: 'Plantilla no encontrada o acceso denegado.' });
                    router.push('/checklists-operacionales/plantillas');
                }
                setLoading(false);
            };
            fetchTemplate();
        }
    }, [templateId, user, companyId, router, toast]);

    const updateField = (field: keyof OperationalChecklistTemplate, value: any) => {
        setTemplate(prev => ({ ...prev, [field]: value }));
    };

    const addSection = () => {
        const newSection: ChecklistSection = {
            id: crypto.randomUUID(),
            title: `Nueva Sección ${ (template.secciones?.length || 0) + 1 }`,
            order: (template.secciones?.length || 0) + 1,
            items: [],
        };
        updateField('secciones', [...(template.secciones || []), newSection]);
    };

    const updateSection = (section: ChecklistSection) => {
        updateField('secciones', template.secciones?.map(s => s.id === section.id ? section : s));
        setEditingSection(null);
    };

    const deleteSection = (sectionId: string) => {
        updateField('secciones', template.secciones?.filter(s => s.id !== sectionId));
    };

    const moveSection = (index: number, direction: 'up' | 'down') => {
        if (!template.secciones) return;
        const newSections = [...template.secciones];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newSections.length) return;

        [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
        updateField('secciones', newSections.map((s, i) => ({ ...s, order: i + 1 })));
    };

    const addItem = (sectionId: string) => {
        const section = template.secciones?.find(s => s.id === sectionId);
        if (!section) return;

        setEditingItem({ 
            sectionId, 
            item: { 
                id: crypto.randomUUID(), 
                order: (section.items?.length || 0) + 1, 
                ...initialItem 
            } 
        });
    };

    const updateItem = (itemToSave: ChecklistItem) => {
        if (!editingItem) return;
        const newSections = template.secciones?.map(s => {
            if (s.id === editingItem.sectionId) {
                const existing = s.items?.find(i => i.id === itemToSave.id);
                const newItems = existing
                    ? s.items.map(i => i.id === itemToSave.id ? itemToSave : i)
                    : [...(s.items || []), itemToSave];
                return { ...s, items: newItems.sort((a, b) => a.order - b.order) };
            }
            return s;
        });
        updateField('secciones', newSections);
        setEditingItem(null);
    };

    const deleteItem = (sectionId: string, itemId: string) => {
        updateField('secciones', template.secciones?.map(s => 
            s.id === sectionId ? { ...s, items: s.items.filter(i => i.id !== itemId) } : s
        ));
    };
    
    const moveItem = (sectionId: string, itemIndex: number, direction: 'up' | 'down') => {
        if (!template.secciones) return;
        const newSections = [...template.secciones];
        const sectionIndex = newSections.findIndex(s => s.id === sectionId);
        if (sectionIndex === -1) return;

        const newItems = [...newSections[sectionIndex].items];
        const targetIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
        if (targetIndex < 0 || targetIndex >= newItems.length) return;

        [newItems[itemIndex], newItems[targetIndex]] = [newItems[targetIndex], newItems[itemIndex]];
        newSections[sectionIndex] = { ...newSections[sectionIndex], items: newItems.map((item, i) => ({...item, order: i+1})) };
        
        updateField('secciones', newSections);
    };

    const validateTemplate = (): boolean => {
        if (!template.titulo?.trim()) {
            toast({ variant: 'destructive', title: 'Validación fallida', description: 'El título de la plantilla es obligatorio.' });
            return false;
        }
        if (!template.secciones || template.secciones.length === 0) {
            toast({ variant: 'destructive', title: 'Validación fallida', description: 'La plantilla debe tener al menos una sección.' });
            return false;
        }
        for (const section of template.secciones) {
            if (!section.title.trim()) {
                 toast({ variant: 'destructive', title: 'Validación fallida', description: `La sección sin título no es válida.` });
                 return false;
            }
            if (!section.items || section.items.length === 0) {
                 toast({ variant: 'destructive', title: 'Validación fallida', description: `La sección "${section.title}" debe tener al menos un ítem.` });
                 return false;
            }
            for (const item of section.items) {
                if (!item.label.trim()) {
                    toast({ variant: 'destructive', title: 'Validación fallida', description: `Hay un ítem sin etiqueta en la sección "${section.title}".` });
                    return false;
                }
            }
        }
        return true;
    }

    const handleSave = async (publish = false) => {
        if (publish && !validateTemplate()) return;

        setIsSaving(true);
        const dataToSave: Partial<OperationalChecklistTemplate> = { ...template, status: publish ? 'active' : 'draft' };
        
        try {
            if (isNew) {
                const newDocRef = await addDoc(collection(firebaseDb, "operationalChecklistTemplates"), {
                    ...dataToSave,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    createdBy: user?.uid,
                });
                toast({ title: 'Plantilla creada', description: 'Se ha guardado el borrador de tu nueva plantilla.' });
                router.replace(`/checklists-operacionales/plantillas/${newDocRef.id}`);
            } else {
                const docRef = doc(firebaseDb, "operationalChecklistTemplates", templateId as string);
                await updateDoc(docRef, { ...dataToSave, updatedAt: serverTimestamp() });
                toast({ title: 'Plantilla guardada', description: `Se han guardado los cambios ${publish ? 'y se ha publicado' : 'como borrador'}.` });
            }
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la plantilla.' });
        } finally {
            setIsSaving(false);
        }
    };


    if (loading) {
        return <div className="text-center p-8"><Loader2 className="animate-spin" /> Cargando editor...</div>;
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.push('/checklists-operacionales/plantillas')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Editor de Plantilla Operacional</h1>
                        <p className="text-muted-foreground">Define la estructura y campos de tu checklist.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                     <Button onClick={() => handleSave(false)} disabled={isSaving} variant="secondary">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                        Guardar Borrador
                    </Button>
                    <Button onClick={() => handleSave(true)} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                        Guardar y Publicar
                    </Button>
                     {!isNew && (
                        <Button asChild>
                            <Link href={`/checklists-operacionales/ejecutar/${templateId}`}>
                                <Play className="mr-2 h-4 w-4" /> Usar esta Plantilla
                            </Link>
                        </Button>
                    )}
                </div>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Configuración General</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="template-title">Título de la Plantilla</Label>
                        <Input id="template-title" value={template.titulo ?? ''} onChange={e => updateField('titulo', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="template-desc">Descripción</Label>
                        <Textarea id="template-desc" value={template.descripcion ?? ''} onChange={e => updateField('descripcion', e.target.value)} />
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                {template.secciones?.sort((a,b) => a.order - b.order).map((section, sectionIndex) => (
                    <Card key={section.id}>
                        <CardHeader className="flex flex-row justify-between items-center">
                            <CardTitle className="text-lg">{section.title ?? ''}</CardTitle>
                            <div className="flex items-center gap-2">
                                <Button size="icon" variant="ghost" onClick={() => setEditingSection(section)}><Settings className="h-4 w-4"/></Button>
                                <Button size="icon" variant="ghost" onClick={() => moveSection(sectionIndex, 'up')} disabled={sectionIndex === 0}><ArrowUp className="h-4 w-4"/></Button>
                                <Button size="icon" variant="ghost" onClick={() => moveSection(sectionIndex, 'down')} disabled={sectionIndex === (template.secciones?.length || 1) - 1}><ArrowDown className="h-4 w-4"/></Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>¿Eliminar esta sección?</AlertDialogTitle><AlertDialogDescription>Se eliminará la sección &quot;{section.title}&quot; y todos sus ítems. Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => deleteSection(section.id)}>Eliminar</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {section.items?.sort((a,b) => a.order - b.order).map((item, itemIndex) => (
                                <div key={item.id} className="flex items-center justify-between p-2 rounded-md border bg-muted/50">
                                    <div className="flex-1">
                                        <p className="font-medium">{item.label} {item.required && <span className="text-destructive">*</span>}</p>
                                        <p className="text-xs text-muted-foreground">Tipo: {item.type}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button size="icon" variant="ghost" onClick={() => moveItem(section.id, itemIndex, 'up')} disabled={itemIndex === 0}><ArrowUp className="h-4 w-4"/></Button>
                                        <Button size="icon" variant="ghost" onClick={() => moveItem(section.id, itemIndex, 'down')} disabled={itemIndex === (section.items?.length || 1) - 1}><ArrowDown className="h-4 w-4"/></Button>
                                        <Button size="icon" variant="ghost" onClick={() => setEditingItem({ sectionId: section.id, item })}><Edit className="h-4 w-4"/></Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>¿Eliminar este ítem?</AlertDialogTitle></AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => deleteItem(section.id, item.id)}>Eliminar</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            ))}
                            <Button variant="outline" size="sm" onClick={() => addItem(section.id)}><PlusCircle className="mr-2 h-4 w-4"/>Añadir Ítem</Button>
                        </CardContent>
                    </Card>
                ))}
                <Button onClick={addSection}><PlusCircle className="mr-2 h-4 w-4"/>Añadir Sección</Button>
            </div>

            {/* Dialog para editar Sección */}
            <Dialog open={!!editingSection} onOpenChange={() => setEditingSection(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Editar Sección</DialogTitle></DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="section-title">Título de la Sección</Label>
                        <Input id="section-title" value={editingSection?.title ?? ''} onChange={e => setEditingSection(prev => prev ? {...prev, title: e.target.value} : null)} />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditingSection(null)}>Cancelar</Button>
                        <Button onClick={() => updateSection(editingSection!)}>Guardar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog para editar/crear Ítem */}
            <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editingItem?.item?.id && template.secciones?.flatMap(s=>s.items).some(i=>i.id===editingItem.item?.id) ? 'Editar Ítem' : 'Nuevo Ítem'}</DialogTitle></DialogHeader>
                    {editingItem?.item && (
                        <div className="space-y-4 py-4">
                             <div className="space-y-2">
                                <Label>Etiqueta / Pregunta</Label>
                                <Input value={editingItem.item.label ?? ''} onChange={e => setEditingItem(prev => prev ? {...prev, item: {...prev.item!, label: e.target.value}} : null)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Tipo de Campo</Label>
                                <Select value={editingItem.item.type ?? 'boolean'} onValueChange={(v) => setEditingItem(prev => prev ? {...prev, item: {...prev.item!, type: v as ChecklistItem['type']}} : null)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="boolean">Checkbox (Sí/No)</SelectItem>
                                        <SelectItem value="text">Texto</SelectItem>
                                        <SelectItem value="number">Número</SelectItem>
                                        <SelectItem value="select">Selección</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {editingItem.item.type === 'select' && (
                                <div className="space-y-2">
                                    <Label>Opciones (separadas por coma)</Label>
                                    <Input value={editingItem.item.options?.join(', ') ?? ''} onChange={e => setEditingItem(prev => prev ? {...prev, item: {...prev.item!, options: e.target.value.split(',').map(s => s.trim())}} : null)} />
                                </div>
                            )}
                             <div className="flex items-center justify-between pt-4">
                                <Label className="flex items-center gap-2 font-normal"><Checkbox checked={editingItem.item.required ?? false} onCheckedChange={c => setEditingItem(prev => prev ? {...prev, item: {...prev.item!, required: !!c}} : null)}/> Obligatorio</Label>
                             </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditingItem(null)}>Cancelar</Button>
                        <Button onClick={() => updateItem(editingItem!.item!)}>Guardar Ítem</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
