// src/app/prevencion/charlas/components/CharlaPdfButton.tsx
"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Charla, Obra, FirmaAsistente, IPERRegistro } from "@/types/pcg";
import { FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import { charlaReportTexts } from "@/lib/pdf/translations/charlaReportTexts";

interface Props {
  charla: Charla;
  obra?: Obra | null;
  language?: 'es' | 'pt';
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
        return "";
    }
}


async function generarActaDeCharla(charla: Charla, obra?: Obra | null, language: 'es' | 'pt' = 'es') {
  const texts = charlaReportTexts[language];
  const doc = new jsPDF("p", "mm", "a4");
  const marginX = 15;
  let cursorY = 20;

  // Cargar el IPER relacionado si existe
  let iper: IPERRegistro | null = null;
  if (charla.iperIdRelacionado) {
    try {
      const iperRef = doc(firebaseDb, "obras", charla.obraId, "iper", charla.iperIdRelacionado);
      const iperSnap = await getDoc(iperRef);
      if (iperSnap.exists()) {
        iper = { id: iperSnap.id, ...iperSnap.data() } as IPERRegistro;
      }
    } catch (error) {
      console.error("Error al cargar el IPER relacionado:", error);
    }
  }

  // Encabezado
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(texts.title, 105, cursorY, { align: 'center' });
  cursorY += 15;

  // Datos Generales
  autoTable(doc, {
    startY: cursorY,
    body: [
      [texts.fieldObra, obra?.nombreFaena || charla.obraNombre],
      [texts.fieldMandante, obra?.mandanteRazonSocial || texts.noEspecificado],
      [texts.fieldContratista, obra?.empresa?.nombre || texts.noEspecificado],
      [texts.fieldTema, charla.titulo],
      [texts.fieldFecha, charla.fechaRealizacion?.toDate().toLocaleDateString(language === 'pt' ? 'pt-BR' : 'es-CL') || texts.noDefinida],
    ],
    theme: 'grid',
    headStyles: { fillColor: [240, 240, 240], textColor: 20 },
    columnStyles: { 0: { fontStyle: 'bold' } },
  });
  cursorY = (doc as any).lastAutoTable.finalY + 10;

  // Origen de la charla (IPER)
  if (iper) {
    cursorY = addSectionTitle(doc, texts.sectionIperTitle, cursorY);
    autoTable(doc, {
        startY: cursorY,
        body: [
            [texts.fieldIperId, iper.id],
            [texts.fieldIperTarea, iper.tarea],
            [texts.fieldIperPeligro, iper.peligro],
            [texts.fieldIperRiesgo, iper.riesgo],
            [texts.fieldIperRiesgoInherente, `${iper.nivel_riesgo_hombre} (H) / ${iper.nivel_riesgo_mujer} (M)`],
            [texts.fieldIperRiesgoResidual, `${iper.nivel_riesgo_residual}`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: 20 },
        columnStyles: { 0: { fontStyle: 'bold' } },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Contenido
  cursorY = addSectionTitle(doc, texts.sectionContentTitle, cursorY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  const contenido = iper
    ? `${texts.contentFromIperIntro} "${iper.tarea}":\n\n` +
      `- ${texts.contentFromIperPeligro}: ${iper.peligro}.\n` +
      `- ${texts.contentFromIperRiesgo}: ${iper.riesgo} (Nivel: ${Math.max(iper.nivel_riesgo_hombre, iper.nivel_riesgo_mujer)}).\n` +
      `- ${texts.contentFromIperControl}: ${iper.control_especifico_genero || texts.noEspecificado}.`
    : charla.contenido;
  
  const contenidoLines = doc.splitTextToSize(contenido, 180);
  doc.text(contenidoLines, marginX, cursorY);
  cursorY += contenidoLines.length * 5 + 10;

  // Lista de Asistentes
  doc.addPage();
  cursorY = 20;
  cursorY = addSectionTitle(doc, texts.sectionAttendeesTitle, cursorY);
  
  if (charla.asistentes && charla.asistentes.length > 0) {
    const tableBodyPromises = charla.asistentes.map(async (asistente) => {
        let firmaContent: any = texts.noFirma;
        if (asistente.firmaUrl) {
            try {
                const imgData = await getBase64ImageFromUrl(asistente.firmaUrl);
                if(imgData) {
                    firmaContent = { image: imgData, width: 30, height: 10 };
                } else {
                    firmaContent = texts.errorFirma;
                }
            } catch(e) {
                console.error("Error al procesar firma", e);
                firmaContent = texts.errorFirma;
            }
        }
        
        return [
            asistente.nombre,
            asistente.rut || '-',
            asistente.cargo || '-',
            asistente.firmadoEn ? new Date(asistente.firmadoEn).toLocaleString(language === 'pt' ? 'pt-BR' : 'es-CL') : 'N/A',
            firmaContent
        ];
    });

    const tableBody = await Promise.all(tableBodyPromises);

    autoTable(doc, {
      startY: cursorY,
      head: [[texts.tableAttendeesHeadName, texts.tableAttendeesHeadId, texts.tableAttendeesHeadPosition, texts.tableAttendeesHeadDate, texts.tableAttendeesHeadSignature]],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: 20 },
      didDrawCell: (data) => {},
      columnStyles: {
          4: { minCellHeight: 15, halign: 'center', valign: 'middle' }
      }
    });

  } else {
    doc.text(texts.noAsistentes, marginX, cursorY);
  }

  // Pie de página
  addFooter(doc, language);

  const fecha = charla.fechaRealizacion ? charla.fechaRealizacion.toDate().toISOString().slice(0, 10) : 'sin_fecha';
  const fileName = `${texts.fileName}_${obra?.nombreFaena.replace(/ /g, '_')}_${fecha}.pdf`;
  doc.save(fileName);
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(title, marginX, y);
    return y + 6;
}

function addFooter(doc: jsPDF, language: 'es' | 'pt') {
    const texts = charlaReportTexts[language];
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`PCG - ${texts.page} ${i} de ${pageCount}`, 105, 285, { align: 'center' });
    }
}


export function CharlaPdfButton({ charla, obra, language = 'es' }: Props) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    await generarActaDeCharla(charla, obra, language);
    setLoading(false);
  };

  return (
    <Button size="sm" variant="outline" onClick={handleDownload} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
      {loading ? (language === 'pt' ? 'Gerando...' : 'Generando...') : (language === 'pt' ? 'Gerar Ata (PDF)' : 'Generar Acta (PDF)')}
    </Button>
  );
}
