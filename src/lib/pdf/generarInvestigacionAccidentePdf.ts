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
    if (y > 250) { // Evita que el título quede al final de la página
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
    // Aquí podrías añadir el nombre del trabajador si lo tienes en el registro
    // doc.text(`Persona Afectada: [Nombre del trabajador]`, 105, 148, { align: 'center' });
    doc.text(`Tipo de Suceso: ${incidente.tipoIncidente}`, 105, 148, { align: 'center' });
    doc.text(`Gravedad: ${incidente.gravedad}`, 105, 156, { align: 'center' });
    doc.text(`Fecha de Generación: ${new Date().toLocaleDateString('es-CL')}`, 105, 164, { align: 'center' });


    // --- 2. CUERPO DEL INFORME ---
    doc.addPage();
    addHeader(doc, `Investigación ID: ${incidente.id}`);
    let cursorY = 40;

    // Sección 1: Datos Generales
    cursorY = addSectionTitle(doc, "1. Datos Generales del Accidente", cursorY);
    autoTable(doc, {
        startY: cursorY,
        body: [
            ['Fecha y Hora', `${new Date(incidente.fecha + 'T00:00:00').toLocaleDateString('es-CL')}`], // Hora no está en el modelo actual
            ['Lugar del Accidente', incidente.lugar || 'No registrado'],
            // ['Persona Afectada', 'PENDIENTE' /* Aquí iría el nombre del trabajador */ ],
            // ['Responsable del Área', incidente.responsableSeguimiento || 'No registrado'],
            ['Lesión Producida', incidente.lesionDescripcion || 'No registrado'],
            ['Parte del Cuerpo Afectada', incidente.parteCuerpoAfectada || 'No registrado'],
            ['Agente del Accidente', incidente.agenteAccidente || 'No registrado'],
            ['Mecanismo del Accidente', incidente.mecanismoAccidente || 'No registrado'],
            ['¿Hubo Tiempo Perdido?', incidente.huboTiempoPerdido ? 'Sí' : 'No'],
            ['Días de Reposo Médico', incidente.diasReposoMedico?.toString() || 'No registrado'],
            ['¿Accidente Grave/Fatal?', incidente.esAccidenteGraveFatal ? 'Sí' : 'No'],
        ],
        theme: 'plain',
        styles: { fontSize: 9 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 10;
    
    // Sección 2: Descripción del Hecho
    cursorY = addSectionTitle(doc, "2. Descripción Objetiva del Hecho", cursorY);
    const descLines = doc.splitTextToSize(incidente.descripcionHecho, 180);
    doc.setFontSize(10);
    doc.text(descLines, 15, cursorY);
    cursorY += descLines.length * 5 + 10;
    
    // Sección 3: Árbol de Causas
    cursorY = addSectionTitle(doc, "3. Análisis de Causas (Árbol de Causas)", cursorY);
    
    if (incidente.arbolCausas && incidente.arbolCausas.nodos && incidente.arbolCausas.raizId) {
        const nodos = Object.values(incidente.arbolCausas.nodos);
        const raiz = nodos.find(n => n.id === incidente.arbolCausas!.raizId);
        const causasInmediatas = nodos.filter(n => n.esCausaInmediata);
        const causasBasicas = nodos.filter(n => n.esCausaBasica);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text("Hecho Principal (Accidente):", 15, cursorY); cursorY += 5;
        doc.setFont('helvetica', 'normal');
        
        if (raiz) {
            const descRaiz = raiz.descripcionCorta === 'Nuevo Hecho' ? 'Accidente investigado' : raiz.descripcionCorta;
            doc.text(`- [${raiz.tipo.toUpperCase()}] ${descRaiz}`, 20, cursorY); cursorY += 5;
            if(raiz.detalle) {
                doc.setFontSize(9);
                doc.setTextColor(100);
                doc.text(`  Detalle: ${raiz.detalle}`, 22, cursorY); cursorY += 5;
                doc.setTextColor(0);
                doc.setFontSize(10);
            }
        }
        cursorY += 5;
        
        doc.setFont('helvetica', 'bold');
        doc.text("Causas Inmediatas:", 15, cursorY); cursorY += 5;
        doc.setFont('helvetica', 'normal');
        if (causasInmediatas.length > 0) {
            causasInmediatas.forEach(causa => {
                doc.text(`- [${causa.tipo.toUpperCase()}] ${causa.descripcionCorta}`, 20, cursorY); cursorY += 5;
            });
        } else {
            doc.text("No se registraron causas inmediatas.", 20, cursorY); cursorY += 5;
        }
        cursorY += 5;
        
        doc.setFont('helvetica', 'bold');
        doc.text("Causas Básicas:", 15, cursorY); cursorY += 5;
        doc.setFont('helvetica', 'normal');
        if (causasBasicas.length > 0) {
            causasBasicas.forEach(causa => {
                doc.text(`- [${causa.tipo.toUpperCase()}] ${causa.descripcionCorta}`, 20, cursorY); cursorY += 5;
            });
        } else {
             doc.text("No se registraron causas básicas.", 20, cursorY); cursorY += 5;
        }
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
    }


    // --- PIE DE PÁGINA ---
    addFooter(doc, obra.nombreFaena);

    // --- GUARDAR ---
    doc.save(`Investigacion_Accidente_${incidente.id?.substring(0, 8)}.pdf`);
}
