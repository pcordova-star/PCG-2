// src/app/checklists-operacionales/ejecutar/[templateId]/page.tsx
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, addDoc, serverTimestamp, collection, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
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
import SignaturePad from '@/app/prevencion/hallazgos/components/SignaturePad';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface HeaderData {
    fecha: string;
    hora: string;
    sector: string;
    elemento: string;
    actividad: string;
    responsable: string;
    observaciones: string;
}

export default function EjecutarChecklistPage() {
    const { templateId } = useParams();
    const router = useRouter();
    const { user, companyId } = useAuth();
    const { toast } = useToast();

    const [template, setTemplate] = useState<OperationalChecklistTemplate | null>(null);
    const [obras, setObras] =useState<Obra[]>([]);
    
    // Estados para el formulario
    const [header, setHeader] = useState<HeaderData>({
        fecha: new Date().toISOString().slice(0, 10),
        hora: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
        sector: '',
        elemento: '',
        actividad: '',
        responsable: user?.displayName || user?.email || '',
        observaciones: ''
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

                // Fetch Catalogos
                const catalogosRef = doc(firebaseDb, "companyCatalogs", companyId, "operationalChecklists", "config");
                const catalogosSnap = await getDoc(catalogosRef);
                if (catalogosSnap.exists()) {
                    const data = catalogosSnap.data();
                    setSectoresCatalogo(prev => [...new Set([...prev, ...(data.sectores || [])])]);
                    setElementosCatalogo(prev => [...new Set([...prev, ...(data.elementos || [])])]);
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

    const handleHeaderChange = (field: keyof HeaderData, value: string) => {
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
                obraId: null, // Placeholder por ahora
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
```
  </change>
  <change>
    <file>src/app/checklists-operacionales/respuestas/[recordId]/page.tsx</file>
    <content><![CDATA[// src/app/checklists-operacionales/respuestas/[recordId]/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, FileText, Download } from 'lucide-react';
import { OperationalChecklistRecord, OperationalChecklistTemplate, Obra } from '@/types/pcg';
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import Image from 'next/image';

export default function RecordDetailPage() {
    const { recordId } = useParams();
    const router = useRouter();
    const { user, companyId } = useAuth();
    const { toast } = useToast();

    const [record, setRecord] = useState<OperationalChecklistRecord | null>(null);
    const [template, setTemplate] = useState<OperationalChecklistTemplate | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !companyId || !recordId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Record
                const recordRef = doc(firebaseDb, "operationalChecklistRecords", recordId as string);
                const recordSnap = await getDoc(recordRef);
                if (recordSnap.exists() && recordSnap.data().companyId === companyId) {
                    const recordData = { id: recordSnap.id, ...recordSnap.data() } as OperationalChecklistRecord;
                    setRecord(recordData);

                    // Fetch Template for context
                    const templateRef = doc(firebaseDb, "operationalChecklistTemplates", recordData.templateId);
                    const templateSnap = await getDoc(templateRef);
                    if (templateSnap.exists()) {
                        setTemplate({ id: templateSnap.id, ...templateSnap.data() } as OperationalChecklistTemplate);
                    }
                    
                } else {
                    toast({ variant: 'destructive', title: 'Error', description: 'Registro no encontrado o acceso denegado.' });
                    router.push('/checklists-operacionales/respuestas');
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos.' });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [recordId, user, companyId, router, toast]);
    
    const handleGeneratePdf = () => {
        if (!record || !template) return;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text(template.titulo, 15, 20);
        
        doc.setFontSize(12);
        doc.text(`Fecha: ${record.header?.fecha || record.filledAt.toDate().toLocaleDateString()}`, 15, 30);
        doc.text(`Realizado por: ${record.header?.responsable || record.filledByEmail}`, 15, 36);
        doc.text(`Sector: ${record.header?.sector || 'N/A'}`, 15, 42);
        doc.text(`Elemento: ${record.header?.elemento || 'N/A'}`, 15, 48);

        let y = 60;
        
        template.secciones.forEach(section => {
            if(y > 260) { doc.addPage(); y = 20; }
            doc.setFontSize(14);
            doc.text(section.title, 15, y);
            y += 8;

            section.items.forEach(item => {
                if(y > 270) { doc.addPage(); y = 20; }
                const answer = record.answers[item.id];
                let answerText = 'No respondido';
                if(item.type === 'boolean') {
                    answerText = answer ? 'Sí / Conforme' : 'No / No Conforme';
                } else if (answer !== undefined && answer !== null) {
                    answerText = String(answer);
                }

                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text(`- ${item.label}:`, 20, y);
                doc.setFont('helvetica', 'normal');
                doc.text(answerText, 60, y);
                y += 7;
            });
            y+= 5;
        });

        if (record.header?.observaciones) {
            if(y > 250) { doc.addPage(); y = 20; }
            doc.setFontSize(14);
            doc.text("Observaciones Generales", 15, y); y+=8;
            doc.setFontSize(10);
            doc.text(record.header.observaciones, 15, y); y+=20;
        }

        if (record.signature?.name) {
             if(y > 260) { doc.addPage(); y = 20; }
            doc.setFontSize(14);
            doc.text("Firma", 15, y); y+=8;
            doc.setFontSize(10);
            doc.text(`Firmado por: ${record.signature.name}`, 15, y);
        }

        doc.save(`checklist_${record.id}.pdf`);
    };

    if (loading) {
        return <div className="p-8 text-center"><Loader2 className="animate-spin" /> Cargando registro...</div>;
    }
    
    if (!record || !template) {
        return <div className="p-8 text-center text-destructive">No se pudieron cargar los datos del registro.</div>;
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                     <Button variant="outline" size="icon" onClick={() => router.push('/checklists-operacionales/respuestas')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{record.templateTitleSnapshot}</h1>
                        <p className="text-muted-foreground">Completado por {record.filledByEmail} el {record.filledAt.toDate().toLocaleString('es-CL')}</p>
                    </div>
                </div>
                 <Button onClick={handleGeneratePdf} disabled={!record || !template}>
                    <FileText className="mr-2 h-4 w-4"/> Generar PDF
                </Button>
            </header>

            {record.header && (
                <Card>
                    <CardHeader><CardTitle>Encabezado del Registro</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div><Label>Fecha</Label><p>{record.header.fecha}</p></div>
                        <div><Label>Hora</Label><p>{record.header.hora}</p></div>
                        <div><Label>Responsable</Label><p>{record.header.responsable}</p></div>
                        <div><Label>Sector</Label><p>{record.header.sector}</p></div>
                        <div><Label>Elemento</Label><p>{record.header.elemento}</p></div>
                        <div><Label>Actividad</Label><p>{record.header.actividad || 'N/A'}</p></div>
                        <div className="col-span-full"><Label>Observaciones</Label><p className="text-muted-foreground">{record.header.observaciones || 'Sin observaciones.'}</p></div>
                        {record.header.evidenceUrls && record.header.evidenceUrls.length > 0 && (
                            <div className="col-span-full">
                                <Label>Evidencia</Label>
                                <div className="flex gap-2 flex-wrap mt-2">
                                    {record.header.evidenceUrls.map((url, i) => (
                                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="relative w-24 h-24 block border rounded-md overflow-hidden">
                                            <Image src={url} alt={`Evidencia ${i + 1}`} layout="fill" objectFit="cover" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Download className="h-6 w-6 text-white"/>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {template.secciones.sort((a,b)=>a.order-b.order).map(section => (
                <Card key={section.id}>
                    <CardHeader><CardTitle>{section.title}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {section.items.sort((a,b)=>a.order-b.order).map(item => {
                             const answer = record.answers[item.id];
                             let displayAnswer = 'No respondido';
                             if(item.type === 'boolean') {
                                 displayAnswer = typeof answer === 'boolean' ? (answer ? 'Sí / Conforme' : 'No / No Conforme') : 'No respondido';
                             } else if (answer !== undefined && answer !== null) {
                                 displayAnswer = String(answer);
                             }
                             return (
                                <div key={item.id}>
                                    <Label className="font-semibold">{item.label}</Label>
                                    <p className="text-sm text-muted-foreground p-2 bg-muted rounded-md mt-1">{displayAnswer}</p>
                                </div>
                             )
                        })}
                    </CardContent>
                </Card>
            ))}

            <Card>
                <CardHeader><CardTitle>Firma</CardTitle></CardHeader>
                <CardContent>
                     {record.signature?.dataUrl ? (
                         <div>
                            <p className="text-sm text-muted-foreground mb-2">Firmado por: {record.signature.name}</p>
                             <Image src={record.signature.dataUrl} alt="Firma" width={200} height={100} className="border rounded-md bg-white"/>
                         </div>
                     ) : (
                         <p className="text-sm text-muted-foreground">No se registró firma para este checklist.</p>
                     )}
                </CardContent>
            </Card>
        </div>
    );
}
```
  </change>
  <change>
    <file>src/app/checklists-operacionales/respuestas/page.tsx</file>
    <content><![CDATA[// src/app/checklists-operacionales/respuestas/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Eye } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OperationalChecklistRecord, Obra } from '@/types/pcg';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function OperationalChecklistRecordsPage() {
    const { user, companyId } = useAuth();
    const [obras, setObras] = useState<Obra[]>([]);
    const [selectedObraId, setSelectedObraId] = useState('__all__');
    const [records, setRecords] = useState<OperationalChecklistRecord[]>([]);
    const [loading, setLoading] = useState(true);

     useEffect(() => {
        if (!companyId) return;

        const obrasQuery = query(collection(firebaseDb, "obras"), where("empresaId", "==", companyId));
        const unsubObras = onSnapshot(obrasQuery, (snapshot) => {
            const obrasList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra));
            setObras(obrasList);
        });
        return () => unsubObras();
    }, [companyId]);

    useEffect(() => {
        if (!companyId) {
             setRecords([]);
             setLoading(false);
             return;
        };

        setLoading(true);
        let recordsQuery;
        
        const baseQuery = collection(firebaseDb, "operationalChecklistRecords");
        const companyFilter = where("companyId", "==", companyId);

        if(selectedObraId === '__all__') {
             recordsQuery = query(
                baseQuery,
                companyFilter,
                orderBy("filledAt", "desc")
            );
        } else {
            recordsQuery = query(
                baseQuery,
                companyFilter,
                where("obraId", "==", selectedObraId),
                orderBy("filledAt", "desc")
            );
        }

        const unsubscribe = onSnapshot(recordsQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OperationalChecklistRecord));
            setRecords(data);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching records: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [companyId, selectedObraId]);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/checklists-operacionales">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Registros de Checklists Operacionales</h1>
          <p className="text-muted-foreground">
            Historial de todos los formularios completados.
          </p>
        </div>
      </header>
       <Card>
        <CardHeader>
          <CardTitle>Filtro por Obra</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm">
            <Label>Filtrar por obra</Label>
            <Select value={selectedObraId} onValueChange={(val) => setSelectedObraId(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las obras" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas las obras</SelectItem>
                {obras.map(obra => (
                  <SelectItem key={obra.id} value={obra.id}>{obra.nombreFaena}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
       <Card>
        <CardHeader>
          <CardTitle>Historial de Registros</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8"><Loader2 className="animate-spin mx-auto"/></div>
          ) : records.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">No se han completado formularios que coincidan con el filtro.</p>
            </div>
          ) : (
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Nombre Formulario</TableHead>
                  <TableHead>Completado Por</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map(record => (
                  <TableRow key={record.id}>
                    <TableCell>{record.filledAt.toDate().toLocaleString('es-CL')}</TableCell>
                    <TableCell className="font-medium">{record.templateTitleSnapshot}</TableCell>
                    <TableCell>{record.filledByEmail}</TableCell>
                    <TableCell>{record.header?.sector || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/checklists-operacionales/respuestas/${record.id}`}>
                           <Eye className="mr-2 h-4 w-4" /> Ver Detalle
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
```
  </change>
  <change>
    <file>src/types/pcg.ts</file>
    <content><![CDATA[// src/types/pcg.ts

import { Timestamp } from "firebase/firestore";

/**
 * Representa una empresa en la plataforma.
 * Almacenada en la colección `companies`.
 */
export interface Company {
  id: string;
  nombreFantasia: string;
  razonSocial: string;
  rut: string;
  giro?: string;
  direccion?: string;
  comuna?: string;
  ciudad?: string;
  telefonoContacto?: string;
  emailContacto?: string;
  baseMensual: number;
  valorPorUsuario: number;
  activa: boolean;
  createdAt: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}


/**
 * Representa un usuario dentro del contexto de una empresa específica.
 * Este tipo se usa principalmente para mostrar datos, el 'role' se obtiene de 'AppUser'.
 */
export interface CompanyUser {
  id?: string;
  uid: string;
  email: string;
  nombre: string;
  role: RolInvitado;
  obrasAsignadas: string[];
  activo: boolean;
}

/**
 * Representa un usuario a nivel global en la plataforma.
 * Almacenado en la colección `users`. Esta es la fuente de verdad para los roles.
 */
export interface AppUser {
  id?: string; // El ID del documento es el UID de Firebase Auth
  nombre: string;
  email: string;
  phone?: string;
  role: RolInvitado | 'superadmin' | 'none';
  empresaId: string | null;
  createdAt: Date | Timestamp;
  activo?: boolean;
  eliminado?: boolean;
  eliminadoAt?: Date | Timestamp;
}


export type RolInvitado = "admin_empresa" | "jefe_obra" | "prevencionista" | "cliente";
/**
 * Representa una invitación para unirse a una empresa.
 * Almacenada en la colección `invitacionesUsuarios`.
 */
export interface UserInvitation {
    id?: string;
    email: string;
    empresaId: string;
    empresaNombre: string;
    roleDeseado: RolInvitado;
    estado: "pendiente" | "aceptada" | "revocada" | "pendiente_auth" | "activado";
    creadoPorUid: string;
    createdAt: Date | Timestamp;
}

export interface Obra {
  id: string;
  nombreFaena: string;
  direccion?: string;
  clienteEmail?: string;
  mandanteRazonSocial?: string;
  mandanteRut?: string;
  jefeObraNombre?: string;
  prevencionistaNombre?: string;
  mutualidad?: string;
  empresaId: string;
  empresa?: {
    nombre: string;
  };
  fechaInicio?: string;
  fechaTermino?: string;
  dotacionProyectada?: number;
  adminContratoNombre?: string;
}

export interface ActividadProgramada {
  id: string;
  obraId: string;
  nombreActividad: string;
  fechaInicio: string;
  fechaFin: string;
  precioContrato: number; 
  unidad: string;
  cantidad: number;
  avanceProgramado?: number;
};

export interface AvanceDiario {
  id: string;
  obraId: string;
  actividadId: string;
  fecha: Timestamp;
  cantidadEjecutada?: number;
  porcentajeAvance?: number;
  comentario: string;
  fotos?: string[];
  visibleCliente: boolean;
  creadoPor: {
    uid: string;
    displayName: string;
  };
  tipoRegistro?: 'CANTIDAD' | 'FOTOGRAFICO';
};

export interface Presupuesto {
    id: string;
    nombre: string;
    fechaCreacion: Timestamp;
    items: any[];
};

export interface IPERRegistro {
  id: string;
  correlativo?: number;
  obraId: string;
  obraNombre?: string;
  // Identificación
  tarea: string;
  zona: string;
  peligro: string;
  riesgo: string;
  categoriaPeligro: string;
  // Evaluación Inherente (con género)
  probabilidad_hombre: number;
  consecuencia_hombre: number;
  nivel_riesgo_hombre: number;
  probabilidad_mujer: number;
  consecuencia_mujer: number;
  nivel_riesgo_mujer: number;
  // Controles
  jerarquiaControl: string; 
  control_especifico_genero: string;
  responsable: string; plazo: string; 
  // Seguimiento
  estadoControl: string; 
  // Riesgo Residual
  probabilidad_residual: number; 
  consecuencia_residual: number; 
  nivel_riesgo_residual: number; 
  // Meta
  usa_componente_genero?: boolean;
  medidasControlExistentes: string;
  medidasControlPropuestas: string;
  responsableImplementacion: string;
  plazoImplementacion: string;
  fecha?: string;
  createdAt?: any;
  // Campos para compatibilidad con plantillas (pueden ser opcionales)
  peligroOtro?: string;
  riesgoOtro?: string;
  controlEspecificoGeneroOtro?: string;
  probabilidadHombre?: number;
  consecuenciaHombre?: number;
  probabilidadMujer?: number;
  consecuenciaMujer?: number;
  probabilidadResidual?: number;
  consecuenciaResidual?: number;
  // Campos de firma del prevencionista
  firmaPrevencionistaUrl?: string;
  firmaPrevencionistaNombre?: string;
  firmaPrevencionistaRut?: string;
  firmaPrevencionistaCargo?: string;
  firmaPrevencionistaFecha?: string; // ISO String
  firmaPrevencionistaUserId?: string;
};

export type CharlaEstado = "borrador" | "realizada" | "programada" | "cancelada";

export interface FirmaAsistente {
  trabajadorId?: string;
  nombre: string;
  rut: string;
  cargo?: string;
  firmaUrl?: string;
  firmadoEn?: string; // ISO
  firmadoPorUsuarioId?: string; // UID del prevencionista/admin que guarda
}

export type Charla = {
    id: string;
    obraId: string;
    obraNombre: string;
    iperId: string;
    iperIdRelacionado?: string; // Nuevo campo opcional
    titulo: string;
    tipo: "charla_iper" | "charla_induccion";
    fechaCreacion: Timestamp;
    creadaPorUid: string;
    generadaAutomaticamente: boolean;
    tarea: string;
    zonaSector?: string;
    peligro: string;
    riesgo: string;
    probHombres: number;
    consHombres: number;
    nivelHombres: number;
    probMujeres: number;
    consMujeres: number;
    nivelMujeres: number;
    controlGenero: string;
    estado: CharlaEstado;
    contenido: string;
    fechaRealizacion?: Timestamp;
    duracionMinutos?: number;
    participantesTexto?: string;
    asistentes?: FirmaAsistente[]; // Nuevo campo opcional
    observaciones?: string;
};

export type Criticidad = 'baja' | 'media' | 'alta';

export interface Hallazgo {
  id?: string;
  obraId: string;
  sector?: string;
  createdAt: Timestamp;
  createdBy: string;
  tipoRiesgo: string;
  descripcion: string;
  tipoHallazgoDetalle?: string;
  descripcionLibre?: string;
  accionesInmediatas: string[];
  responsableId: string;
  responsableNombre?: string;
  plazo: string;
  evidenciaUrl: string;
  criticidad: Criticidad;
  estado: 'abierto' | 'en_progreso' | 'cerrado';
  iperActividadId?: string;
  iperRiesgoId?: string;
  planAccionId?: string;
  investigacionId?: string; // Nuevo campo
  fichaFirmadaUrl?: string;
  fechaFichaFirmada?: Timestamp;
}

export interface MiembroEquipo {
    id: string;
    nombre: string;
    cargo: 'Supervisor' | 'Administrador de obra' | 'Prevencionista' | 'Capataz' | 'Comité Paritario';
}

export type EquipoResponsable = MiembroEquipo[];

export type OrigenAccion =
  | "IPER"
  | "INCIDENTE"
  | "OBSERVACION"
  | "hallazgo"
  | "OTRO";

export type EstadoAccion = "Pendiente" | "En progreso" | "Cerrada";

export type RegistroPlanAccion = {
  id: string;
  obraId: string;
  obraNombre?: string;
  origen: OrigenAccion;
  referencia: string; 
  descripcionAccion: string;
  responsable: string;
  plazo: string;
  estado: EstadoAccion;
  avance: string;
  observacionesCierre: string;
  fechaCreacion: string;
  creadoPor: string;
  createdAt?: any;
  hallazgoId?: string;
};

export type TipoIncidente =
  | "Accidente con tiempo perdido"
  | "Accidente sin tiempo perdido"
  | "Casi accidente"
  | "Daño a la propiedad";

export type GravedadIncidente = "Leve" | "Grave" | "Fatal potencial";

export type MetodoAnalisisIncidente = 'ishikawa_5p' | 'arbol_causas';

export interface NodoArbolCausas {
  id: string;
  parentId: string | null;
  tipo: 'hecho' | 'accion' | 'condicion';
  descripcionCorta: string;
  detalle?: string;
  esCausaInmediata?: boolean;
  esCausaBasica?: boolean;
}

export interface ArbolCausas {
  habilitado: boolean;
  raizId: string | null;
  nodos: Record<string, NodoArbolCausas>;
}

export interface MedidaCorrectivaDetallada {
  id: string;
  causaNodoId?: string | null; // id del NodoArbolCausas al que se asocia la medida (si aplica)
  descripcionAccion: string;
  responsable: string;
  fechaCompromiso: string; // ISO string
  estado: 'pendiente' | 'en_proceso' | 'cerrado';
  observaciones?: string;
}

export type RegistroIncidente = {
  id: string;
  obraId: string;
  obraNombre?: string;
  fecha: string; 
  lugar: string;
  tipoIncidente: TipoIncidente;
  gravedad: GravedadIncidente;
  descripcionHecho: string;
  actoInseguro: string;
  condicionInsegura: string;
  causasInmediatas: string;
  causasBasicas: string;
  analisisIshikawa: string;
  analisis5Porques: string;
  medidasCorrectivas: string;
  responsableSeguimiento: string;
  plazoCierre: string;
  estadoCierre: "Abierto" | "En seguimiento" | "Cerrado";
  createdAt?: any;
  origen?: string;
  hallazgoId?: string;
  // Campos del Árbol de Causas
  metodoAnalisis?: MetodoAnalisisIncidente;
  arbolCausas?: ArbolCausas;
  // Campos para el Plan de Acción
  medidasCorrectivasDetalladas?: MedidaCorrectivaDetallada[];
  // Campos Normativos para Accidentes
  lesionDescripcion?: string;
  parteCuerpoAfectada?: string;
  agenteAccidente?: string;
  mecanismoAccidente?: string;
  diasReposoMedico?: number | null;
  huboTiempoPerdido?: boolean | null;
  esAccidenteGraveFatal?: boolean | null;
};

// --- CHECKLISTS ---

// Tipos comunes para ítems de checklist
export type ChecklistItemType = "boolean" | "text" | "number" | "select";

export interface ChecklistItem {
    id: string;
    order: number;
    type: ChecklistItemType;
    label: string;
    required: boolean;
    options?: string[];
    allowComment?: boolean;
    allowPhoto?: boolean;
}

export interface ChecklistSection {
    id: string;
    title: string;
    order: number;
    items: ChecklistItem[];
}

// Plantillas de Checklists OPERACIONALES
export interface OperationalChecklistTemplate {
    id: string;
    companyId: string;
    titulo: string;
    descripcion: string;
    status: 'draft' | 'active' | 'inactive';
    secciones: ChecklistSection[];
    createdAt: Timestamp;
    updatedAt?: Timestamp;
    createdBy: string;
}

// Respuestas de Checklists OPERACIONALES
export interface OperationalChecklistRecord {
    id: string;
    companyId: string;
    obraId?: string;
    templateId: string;
    templateTitleSnapshot: string;
    filledByUid: string;
    filledByEmail: string;
    filledAt: Timestamp;
    header?: {
        fecha: string;
        hora: string;
        sector: string;
        elemento: string;
        actividad: string;
        responsable: string;
        observaciones: string;
        evidenceUrls?: string[];
    };
    answers: Record<string, any>; // Clave es el itemId
    signature?: { type: "none"|"typed"; name?: string, dataUrl?: string | null };
    pdf: { generated: boolean, dataUri?: string };
    status: "draft" | "submitted";
}


// --- CHECKLISTS SEGURIDAD (AISLADO) ---
export interface SafetyChecklistTemplate {
    id: string;
    companyId: string;
    titulo: string;
    descripcion: string;
    createdAt: Timestamp;
    createdBy: string; // UID del prevencionista
    secciones: {
        id: string;
        titulo: string;
        items: {
            id: string;
            texto: string;
            tipo: "ok_nok_na" | "texto" | "numero" | "fecha";
        }[];
    }[];
}

export interface SafetyChecklistRecord {
    id: string;
    companyId: string;
    obraId: string;
    templateId: string;
    templateTitulo: string;
    userId: string; // UID del prevencionista que lo completa
    userName: string;
    createdAt: Timestamp;
    respuestas: {
        itemId: string;
        respuesta: 'OK' | 'NOK' | 'NA' | string | number | null;
        observacion?: string;
        fotoUrl?: string;
    }[];
    firmaObligatoriaUrl: string; // La firma es obligatoria
    pdfUrl?: string;
}

// --- MÓDULO DE CONTROL DOCUMENTAL ---

export interface CompanyDocument {
    id?: string;
    companyId: string;
    code: string;
    name: string;
    category: string;
    version: string;
    vigente: boolean;
    fileUrl?: string | null;
    storagePath?: string | null; // Path en Firebase Storage
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdById: string;
    updatedById: string;
}

export interface ProjectDocument {
    id?: string;
    companyId: string;
    projectId: string; // Corresponde a obraId
    companyDocumentId: string | null;
    code: string;
    name: string;
    category: string;
    versionAsignada: string;
    vigente: boolean;
    obsoleto: boolean;
    eliminado?: boolean;
    fileUrl: string | null;
    storagePath: string | null; // Path en Firebase Storage
    assignedAt: Timestamp;
    assignedById: string;
}

export interface DocumentDistribution {
    id?: string;
    companyId: string;
    projectId: string; // Corresponde a obraId
    projectDocumentId: string;
    companyDocumentId: string;
    version: string;
    notifiedUserId: string;
    email: string;
    method: "email";
    sentAt: Timestamp;
}

// --- MÓDULO DE RDI ---

export type RdiPrioridad = 'baja' | 'media' | 'alta' | 'critica';

export type RdiEstado = 'borrador' | 'enviada' | 'respondida' | 'cerrada' | 'anulada';

export type RdiAdjuntoTipo = 'imagen' | 'pdf' | 'otro';

export interface RdiAdjunto {
  id: string;
  nombreArchivo: string;
  tipo: RdiAdjuntoTipo;
  storagePath: string;
  downloadUrl: string;
  subidoPorUserId: string;
  fechaSubida: Timestamp;
}

export interface Rdi {
  id: string; // id del documento en Firestore
  companyId: string;
  obraId: string;
  correlativo: string; // ej: "RDI-001"
  titulo: string;
  descripcion: string;
  tipo: 'a_mandante' | 'a_contratista' | 'interna';

  // Especialidad
  especialidad: 'arquitectura' | 'estructuras' | 'electrica' | 'sanitaria' | 'climatizacion' | 'otra';

  prioridad: RdiPrioridad;
  estado: RdiEstado;

  // Referencias a personas
  solicitante: {
    userId: string;
    nombre: string;
    email: string;
    cargo: string;
  };
  destinatario: {
    nombre: string;
    email: string;
    empresa: string;
    cargo: string;
  };

  // Relación con plano / documento técnico
  planoId: string | null; // id del plano o documento técnico relacionado

  // Fechas y plazos
  fechaEmision: Timestamp;
  fechaLimiteRespuesta: Timestamp | null;
  plazoRespuestaDias: number | null;

  // Impacto en el programa (plazo de la obra)
  afectaPlazo: boolean;
  diasAumentoSolicitados: number | null;
  diasAumentoAprobados: number | null;

  // Respuesta del cliente
  respuestaTexto: string | null;
  clienteRespondio: boolean;
  fechaRespuestaCliente: Timestamp | null;

  // Adjuntos
  adjuntos: RdiAdjunto[];
  tieneAdjuntos: boolean;

  // Notificación al cliente
  paraCliente: boolean; // si debe aparecer en dashboard del cliente
  emailClienteNotificado: boolean;
  fechaNotificacionEmail: Timestamp | null;

  // Metadatos
  createdAt: Timestamp;
  updatedAt: Timestamp;
  closedAt: Timestamp | null;
  deleted: boolean;
  
  // --- Adicional / Itemizado asociado ---
  tieneAdicional?: boolean;             // true si esta RDI ya generó un adicional
  adicionalId?: string | null;         // id del itemizado/adicional en su colección
  adicionalEstado?: 'borrador' | 'enviado' | 'aprobado' | 'rechazado' | null;
  adicionalMontoTotal?: number | null; // monto total del adicional asociado, si aplica
}
```
  </change>
  <change>
    <file>src/lib/checklists/catalogos.ts</file>
    <content><![CDATA[// src/lib/checklists/catalogos.ts

export const defaultSectores = ["Bodega", "Acceso", "Faena", "Oficinas", "Patio", "Andamios", "Zona de carga", "Otro"];

export const defaultElementos = ["Hormigón", "Enfierradura", "Moldajes", "Albañilería", "Terminaciones", "Instalaciones", "Aseo", "Otro"];
