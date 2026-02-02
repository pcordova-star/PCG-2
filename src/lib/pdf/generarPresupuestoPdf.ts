// src/lib/pdf/generarPresupuestoPdf.ts
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import { Company } from "@/types/pcg";

export type HierarchicalItem = {
    id: string;
    parentId: string | null;
    type: "chapter" | "subchapter" | "item";
    descripcion: string;
    unidad: string;
    cantidad: number | null;
    precioUnitario: number | null;
    level: number;
    itemNumber: string;
    subtotal: number;
};

export type DatosEmpresa = {
  nombre: string;
  rut: string;
  direccion?: string;
};

export type DatosObra = {
  nombreFaena: string;
  ubicacion?: string;
};

export type DatosPresupuesto = {
  codigo: string;
  nombre: string;
  fecha: string; // formateada como string "19-11-2025"
  items: HierarchicalItem[];
  subtotal: number;
  gastosGeneralesPorcentaje: number;
  gastosGenerales: number;
  subtotalConGG: number;
  iva: number;
  total: number;
};

function formatoMoneda(valor: number | null) {
  if (valor === null || isNaN(valor)) return '$ 0';
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(valor);
}

function agregarPieDePagina(doc: jsPDF) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      "Documento generado con PCG · Plataforma de Control y Gestión",
      105,
      pageHeight - 15,
      { align: "center" }
    );
    doc.text(
      `Página ${i} de ${pageCount}`,
      105,
      pageHeight - 8,
      { align: "center" }
    );
    doc.setTextColor(0);
  }
}


export function generarPresupuestoPdf(
  empresa: DatosEmpresa,
  obra: DatosObra,
  presupuesto: DatosPresupuesto,
  isItemizado: boolean = false // Nuevo flag para diferenciar
) {
  const doc = new jsPDF("p", "mm", "a4");
  const marginX = 15;
  let cursorY = 20;

  const docTitle = isItemizado ? "Itemizado" : "Presupuesto";
  const docSubtitle = isItemizado
    ? `Itemizado generado desde IA - ${presupuesto.fecha}`
    : `Presupuesto: ${presupuesto.nombre}`;

  // -------- ENCABEZADO --------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("PCG · Plataforma de Control y Gestión", marginX, cursorY);
  cursorY += 8;

  doc.setFontSize(12);
  doc.text(docSubtitle, marginX, cursorY);
  cursorY += 6;
  if (!isItemizado) {
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha: ${presupuesto.fecha}`, marginX, cursorY);
    cursorY += 10;
  } else {
    cursorY += 4;
  }

  doc.setFont("helvetica", "bold");
  doc.text("Empresa que genera:", marginX, cursorY);
  cursorY += 6;
  doc.setFont("helvetica", "normal");
  doc.text(empresa.nombre, marginX, cursorY);
  cursorY += 5;
  doc.text(`RUT: ${empresa.rut}`, marginX, cursorY);
  cursorY += 5;
  if (empresa.direccion) {
    doc.text(`Dirección: ${empresa.direccion}`, marginX, cursorY);
    cursorY += 5;
  }

  cursorY += 5;

  doc.setFont("helvetica", "bold");
  doc.text("Obra / Faena:", marginX, cursorY);
  cursorY += 6;
  doc.setFont("helvetica", "normal");
  doc.text(obra.nombreFaena, marginX, cursorY);
  cursorY += 5;
  if (obra.ubicacion) {
    doc.text(`Ubicación: ${obra.ubicacion}`, marginX, cursorY);
    cursorY += 5;
  }

  cursorY += 8;
  
  const body = presupuesto.items.map(item => {
    return [
      { content: item.itemNumber, styles: { fontStyle: 'bold' } },
      { content: item.descripcion, styles: { cellWidth: 80 } },
      item.type === 'item' ? item.unidad : '',
      item.type === 'item' && item.cantidad != null ? item.cantidad.toLocaleString('es-CL') : '',
      item.type === 'item' ? formatoMoneda(item.precioUnitario) : '',
      { content: formatoMoneda(item.subtotal), styles: { fontStyle: 'bold', halign: 'right' } }
    ]
  });

  autoTable(doc, {
    startY: cursorY,
    head: [['Ítem', 'Descripción', 'Un.', 'Cant.', 'P. Unitario', 'P. Total']],
    body: body,
    theme: 'grid',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
    },
    didParseCell: (data) => {
        const item = presupuesto.items[data.row.index];
        if (!item) return;

        if (item.type === 'chapter') {
            data.cell.styles.fillColor = '#cae8ff';
            data.cell.styles.fontStyle = 'bold';
        }
        if (item.type === 'subchapter') {
            data.cell.styles.fillColor = '#f0f0f0';
            data.cell.styles.fontStyle = 'bold';
        }
        if (item.level > 0 && data.column.index === 1) {
            data.cell.styles.cellPadding = { ...(data.cell.styles.cellPadding as any), left: 5 + item.level * 5 };
        }
    }
  });

  cursorY = (doc as any).lastAutoTable.finalY + 10;
  
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottomMargin = 20;
  const summaryBlockHeight = 40; // Altura estimada para el bloque de totales

  if (cursorY + summaryBlockHeight > pageHeight - bottomMargin) {
      doc.addPage();
      cursorY = 20; // Reiniciar en la parte superior de la nueva página
  }

  const colTotalX = 195;
  const colLabelX = colTotalX - 55;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  doc.text("Subtotal Neto:", colLabelX, cursorY, { align: "right" });
  doc.text(formatoMoneda(presupuesto.subtotal), colTotalX, cursorY, { align: "right" });
  cursorY += 6;

  doc.text(`Gastos Generales y Utilidades (${presupuesto.gastosGeneralesPorcentaje}%):`, colLabelX, cursorY, { align: "right" });
  doc.text(formatoMoneda(presupuesto.gastosGenerales), colTotalX, cursorY, { align: "right" });
  cursorY += 8; // Aumentar espacio

  doc.setFont("helvetica", "bold");
  doc.text("Subtotal + GGyU:", colLabelX, cursorY, { align: "right" });
  doc.text(formatoMoneda(presupuesto.subtotalConGG), colTotalX, cursorY, { align: "right" });
  cursorY += 6;

  doc.setFont("helvetica", "normal");
  doc.text("IVA (19%):", colLabelX, cursorY, { align: "right" });
  doc.text(formatoMoneda(presupuesto.iva), colTotalX, cursorY, { align: "right" });
  cursorY += 8; // Aumentar espacio

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total General:", colLabelX, cursorY, { align: "right" });
  doc.text(formatoMoneda(presupuesto.total), colTotalX, cursorY, { align: "right" });

  agregarPieDePagina(doc);

  const fileName = isItemizado
    ? `Itemizado_IA_${obra.nombreFaena.replace(/ /g, '_')}.pdf`
    : `presupuesto-${presupuesto.codigo}.pdf`;
  doc.save(fileName);
}
