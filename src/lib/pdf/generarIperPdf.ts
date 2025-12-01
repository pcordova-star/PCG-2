// src/lib/pdf/generarIperPdf.ts
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import { IPERRegistro, Obra } from "@/types/pcg";

const headerColor = [226, 232, 240];
const marginX = 15;

function addHeader(doc: jsPDF, obraNombre: string, iperId: string) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("PCG · Plataforma de Control y Gestión", marginX, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Obra: ${obraNombre} | IPER ID: ${iperId}`, marginX, 26);
}

function addFooter(doc: jsPDF) {
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(`Documento generado con PCG`, 105, pageHeight - 10, { align: 'center' });
        doc.text(`Página ${i} de ${pageCount}`, 195, pageHeight - 10, { align: 'right' });
        doc.setTextColor(0);
    }
}

function addSection(doc: jsPDF, title: string, y: number): number {
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

export function generarIperPdf(iper: IPERRegistro, obra: Obra) {
    const doc = new jsPDF("p", "mm", "a4");
    const iperId = `IPER-${String(iper.correlativo).padStart(3, '0')}`;

    // --- 1. Portada y Título ---
    addHeader(doc, obra.nombreFaena, iperId);
    doc.setFontSize(18);
    doc.text("Ficha de Identificación de Peligros y Evaluación de Riesgos (IPER)", 105, 45, { align: 'center' });
    let cursorY = 60;
    
    // --- 2. Identificación ---
    cursorY = addSection(doc, "1. Identificación del Peligro y Riesgo", cursorY);
    autoTable(doc, {
        startY: cursorY,
        body: [
            ['Tarea', iper.tarea],
            ['Zona / Sector', iper.zona],
            ['Categoría del Peligro', iper.categoriaPeligro],
            ['Peligro Identificado', iper.peligro],
            ['Riesgo Asociado', iper.riesgo],
        ],
        theme: 'grid',
        headStyles: { fillColor: headerColor, textColor: 20 },
        columnStyles: { 0: { fontStyle: 'bold' } },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 10;
    
    // --- 3. Evaluación Inherente ---
    cursorY = addSection(doc, "2. Evaluación de Riesgo Inherente (con enfoque de género)", cursorY);
    autoTable(doc, {
        startY: cursorY,
        head: [['Evaluación', 'Probabilidad', 'Consecuencia', 'Nivel Riesgo']],
        body: [
            ['Hombres', iper.probabilidad_hombre, iper.consecuencia_hombre, iper.nivel_riesgo_hombre],
            ['Mujeres', iper.probabilidad_mujer, iper.consecuencia_mujer, iper.nivel_riesgo_mujer],
        ],
        theme: 'grid',
        headStyles: { fillColor: headerColor, textColor: 20 },
        columnStyles: { 0: { fontStyle: 'bold' } },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 10;

    // --- 4. Medidas de Control ---
    cursorY = addSection(doc, "3. Medidas de Control Propuestas", cursorY);
    autoTable(doc, {
        startY: cursorY,
        body: [
            ['Jerarquía del Control', iper.jerarquiaControl],
            ['Control Específico por Género', iper.control_especifico_genero || 'No se especifican medidas adicionales por género.'],
            ['Responsable de Implementación', iper.responsable],
            ['Plazo de Implementación', iper.plazo ? new Date(iper.plazo + 'T00:00:00').toLocaleDateString('es-CL') : 'No especificado'],
        ],
        theme: 'grid',
        headStyles: { fillColor: headerColor, textColor: 20 },
        columnStyles: { 0: { fontStyle: 'bold' } },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 10;

    // --- 5. Riesgo Residual y Seguimiento ---
    cursorY = addSection(doc, "4. Riesgo Residual y Seguimiento", cursorY);
     autoTable(doc, {
        startY: cursorY,
        body: [
            ['Nivel de Riesgo Residual', `${iper.nivel_riesgo_residual} (Prob: ${iper.probabilidad_residual} / Cons: ${iper.consecuencia_residual})`],
            ['Estado del Control', iper.estadoControl],
        ],
        theme: 'grid',
        headStyles: { fillColor: headerColor, textColor: 20 },
        columnStyles: { 0: { fontStyle: 'bold' } },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 20;

    // --- 6. Firmas ---
    doc.text("________________________", marginX, cursorY);
    doc.text("________________________", 110, cursorY);
    cursorY += 5;
    doc.setFontSize(9);
    doc.text("Firma Prevencionista", marginX, cursorY);
    doc.text("Firma Jefe de Obra / Supervisor", 110, cursorY);


    // --- Finalizar PDF ---
    addFooter(doc);
    const fecha = new Date().toISOString().slice(0, 10);
    doc.save(`IPER_${iperId}_${obra.nombreFaena.replace(/ /g, '_')}_${fecha}.pdf`);
}
