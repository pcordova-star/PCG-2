"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function PrintButton({ label = "Imprimir" }: { label?: string }) {
  return (
    <Button
      onClick={() => window.print()}
      variant="outline"
      className="no-print"
    >
       <Printer className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}
