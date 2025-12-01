// src/app/prevencion/formularios-generales/components/InformeAccidentePdfButton.tsx
"use client";

import { Button } from "@/components/ui/button";
import { generarInvestigacionAccidentePdf } from "@/lib/pdf/generarInvestigacionAccidentePdf";
import { Obra, RegistroIncidente } from "@/types/pcg";
import { FileText } from "lucide-react";

interface Props {
  investigacion: RegistroIncidente;
  obra: Obra;
  language?: 'es' | 'pt';
}

export function InformeAccidentePdfButton({ investigacion, obra, language = 'es' }: Props) {

  const handleDownload = () => {
    generarInvestigacionAccidentePdf(investigacion, obra, language);
  };

  const buttonText = language === 'pt' ? 'Baixar Relatório (PT)' : 'Generar Informe PDF (ES)';

  return (
    <Button size="sm" variant="secondary" onClick={handleDownload}>
      <FileText className="h-4 w-4 mr-2" />
      {buttonText}
    </Button>
  );
}
