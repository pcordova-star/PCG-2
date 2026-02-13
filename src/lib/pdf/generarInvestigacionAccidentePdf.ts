// src/lib/pdf/generarInvestigacionAccidentePdf.ts
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import { Obra, RegistroIncidente } from "@/types/pcg";
import { accidentReportTexts } from "./translations/accidentReportTexts";

function addHeader(doc: jsPDF, title: string) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("PCG · Plataforma de Control y Gestión", 15, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(title, 15, 26);
}

function addFooter(doc: jsPDF, obraNombre: string, language: 'es' | 'pt') {
    const texts = accidentReportTexts[language];
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(120);

        doc.text(obraNombre, 15, pageHeight - 10);
        doc.text(texts.footer, 105, pageHeight - 10, { align: 'center' });
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
    doc.text(title, 15, y);
    doc.line(15, y + 1.5, 195, y + 1.5);
    return y + 8;
}

export function generarInvestigacionAccidentePdf(
  incidente: RegistroIncidente,
  obra: Obra,
  language: 'es' | 'pt' = 'es'
) {
    const texts = accidentReportTexts[language];
    const doc = new jsPDF("p", "mm", "a4");
    const headerColor = [226, 232, 240]; 

    // --- 1. PORTADA ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("PCG - Plataforma de Control y Gestión", 105, 60, { align: 'center' });

    doc.setFontSize(22);
    doc.text(texts.title, 105, 100, { align: 'center' });

    doc.setFontSize(16);
    doc.text(obra.nombreFaena, 105, 120, { align: 'center' });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(`${texts.fieldFechaAccidente}: ${new Date(incidente.fecha + 'T00:00:00').toLocaleDateString(language === 'pt' ? 'pt-BR' : 'es-CL')}`, 105, 140, { align: 'center' });
    doc.text(`${texts.fieldType}: ${incidente.tipoIncidente}`, 105, 148, { align: 'center' });
    doc.text(`${texts.fieldSeverity}: ${incidente.gravedad}`, 105, 156, { align: 'center' });
    doc.text(`${texts.fieldGenerationDate}: ${new Date().toLocaleDateString(language === 'pt' ? 'pt-BR' : 'es-CL')}`, 105, 164, { align: 'center' });


    // --- 2. CUERPO DEL INFORME ---
    doc.addPage();
    addHeader(doc, `${texts.headerId}: ${incidente.id}`);
    let cursorY = 40;

    // Sección 1: Datos Generales del Accidente
    cursorY = addSectionTitle(doc, texts.section1, cursorY);
    autoTable(doc, {
        startY: cursorY,
        body: [
            [texts.fieldFechaAccidente, new Date(incidente.fecha + 'T00:00:00').toLocaleDateString(language === 'pt' ? 'pt-BR' : 'es-CL')],
            [texts.fieldLugar, incidente.lugar || texts.noRegistrado],
            [texts.fieldLesion, incidente.lesionDescripcion || texts.noRegistrado],
            [texts.fieldParteCuerpo, incidente.parteCuerpoAfectada || texts.noRegistrado],
            [texts.fieldAgente, incidente.agenteAccidente || texts.noRegistrado],
            [texts.fieldMecanismo, incidente.mecanismoAccidente || texts.noRegistrado],
            [texts.fieldTiempoPerdido, incidente.huboTiempoPerdido ? texts.yes : texts.no],
            [texts.fieldDiasReposo, incidente.diasReposoMedico?.toString() || texts.noRegistrado],
            [texts.fieldGraveFatal, incidente.esAccidenteGraveFatal ? texts.yes : texts.no],
        ],
        head: [[texts.tableDatosHeadCampo, texts.tableDatosHeadValor]],
        theme: 'grid',
        headStyles: { fillColor: headerColor, textColor: 20 },
        columnStyles: { 0: { fontStyle: 'bold' } },
        didDrawPage: (data) => { cursorY = data.cursor?.y || cursorY; }
    });
    cursorY = (doc as any).lastAutoTable.finalY + 10;
    
    // Sección 2: Descripción del Hecho
    cursorY = addSectionTitle(doc, texts.section2, cursorY);
    const descLines = doc.splitTextToSize(incidente.descripcionHecho, 180);
    doc.setFontSize(10);
    doc.text(descLines, 15, cursorY);
    cursorY += descLines.length * 5 + 10;
    
    // Sección 3: Árbol de Causas
    if (cursorY > 200) { doc.addPage(); cursorY = 40; }
    cursorY = addSectionTitle(doc, texts.section3, cursorY);
    
    if (incidente.arbolCausas && incidente.arbolCausas.nodos && incidente.arbolCausas.raizId) {
        const nodos = Object.values(incidente.arbolCausas.nodos);
        const raiz = nodos.find(n => n.id === incidente.arbolCausas!.raizId);
        const causasInmediatas = nodos.filter(n => n.esCausaInmediata);
        const causasBasicas = nodos.filter(n => n.esCausaBasica);
        
        const arbolBody = [];
        if (raiz) {
            arbolBody.push([
                raiz.tipo.toUpperCase(),
                raiz.descripcionCorta === 'Nuevo Hecho' ? texts.rootNodeDefault : raiz.descripcionCorta,
                raiz.detalle || '-',
                texts.levelHechoPrincipal
            ]);
        }
        if (causasInmediatas.length > 0) {
            causasInmediatas.forEach(c => arbolBody.push([c.tipo.toUpperCase(), c.descripcionCorta, c.detalle === raiz?.detalle ? '-' : (c.detalle || '-'), texts.levelCausaInmediata]));
        } else {
             arbolBody.push([{ content: texts.noImmediateCauses, colSpan: 4, styles: { fontStyle: 'italic', textColor: 120 } }]);
        }
        if (causasBasicas.length > 0) {
            causasBasicas.forEach(c => arbolBody.push([c.tipo.toUpperCase(), c.descripcionCorta, c.detalle === raiz?.detalle ? '-' : (c.detalle || '-'), texts.levelCausaBasica]));
        } else {
            arbolBody.push([{ content: texts.noBasicCauses, colSpan: 4, styles: { fontStyle: 'italic', textColor: 120 } }]);
        }

        autoTable(doc, {
            startY: cursorY,
            head: [[texts.tableCausasHeadTipo, texts.tableCausasHeadDescripcion, texts.tableCausasHeadDetalle, texts.tableCausasHeadNivel]],
            body: arbolBody,
            theme: 'grid',
            headStyles: { fillColor: headerColor, textColor: 20 },
            didDrawPage: (data) => { cursorY = data.cursor?.y || cursorY; }
        });
        cursorY = (doc as any).lastAutoTable.finalY;

    } else {
        doc.text(texts.noTree, 15, cursorY);
    }
    
    // Sección 4: Plan de Acción
    if (incidente.medidasCorrectivasDetalladas && incidente.medidasCorrectivasDetalladas.length > 0) {
        if (cursorY > 200) { doc.addPage(); cursorY = 40; } else { cursorY += 10; }
        
        cursorY = addSectionTitle(doc, texts.section4, cursorY);
        
        autoTable(doc, {
            startY: cursorY,
            head: [[texts.tablePlanHeadAccion, texts.tablePlanHeadCausa, texts.tablePlanHeadResponsable, texts.tablePlanHeadPlazo, texts.tablePlanHeadEstado]],
            body: incidente.medidasCorrectivasDetalladas.map(m => {
                const causaNodo = m.causaNodoId ? incidente.arbolCausas?.nodos[m.causaNodoId] : null;
                const causaTexto = causaNodo ? `[${causaNodo.tipo}] ${causaNodo.descripcionCorta}` : 'General';
                return [
                    m.descripcionAccion,
                    causaTexto,
                    m.responsable,
                    m.fechaCompromiso ? new Date(m.fechaCompromiso + 'T00:00:00').toLocaleDateString(language === 'pt' ? 'pt-BR' : 'es-CL') : 'N/A',
                    m.estado
                ];
            }),
            theme: 'grid',
            headStyles: { fillColor: headerColor, textColor: 20 },
            didDrawPage: (data) => {
                cursorY = data.cursor?.y || cursorY;
            }
        });
        cursorY = (doc as any).lastAutoTable.finalY;
    } else {
        if (cursorY > 250) { doc.addPage(); cursorY = 40; } else { cursorY += 10; }
        cursorY = addSectionTitle(doc, texts.section4, cursorY);
        doc.text(texts.planAccionSinMedidas, 15, cursorY);
    }


    // --- PIE DE PÁGINA ---
    addFooter(doc, obra.nombreFaena, language);

    // --- GUARDAR ---
    const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const langSuffix = language.toUpperCase();
    const fileName = `${texts.fileName}_${obra.nombreFaena.replace(/ /g, '_')}_${fecha}_${langSuffix}.pdf`;
    doc.save(fileName);
}