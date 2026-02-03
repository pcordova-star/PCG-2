// src/lib/comparacion-planos/exportToPdf.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ComparacionPlanosOutput, ArbolImpactosOutput } from "@/types/comparacion-planos";

type ImpactoNode = ArbolImpactosOutput['impactos'][0];

const PRIMARY_COLOR = "#3F51B5"; // Azul principal de la app
const TEXT_COLOR = "#333333";
const MUTED_TEXT_COLOR = "#777777";
const PAGE_MARGIN = 15;

function addHeader(doc: jsPDF, jobId: string) {
  doc.setFontSize(9);
  doc.setTextColor(MUTED_TEXT_COLOR);
  doc.text("Reporte de Análisis Comparativo de Planos | PCG", PAGE_MARGIN, 10);
  doc.text(`Job ID: ${jobId}`, doc.internal.pageSize.getWidth() - PAGE_MARGIN, 10, { align: 'right' });
  doc.setDrawColor(PRIMARY_COLOR);
  doc.setLineWidth(0.2);
  doc.line(PAGE_MARGIN, 13, doc.internal.pageSize.getWidth() - PAGE_MARGIN, 13);
}

function addFooter(doc: jsPDF) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(MUTED_TEXT_COLOR);
    doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    doc.text("Para más información, contacte a: control@pcgoperacion.com", doc.internal.pageSize.getWidth() - PAGE_MARGIN, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
  }
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  if (y > 250) {
    doc.addPage();
    y = 20; // Menor margen en páginas nuevas
  }
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(PRIMARY_COLOR);
  doc.text(title, PAGE_MARGIN, y);
  return y + 10;
}

function addBodyText(doc: jsPDF, text: string, y: number): number {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(TEXT_COLOR);
    const splitText = doc.splitTextToSize(text, doc.internal.pageSize.getWidth() - (PAGE_MARGIN * 2));
    doc.text(splitText, PAGE_MARGIN, y);
    return y + (splitText.length * 5) + 5;
}

function addImpactoNode(doc: jsPDF, node: ImpactoNode, y: number, level: number): number {
    let cursorY = y;
    if (cursorY > 260) {
        doc.addPage();
        cursorY = 20;
    }
    const indent = PAGE_MARGIN + (level * 8);
    const severidadColor = { baja: '#22c55e', media: '#f59e0b', alta: '#ef4444' };
    
    doc.setFillColor(248, 250, 252); // bg-slate-50
    doc.rect(indent - 3, cursorY - 5, doc.internal.pageSize.getWidth() - indent - 12, 10, 'F');
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(TEXT_COLOR);
    doc.text(`${" ".repeat(level * 2)}• ${node.especialidad.toUpperCase()}`, indent, cursorY);
    
    doc.setFont("helvetica", "normal");
    const severidadText = `Severidad: ${node.severidad}`;
    const textWidth = doc.getTextWidth(severidadText);
    doc.setFillColor(severidadColor[node.severidad as keyof typeof severidadColor] || '#64748b');
    doc.rect(doc.internal.pageSize.getWidth() - PAGE_MARGIN - textWidth - 4, cursorY - 4, textWidth + 4, 6, 'F');
    doc.setTextColor('#FFFFFF');
    doc.text(severidadText, doc.internal.pageSize.getWidth() - PAGE_MARGIN - 2, cursorY, { align: 'right' });

    cursorY += 8;
    doc.setTextColor(TEXT_COLOR);
    doc.setFontSize(9);
    
    let currentY = addBodyText(doc, `Impacto: ${node.impactoDirecto}`, cursorY);
    if(node.riesgo) {
      currentY = addBodyText(doc, `Riesgo: ${node.riesgo}`, currentY);
    }
    cursorY = currentY;

    if (node.subImpactos) {
        for (const subNode of node.subImpactos) {
            cursorY = addImpactoNode(doc, subNode, cursorY, level + 1);
        }
    }
    return cursorY + 4;
}

export async function exportAnalisisToPdf(data: {
  jobId: string;
  results: ComparacionPlanosOutput;
}) {
  const { jobId, results } = data;
  const { diffTecnico, cubicacionDiferencial, arbolImpactos } = results;

  const doc = new jsPDF();

  // --- Página de Portada ---
  doc.setFillColor(PRIMARY_COLOR);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 60, 'F');
  doc.setFontSize(26);
  doc.setTextColor('#FFFFFF');
  doc.setFont("helvetica", "bold");
  doc.text("Análisis Comparativo de Planos con IA", 105, 35, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("Generado por PCG - Plataforma de Control y Gestión", 105, 45, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setTextColor(TEXT_COLOR);
  doc.text("Resumen de Hallazgos", 105, 80, { align: 'center' });
  
  autoTable(doc, {
      startY: 90,
      body: [
          ["ID del Análisis (Job ID)", jobId],
          ["Fecha de Generación", new Date().toLocaleDateString('es-CL')],
          ["Cambios Detectados", `${diffTecnico.elementos.length} elementos`],
          ["Partidas con Variación", `${cubicacionDiferencial.partidas.length}`],
      ],
      theme: 'plain',
      styles: { fontSize: 11, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: 'bold' } },
  });

  doc.setFontSize(10);
  doc.setTextColor(MUTED_TEXT_COLOR);
  doc.text("Este reporte contiene un análisis automatizado y debe ser verificado por un profesional.", 105, 200, { align: 'center', maxWidth: 160 });

  doc.setFontSize(11);
  doc.setTextColor(PRIMARY_COLOR);
  doc.text("Para más información, contacte a:", 105, 220, { align: 'center' });
  doc.setFont("helvetica", "bold");
  doc.text("control@pcgoperacion.com", 105, 227, { align: 'center' });

  // --- Inicio del Contenido Detallado ---
  doc.addPage();
  addHeader(doc, jobId);
  let cursorY = 25;

  // --- Resumen Ejecutivo ---
  cursorY = addSectionTitle(doc, "Resumen Ejecutivo", cursorY);
  cursorY = addBodyText(doc, `Resumen Diff Técnico: ${diffTecnico.resumen}`, cursorY);
  cursorY = addBodyText(doc, `Resumen Cubicación Diferencial: ${cubicacionDiferencial.resumen}`, cursorY);
  
  // --- Diff Técnico ---
  cursorY += 5;
  cursorY = addSectionTitle(doc, "1. Detalle de Diferencias Técnicas", cursorY);
  autoTable(doc, {
    startY: cursorY,
    head: [['Tipo', 'Descripción', 'Ubicación']],
    body: diffTecnico.elementos.map(e => [e.tipo, e.descripcion, e.ubicacion || 'General']),
    theme: 'grid',
    headStyles: { fillColor: PRIMARY_COLOR },
  });
  cursorY = (doc as any).lastAutoTable.finalY + 10;

  // --- Cubicación ---
  cursorY = addSectionTitle(doc, "2. Análisis de Cubicación Diferencial", cursorY);
  autoTable(doc, {
    startY: cursorY,
    head: [['Partida', 'Unidad', 'Cant. Anterior', 'Cant. Nueva', 'Diferencia']],
    body: cubicacionDiferencial.partidas.map(p => [p.partida, p.unidad, p.cantidadA ?? 'N/A', p.cantidadB ?? 'N/A', p.diferencia.toLocaleString('es-CL')]),
    theme: 'grid',
    headStyles: { fillColor: PRIMARY_COLOR },
    columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } }
  });
  cursorY = (doc as any).lastAutoTable.finalY + 10;

  // --- Árbol de Impactos ---
  cursorY = addSectionTitle(doc, "3. Árbol de Impactos por Especialidad", cursorY);
  if (arbolImpactos.impactos && arbolImpactos.impactos.length > 0) {
    for (const rootNode of arbolImpactos.impactos) {
      cursorY = addImpactoNode(doc, rootNode, cursorY, 0);
    }
  } else {
    doc.text("No se generó árbol de impactos.", 15, cursorY);
  }

  addFooter(doc);

  return doc.output('arraybuffer');
}
