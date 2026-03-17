"use client";

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { doc, getDoc, updateDoc, addDoc, serverTimestamp, collection } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { OperationalChecklistTemplate, ChecklistSection, ChecklistItem } from '@/types/pcg';
import { Textarea } from '@/components/ui/textarea';

const initialTemplate: Omit<OperationalChecklistTemplate, 'id' | 'createdAt' | 'createdBy' | 'companyId'> = {
    titulo: 'Nueva Plantilla',
    descripcion: '',
    categoria: 'general',
    status: 'draft',
    secciones: [],
};

function TemplateEditor() {
    const params = useParams();
    const templateId = params.templateId as string;
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, companyId } = useAuth();
    const { toast } = useToast();

    const [template, setTemplate] = useState<Partial<OperationalChecklistTemplate>>(initialTemplate);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const isNew = templateId === 'nuevo';

    useEffect(() => {
        if (!user || !companyId) return;
        const cat = (searchParams.get('category') as any) || 'general';
        if (isNew) {
            setTemplate({ ...initialTemplate, companyId, categoria: cat });
            setLoading(false);
        } else {
            getDoc(doc(firebaseDb, "operationalChecklistTemplates", templateId)).then(s => {
                if (s.exists()) setTemplate({ id: s.id, ...s.data() } as any);
                setLoading(false);
            });
        }
    }, [templateId, user, companyId]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (isNew) await addDoc(collection(firebaseDb, "operationalChecklistTemplates"), { ...template, createdAt: serverTimestamp() });
            else await updateDoc(doc(firebaseDb, "operationalChecklistTemplates", templateId), { ...template, updatedAt: serverTimestamp() });
            toast({ title: "Guardado" });
            router.push('/checklists-operacionales/plantillas');
        } catch (e) { toast({ variant: "destructive", title: "Error" }); }
        finally { setIsSaving(false); }
    };

    if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4"/>Volver</Button>
                <Button onClick={handleSave} disabled={isSaving}>{isSaving && <Loader2 className="animate-spin mr-2" />}Guardar</Button>
            </header>
            <Card><CardHeader><CardTitle>Información</CardTitle></CardHeader><CardContent className="space-y-4"><Label>Título</Label><Input value={template.titulo} onChange={e => setTemplate(p => ({...p, titulo: e.target.value}))} /><Label>Descripción</Label><Textarea value={template.descripcion} onChange={e => setTemplate(p => ({...p, descripcion: e.target.value}))} /></CardContent></Card>
        </div>
    );
}

export default function TemplateEditorPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center"><Loader2 className="animate-spin" /></div>}>
            <TemplateEditor />
        </Suspense>
    );
}
