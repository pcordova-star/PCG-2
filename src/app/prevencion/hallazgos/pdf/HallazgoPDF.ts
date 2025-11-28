// src/app/prevencion/hallazgos/pdf/HallazgoPDF.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Hallazgo, Obra } from "@/types/pcg";

export function generateHallazgoPDF(hallazgo: Hallazgo, obra: Obra) {
    const doc = new jsPDF();

    // Encabezado
    doc.setFontSize(18);
    doc.text("Ficha de Hallazgo en Terreno", 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Obra: ${obra.nombreFaena}`, 15, 30);
    doc.text(`Fecha: ${hallazgo.createdAt.toDate().toLocaleDateString('es-CL')}`, 150, 30);
    doc.line(15, 35, 195, 35);
    
    let y = 45;

    // Datos del Hallazgo
    doc.setFontSize(12);
    doc.text(`Tipo de Riesgo: ${hallazgo.tipoRiesgo}`, 15, y); y+=10;
    doc.text(`Descripción: ${hallazgo.descripcion}`, 15, y); y+=10;
    doc.text(`Criticidad: ${hallazgo.criticidad.toUpperCase()}`, 15, y); y+=10;
    
    // Evidencia (si es una URL de imagen)
    // Nota: jsPDF no puede cargar imágenes de URL directamente sin hacks/CORS.
    // Esto es un placeholder. Para una implementación real, se necesitaría un proxy o cargar la imagen como base64.
    if (hallazgo.evidenciaUrl) {
        try {
            doc.text(`Evidencia Fotográfica:`, 15, y); y+=5;
            // Se asume que la imagen podría no cargar por CORS
            // doc.addImage(hallazgo.evidenciaUrl, 'JPEG', 15, y, 80, 60);
             doc.text(`[Ver imagen en URL: ${hallazgo.evidenciaUrl}]`, 20, y);
            y += 10;
        } catch(e) {
            console.error("Error al añadir imagen al PDF:", e);
             doc.text(`[No se pudo cargar la imagen desde la URL]`, 20, y);
             y += 10;
        }
    }


    // Acciones y Responsable
    doc.text("Acciones Inmediatas:", 15, y); y+=5;
    if (hallazgo.accionesInmediatas && hallazgo.accionesInmediatas.length > 0) {
        hallazgo.accionesInmediatas.forEach(accion => {
            doc.text(`- ${accion}`, 20, y); y+=5;
        });
    } else {
        doc.text(`- No se registraron acciones inmediatas.`, 20, y); y+=5;
    }
    
    y+=5;
    doc.text(`Responsable Sugerido: ${hallazgo.responsableId}`, 15, y); y+=5;
    doc.text(`Plazo Sugerido: ${hallazgo.plazo}`, 15, y); y+=15;

    // Espacios para firmas
    doc.text("Medidas Correctivas (a definir en terreno):", 15, y); y+=20;
    doc.line(15, y, 195, y); y+=15;

    doc.text("Firma Supervisor:", 15, y);
    doc.line(15, y + 15, 80, y + 15);
    
    doc.text("Firma Prevencionista:", 115, y);
    doc.line(115, y + 15, 180, y + 15);

    doc.save(`Hallazgo_${hallazgo.id?.substring(0, 8)}.pdf`);
}
