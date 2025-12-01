// src/app/prevencion/formularios-generales/components/PlanAccionEditor.tsx
"use client";

import React, { useState } from 'react';
import { ArbolCausas, MedidaCorrectivaDetallada, NodoArbolCausas } from '@/types/pcg';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, PlusCircle, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface PlanAccionEditorProps {
  arbolCausas?: ArbolCausas;
  medidas: MedidaCorrectivaDetallada[] | undefined;
  onChange: (medidas: MedidaCorrectivaDetallada[]) => void;
  readOnly?: boolean;
}

const initialMedidaState: Omit<MedidaCorrectivaDetallada, 'id'> = {
  causaNodoId: null,
  descripcionAccion: '',
  responsable: '',
  fechaCompromiso: '',
  estado: 'pendiente',
  observaciones: ''
};

export function PlanAccionEditor({ arbolCausas, medidas = [], onChange, readOnly = false }: PlanAccionEditorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentMedida, setCurrentMedida] = useState<Partial<MedidaCorrectivaDetallada>>(initialMedidaState);

  const nodosArbol = useMemo(() => arbolCausas ? Object.values(arbolCausas.nodos) : [], [arbolCausas]);

  const handleOpenDialog = (medida?: MedidaCorrectivaDetallada) => {
    setCurrentMedida(medida || { id: crypto.randomUUID(), ...initialMedidaState });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    const existingIndex = medidas.findIndex(m => m.id === currentMedida.id);
    if (existingIndex > -1) {
      const newMedidas = [...medidas];
      newMedidas[existingIndex] = currentMedida as MedidaCorrectivaDetallada;
      onChange(newMedidas);
    } else {
      onChange([...medidas, currentMedida as MedidaCorrectivaDetallada]);
    }
    setIsDialogOpen(false);
  };
  
  const handleRemove = (id: string) => {
    onChange(medidas.filter(m => m.id !== id));
  };
  
  if (readOnly && medidas.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay un plan de acción definido para esta investigación.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-md font-semibold">Plan de Acción / Medidas Correctivas</h4>
        {!readOnly && <Button type="button" size="sm" onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4" /> Agregar Medida</Button>}
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Acción</TableHead>
              {arbolCausas && <TableHead>Causa Asociada</TableHead>}
              <TableHead>Responsable</TableHead>
              <TableHead>Fecha Límite</TableHead>
              <TableHead>Estado</TableHead>
              {!readOnly && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {medidas.map(medida => (
              <TableRow key={medida.id}>
                <TableCell className="text-xs">{medida.descripcionAccion}</TableCell>
                {arbolCausas && <TableCell className="text-xs text-muted-foreground">{nodosArbol.find(n => n.id === medida.causaNodoId)?.descripcionCorta || 'General'}</TableCell>}
                <TableCell className="text-xs">{medida.responsable}</TableCell>
                <TableCell className="text-xs">{medida.fechaCompromiso}</TableCell>
                <TableCell><Badge variant="outline">{medida.estado}</Badge></TableCell>
                {!readOnly && (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(medida)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleRemove(medida.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {medidas.length === 0 && <p className="text-center text-sm text-muted-foreground p-4">No se han agregado medidas.</p>}
      </div>

      {!readOnly && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{currentMedida.id && medidas.some(m => m.id === currentMedida.id) ? 'Editar Medida' : 'Nueva Medida Correctiva'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {arbolCausas && (
                <div className="space-y-2">
                  <Label>Asociar a Causa del Árbol (Opcional)</Label>
                  <Select value={currentMedida.causaNodoId || ''} onValueChange={val => setCurrentMedida(prev => ({...prev, causaNodoId: val}))}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar causa..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="">General / No asociada</SelectItem>
                        {nodosArbol.map(nodo => <SelectItem key={nodo.id} value={nodo.id}>{nodo.descripcionCorta}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Descripción de la Acción</Label>
                <Input value={currentMedida.descripcionAccion} onChange={e => setCurrentMedida(prev => ({...prev, descripcionAccion: e.target.value}))}/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Responsable</Label>
                    <Input value={currentMedida.responsable} onChange={e => setCurrentMedida(prev => ({...prev, responsable: e.target.value}))}/>
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha Compromiso</Label>
                    <Input type="date" value={currentMedida.fechaCompromiso} onChange={e => setCurrentMedida(prev => ({...prev, fechaCompromiso: e.target.value}))}/>
                  </div>
              </div>
              <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={currentMedida.estado} onValueChange={val => setCurrentMedida(prev => ({...prev, estado: val as MedidaCorrectivaDetallada['estado']}))}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="en_proceso">En Proceso</SelectItem>
                        <SelectItem value="cerrado">Cerrado</SelectItem>
                    </SelectContent>
                  </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave}>Guardar Medida</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
