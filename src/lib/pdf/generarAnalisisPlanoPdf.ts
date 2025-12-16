// src/lib/pdf/generarAnalisisPlanoPdf.ts
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import { AnalisisPlanoOutput } from "@/types/analisis-planos";
import { Company } from "@/types/pcg";

export async function generarAnalisisPlanoPdf(
  analisis: AnalisisPlanoOutput,
  obraNombre: string,
  company?: Company | null
) {
  const doc = new jsPDF("p", "mm", "a4");
  const marginX = 15;
  let cursorY = 20;

  // --- Encabezado ---
  // El logo se puede cargar si está en base64 o si se hace una petición fetch
  // por ahora lo omitimos para simplicidad del lado del cliente sin fetch.
  // doc.addImage("/logo.png", "PNG", marginX, 15, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("PCG · Plataforma de Control y Gestión", marginX, cursorY);
  cursorY += 8;
  doc.setFontSize(12);
  doc.text(`Análisis de Plano: ${obraNombre}`, marginX, cursorY);
  cursorY += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha de Generación: ${new Date().toLocaleDateString('es-CL')}`, marginX, cursorY);
  cursorY += 10;

  if (company) {
    doc.setFontSize(10);
    doc.text(`Empresa: ${company.nombreFantasia || company.razonSocial}`, marginX, cursorY);
    cursorY += 5;
  }
  
  cursorY += 5;

  // --- Resumen de la IA ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Resumen del Análisis de IA", marginX, cursorY);
  cursorY += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const summaryLines = doc.splitTextToSize(analisis.summary, 180);
  doc.text(summaryLines, marginX, cursorY, {
    lineHeightFactor: 1.5,
  });
  cursorY += summaryLines.length * 5 + 10;

  // --- Tabla de Elementos Analizados ---
  if (analisis.elements && analisis.elements.length > 0) {
    const body = analisis.elements.map(el => [
      el.name,
      el.estimatedQuantity.toLocaleString('es-CL'),
      el.unit,
      `${(el.confidence * 100).toFixed(0)}%`,
      el.notes,
    ]);

    autoTable(doc, {
      startY: cursorY,
      head: [['Elemento', 'Cantidad Estimada', 'Unidad', 'Confianza', 'Notas']],
      body: body,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 58, 138], // Un azul oscuro (primary)
        textColor: 255,
        fontStyle: 'bold',
      },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'center' },
        3: { halign: 'right' },
      },
      didDrawPage: (data) => {
        // Actualizar cursorY si la tabla crea una nueva página
        cursorY = data.cursor?.y || cursorY;
      }
    });
    cursorY = (doc as any).lastAutoTable.finalY + 10;
  }

  // --- Nota de Advertencia ---
  doc.setFontSize(8);
  doc.setTextColor(150);
  const warningText = "Este es un documento generado por un modelo de Inteligencia Artificial. Las cubicaciones y datos son estimaciones y deben ser verificadas por un profesional antes de ser utilizadas en un presupuesto o planificación formal. PCG no se hace responsable por desviaciones o errores en la información.";
  const warningLines = doc.splitTextToSize(warningText, 180);
  doc.text(warningLines, marginX, cursorY);


  // --- Pie de Página ---
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Página ${i} de ${pageCount}`,
      105,
      pageHeight - 10,
      { align: "center" }
    );
  }

  doc.save(`Analisis_Plano_${obraNombre.replace(/\s+/g, '_')}.pdf`);
}
