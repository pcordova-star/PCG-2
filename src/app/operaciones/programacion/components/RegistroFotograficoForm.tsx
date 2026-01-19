// src/app/operaciones/programacion/components/RegistroFotograficoForm.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ActividadProgramada, Obra } from '../page';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';
import { uploadFileToStorage } from '@/lib/storage/uploadFile';

type RegistroFotograficoFormProps = {
  obras: Obra[]; 
  actividades: ActividadProgramada[];
  onRegistroGuardado?: () => void;
};

const MAX_FOTOS = 5;

export default function RegistroFotograficoForm({ obras, actividades, onRegistroGuardado }: RegistroFotograficoFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [selectedObraId, setSelectedObraId] = useState(obras.length > 0 ? obras[0].id : "");
  const [fechaAvance, setFechaAvance] = useState(new Date().toISOString().slice(0, 10));

  const [actividadFotoId, setActividadFotoId] = useState<string>('');
  const [comentarioFoto, setComentarioFoto] = useState('');
  const [fotosSolo, setFotosSolo] = useState<File[]>([]);

  const [isSaving, setIsSaving] = useState(false);
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
    
    const archivosValidos: File[] = [];
    let heicDetectado = false;

    for (const file of nuevosArchivos) {
      const esHeic = file.type.includes('heic') || file.type.includes('heif') || /\.heic$/i.test(file.name) || /\.heif$/i.test(file.name);
      if (esHeic) {
        heicDetectado = true;
      } else {
        archivosValidos.push(file);
      }
    }

    if (heicDetectado) {
      toast({
        variant: "destructive",
        title: "Formato de imagen no compatible",
        description: "Las fotos en formato HEIC (de iPhone) no son soportadas. Por favor, cambia la configuración de tu cámara a 'Más compatible' (JPG) en Ajustes > Cámara > Formatos.",
        duration: 8000,
      });
      e.target.value = ""; // Limpia el input
    }
    
    if (archivosValidos.length > 0) {
        const total = fotosSolo.length + archivosValidos.length;
        if (total > MAX_FOTOS) {
            setError(`No más de ${MAX_FOTOS} fotos por registro.`);
            toast({ variant: 'destructive', title: 'Límite de fotos excedido' });
            return;
        }
        setFotosSolo(prev => [...prev, ...archivosValidos]);
    }
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

    setIsSaving(true);
    setError(null);

    try {
        const urlsFotos: string[] = [];
        if (fotosSolo.length > 0) {
            for(const file of fotosSolo){
                const nombreArchivo = `${Date.now()}-${file.name}`;
                const storagePath = `avances/${selectedObraId}/${nombreArchivo}`;
                const url = await uploadFileToStorage(file, storagePath);
                urlsFotos.push(url);
            }
        }
        
        const colRef = collection(firebaseDb, 'obras', selectedObraId, 'avancesDiarios');
        const docData = {
          tipoRegistro: 'FOTOGRAFICO',
          obraId: selectedObraId,
          actividadId: actividadFotoId === 'SIN_ACTIVIDAD' ? null : actividadFotoId,
          comentario: comentarioFoto || '',
          fotos: urlsFotos,
          visibleCliente: true,
          creadoPor: { uid: user.uid, displayName: user.displayName || user.email || 'Anónimo', },
          fecha: new Date(fechaAvance + 'T12:00:00Z'),
          createdAt: serverTimestamp(),
        };
        
        await addDoc(colRef, docData);

        toast({ title: 'Registro guardado', description: 'El registro fotográfico se ha guardado con éxito.' });
        onRegistroGuardado?.();
        resetFormStates();

    } catch(err: any) {
      console.error("Error guardando registro fotográfico:", err);
      setError('No se pudo guardar el registro fotográfico. ' + err.message);
      toast({ variant: 'destructive', title: 'Error', description: 'Ocurrió un problema al guardar el registro. Revisa la consola.' });
    } finally {
      setIsSaving(false);
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
                <Label htmlFor="obra-selector" className="font-semibold">Obra*</Label>
                <Select value={selectedObraId} onValueChange={handleObraSelectionChange} required>
                  <SelectTrigger id="obra-selector"><SelectValue placeholder="Seleccionar obra" /></SelectTrigger>
                  <SelectContent>
                    {obras.map((obra) => (<SelectItem key={obra.id} value={obra.id}>{obra.nombreFaena}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="avance-fecha" className="font-semibold">Fecha del Registro*</Label>
                <Input id="avance-fecha" type="date" value={fechaAvance} onChange={(e) => setFechaAvance(e.target.value)} required />
              </div>
            </div>
            
            <div className="space-y-1">
                <Label htmlFor="actividad-foto-selector" className="font-semibold">
                    Actividad Asociada{' '}
                    <span className="animate-pulse font-bold text-accent">(Opcional)</span>
                </Label>
                <Select value={actividadFotoId} onValueChange={setActividadFotoId}>
                <SelectTrigger id="actividad-foto-selector"><SelectValue placeholder="Seleccionar actividad" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="SIN_ACTIVIDAD">Sin actividad específica</SelectItem>
                    {actividadesAMostrar.map((act) => (<SelectItem key={act.id} value={act.id}>{act.nombreActividad}</SelectItem>))}
                </SelectContent>
                </Select>
            </div>
            <div className="space-y-1">
                <Label htmlFor="comentario-foto" className="font-semibold">Comentario</Label>
                <Textarea id="comentario-foto" value={comentarioFoto} onChange={(e) => setComentarioFoto(e.target.value)} placeholder="Descripción de la foto o del suceso..." />
            </div>
                <div className="space-y-1">
                <Label htmlFor="fotos-solo" className="font-semibold">Fotos</Label>
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
            <div className="flex items-center gap-4">
              <Button type="submit" disabled={isSaving || !selectedObraId} className="w-full sm:w-auto">
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSaving ? 'Guardando...' : 'Guardar Registro Fotográfico'}
              </Button>
               <Button type="button" variant="ghost" onClick={() => router.back()}>
                  Cancelar
              </Button>
            </div>
          </form>
      </CardContent>
    </Card>
  );
}
