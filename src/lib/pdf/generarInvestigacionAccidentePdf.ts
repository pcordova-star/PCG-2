// src/lib/pdf/generarInvestigacionAccidentePdf.ts
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import { Obra, RegistroIncidente } from "@/types/pcg";

function addHeader(doc: jsPDF, title: string) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("PCG · Plataforma de Control y Gestión", 15, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(title, 15, 26);
}

function addFooter(doc: jsPDF, obraNombre: string) {
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(120);

        doc.text(obraNombre, 15, pageHeight - 10);
        doc.text("Informe de Investigación de Accidente", 105, pageHeight - 10, { align: 'center' });
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
    doc.setFontSize(12);
    doc.text(title, 15, y);
    doc.line(15, y + 1.5, 195, y + 1.5);
    return y + 8;
}

export function generarInvestigacionAccidentePdf(
  incidente: RegistroIncidente,
  obra: Obra
) {
    const doc = new jsPDF("p", "mm", "a4");

    // --- 1. PORTADA ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Informe de Investigación de Accidente", 105, 100, { align: 'center' });

    doc.setFontSize(16);
    doc.text(obra.nombreFaena, 105, 120, { align: 'center' });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(`Fecha del Accidente: ${new Date(incidente.fecha + 'T00:00:00').toLocaleDateString('es-CL')}`, 105, 140, { align: 'center' });
    doc.text(`Tipo de Suceso: ${incidente.tipoIncidente}`, 105, 148, { align: 'center' });
    doc.text(`Gravedad: ${incidente.gravedad}`, 105, 156, { align: 'center' });
    doc.text(`Fecha de Generación: ${new Date().toLocaleDateString('es-CL')}`, 105, 164, { align: 'center' });


    // --- 2. CUERPO DEL INFORME ---
    doc.addPage();
    addHeader(doc, `Investigación ID: ${incidente.id}`);
    let cursorY = 40;

    // Sección 1: Datos Generales del Accidente
    cursorY = addSectionTitle(doc, "1. Datos Generales del Accidente", cursorY);
    autoTable(doc, {
        startY: cursorY,
        body: [
            ['Fecha del Accidente', new Date(incidente.fecha + 'T00:00:00').toLocaleDateString('es-CL')],
            ['Lugar', incidente.lugar || 'No registrado'],
            ['Lesión Producida', incidente.lesionDescripcion || 'No registrado'],
            ['Parte del Cuerpo Afectada', incidente.parteCuerpoAfectada || 'No registrado'],
            ['Agente del Accidente', incidente.agenteAccidente || 'No registrado'],
            ['Mecanismo del Accidente', incidente.mecanismoAccidente || 'No registrado'],
            ['¿Hubo Tiempo Perdido?', incidente.huboTiempoPerdido ? 'Sí' : 'No'],
            ['Días de Reposo Médico', incidente.diasReposoMedico?.toString() || 'No registrado'],
            ['¿Accidente Grave/Fatal?', incidente.esAccidenteGraveFatal ? 'Sí' : 'No'],
        ],
        head: [['Campo', 'Valor']],
        theme: 'striped',
        headStyles: { fillColor: [52, 73, 94] },
        columnStyles: { 0: { fontStyle: 'bold' } },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 10;
    
    // Sección 2: Descripción del Hecho
    cursorY = addSectionTitle(doc, "2. Descripción Objetiva del Hecho", cursorY);
    const descLines = doc.splitTextToSize(incidente.descripcionHecho, 180);
    doc.setFontSize(10);
    doc.text(descLines, 15, cursorY);
    cursorY += descLines.length * 5 + 10;
    
    // Sección 3: Árbol de Causas
    if (cursorY > 200) { doc.addPage(); cursorY = 40; }
    cursorY = addSectionTitle(doc, "3. Análisis de Causas (Árbol de Causas)", cursorY);
    
    if (incidente.arbolCausas && incidente.arbolCausas.nodos && incidente.arbolCausas.raizId) {
        const nodos = Object.values(incidente.arbolCausas.nodos);
        const raiz = nodos.find(n => n.id === incidente.arbolCausas!.raizId);
        const causasInmediatas = nodos.filter(n => n.esCausaInmediata);
        const causasBasicas = nodos.filter(n => n.esCausaBasica);
        
        const arbolBody = [];
        if (raiz) {
            arbolBody.push([
                raiz.tipo.toUpperCase(),
                raiz.descripcionCorta === 'Nuevo Hecho' ? 'Accidente investigado' : raiz.descripcionCorta,
                raiz.detalle || '-',
                'Hecho Principal'
            ]);
        }
        if (causasInmediatas.length > 0) {
            causasInmediatas.forEach(c => arbolBody.push([c.tipo.toUpperCase(), c.descripcionCorta, c.detalle || '-', 'Causa Inmediata']));
        } else {
             arbolBody.push([{ content: 'No se registraron causas inmediatas.', colSpan: 4, styles: { fontStyle: 'italic', textColor: 120 } }]);
        }
        if (causasBasicas.length > 0) {
            causasBasicas.forEach(c => arbolBody.push([c.tipo.toUpperCase(), c.descripcionCorta, c.detalle || '-', 'Causa Básica']));
        } else {
            arbolBody.push([{ content: 'No se registraron causas básicas.', colSpan: 4, styles: { fontStyle: 'italic', textColor: 120 } }]);
        }

        autoTable(doc, {
            startY: cursorY,
            head: [['Tipo', 'Descripción', 'Detalle', 'Nivel']],
            body: arbolBody,
            theme: 'grid',
            headStyles: { fillColor: [52, 73, 94] }
        });
        cursorY = (doc as any).lastAutoTable.finalY;

    } else {
        doc.text("No se ha definido un árbol de causas para esta investigación.", 15, cursorY);
    }
    
    // Sección 4: Plan de Acción
    if (incidente.medidasCorrectivasDetalladas && incidente.medidasCorrectivasDetalladas.length > 0) {
        if (cursorY > 200) { doc.addPage(); cursorY = 40; } else { cursorY += 10; }
        
        cursorY = addSectionTitle(doc, "4. Plan de Acción / Medidas Correctivas", cursorY);
        
        autoTable(doc, {
            startY: cursorY,
            head: [['Acción', 'Causa Asociada', 'Responsable', 'Plazo', 'Estado']],
            body: incidente.medidasCorrectivasDetalladas.map(m => {
                const causaNodo = m.causaNodoId ? incidente.arbolCausas?.nodos[m.causaNodoId] : null;
                const causaTexto = causaNodo ? `[${causaNodo.tipo}] ${causaNodo.descripcionCorta}` : 'General';
                return [
                    m.descripcionAccion,
                    causaTexto,
                    m.responsable,
                    m.fechaCompromiso ? new Date(m.fechaCompromiso + 'T00:00:00').toLocaleDateString('es-CL') : 'N/A',
                    m.estado
                ];
            }),
            theme: 'striped',
            headStyles: { fillColor: [52, 73, 94] },
            didDrawPage: (data) => { // Para manejar saltos de página
                cursorY = data.cursor?.y || cursorY;
            }
        });
        cursorY = (doc as any).lastAutoTable.finalY;
    } else {
        if (cursorY > 250) { doc.addPage(); cursorY = 40; } else { cursorY += 10; }
        cursorY = addSectionTitle(doc, "4. Plan de Acción / Medidas Correctivas", cursorY);
        doc.text("No existen medidas correctivas registradas.", 15, cursorY);
    }


    // --- PIE DE PÁGINA ---
    addFooter(doc, obra.nombreFaena);

    // --- GUARDAR ---
    const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    doc.save(`Informe_Accidente_${obra.nombreFaena.replace(/ /g, '_')}_${fecha}.pdf`);
}
