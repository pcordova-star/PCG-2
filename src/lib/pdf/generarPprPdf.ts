// src/lib/pdf/generarPprPdf.ts
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import { Obra, IPERRegistro, Charla } from "@/types/pcg";

export type PprData = {
  obra: Obra;
  iperRegistros: IPERRegistro[];
  charlas: Charla[];
};

function addHeader(doc: jsPDF) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("PCG · Plataforma de Control y Gestión", 15, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Programa de Prevención de Riesgos (PPR)", 15, 26);
}

function addFooter(doc: jsPDF, obraNombre: string) {
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(120);

        doc.text(obraNombre, 15, pageHeight - 10);
        doc.text("PCG – Programa de Prevención de Riesgos", 105, pageHeight - 10, { align: 'center' });
        doc.text(`Página ${i} de ${pageCount}`, 195, pageHeight - 10, { align: 'right' });
        
        doc.setTextColor(0);
    }
}

function addSectionTitle(doc: jsPDF, title: string, description: string, y: number): number {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(title, 15, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const splitDescription = doc.splitTextToSize(description, 180);
    doc.text(splitDescription, 15, y);
    y += splitDescription.length * 5 + 5;
    return y;
}

export async function generarPprPdf(pprData: PprData): Promise<void> {
    const { obra, iperRegistros, charlas } = pprData;
    const doc = new jsPDF("p", "mm", "a4");

    // --- 1. PORTADA ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Programa de Prevención de Riesgos", 105, 80, { align: 'center' });
    doc.setFontSize(18);
    doc.text(obra.nombreFaena, 105, 100, { align: 'center' });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(`Empresa Contratista: ${obra.empresa?.nombre || 'Constructora PCG Ltda.'}`, 105, 120, { align: 'center' });
    doc.text(`Empresa Mandante: ${obra.mandanteRazonSocial || 'No especificado'}`, 105, 128, { align: 'center' });
    doc.text(`Prevencionista Responsable: ${obra.prevencionistaNombre || 'No especificado'}`, 105, 136, { align: 'center' });
    doc.text(`Fecha de Generación: ${new Date().toLocaleDateString('es-CL')}`, 105, 150, { align: 'center' });

    // --- 2. ÍNDICE ---
    doc.addPage();
    addHeader(doc);
    let cursorY = 40;
    cursorY = addSectionTitle(doc, "Índice de Contenidos", "", cursorY);
    
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

    // --- 3. CUERPO DEL PPR ---
    const startY = 40;

    // Sección 1
    doc.addPage(); addHeader(doc); cursorY = startY;
    cursorY = addSectionTitle(doc, "1. Información General de la Obra", "Datos base del Programa de Prevención de Riesgos, obtenidos desde el módulo de Obras.", cursorY);
    autoTable(doc, {
        startY: cursorY,
        body: [
            ['Nombre de la obra', obra.nombreFaena],
            ['Ubicación', obra.direccion || ''],
            ['Mandante', obra.mandanteRazonSocial || ''],
            ['Contratista', obra.empresa?.nombre || ''],
            ['Fecha de inicio', obra.fechaInicio ? new Date(obra.fechaInicio + 'T00:00:00').toLocaleDateString('es-CL') : ''],
            ['Fecha de término', obra.fechaTermino ? new Date(obra.fechaTermino + 'T00:00:00').toLocaleDateString('es-CL') : ''],
            ['Prevencionista', obra.prevencionistaNombre || ''],
        ],
        theme: 'grid'
    });

    // Sección 4
    doc.addPage(); addHeader(doc); cursorY = startY;
    cursorY = addSectionTitle(doc, "4. Identificación de Peligros (IPER)", "Matriz que detalla los peligros, riesgos y controles de cada actividad.", cursorY);
    if(iperRegistros.length > 0) {
        autoTable(doc, {
            startY: cursorY,
            head: [['Tarea', 'Peligro', 'Riesgo', 'Riesgo H/M', 'Riesgo Residual']],
            body: iperRegistros.map(iper => [iper.tarea, iper.peligro, iper.riesgo, `${iper.nivel_riesgo_hombre}/${iper.nivel_riesgo_mujer}`, iper.nivel_riesgo_residual]),
            theme: 'striped', headStyles: { fillColor: [52, 73, 94] }
        });
    } else {
        doc.text("No hay registros IPER para esta obra.", 15, cursorY);
    }
    
    // Sección 5
    doc.addPage(); addHeader(doc); cursorY = startY;
    cursorY = addSectionTitle(doc, "5. Medidas de Control", "Controles a implementar, generados desde la matriz IPER.", cursorY);
    if(iperRegistros.length > 0) {
        autoTable(doc, {
            startY: cursorY,
            head: [['Peligro', 'Control Específico (Género)', 'Responsable']],
            body: iperRegistros.map(iper => [iper.peligro, iper.control_especifico_genero || '-', iper.responsable || '-']),
            theme: 'striped', headStyles: { fillColor: [52, 73, 94] }
        });
    } else {
        doc.text("No hay medidas de control definidas (sin IPER).", 15, cursorY);
    }

    // Sección 6
    doc.addPage(); addHeader(doc); cursorY = startY;
    cursorY = addSectionTitle(doc, "6. Charlas y Capacitación", "Calendario de charlas de seguridad.", cursorY);
    if(charlas.length > 0) {
        autoTable(doc, {
            startY: cursorY,
            head: [['Título', 'Fecha Creación', 'Estado']],
            body: charlas.map(c => [c.titulo, c.fechaCreacion.toDate().toLocaleDateString('es-CL'), c.estado]),
            theme: 'striped', headStyles: { fillColor: [52, 73, 94] }
        });
    } else {
        doc.text("No hay charlas registradas para esta obra.", 15, cursorY);
    }

    // ... Se podrían añadir más secciones aquí ...

    // --- PIE DE PÁGINA ---
    addFooter(doc, obra.nombreFaena);

    // --- GUARDAR ---
    const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    doc.save(`PPR_${obra.nombreFaena.replace(/ /g, '_')}_${fecha}.pdf`);
}
