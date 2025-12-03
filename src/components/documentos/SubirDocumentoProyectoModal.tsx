"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SubirDocumentoProyectoModal({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Subir Documento del Proyecto</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label>Código</Label>
            <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          </div>

          <div>
            <Label>Nombre del Documento</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>

          <div>
            <Label>Categoría</Label>
            <Select onValueChange={setCategoria}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Seguridad">Seguridad</SelectItem>
                <SelectItem value="Calidad">Calidad</SelectItem>
                <SelectItem value="Medio Ambiente">Medio Ambiente</SelectItem>
                <SelectItem value="Operaciones">Operaciones</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Archivo PDF</Label>
            <Input type="file" accept="application/pdf" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!archivo || !nombre || !codigo || !categoria}>
            Subir Documento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
