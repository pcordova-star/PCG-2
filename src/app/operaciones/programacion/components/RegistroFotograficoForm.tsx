// src/app/operaciones/programacion/components/RegistroFotograficoForm.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, addDoc } from 'firebase/firestore';
import { firebaseDb, firebaseStorage } from '@/lib/firebaseClient';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ActividadProgramada, Obra } from '../page';
import { Textarea } from '@/components/ui/textarea';

type RegistroFotograficoFormProps = {
  obras: Obra[]; 
  actividades: ActividadProgramada[];
  onRegistroGuardado?: () => void;
};

const MAX_FOTOS = 5;

export default function RegistroFotograficoForm({ obras, actividades, onRegistroGuardado }: RegistroFotograficoFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedObraId, setSelectedObraId] = useState(obras.length > 0 ? obras[0].id : "");
  const [fechaAvance, setFechaAvance] = useState(new Date().toISOString().slice(0, 10));

  const [actividadFotoId, setActividadFotoId] = useState<string>('');
  const [comentarioFoto, setComentarioFoto] = useState('');
  const [fotosSolo, setFotosSolo] = useState<File[]>([]);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actividadesAMostrar = useMemo(() => {
    return actividades.filter(act => act.obraId === selectedObraId);
  }, [actividades, selectedObraId]);
  
  const resetFormStates = () => {
    setActividadFotoId('');
    setComentarioFoto('');
    setFotosSolo([]);
    setError(null);
  };
  
  const handleFileChangeSoloFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const nuevosArchivos = Array.from(e.target.files);
    const total = fotosSolo.length + nuevosArchivos.length;
    if (total > MAX_FOTOS) {
        setError(`No más de ${MAX_FOTOS} fotos por registro.`);
        toast({ variant: 'destructive', title: 'Límite de fotos excedido' });
        return;
    }
    setFotosSolo(prev => [...prev, ...nuevosArchivos]);
  }

  const handleRemoveFileSoloFoto = (index: number) => {
    setFotosSolo(prev => prev.filter((_, i) => i !== index));
  }
  
  const handleFotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObraId || !user) {
      setError('Debes seleccionar obra y estar autenticado.');
      return;
    }
     if (fotosSolo.length === 0 && !comentarioFoto.trim()) {
      setError('Debes agregar al menos una foto o un comentario.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
        const urlsFotos: string[] = [];
        if (fotosSolo.length > 0) {
            for(const file of fotosSolo){
                const nombreArchivo = `${Date.now()}-${file.name}`;
                const storageRef = ref(firebaseStorage, `avances/${selectedObraId}/${nombreArchivo}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                urlsFotos.push(url);
            }
        }
        
        const colRef = collection(firebaseDb, 'obras', selectedObraId, 'avancesDiarios');
        const docData = {
          tipoRegistro: 'FOTOGRAFICO',
          obraId: selectedObraId,
          actividadId: actividadFotoId || null,
          comentario: comentarioFoto || '',
          fotos: urlsFotos,
          visibleCliente: true,
          creadoPor: { uid: user.uid, displayName: user.displayName || user.email || 'Anónimo', },
          fecha: new Date(fechaAvance + 'T12:00:00Z'),
        };
        
        await addDoc(colRef, docData);

        toast({ title: 'Registro fotográfico guardado con éxito.' });
        onRegistroGuardado?.();
        resetFormStates();

    } catch(err: any) {
      console.error(err);
      setError('No se pudo guardar el registro fotográfico. ' + err.message);
    } finally {
      setUploading(false);
    }
  }

  const handleObraSelectionChange = (obraId: string) => {
    setSelectedObraId(obraId);
    resetFormStates();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detalles del Registro</CardTitle>
        <CardDescription>Asocia tu registro a una obra y actividad, y agrega comentarios y fotos.</CardDescription>
      </CardHeader>
      <CardContent>
          <form onSubmit={handleFotoSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="obra-selector">Obra*</Label>
                <Select value={selectedObraId} onValueChange={handleObraSelectionChange}>
                  <SelectTrigger id="obra-selector"><SelectValue placeholder="Seleccionar obra" /></SelectTrigger>
                  <SelectContent>
                    {obras.map((obra) => (<SelectItem key={obra.id} value={obra.id}>{obra.nombreFaena}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="avance-fecha">Fecha del Registro*</Label>
                <Input id="avance-fecha" type="date" value={fechaAvance} onChange={(e) => setFechaAvance(e.target.value)} />
              </div>
            </div>
            
            <div className="space-y-1">
                <Label htmlFor="actividad-foto-selector">Actividad Asociada (Opcional)</Label>
                <Select value={actividadFotoId} onValueChange={setActividadFotoId}>
                <SelectTrigger id="actividad-foto-selector"><SelectValue placeholder="Seleccionar actividad" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="">Sin actividad específica</SelectItem>
                    {actividadesAMostrar.map((act) => (<SelectItem key={act.id} value={act.id}>{act.nombreActividad}</SelectItem>))}
                </SelectContent>
                </Select>
            </div>
            <div className="space-y-1">
                <Label htmlFor="comentario-foto">Comentario</Label>
                <Textarea id="comentario-foto" value={comentarioFoto} onChange={(e) => setComentarioFoto(e.target.value)} placeholder="Descripción de la foto o del suceso..." />
            </div>
                <div className="space-y-1">
                <Label htmlFor="fotos-solo">Fotos</Label>
                <Input id="fotos-solo" type="file" accept="image/*" capture="environment" multiple onChange={handleFileChangeSoloFoto} />
                    <div className="flex flex-wrap gap-2 mt-2">
                    {fotosSolo.map((file, index) => (
                        <div key={index} className="relative text-sm bg-muted p-2 rounded-md">
                            <span>{file.name.substring(0,20)}...</span>
                            <button type="button" onClick={() => handleRemoveFileSoloFoto(index)} className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center text-white"><X size={12} /></button>
                        </div>
                    ))}
                </div>
            </div>
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <Button type="submit" disabled={uploading || !selectedObraId} className="w-full">
                <Camera className="mr-2 h-4 w-4" />
                {uploading ? 'Guardando registro...' : 'Guardar Registro Fotográfico'}
            </Button>
          </form>
      </CardContent>
    </Card>
  );
}
