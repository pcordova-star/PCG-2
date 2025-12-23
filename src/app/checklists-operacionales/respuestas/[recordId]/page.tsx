// src/app/checklists-operacionales/respuestas/[recordId]/page.tsx
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
        const fechaStr =
            (record.header && record.header.fecha) ||
            (record.filledAt ? record.filledAt.toDate().toLocaleDateString() : "");
        doc.text("Fecha: " + fechaStr, 15, 30);
        doc.text("Realizado por: " + ((record.header && record.header.responsable) || record.filledByEmail || ""), 15, 36);
        doc.text("Sector: " + ((record.header && record.header.sector) || "N/A"), 15, 42);
        doc.text("Elemento: " + ((record.header && record.header.elemento) || "N/A"), 15, 48);

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
