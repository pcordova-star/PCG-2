// src/app/prevencion/charlas/components/CharlaPdfButton.tsx
"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Charla, Obra, FirmaAsistente } from "@/types/pcg";
import { FileText, Loader2 } from "lucide-react";
import { useState } from "react";

interface Props {
  charla: Charla;
  obra?: Obra | null;
}

async function getBase64ImageFromUrl(imageUrl: string): Promise<string> {
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Error fetching image for PDF:", error);
        return ""; // Devuelve string vacío en caso de error
    }
}


async function generarActaDeCharla(charla: Charla, obra?: Obra | null) {
  const doc = new jsPDF("p", "mm", "a4");
  const marginX = 15;
  let cursorY = 20;

  // Encabezado
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Acta de Charla Operativa / Capacitação", 105, cursorY, { align: 'center' });
  cursorY += 15;

  // Datos Generales
  autoTable(doc, {
    startY: cursorY,
    body: [
      ["Obra", obra?.nombreFaena || charla.obraNombre],
      ["Mandante", obra?.mandanteRazonSocial || 'No especificado'],
      ["Contratista", obra?.empresa?.nombre || 'No especificado'],
      ["Tema de la Charla", charla.titulo],
      ["Fecha de Realización", charla.fechaRealizacion?.toDate().toLocaleDateString('es-CL') || 'No definida'],
      ["Referencia IPER", charla.iperIdRelacionado || charla.iperId || 'N/A'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [240, 240, 240], textColor: 20 },
    columnStyles: { 0: { fontStyle: 'bold' } },
  });
  cursorY = (doc as any).lastAutoTable.finalY + 10;

  // Contenido
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Resumo dos temas abordados", marginX, cursorY);
  cursorY += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const contenidoLines = doc.splitTextToSize(charla.contenido, 180);
  doc.text(contenidoLines, marginX, cursorY);
  cursorY += contenidoLines.length * 5 + 10;

  // Lista de Asistentes
  doc.addPage();
  cursorY = 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Lista de Presença", 105, cursorY, { align: 'center' });
  cursorY += 10;
  
  if (charla.asistentes && charla.asistentes.length > 0) {
    const tableBody = charla.asistentes.map(asistente => [
      asistente.nombre,
      asistente.rut || '-',
      asistente.cargo || '-',
      asistente.firmadoEn ? new Date(asistente.firmadoEn).toLocaleString('es-CL') : 'Sin firma',
      '' // Placeholder for signature
    ]);

    autoTable(doc, {
      startY: cursorY,
      head: [['Nome', 'RUT/CPF', 'Cargo', 'Data da assinatura', 'Assinatura']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: 20 },
      didDrawCell: async (data) => {
        if (data.column.index === 4 && data.row.index < charla.asistentes!.length) {
            const asistente = charla.asistentes![data.row.index];
            if(asistente.firmaUrl) {
                try {
                    const imgData = await getBase64ImageFromUrl(asistente.firmaUrl);
                    if (imgData) {
                        doc.addImage(imgData, 'PNG', data.cell.x + 2, data.cell.y + 2, 30, 10);
                    }
                } catch(e) {
                    console.log("Error al cargar firma en PDF", e);
                }
            }
        }
      }
    });

  } else {
    doc.text("Não existem assinaturas registradas nesta charla.", marginX, cursorY);
  }

  // Pie de página
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`PCG - Página ${i} de ${pageCount}`, 105, 285, { align: 'center' });
  }

  const fecha = charla.fechaRealizacion ? charla.fechaRealizacion.toDate().toISOString().slice(0, 10) : 'sin_fecha';
  doc.save(`acta_charla_${obra?.nombreFaena.replace(/ /g, '_')}_${fecha}.pdf`);
}


export function CharlaPdfButton({ charla, obra }: Props) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    await generarActaDeCharla(charla, obra);
    setLoading(false);
  };

  return (
    <Button size="sm" variant="outline" onClick={handleDownload} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
      {loading ? 'Generando...' : 'Generar Acta PDF'}
    </Button>
  );
}
