"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Obra } from "@/types/pcg";
import { Label } from "../ui/label";

interface ObraSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (obraId: string) => void;
    obras: Obra[];
}

export function ObraSelectionModal({ isOpen, onClose, onSelect, obras }: ObraSelectionModalProps) {
    const [selectedId, setSelectedId] = useState('');

    const handleConfirm = () => {
        if (selectedId) {
            onSelect(selectedId);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Seleccionar Obra</DialogTitle>
                    <DialogDescription>
                        Elige la obra donde quieres registrar el hallazgo de seguridad.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label htmlFor="obra-modal-select">Obras Disponibles</Label>
                    <Select value={selectedId} onValueChange={setSelectedId}>
                        <SelectTrigger id="obra-modal-select">
                            <SelectValue placeholder="Selecciona una obra..." />
                        </SelectTrigger>
                        <SelectContent>
                            {obras.map(obra => (
                                <SelectItem key={obra.id} value={obra.id}>{obra.nombreFaena}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleConfirm} disabled={!selectedId}>Confirmar y Continuar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
