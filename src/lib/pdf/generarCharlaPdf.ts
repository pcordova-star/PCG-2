// src/lib/pdf/generarCharlaPdf.ts
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import { Obra, Charla, FirmaAsistente } from "@/types/pcg";
import { charlaReportTexts } from "./translations/charlaReportTexts";

const headerColor = [226, 232, 240]; // slate-200
const marginX = 15;

async function getBase64ImageFromUrl(imageUrl: string): Promise<string> {
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) return "";
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
        });
    } catch (error) {
        console.error("Error fetching image for PDF:", error);
        return "";
    }
}

function addHeader(doc: jsPDF, obraNombre: string, language: 'es' | 'pt') {
    const texts = charlaReportTexts[language];
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("PCG · Plataforma de Control y Gestión", marginX, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`${texts.fieldObra}: ${obraNombre}`, marginX, 26);
}

function addFooter(doc: jsPDF, language: 'es' | 'pt') {
    const texts = charlaReportTexts[language];
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(
            `Documento generado con PCG`,
            105,
            pageHeight - 10,
            { align: "center" }
        );
        doc.text(`${texts.page} ${i} / ${pageCount}`, 195, pageHeight - 10, { align: 'right' });
        doc.setTextColor(0);
    }
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
    if (y > 250) { 
        doc.addPage();
        y = 40;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(title, marginX, y);
    doc.line(marginX, y + 1.5, 195, y + 1.5);
    return y + 8;
}

export async function generarCharlaPdf(charla: Charla, obra: Obra, language: 'es' | 'pt' = 'es'): Promise<void> {
    const texts = charlaReportTexts[language];
    const doc = new jsPDF("p", "mm", "a4");

    // --- 1. Portada y Título ---
    addHeader(doc, obra.nombreFaena, language);
    doc.setFontSize(18);
    doc.text(texts.title, 105, 45, { align: 'center' });
    let cursorY = 60;
    
    // --- 2. Datos Generales ---
    autoTable(doc, {
        startY: cursorY,
        body: [
            [texts.fieldTema, charla.titulo],
            [texts.fieldFecha, charla.fechaRealizacion ? charla.fechaRealizacion.toDate().toLocaleDateString(language === 'pt' ? 'pt-BR' : 'es-CL') : texts.noDefinida],
            [texts.fieldContratista, obra.empresa?.nombre || 'PCG Ltda.'],
            [texts.fieldMandante, obra.mandanteRazonSocial || texts.noEspecificado],
        ],
        theme: 'grid',
        styles: { cellPadding: 2 },
        headStyles: { fillColor: headerColor, textColor: 20 },
        columnStyles: { 0: { fontStyle: 'bold' } },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 10;
    
    // --- 3. Origen (si aplica) ---
    if (charla.iperIdRelacionado && charla.generadaAutomaticamente) {
        cursorY = addSectionTitle(doc, texts.sectionIperTitle, cursorY);
        autoTable(doc, {
            startY: cursorY,
            body: [
                [texts.fieldIperTarea, charla.tarea || texts.noDefinida],
                [texts.fieldIperPeligro, charla.peligro || texts.noDefinida],
                [texts.fieldIperRiesgo, charla.riesgo || texts.noDefinida],
                [texts.fieldIperControl, charla.controlGenero || texts.noDefinida],
            ],
            theme: 'grid', columnStyles: { 0: { fontStyle: 'bold' } },
        });
        cursorY = (doc as any).lastAutoTable.finalY + 10;
    }
    
    // --- 4. Contenido ---
    cursorY = addSectionTitle(doc, texts.sectionContentTitle, cursorY);
    const contentLines = doc.splitTextToSize(charla.contenido, 180);
    doc.setFontSize(10);
    doc.text(contentLines, 15, cursorY);
    cursorY += contentLines.length * 5 + 10;

    // --- 5. Asistentes ---
    if (cursorY > 180) { doc.addPage(); cursorY = 40; }
    cursorY = addSectionTitle(doc, texts.sectionAttendeesTitle, cursorY);

    if (charla.asistentes && charla.asistentes.length > 0) {
        const body = [];
        for (const asistente of charla.asistentes) {
            let signatureContent: any = texts.noFirma;
            if (asistente.firmaUrl) {
                try {
                    const imgData = await getBase64ImageFromUrl(asistente.firmaUrl);
                    signatureContent = { image: imgData, width: 30, height: 10 };
                } catch {
                    signatureContent = texts.errorFirma;
                }
            }
            body.push([
                asistente.nombre,
                asistente.rut,
                asistente.cargo || '',
                asistente.firmadoEn ? new Date(asistente.firmadoEn).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'es-CL') : '',
                signatureContent
            ]);
        }
        autoTable(doc, {
            startY: cursorY,
            head: [[texts.tableAttendeesHeadName, texts.tableAttendeesHeadId, texts.tableAttendeesHeadPosition, texts.tableAttendeesHeadDate, texts.tableAttendeesHeadSignature]],
            body: body,
            theme: 'grid',
            headStyles: { fillColor: headerColor, textColor: 20 },
            didDrawPage: (data) => { cursorY = data.cursor?.y || cursorY; }
        });
    } else {
        doc.text(texts.noAsistentes, 15, cursorY);
    }
    
    // --- Finalizar PDF ---
    addFooter(doc, language);
    const fecha = new Date().toISOString().slice(0, 10);
    doc.save(`${texts.fileName}_${charla.titulo.slice(0, 20).replace(/ /g, '_')}_${fecha}.pdf`);
}
