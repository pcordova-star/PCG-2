// src/app/checklists-operacionales/ejecutar/[templateId]/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, addDoc, serverTimestamp, collection, where, query, getDocs } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import { OperationalChecklistTemplate, Obra } from '@/types/pcg';

export default function EjecutarChecklistPage() {
    const { templateId } = useParams();
    const router = useRouter();
    const { user, companyId } = useAuth();
    const { toast } = useToast();

    const [template, setTemplate] = useState<OperationalChecklistTemplate | null>(null);
    const [obras, setObras] = useState<Obra[]>([]);
    const [selectedObraId, setSelectedObraId] = useState('__none__');
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [observations, setObservations] = useState('');
    const [signatureName, setSignatureName] = useState('');
    
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    useEffect(() => {
        if (!user || !companyId) return;

        const fetchTemplateAndObras = async () => {
            setLoading(true);
            try {
                // Fetch Template
                const templateRef = doc(firebaseDb, "operationalChecklistTemplates", templateId as string);
                const templateSnap = await getDoc(templateRef);
                if (templateSnap.exists() && templateSnap.data().companyId === companyId) {
                    setTemplate({ id: templateSnap.id, ...templateSnap.data() } as OperationalChecklistTemplate);
                } else {
                    toast({ variant: 'destructive', title: 'Error', description: 'Plantilla no encontrada o acceso denegado.' });
                    router.push('/checklists-operacionales/plantillas');
                }

                // Fetch Obras
                const obrasQuery = query(collection(firebaseDb, "obras"), where("empresaId", "==", companyId));
                const obrasSnap = await getDocs(obrasQuery);
                const obrasList = obrasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra));
                setObras(obrasList);

            } catch (error) {
                console.error("Error fetching data:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos necesarios.' });
            } finally {
                setLoading(false);
            }
        };

        fetchTemplateAndObras();
    }, [templateId, user, companyId, router, toast]);

    const handleAnswerChange = (itemId: string, value: any) => {
        setAnswers(prev => ({...prev, [itemId]: value}));
    };

    const handleSave = async () => {
        if (!user || !companyId || !template) return;

        // Validar campos requeridos
        if (template.secciones) {
            for (const section of template.secciones) {
                for (const item of section.items) {
                    if (item.required && (answers[item.id] === undefined || answers[item.id] === '')) {
                        toast({ variant: 'destructive', title: 'Validación fallida', description: `El campo "${item.label}" es obligatorio.` });
                        return;
                    }
                }
            }
        }


        setIsSaving(true);
        try {
            const obraIdFinal = selectedObraId === '__none__' ? null : selectedObraId;

            const newRecordRef = await addDoc(collection(firebaseDb, "operationalChecklistRecords"), {
                companyId,
                templateId,
                templateTitleSnapshot: template.titulo,
                obraId: obraIdFinal,
                filledByUid: user.uid,
                filledByEmail: user.email,
                filledAt: serverTimestamp(),
                answers,
                observations,
                signature: { type: 'typed', name: signatureName },
                pdf: { generated: false },
                status: 'submitted',
            });
            toast({ title: 'Checklist Guardado', description: 'El registro se ha guardado correctamente.' });
            router.push(`/checklists-operacionales/respuestas/${newRecordRef.id}`);

        } catch (error) {
            console.error("Error saving checklist record:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el registro.' });
        } finally {
            setIsSaving(false);
        }
    };


    if (loading) {
        return <div className="p-8 text-center"><Loader2 className="animate-spin" /> Cargando formulario...</div>;
    }
    
    if (!template) {
        return <div className="p-8 text-center text-destructive">No se pudo cargar la plantilla.</div>;
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                     <Button variant="outline" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{template.titulo}</h1>
                        <p className="text-muted-foreground">{template.descripcion}</p>
                    </div>
                </div>
                 <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                    {isSaving ? 'Guardando...' : 'Guardar y Finalizar'}
                </Button>
            </header>

            <Card>
                <CardHeader><CardTitle>Información General</CardTitle></CardHeader>
                <CardContent>
                     <div className="max-w-sm space-y-2">
                        <Label>Obra (Opcional)</Label>
                        <Select value={selectedObraId} onValueChange={setSelectedObraId}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar obra..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none__">Sin Obra Específica</SelectItem>
                                {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nombreFaena}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {template.secciones?.sort((a,b) => a.order-b.order).map(section => (
                <Card key={section.id}>
                    <CardHeader><CardTitle>{section.title}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {section.items.sort((a,b) => a.order - b.order).map(item => (
                            <div key={item.id} className="p-4 border rounded-md">
                                <Label className="font-semibold block mb-2">{item.label} {item.required && <span className="text-destructive">*</span>}</Label>
                                {item.type === 'boolean' && (
                                    <div className="flex items-center gap-2">
                                        <Switch checked={answers[item.id] || false} onCheckedChange={val => handleAnswerChange(item.id, val)} />
                                        <span>{answers[item.id] ? 'Sí / Conforme' : 'No / No Conforme'}</span>
                                    </div>
                                )}
                                {item.type === 'text' && (
                                    <Input value={answers[item.id] || ''} onChange={e => handleAnswerChange(item.id, e.target.value)} />
                                )}
                                 {item.type === 'number' && (
                                    <Input type="number" value={answers[item.id] || ''} onChange={e => handleAnswerChange(item.id, e.target.value)} />
                                )}
                                {item.type === 'select' && (
                                    <Select value={answers[item.id] || ''} onValueChange={val => handleAnswerChange(item.id, val)}>
                                        <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                        <SelectContent>
                                            {item.options?.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            ))}

            <Card>
                <CardHeader><CardTitle>Observaciones y Firma</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="observations">Observaciones Generales</Label>
                        <Textarea id="observations" value={observations} onChange={e => setObservations(e.target.value)} />
                    </div>
                     <div>
                        <Label htmlFor="signature">Firma (Nombre del responsable)</Label>
                        <Input id="signature" value={signatureName} onChange={e => setSignatureName(e.target.value)} placeholder="Escriba su nombre completo" />
                    </div>
                </CardContent>
            </Card>

             <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                    {isSaving ? 'Guardando...' : 'Guardar y Finalizar'}
                </Button>
            </div>
        </div>
    );
}
