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
        if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
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
    const tableBodyPromises = charla.asistentes.map(async (asistente) => {
        let firmaContent: any = 'Sin firma';
        if (asistente.firmaUrl) {
            try {
                const imgData = await getBase64ImageFromUrl(asistente.firmaUrl);
                if(imgData) {
                    firmaContent = { image: imgData, width: 30, height: 10 };
                } else {
                    firmaContent = 'Error al cargar firma';
                }
            } catch(e) {
                console.error("Error al procesar firma", e);
                firmaContent = 'Error de imagen';
            }
        }
        
        return [
            asistente.nombre,
            asistente.rut || '-',
            asistente.cargo || '-',
            asistente.firmadoEn ? new Date(asistente.firmadoEn).toLocaleString('es-CL') : 'N/A',
            firmaContent
        ];
    });

    const tableBody = await Promise.all(tableBodyPromises);

    autoTable(doc, {
      startY: cursorY,
      head: [['Nome', 'RUT/CPF', 'Cargo', 'Data da assinatura', 'Assinatura']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: 20 },
      didDrawCell: (data) => {
        // La lógica de `didDrawCell` es compleja con async, es mejor preparar la data antes
      },
      columnStyles: {
          4: { minCellHeight: 15, halign: 'center', valign: 'middle' }
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
