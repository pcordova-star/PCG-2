"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DocumentoCorporativo {
  id: string;
  code: string;
  name: string;
  category: string;
  version: string;
}

export default function ImportarCorporativosModal({
  open,
  onClose,
  documentos,
}: {
  open: boolean;
  onClose: () => void;
  documentos: DocumentoCorporativo[];
}) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Importar Documentos Corporativos</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-80 mt-4 border rounded-md p-3">
          {documentos.map((doc) => (
            <div key={doc.id} className="flex items-center space-x-3 py-2 border-b">
              <Checkbox checked={selected.includes(doc.id)} onCheckedChange={() => toggle(doc.id)} />
              <div>
                <p className="font-medium">{doc.code} — {doc.name}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.category} · v{doc.version}
                </p>
              </div>
            </div>
          ))}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={selected.length === 0}>
            Importar ({selected.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
