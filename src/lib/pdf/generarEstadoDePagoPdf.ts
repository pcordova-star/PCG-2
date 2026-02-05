// src/lib/pdf/generarEstadoDePagoPdf.ts
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import { Company } from "@/types/pcg";

type Obra = {
  id: string;
  nombreFaena: string;
  direccion?: string;
  clienteEmail?: string;
  mandante?: string;
  [key: string]: any;
};

type ItemEstadoPago = {
  actividadId: string;
  nombre: string;
  precioContrato: number;
  cantidad: number;
  unidad: string;
  porcentajeAvance: number;
  montoProyectado: number;
};

// Updated Type
type EstadoDePago = {
  id: string;
  correlativo: number;
  fechaGeneracion: Date;
  fechaDeCorte: string;
  totalAcumulado: number;
  totalAnterior: number;
  subtotal: number;
  iva: number;
  total: number;
  actividades: ItemEstadoPago[];
};

function formatoMoneda(valor: number) {
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

export function generarEstadoDePagoPdf(
  empresa: Company,
  obra: Obra,
  estadoDePago: EstadoDePago
) {
  const doc = new jsPDF("p", "mm", "a4");
  const marginX = 15;
  let cursorY = 20;

  // Encabezado
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("PCG · Plataforma de Control y Gestión", marginX, cursorY);
  cursorY += 8;

  doc.setFontSize(12);
  doc.text(`Estado de Pago: ${obra.nombreFaena}`, marginX, cursorY);
  cursorY += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`EDP N°: ${estadoDePago.correlativo.toString().padStart(3, '0')}`, marginX, cursorY);
  cursorY += 5;
  doc.text(`Fecha de Corte: ${new Date(estadoDePago.fechaDeCorte + 'T00:00:00').toLocaleDateString('es-CL')}`, marginX, cursorY);
  cursorY += 10;
  
  // Datos
  doc.setFont("helvetica", "bold");
  doc.text("Constructora:", marginX, cursorY);
  doc.setFont("helvetica", "normal");
  doc.text(empresa.nombreFantasia || empresa.razonSocial, marginX + 35, cursorY);
  cursorY += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Mandante:", marginX, cursorY);
  doc.setFont("helvetica", "normal");
  doc.text(obra.mandante || 'No especificado', marginX + 35, cursorY);
  cursorY += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Cliente:", marginX, cursorY);
  doc.setFont("helvetica", "normal");
  doc.text(obra.clienteEmail || 'No especificado', marginX + 35, cursorY);
  cursorY += 10;
  

  const body = estadoDePago.actividades.map((item, index) => [
    index + 1,
    item.nombre,
    item.cantidad.toLocaleString('es-CL'),
    item.unidad,
    formatoMoneda(item.precioContrato),
    `${item.porcentajeAvance.toFixed(1)}%`,
    formatoMoneda(item.montoProyectado)
  ]);

  autoTable(doc, {
    startY: cursorY,
    head: [['Ítem', 'Descripción', 'Cant.', 'Un.', 'P. Unitario', '% Avance', 'Monto Acumulado']],
    body: body,
    theme: 'grid',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: {
      6: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
    }
  });

  cursorY = (doc as any).lastAutoTable.finalY + 10;
  
  // Resumen final (UPDATED)
  const colTotalX = 195;
  const colLabelX = colTotalX - 60; // Adjusted for longer labels

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  doc.text("Total Avance Acumulado a la Fecha:", colLabelX, cursorY, { align: "right" });
  doc.text(formatoMoneda(estadoDePago.totalAcumulado), colTotalX, cursorY, { align: "right" });
  cursorY += 6;

  doc.text("(-) Descuento Avances Anteriores:", colLabelX, cursorY, { align: "right" });
  doc.text(formatoMoneda(estadoDePago.totalAnterior), colTotalX, cursorY, { align: "right" });
  cursorY += 6;
  
  doc.setFont("helvetica", "bold");
  doc.text("Subtotal de Este Período:", colLabelX, cursorY, { align: "right" });
  doc.text(formatoMoneda(estadoDePago.subtotal), colTotalX, cursorY, { align: "right" });
  cursorY += 6;

  doc.setFont("helvetica", "normal");
  doc.text("IVA (19%):", colLabelX, cursorY, { align: "right" });
  doc.text(formatoMoneda(estadoDePago.iva), colTotalX, cursorY, { align: "right" });
  cursorY += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total a Pagar en este EEPP:", colLabelX, cursorY, { align: "right" });
  doc.text(formatoMoneda(estadoDePago.total), colTotalX, cursorY, { align: "right" });
  
  cursorY += 25;
  
  // Firmas
   doc.text("________________________", marginX, cursorY);
   doc.text("________________________", 110, cursorY);
   cursorY += 5;
   doc.setFontSize(9);
   doc.text("Firma Contratista", marginX, cursorY);
   doc.text("Firma Mandante / ITO", 110, cursorY);


  agregarPieDePagina(doc);

  doc.save(`EDP-${estadoDePago.correlativo.toString().padStart(3, '0')}-${obra.nombreFaena.replace(/ /g, '_')}.pdf`);
}
