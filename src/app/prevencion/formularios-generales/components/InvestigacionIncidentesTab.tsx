// src/app/prevencion/formularios-generales/components/InvestigacionIncidentesTab.tsx
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { firebaseDb } from '@/lib/firebaseClient';
import { addDoc, collection, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { RegistroIncidente } from '@/types/pcg';
import { PlanAccionEditor } from './PlanAccionEditor';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


interface Props {
  obraId: string;
  investigaciones: RegistroIncidente[];
  loading: boolean;
  onUpdate: () => void;
}

const initialFormState: Omit<RegistroIncidente, 'id' | 'obraId' | 'obraNombre' | 'createdAt'> = {
  fecha: new Date().toISOString().slice(0, 10),
  lugar: "",
  tipoIncidente: "Casi accidente",
  gravedad: "Leve",
  descripcionHecho: "",
  actoInseguro: "",
  condicionInsegura: "",
  causasInmediatas: "",
  causasBasicas: "",
  analisisIshikawa: "",
  analisis5Porques: "",
  medidasCorrectivas: "",
  responsableSeguimiento: "",
  plazoCierre: "",
  estadoCierre: "Abierto",
  metodoAnalisis: 'ishikawa_5p',
  medidasCorrectivasDetalladas: [],
};

export function InvestigacionIncidentesTab({ obraId, investigaciones, loading, onUpdate }: Props) {
  const [formState, setFormState] = useState(initialFormState);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleInputChange = <K extends keyof typeof formState>(campo: K, valor: (typeof formState)[K]) => {
    setFormState(prev => ({ ...prev, [campo]: valor }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obraId) {
      setError("Seleccione una obra.");
      return;
    }
    setError(null);
    try {
      await addDoc(collection(firebaseDb, "investigacionesIncidentes"), {
        ...formState,
        obraId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        metodoAnalisis: 'ishikawa_5p',
      });
      setFormState(initialFormState);
      onUpdate();
    } catch (err) {
      console.error(err);
      setError("No se pudo guardar la investigación.");
    }
  };

  const handleDelete = async (incidenteId: string) => {
    try {
        const docRef = doc(firebaseDb, "investigacionesIncidentes", incidenteId);
        await deleteDoc(docRef);
        toast({ title: "Incidente eliminado", description: "El registro del incidente ha sido eliminado." });
        onUpdate(); 
    } catch (error) {
        console.error("Error deleting incident:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el incidente.' });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      <Card>
        <CardHeader>
          <CardTitle>Registrar Nuevo Incidente</CardTitle>
          <CardDescription>Use este formulario para registrar eventos menores como casi accidentes o daños a la propiedad.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Suceso</Label>
                <Select value={formState.tipoIncidente} onValueChange={v => handleInputChange('tipoIncidente', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Casi accidente">Casi accidente</SelectItem>
                    <SelectItem value="Daño a la propiedad">Daño a la propiedad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha del Suceso</Label>
                <Input type="date" value={formState.fecha} onChange={e => handleInputChange('fecha', e.target.value)} />
              </div>
            </div>

            <div className="space-y-2"><Label>Descripción del Hecho</Label><Textarea value={formState.descripcionHecho} onChange={e => handleInputChange('descripcionHecho', e.target.value)} /></div>
            
            <div className="space-y-2"><Label>Análisis Ishikawa (Resumen)</Label><Textarea value={formState.analisisIshikawa} onChange={e => handleInputChange('analisisIshikawa', e.target.value)} rows={2} /></div>
            <div className="space-y-2"><Label>Análisis 5 Porqués (Resumen)</Label><Textarea value={formState.analisis5Porques} onChange={e => handleInputChange('analisis5Porques', e.target.value)} rows={2} /></div>
            
            <PlanAccionEditor
                medidas={formState.medidasCorrectivasDetalladas}
                onChange={medidas => handleInputChange('medidasCorrectivasDetalladas', medidas)}
            />

            <Button type="submit">Registrar Incidente</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Incidentes Menores</CardTitle>
          <CardDescription>Eventos analizados con Ishikawa / 5 Porqués.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <p>Cargando...</p> : investigaciones.length === 0 ? <p className="text-muted-foreground text-sm">No hay incidentes registrados para esta obra.</p> : (
            <div className="space-y-3 max-h-[800px] overflow-y-auto">
              {investigaciones.map(inv => (
                <article key={inv.id} className="border p-3 rounded-lg text-sm space-y-2">
                    <div className="flex justify-between items-start">
                        <p className="font-semibold">{inv.descripcionHecho}</p>
                        <div className="flex items-center">
                            <Badge variant="secondary">Ishikawa / 5P</Badge>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Eliminar este incidente?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta acción no se puede deshacer. Se eliminará el registro del incidente.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(inv.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{inv.fecha} - {inv.lugar}</p>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
