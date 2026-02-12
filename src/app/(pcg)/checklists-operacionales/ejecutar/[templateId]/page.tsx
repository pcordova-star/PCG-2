// src/app/checklists-operacionales/ejecutar/[templateId]/page.tsx
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, addDoc, serverTimestamp, collection, setDoc, updateDoc, arrayUnion, getDocs } from 'firebase/firestore';
import { firebaseDb, firebaseStorage } from '@/lib/firebaseClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, Save, Upload, X } from 'lucide-react';
import { OperationalChecklistTemplate, Obra } from '@/types/pcg';
import { defaultSectores, defaultElementos } from '@/lib/checklists/catalogos';
import SignaturePad from '@/components/ui/SignaturePad';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface HeaderData {
    fecha: string;
    hora: string;
    sector: string;
    elemento: string;
    actividad: string;
    responsable: string;
    observaciones: string;
    obraId: string | null;
}

export default function EjecutarChecklistPage() {
    const { templateId } = useParams();
    const router = useRouter();
    const { user, companyId } = useAuth();
    const { toast } = useToast();

    const [template, setTemplate] = useState<OperationalChecklistTemplate | null>(null);
    const [obras, setObras] = useState<Obra[]>([]);
    
    // Estados para el formulario
    const [header, setHeader] = useState<HeaderData>({
        fecha: new Date().toISOString().slice(0, 10),
        hora: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
        sector: '',
        elemento: '',
        actividad: '',
        responsable: user?.displayName || user?.email || '',
        observaciones: '',
        obraId: null,
    });
    const [nuevoSector, setNuevoSector] = useState('');
    const [nuevoElemento, setNuevoElemento] = useState('');
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [evidencia, setEvidencia] = useState<File[]>([]);
    const [firmaDataUrl, setFirmaDataUrl] = useState<string | null>(null);
    
    // Estados de UI
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Estados para catálogos dinámicos
    const [sectoresCatalogo, setSectoresCatalogo] = useState<string[]>(defaultSectores);
    const [elementosCatalogo, setElementosCatalogo] = useState<string[]>(defaultElementos);

    useEffect(() => {
        if (!user || !companyId || !templateId) return;

        const fetchTemplateAndData = async () => {
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
                    return;
                }

                // Fetch Obras
                const obrasQuery = collection(firebaseDb, "obras");
                const obrasSnap = await getDocs(obrasQuery);
                const obrasList = obrasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra));
                setObras(obrasList);

                // Fetch Catalogos
                const catalogosRef = doc(firebaseDb, "companyCatalogs", companyId, "operationalChecklists", "config");
                const catalogosSnap = await getDoc(catalogosRef);
                if (catalogosSnap.exists()) {
                    const data = catalogosSnap.data();
                    setSectoresCatalogo(prev => [...new Set([...prev, ...(data.sectores || [])])].sort());
                    setElementosCatalogo(prev => [...new Set([...prev, ...(data.elementos || [])])].sort());
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos necesarios.' });
            } finally {
                setLoading(false);
            }
        };

        fetchTemplateAndData();
    }, [templateId, user, companyId, router, toast]);

    const handleHeaderChange = (field: keyof HeaderData, value: string | null) => {
        setHeader(prev => ({ ...prev, [field]: value }));
    };

    const handleAnswerChange = (itemId: string, value: any) => {
        setAnswers(prev => ({...prev, [itemId]: value}));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setEvidencia(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const handleRemoveFile = (index: number) => {
        setEvidencia(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!user || !companyId || !template) return;

        // Validaciones
        if (!header.fecha || !header.sector || !header.elemento) {
            toast({ variant: 'destructive', title: 'Campos requeridos', description: 'Fecha, Sector y Elemento son obligatorios en el encabezado.' });
            return;
        }
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
            // Subir evidencias a Storage
            const evidenceUrls = [];
            for (const file of evidencia) {
                const storageRef = ref(firebaseStorage, `operationalChecklists/${companyId}/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                evidenceUrls.push(url);
            }

            // Subir firma si existe
            let finalFirmaUrl: string | null = null;
            if (firmaDataUrl) {
                const blob = await(await fetch(firmaDataUrl)).blob();
                const firmaRef = ref(firebaseStorage, `operationalChecklists/${companyId}/firmas/${Date.now()}.png`);
                await uploadBytes(firmaRef, blob);
                finalFirmaUrl = await getDownloadURL(firmaRef);
            }

            // Actualizar catálogos si es necesario
            const catalogosRef = doc(firebaseDb, "companyCatalogs", companyId, "operationalChecklists", "config");
            const updatePayload: Record<string, any> = {};
            if (header.sector === 'Otro' && nuevoSector.trim()) {
                updatePayload.sectores = arrayUnion(nuevoSector.trim());
            }
            if (header.elemento === 'Otro' && nuevoElemento.trim()) {
                updatePayload.elementos = arrayUnion(nuevoElemento.trim());
            }
            if (Object.keys(updatePayload).length > 0) {
                await setDoc(catalogosRef, updatePayload, { merge: true });
            }

            const recordData = {
                companyId,
                templateId,
                templateTitleSnapshot: template.titulo,
                obraId: header.obraId,
                filledByUid: user.uid,
                filledByEmail: user.email,
                filledAt: serverTimestamp(),
                header: {
                    ...header,
                    sector: header.sector === 'Otro' ? nuevoSector.trim() : header.sector,
                    elemento: header.elemento === 'Otro' ? nuevoElemento.trim() : header.elemento,
                    evidenceUrls,
                },
                answers,
                signature: { 
                    type: firmaDataUrl ? "typed" : "none", 
                    name: header.responsable,
                    dataUrl: finalFirmaUrl,
                },
                pdf: { generated: false },
                status: 'submitted',
            };

            const newRecordRef = await addDoc(collection(firebaseDb, "operationalChecklistRecords"), recordData);
            
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
                <CardHeader><CardTitle>Encabezado</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>Fecha*</Label><Input type="date" value={header.fecha} onChange={e => handleHeaderChange('fecha', e.target.value)} /></div>
                    <div className="space-y-2"><Label>Hora</Label><Input type="time" value={header.hora} onChange={e => handleHeaderChange('hora', e.target.value)} /></div>
                    <div className="space-y-2"><Label>Responsable</Label><Input value={header.responsable} onChange={e => handleHeaderChange('responsable', e.target.value)} /></div>
                    
                     <div className="space-y-2"><Label>Obra (Opcional)</Label>
                        <Select value={header.obraId ?? "__none__"} onValueChange={v => handleHeaderChange('obraId', v === "__none__" ? null : v)}>
                            <SelectTrigger><SelectValue placeholder="Sin Obra Específica"/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none__">Sin Obra Específica</SelectItem>
                                {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nombreFaena}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2"><Label>Sector*</Label>
                        <Select value={header.sector} onValueChange={v => handleHeaderChange('sector', v)}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar sector..."/></SelectTrigger>
                            <SelectContent>{sectoresCatalogo.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                        {header.sector === 'Otro' && <Input value={nuevoSector} onChange={e => setNuevoSector(e.target.value)} placeholder="Especificar nuevo sector"/>}
                    </div>
                     <div className="space-y-2"><Label>Elemento*</Label>
                        <Select value={header.elemento} onValueChange={v => handleHeaderChange('elemento', v)}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar elemento..."/></SelectTrigger>
                            <SelectContent>{elementosCatalogo.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                        </Select>
                        {header.elemento === 'Otro' && <Input value={nuevoElemento} onChange={e => setNuevoElemento(e.target.value)} placeholder="Especificar nuevo elemento"/>}
                    </div>
                    <div className="space-y-2"><Label>Actividad/Tarea</Label><Input value={header.actividad} onChange={e => handleHeaderChange('actividad', e.target.value)} /></div>
                    <div className="lg:col-span-3 space-y-2"><Label>Observaciones Generales</Label><Textarea value={header.observaciones} onChange={e => handleHeaderChange('observaciones', e.target.value)} /></div>
                    <div className="lg:col-span-3 space-y-2">
                        <Label>Evidencia Fotográfica (opcional)</Label>
                        <Input type="file" accept="image/*" multiple onChange={handleFileChange} />
                        <div className="flex flex-wrap gap-2 mt-2">
                            {evidencia.map((file, index) => (
                                <div key={index} className="relative text-xs bg-muted p-1 rounded">
                                    <span>{file.name}</span>
                                    <button type="button" onClick={() => handleRemoveFile(index)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-4 w-4 flex items-center justify-center"><X size={10} /></button>
                                </div>
                            ))}
                        </div>
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
                <CardHeader><CardTitle>Firma del Responsable</CardTitle></CardHeader>
                <CardContent>
                    <SignaturePad onChange={setFirmaDataUrl} onClear={() => setFirmaDataUrl(null)} />
                    <p className="text-xs text-muted-foreground mt-2">Al firmar, doy fe de que la información registrada es verídica.</p>
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
