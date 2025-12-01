// src/lib/pdf/generarPprPdf.ts
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import { Obra, IPERRegistro, Charla } from "@/types/pcg";
import { pprTexts } from "./translations/pprTexts";

export type PprData = {
  obra: Obra;
  iperRegistros: IPERRegistro[];
  charlas: Charla[];
};

const headerColor = [226, 232, 240]; // slate-200
const marginX = 15;

function addHeader(doc: jsPDF, obraNombre: string, language: 'es' | 'pt') {
    const texts = pprTexts[language];
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(texts.subtitle, marginX, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`${texts.title}: ${obraNombre}`, marginX, 26);
}

function addFooter(doc: jsPDF, obraNombre: string, language: 'es' | 'pt') {
    const texts = pprTexts[language];
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(120);

        doc.text(obraNombre, marginX, pageHeight - 10);
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
    doc.setFontSize(14);
    doc.text(title, marginX, y);
    doc.line(marginX, y + 1.5, 195, y + 1.5);
    return y + 10;
}

function addDescriptionText(doc: jsPDF, text: string, y: number): number {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const splitText = doc.splitTextToSize(text, 180);
    doc.text(splitText, marginX, y);
    return y + splitText.length * 5 + 5;
}


export async function generarPprPdf(pprData: PprData, language: 'es' | 'pt' = 'es'): Promise<void> {
    const texts = pprTexts[language];
    const { obra, iperRegistros, charlas } = pprData;
    const doc = new jsPDF("p", "mm", "a4");

    // --- 1. PORTADA ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(texts.title, 105, 80, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(texts.subtitle, 105, 88, { align: 'center' });

    doc.setFontSize(18);
    doc.text(obra.nombreFaena, 105, 110, { align: 'center' });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(`${texts.fieldContratista}: ${obra.empresa?.nombre || 'Constructora PCG Ltda.'}`, 105, 130, { align: 'center' });
    doc.text(`${texts.fieldMandante}: ${obra.mandanteRazonSocial || texts.noEspecificado}`, 105, 138, { align: 'center' });
    doc.text(`${texts.fieldPrevencionista}: ${obra.prevencionistaNombre || texts.noEspecificado}`, 105, 146, { align: 'center' });
    doc.text(`${texts.fieldFechaGeneracion}: ${new Date().toLocaleDateString(language === 'pt' ? 'pt-BR' : 'es-CL')}`, 105, 160, { align: 'center' });

    // --- 2. ÍNDICE ---
    doc.addPage();
    addHeader(doc, obra.nombreFaena, language);
    let cursorY = 40;
    cursorY = addSectionTitle(doc, texts.index, cursorY);
    
    const secciones = [
        texts.section1, texts.section2, texts.section3, texts.section4,
        texts.section5, texts.section6, texts.section7, texts.section8,
        texts.section9, texts.section10, texts.section11, texts.section12
    ];
    
    autoTable(doc, {
        startY: cursorY,
        body: secciones.map(s => [s]),
        theme: 'plain',
        styles: { fontSize: 11, cellPadding: 2 },
    });

    // --- CUERPO DEL PPR ---
    const startY = 40;

    // Sección 1
    doc.addPage(); addHeader(doc, obra.nombreFaena, language); cursorY = startY;
    cursorY = addSectionTitle(doc, texts.section1, cursorY);
    autoTable(doc, {
        startY: cursorY,
        head: [[texts.tableInfoCampo, texts.tableInfoValor]],
        body: [
            [texts.fieldNombreObra, obra.nombreFaena],
            [texts.fieldUbicacion, obra.direccion || texts.noRegistrado],
            [texts.fieldMandante, obra.mandanteRazonSocial || texts.noRegistrado],
            [texts.fieldContratista, obra.empresa?.nombre || texts.noRegistrado],
            [texts.fieldFechaInicio, obra.fechaInicio ? new Date(obra.fechaInicio + 'T00:00:00').toLocaleDateString(language === 'pt' ? 'pt-BR' : 'es-CL') : texts.noRegistrado],
            [texts.fieldFechaTermino, obra.fechaTermino ? new Date(obra.fechaTermino + 'T00:00:00').toLocaleDateString(language === 'pt' ? 'pt-BR' : 'es-CL') : texts.noRegistrado],
            [texts.fieldPrevencionista, obra.prevencionistaNombre || texts.noRegistrado],
        ],
        theme: 'grid',
        headStyles: { fillColor: headerColor, textColor: 20 },
        columnStyles: { 0: { fontStyle: 'bold' } },
    });

    // Sección 2
    doc.addPage(); addHeader(doc, obra.nombreFaena, language); cursorY = startY;
    cursorY = addSectionTitle(doc, texts.section2, cursorY);
    cursorY = addDescriptionText(doc, texts.textObjetivo, cursorY);

    // Sección 3
    doc.addPage(); addHeader(doc, obra.nombreFaena, language); cursorY = startY;
    cursorY = addSectionTitle(doc, texts.section3, cursorY);
    autoTable(doc, {
        startY: cursorY,
        head: [[texts.tableOrgCargo, texts.tableOrgNombre, texts.tableOrgRol]],
        body: [
            [texts.cargoJefeObra, obra.jefeObraNombre || texts.noAsignado, texts.rolJefeObra],
            [texts.cargoPrevencionista, obra.prevencionistaNombre || texts.noAsignado, texts.rolPrevencionista],
        ],
        theme: 'grid', headStyles: { fillColor: headerColor, textColor: 20 }
    });

    // Sección 4
    doc.addPage(); addHeader(doc, obra.nombreFaena, language); cursorY = startY;
    cursorY = addSectionTitle(doc, texts.section4, cursorY);
    if(iperRegistros.length > 0) {
        autoTable(doc, {
            startY: cursorY,
            head: [[texts.tableIperTarea, texts.tableIperPeligro, texts.tableIperRiesgo, texts.tableIperRiesgoHM, texts.tableIperRiesgoResidual]],
            body: iperRegistros.map(iper => [iper.tarea, iper.peligro, iper.riesgo, `${iper.nivel_riesgo_hombre}/${iper.nivel_riesgo_mujer}`, iper.nivel_riesgo_residual]),
            theme: 'grid', headStyles: { fillColor: headerColor, textColor: 20 }
        });
    } else {
        doc.text(texts.noIper, 15, cursorY);
    }
    
    // Sección 5
    doc.addPage(); addHeader(doc, obra.nombreFaena, language); cursorY = startY;
    cursorY = addSectionTitle(doc, texts.section5, cursorY);
    if(iperRegistros.length > 0) {
        autoTable(doc, {
            startY: cursorY,
            head: [[texts.tableControlPeligro, texts.tableControlMedida, texts.tableControlResponsable]],
            body: iperRegistros.map(iper => [iper.peligro, iper.control_especifico_genero || '-', iper.responsable || '-']),
            theme: 'grid', headStyles: { fillColor: headerColor, textColor: 20 }
        });
    } else {
        doc.text(texts.noMedidas, 15, cursorY);
    }

    // Sección 6
    doc.addPage(); addHeader(doc, obra.nombreFaena, language); cursorY = startY;
    cursorY = addSectionTitle(doc, texts.section6, cursorY);
    if(charlas.length > 0) {
        autoTable(doc, {
            startY: cursorY,
            head: [[texts.tableCharlasTitulo, texts.tableCharlasFecha, texts.tableCharlasEstado]],
            body: charlas.map(c => [c.titulo, c.fechaCreacion.toDate().toLocaleDateString(language === 'pt' ? 'pt-BR' : 'es-CL'), c.estado]),
            theme: 'grid', headStyles: { fillColor: headerColor, textColor: 20 }
        });
    } else {
        doc.text(texts.noCharlas, 15, cursorY);
    }

    // Secciones Placeholder
    const placeholderSections = [
        texts.section7, texts.section8, texts.section9, texts.section10,
        texts.section11, texts.section12
    ];

    placeholderSections.forEach(title => {
        doc.addPage(); addHeader(doc, obra.nombreFaena, language); cursorY = startY;
        cursorY = addSectionTitle(doc, title, cursorY);
        doc.text(texts.textPlaceholder, 15, cursorY);
    });
    
    // --- PIE DE PÁGINA ---
    addFooter(doc, obra.nombreFaena, language);

    // --- GUARDAR ---
    const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const langSuffix = language.toUpperCase();
    const fileName = `${texts.fileName}_${obra.nombreFaena.replace(/ /g, '_')}_${fecha}_${langSuffix}.pdf`;
    doc.save(fileName);
}
