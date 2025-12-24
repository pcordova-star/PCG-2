// src/app/prevencion/safety-checklists/records/[recordId]/page.tsx
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
import Image from 'next/image';

async function getBase64ImageFromUrl(imageUrl: string): Promise<string> {
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) return "";
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Error fetching image for PDF:", error);
        return "";
    }
}


export default function SafetyRecordDetailPage() {
    const { recordId } = useParams();
    const router = useRouter();
    const { user, companyId } = useAuth();
    const { toast } = useToast();

    const [record, setRecord] = useState<OperationalChecklistRecord | null>(null);
    const [template, setTemplate] = useState<OperationalChecklistTemplate | null>(null);
    const [obra, setObra] = useState<Obra | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !companyId || !recordId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const recordRef = doc(firebaseDb, "safetyChecklistRecords", recordId as string);
                const recordSnap = await getDoc(recordRef);
                if (recordSnap.exists() && recordSnap.data().companyId === companyId) {
                    const recordData = { id: recordSnap.id, ...recordSnap.data() } as OperationalChecklistRecord;
                    setRecord(recordData);

                    const templateRef = doc(firebaseDb, "safetyChecklistTemplates", recordData.templateId);
                    const templateSnap = await getDoc(templateRef);
                    if (templateSnap.exists()) {
                        setTemplate({ id: templateSnap.id, ...templateSnap.data() } as OperationalChecklistTemplate);
                    }
                    
                    if (recordData.obraId) {
                        const obraRef = doc(firebaseDb, "obras", recordData.obraId);
                        const obraSnap = await getDoc(obraRef);
                        if (obraSnap.exists()) {
                            setObra({ id: obraSnap.id, ...obraSnap.data() } as Obra);
                        }
                    }
                    
                } else {
                    toast({ variant: 'destructive', title: 'Error', description: 'Registro de seguridad no encontrado o acceso denegado.' });
                    router.push('/prevencion/safety-checklists/records');
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
    
    const handleGeneratePdf = async () => {
        if (!record || !template) return;
    
        const doc = new jsPDF("p", "mm", "a4");
        const margin = 15;
        const pageWidth = doc.internal.pageSize.getWidth();
        let cursorY = 20;

        // --- Helpers ---
        const addPageIfNeeded = (spaceNeeded: number) => {
            if (cursorY + spaceNeeded > 270) {
                doc.addPage();
                cursorY = 20;
                return true;
            }
            return false;
        };

        const addHeader = () => {
            try {
                 const imgData = '/logo.png';
                 doc.addImage(imgData, 'PNG', 15, 15, 20, 20);
            } catch(e) { console.log("logo no encontrado")}
            
            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.text(template.titulo, pageWidth / 2, 20, { align: 'center' });
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text("Checklist de Prevención de Riesgos", pageWidth / 2, 26, { align: 'center' });
            cursorY = 35;
        };

        const addMetadata = () => {
             doc.setFont("helvetica", "normal");
             doc.setFontSize(10);
             if (obra) {
                doc.text("Obra: " + obra.nombreFaena, marginX, cursorY);
                cursorY += 6;
             }
             const fechaStr = (record.header && record.header.fecha) || (record.filledAt ? record.filledAt.toDate().toLocaleDateString('es-CL') : "");
             doc.text("Fecha: " + fechaStr, marginX, cursorY);
             cursorY += 6;
             doc.text("Realizado por: " + ((record.header && record.header.responsable) || record.filledByEmail || ""), marginX, cursorY);
             cursorY += 6;
             doc.text("Sector: " + ((record.header && record.header.sector) || "N/A"), marginX, cursorY);
             cursorY += 6;
             doc.text("Elemento: " + ((record.header && record.header.elemento) || "N/A"), marginX, cursorY);
             cursorY += 10;
        }

        const addTableHeaders = () => {
             doc.setFont("helvetica", "bold");
             doc.setFillColor(240, 240, 240);
             doc.rect(margin, cursorY, pageWidth - (margin * 2), 7, 'F');
             doc.text("Ítem", margin + 2, cursorY + 5);
             doc.text("Estado", margin + 140, cursorY + 5);
             cursorY += 7;
        };

        // --- Generación del Documento ---
        addHeader();
        addMetadata();

        let summary = { conforme: 0, no_conforme: 0, no_aplica: 0 };

        template.secciones.sort((a,b)=>a.order-b.order).forEach(section => {
            if (addPageIfNeeded(20)) { addHeader(); addMetadata(); }
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.text(section.title, margin, cursorY);
            cursorY += 8;
            addTableHeaders();

            section.items.sort((a,b)=>a.order-b.order).forEach(item => {
                const answer = record.answers[item.id];
                let estadoTexto = "No respondido";
                if(item.type === 'boolean') {
                    if(answer === true) { estadoTexto = "Conforme"; summary.conforme++; }
                    else if (answer === false) { estadoTexto = "No Conforme"; summary.no_conforme++; }
                    else { estadoTexto = "N/A"; summary.no_aplica++; }
                } else {
                     estadoTexto = String(answer || "-");
                }
                
                const itemLines = doc.splitTextToSize(item.label, 135);
                const rowHeight = itemLines.length * 5 + 4;

                if (addPageIfNeeded(rowHeight)) {
                    addHeader();
                    addMetadata();
                    addTableHeaders();
                }

                doc.setFont("helvetica", "normal");
                doc.text(itemLines, margin + 2, cursorY + 4);
                doc.text(estadoTexto, margin + 140, cursorY + 4);

                cursorY += rowHeight;
                doc.line(margin, cursorY, pageWidth - margin, cursorY);
            });
            cursorY += 10;
        });

        // Resumen
        if (addPageIfNeeded(30)) { addHeader(); addMetadata(); }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Resumen", margin, cursorY); cursorY+=6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("Conforme: " + summary.conforme, margin, cursorY); cursorY+=5;
        doc.text("No Conforme: " + summary.no_conforme, margin, cursorY); cursorY+=5;
        doc.text("No Aplica: " + summary.no_aplica, margin, cursorY); y+=10;

        // Firma
        if (addPageIfNeeded(50)) { addHeader(); addMetadata(); }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Firma", margin, cursorY); cursorY+=6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("Firmado por: " + (record.signature?.name || record.filledByEmail), margin, cursorY); cursorY+=5;
        
        if (record.signature?.dataUrl) {
            const imgData = await getBase64ImageFromUrl(record.signature.dataUrl);
            if (imgData) {
                doc.rect(margin, cursorY, 60, 25);
                doc.addImage(imgData, 'PNG', margin, cursorY, 60, 25);
            }
        } else {
            doc.text("Firma: No registrada", margin, cursorY);
        }

        doc.save("Checklist_Seguridad_" + record.id.substring(0, 8) + ".pdf");
    };

    if (loading) {
        return <div className="p-8 text-center"><Loader2 className="animate-spin" /> Cargando registro de seguridad...</div>;
    }
    
    if (!record || !template) {
        return <div className="p-8 text-center text-destructive">No se pudieron cargar los datos del registro.</div>;
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                     <Button variant="outline" size="icon" onClick={() => router.push('/prevencion/safety-checklists/records')}>
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
