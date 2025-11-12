"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

// Componente cliente simple para el botón de impresión.
// Contiene la lógica que solo se puede ejecutar en el navegador.
export default function PrintButton() {
  const handlePrint = () => {
    // Esta función solo está disponible en el objeto `window` del navegador.
    window.print();
  };

  return (
    <Button onClick={handlePrint} variant="outline" className="no-print">
      <Printer className="mr-2 h-4 w-4" />
      Imprimir / Guardar PDF
    </Button>
  );
}
