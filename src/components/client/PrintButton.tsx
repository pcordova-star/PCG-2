"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

// Componente cliente simple para el botón de impresión.
export default function PrintButton() {
  const handlePrint = () => {
    // Esta función solo está disponible en el navegador.
    window.print();
  };

  return (
    <Button onClick={handlePrint} variant="outline">
      <Printer className="mr-2 h-4 w-4" />
      Imprimir / Guardar PDF
    </Button>
  );
}
