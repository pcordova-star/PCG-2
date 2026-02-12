// src/components/prevencion/charlas/AsistentesCharla.tsx
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, PlusCircle, Edit } from 'lucide-react';
import { FirmaAsistente } from '@/types/pcg';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import SignaturePad from '@/components/ui/SignaturePad';

interface AsistentesCharlaProps {
  asistentes: FirmaAsistente[];
  onChange: (asistentes: FirmaAsistente[]) => void;
  readOnly?: boolean;
}

export function AsistentesCharla({ asistentes, onChange, readOnly = false }: AsistentesCharlaProps) {
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [signingAttendeeIndex, setSigningAttendeeIndex] = useState<number | null>(null);

  const handleAdd = () => {
    const newAsistente: FirmaAsistente = { nombre: '', rut: '', cargo: '' };
    onChange([...asistentes, newAsistente]);
  };

  const handleRemove = (index: number) => {
    onChange(asistentes.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, field: keyof FirmaAsistente, value: string) => {
    const updated = [...asistentes];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };
  
  const openSignModal = (index: number) => {
    setSigningAttendeeIndex(index);
    setIsSignModalOpen(true);
  };

  const handleSaveSignature = (dataUrl: string) => {
    if (signingAttendeeIndex !== null) {
      const updated = [...asistentes];
      updated[signingAttendeeIndex].firmaUrl = dataUrl;
      updated[signingAttendeeIndex].firmadoEn = new Date().toISOString();
      onChange(updated);
    }
    setIsSignModalOpen(false);
    setSigningAttendeeIndex(null);
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>RUT</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Firma</TableHead>
              {!readOnly && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {asistentes.map((asistente, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Input value={asistente.nombre} onChange={(e) => handleFieldChange(index, 'nombre', e.target.value)} disabled={readOnly} />
                </TableCell>
                <TableCell>
                  <Input value={asistente.rut} onChange={(e) => handleFieldChange(index, 'rut', e.target.value)} disabled={readOnly} />
                </TableCell>
                <TableCell>
                  <Input value={asistente.cargo} onChange={(e) => handleFieldChange(index, 'cargo', e.target.value)} disabled={readOnly} />
                </TableCell>
                <TableCell>
                  {asistente.firmaUrl ? (
                    <img src={asistente.firmaUrl} alt="Firma" className="h-8 w-20 object-contain bg-slate-100 p-1 rounded-sm" />
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => openSignModal(index)} disabled={readOnly}>Firmar</Button>
                  )}
                </TableCell>
                {!readOnly && (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleRemove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {asistentes.length === 0 && <p className="text-center text-sm text-muted-foreground p-4">No hay asistentes registrados.</p>}
      </div>

      {!readOnly && (
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          <PlusCircle className="mr-2 h-4 w-4" /> Agregar Asistente
        </Button>
      )}
      
      <Dialog open={isSignModalOpen} onOpenChange={setIsSignModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Firmar Asistencia</DialogTitle>
              <DialogDescription>
                Participante: {signingAttendeeIndex !== null ? asistentes[signingAttendeeIndex]?.nombre : ''}
              </DialogDescription>
            </DialogHeader>
            <SignaturePad 
              onSave={handleSaveSignature} 
              onClear={() => {
                if (signingAttendeeIndex !== null) {
                  const updated = [...asistentes];
                  updated[signingAttendeeIndex].firmaUrl = undefined;
                  updated[signingAttendeeIndex].firmadoEn = undefined;
                  onChange(updated);
                }
              }} 
            />
          </DialogContent>
      </Dialog>
    </div>
  );
}
