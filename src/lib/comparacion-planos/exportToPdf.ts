// src/lib/comparacion-planos/exportToPdf.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ComparacionPlanosOutput, DiffElemento, CubicacionPartida, ArbolImpactosOutput } from "@/types/comparacion-planos";

type ImpactoNode = ArbolImpactosOutput['impactos'][0];

function addHeader(doc: jsPDF, jobId: string) {
  doc.setFontSize(18);
  doc.text("Reporte de Análisis Comparativo de Planos", 15, 20);
  doc.setFontSize(10);
  doc.text(`Job ID: ${jobId}`, 15, 26);
  doc.setLineWidth(0.5);
  doc.line(15, 28, 195, 28);
}

function addFooter(doc: jsPDF) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Página ${i} de ${pageCount}`, 105, 285, { align: 'center' });
  }
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  if (y > 250) {
    doc.addPage();
    y = 40;
  }
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(title, 15, y);
  return y + 8;
}

function addImpactoNode(doc: jsPDF, node: ImpactoNode, y: number, level: number): number {
    let cursorY = y;
    if (cursorY > 260) {
        doc.addPage();
        cursorY = 20;
    }
    const indent = 15 + (level * 10);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`${" ".repeat(level * 2)}• ${node.especialidad.toUpperCase()}: ${node.impactoDirecto}`, indent, cursorY);
    cursorY += 6;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    if(node.riesgo) {
        doc.text(`Riesgo: ${node.riesgo}`, indent + 4, cursorY);
        cursorY += 5;
    }
    if(node.consecuencias && node.consecuencias.length > 0) {
        doc.text(`Consecuencias: ${node.consecuencias.join(', ')}`, indent + 4, cursorY);
        cursorY += 5;
    }
    doc.setTextColor(0);

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
  addHeader(doc, jobId);
  let cursorY = 40;

  // --- Resumen ---
  cursorY = addSectionTitle(doc, "Resumen Ejecutivo", cursorY);
  doc.setFontSize(10);
  doc.text(diffTecnico.resumen, 15, cursorY, { maxWidth: 180 });
  cursorY += (doc.splitTextToSize(diffTecnico.resumen, 180).length * 5) + 5;
  doc.text(cubicacionDiferencial.resumen, 15, cursorY, { maxWidth: 180 });
  cursorY += (doc.splitTextToSize(cubicacionDiferencial.resumen, 180).length * 5) + 10;
  
  // --- Diff Técnico ---
  cursorY = addSectionTitle(doc, "1. Diff Técnico", cursorY);
  autoTable(doc, {
    startY: cursorY,
    head: [['Tipo', 'Descripción', 'Ubicación']],
    body: diffTecnico.elementos.map(e => [e.tipo, e.descripcion, e.ubicacion || 'General']),
    theme: 'grid',
  });
  cursorY = (doc as any).lastAutoTable.finalY + 10;

  // --- Cubicación ---
  cursorY = addSectionTitle(doc, "2. Cubicación Diferencial", cursorY);
  autoTable(doc, {
    startY: cursorY,
    head: [['Partida', 'Unidad', 'Cant. Anterior', 'Cant. Nueva', 'Diferencia']],
    body: cubicacionDiferencial.partidas.map(p => [p.partida, p.unidad, p.cantidadA ?? 'N/A', p.cantidadB ?? 'N/A', p.diferencia]),
    theme: 'grid',
  });
  cursorY = (doc as any).lastAutoTable.finalY + 10;

  // --- Árbol de Impactos ---
  cursorY = addSectionTitle(doc, "3. Árbol de Impactos", cursorY);
  if (arbolImpactos.impactos && arbolImpactos.impactos.length > 0) {
    for (const rootNode of arbolImpactos.impactos) {
      cursorY = addImpactoNode(doc, rootNode, cursorY, 0);
    }
  } else {
    doc.text("No se generó árbol de impactos.", 15, cursorY);
  }

  addFooter(doc);

  // Devolver como Buffer para la descarga
  return doc.output('arraybuffer');
}
