// src/app/prevencion/formularios-generales/components/InformeAccidentePdfButton.tsx
"use client";

import { Button } from "@/components/ui/button";
import { generarInvestigacionAccidentePdf } from "@/lib/pdf/generarInvestigacionAccidentePdf";
import { Obra, RegistroIncidente } from "@/types/pcg";
import { FileText } from "lucide-react";

interface Props {
  investigacion: RegistroIncidente;
  obra: Obra;
}

export function InformeAccidentePdfButton({ investigacion, obra }: Props) {

  const handleDownload = () => {
    generarInvestigacionAccidentePdf(investigacion, obra);
  };

  return (
    <Button size="sm" variant="secondary" onClick={handleDownload}>
      <FileText className="h-4 w-4 mr-2" />
      Generar Informe PDF
    </Button>
  );
}
