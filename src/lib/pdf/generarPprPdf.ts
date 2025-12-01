// src/lib/pdf/generarPprPdf.ts
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import { Obra, IPERRegistro, Charla } from "@/types/pcg";

export type PprData = {
  obra: Obra;
  iperRegistros: IPERRegistro[];
  charlas: Charla[];
};

const headerColor = [226, 232, 240]; // slate-200
const marginX = 15;

function addHeader(doc: jsPDF, obraNombre: string) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("PCG · Plataforma de Control y Gestión", marginX, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Programa de Prevención de Riesgos (PPR) para: ${obraNombre}`, marginX, 26);
}

function addFooter(doc: jsPDF, obraNombre: string) {
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(120);

        doc.text(obraNombre, marginX, pageHeight - 10);
        doc.text("PCG – Programa de Prevención de Riesgos", 105, pageHeight - 10, { align: 'center' });
        doc.text(`Página ${i} de ${pageCount}`, 195, pageHeight - 10, { align: 'right' });
        
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


export async function generarPprPdf(pprData: PprData): Promise<void> {
    const { obra, iperRegistros, charlas } = pprData;
    const doc = new jsPDF("p", "mm", "a4");

    // --- 1. PORTADA ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Programa de Prevención de Riesgos (PPR)", 105, 80, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text("PCG – Plataforma de Control y Gestión", 105, 88, { align: 'center' });

    doc.setFontSize(18);
    doc.text(obra.nombreFaena, 105, 110, { align: 'center' });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(`Empresa Contratista: ${obra.empresa?.nombre || 'Constructora PCG Ltda.'}`, 105, 130, { align: 'center' });
    doc.text(`Empresa Mandante: ${obra.mandanteRazonSocial || 'No especificado'}`, 105, 138, { align: 'center' });
    doc.text(`Prevencionista Responsable: ${obra.prevencionistaNombre || 'No especificado'}`, 105, 146, { align: 'center' });
    doc.text(`Fecha de Generación: ${new Date().toLocaleDateString('es-CL')}`, 105, 160, { align: 'center' });

    // --- 2. ÍNDICE ---
    doc.addPage();
    addHeader(doc, obra.nombreFaena);
    let cursorY = 40;
    cursorY = addSectionTitle(doc, "Índice de Contenidos", cursorY);
    
    const secciones = [
        "1. Información General de la Obra", "2. Objetivo del Programa", "3. Organización Interna",
        "4. Identificación de Peligros (IPER)", "5. Medidas de Control", "6. Charlas y Capacitación",
        "7. Plan de Capacitación DS 44", "8. Procedimientos de Trabajo Seguro",
        "9. Protocolos de Emergencia", "10. Plan de Fiscalización Interna",
        "11. Registro y Seguimiento", "12. Enfoque de Género (DS 44)"
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
    doc.addPage(); addHeader(doc, obra.nombreFaena); cursorY = startY;
    cursorY = addSectionTitle(doc, "1. Información General de la Obra", cursorY);
    autoTable(doc, {
        startY: cursorY,
        head: [['Campo', 'Valor']],
        body: [
            ['Nombre de la obra', obra.nombreFaena],
            ['Ubicación', obra.direccion || 'No registrado'],
            ['Mandante', obra.mandanteRazonSocial || 'No registrado'],
            ['Contratista', obra.empresa?.nombre || 'No registrado'],
            ['Fecha de inicio', obra.fechaInicio ? new Date(obra.fechaInicio + 'T00:00:00').toLocaleDateString('es-CL') : 'No registrado'],
            ['Fecha de término', obra.fechaTermino ? new Date(obra.fechaTermino + 'T00:00:00').toLocaleDateString('es-CL') : 'No registrado'],
            ['Prevencionista responsable', obra.prevencionistaNombre || 'No registrado'],
        ],
        theme: 'grid',
        headStyles: { fillColor: headerColor, textColor: 20 },
        columnStyles: { 0: { fontStyle: 'bold' } },
    });

    // Sección 2
    doc.addPage(); addHeader(doc, obra.nombreFaena); cursorY = startY;
    cursorY = addSectionTitle(doc, "2. Objetivo del Programa", cursorY);
    cursorY = addDescriptionText(doc, "Establecer las directrices y acciones necesarias para prevenir accidentes y enfermedades profesionales en la obra, cumpliendo la legislación vigente y protocolos internos del mandante y contratista.", cursorY);

    // Sección 3
    doc.addPage(); addHeader(doc, obra.nombreFaena); cursorY = startY;
    cursorY = addSectionTitle(doc, "3. Organización Interna", cursorY);
    autoTable(doc, {
        startY: cursorY,
        head: [['Cargo', 'Nombre', 'Rol en el Sistema de Gestión']],
        body: [
            ['Jefe de Obra', obra.jefeObraNombre || 'No asignado', 'Máximo responsable de la gestión y recursos.'],
            ['Prevencionista', obra.prevencionistaNombre || 'No asignado', 'Coordinador y asesor técnico del PPR.'],
        ],
        theme: 'grid', headStyles: { fillColor: headerColor, textColor: 20 }
    });

    // Sección 4
    doc.addPage(); addHeader(doc, obra.nombreFaena); cursorY = startY;
    cursorY = addSectionTitle(doc, "4. Identificación de Peligros (IPER)", cursorY);
    if(iperRegistros.length > 0) {
        autoTable(doc, {
            startY: cursorY,
            head: [['Tarea', 'Peligro', 'Riesgo', 'Riesgo H/M', 'Riesgo Residual']],
            body: iperRegistros.map(iper => [iper.tarea, iper.peligro, iper.riesgo, `${iper.nivel_riesgo_hombre}/${iper.nivel_riesgo_mujer}`, iper.nivel_riesgo_residual]),
            theme: 'grid', headStyles: { fillColor: headerColor, textColor: 20 }
        });
    } else {
        doc.text("No hay registros IPER para esta obra.", 15, cursorY);
    }
    
    // Sección 5
    doc.addPage(); addHeader(doc, obra.nombreFaena); cursorY = startY;
    cursorY = addSectionTitle(doc, "5. Medidas de Control", cursorY);
    if(iperRegistros.length > 0) {
        autoTable(doc, {
            startY: cursorY,
            head: [['Peligro', 'Control Específico (Género)', 'Responsable']],
            body: iperRegistros.map(iper => [iper.peligro, iper.control_especifico_genero || '-', iper.responsable || '-']),
            theme: 'grid', headStyles: { fillColor: headerColor, textColor: 20 }
        });
    } else {
        doc.text("No hay medidas de control definidas (sin IPER).", 15, cursorY);
    }

    // Sección 6
    doc.addPage(); addHeader(doc, obra.nombreFaena); cursorY = startY;
    cursorY = addSectionTitle(doc, "6. Charlas y Capacitación", cursorY);
    if(charlas.length > 0) {
        autoTable(doc, {
            startY: cursorY,
            head: [['Título', 'Fecha Creación', 'Estado']],
            body: charlas.map(c => [c.titulo, c.fechaCreacion.toDate().toLocaleDateString('es-CL'), c.estado]),
            theme: 'grid', headStyles: { fillColor: headerColor, textColor: 20 }
        });
    } else {
        doc.text("No hay charlas registradas para esta obra.", 15, cursorY);
    }

    // Secciones Placeholder
    const placeholderSections = [
        "7. Plan de Capacitación DS 44", "8. Procedimientos de Trabajo Seguro",
        "9. Protocolos de Emergencia", "10. Plan de Fiscalización Interna",
        "11. Registro y Seguimiento", "12. Enfoque de Género (DS 44)"
    ];

    placeholderSections.forEach(title => {
        doc.addPage(); addHeader(doc, obra.nombreFaena); cursorY = startY;
        cursorY = addSectionTitle(doc, title, cursorY);
        doc.text("Esta sección se completará a medida que se registren actividades y documentos asociados en la plataforma PCG.", 15, cursorY);
    });
    
    // --- PIE DE PÁGINA ---
    addFooter(doc, obra.nombreFaena);

    // --- GUARDAR ---
    const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    doc.save(`PPR_${obra.nombreFaena.replace(/ /g, '_')}_${fecha}.pdf`);
}
