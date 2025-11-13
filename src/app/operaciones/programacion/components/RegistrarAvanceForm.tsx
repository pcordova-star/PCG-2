"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';
import { firebaseDb, firebaseStorage } from '@/lib/firebaseClient';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ActividadProgramada, Obra } from '../page';

type RegistrarAvanceFormProps = {
  obraId?: string;
  obras?: Obra[]; // Lista de obras para el selector
  actividades: ActividadProgramada[];
  onAvanceRegistrado?: (avance: any) => void;
  allowObraSelection?: boolean; // Para mostrar el selector de obra
  onObraChanged?: (obraId: string) => void; // Para notificar cambio de obra
};

const MAX_FOTOS = 5;
const MAX_TAMANO_MB = 5;

export default function RegistrarAvanceForm({ obraId: initialObraId, obras = [], actividades, onAvanceRegistrado, allowObraSelection = false, onObraChanged }: RegistrarAvanceFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedObraId, setSelectedObraId] = useState(initialObraId || (obras.length > 0 ? obras[0].id : ""));

  const [formAvance, setFormAvance] = useState({
    actividadId: 'null',
    fecha: new Date().toISOString().slice(0, 10),
    porcentajeAvance: '',
    comentario: '',
  });
  const [visibleCliente, setVisibleCliente] = useState<boolean>(true);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Si la obra inicial cambia desde las props, actualizamos el estado
    if (initialObraId) {
      setSelectedObraId(initialObraId);
    }
  }, [initialObraId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const nuevosArchivos = Array.from(e.target.files);
    const archivosAProcesar = [...archivos, ...nuevosArchivos];

    if (archivosAProcesar.length > MAX_FOTOS) {
      setError(`No puedes subir más de ${MAX_FOTOS} fotos por avance.`);
      return;
    }

    const archivosValidos = archivosAProcesar.filter((file) => {
      const esValido = file.size <= MAX_TAMANO_MB * 1024 * 1024;
      if (!esValido) {
        setError(`El archivo "${file.name}" supera el tamaño máximo de ${MAX_TAMANO_MB} MB.`);
      }
      return esValido;
    });

    setArchivos(archivosValidos);

    const nuevasPreviews = archivosValidos.map((file) => URL.createObjectURL(file));
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews(nuevasPreviews);
  };

  const handleRemoveFile = (index: number) => {
    const nuevosArchivos = archivos.filter((_, i) => i !== index);
    setArchivos(nuevosArchivos);

    const nuevasPreviews = nuevosArchivos.map((file) => URL.createObjectURL(file));
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews(nuevasPreviews);
  };

  const handleAvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObraId || !user) {
      setError('Debes seleccionar una obra y estar autenticado.');
      toast({ variant: 'destructive', title: 'Error de autenticación', description: 'Debes seleccionar una obra y estar autenticado.' });
      return;
    }

    const { actividadId, comentario } = formAvance;
    const porcentaje = Number(formAvance.porcentajeAvance);

    if (isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100) {
      setError('El porcentaje de avance debe ser un número entre 0 y 100.');
      toast({ variant: 'destructive', title: 'Dato inválido', description: 'El porcentaje de avance debe ser un número entre 0 y 100.' });
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const urlsFotos: string[] = await Promise.all(
        archivos.map(async (file) => {
          const nombreArchivo = `${Date.now()}-${file.name}`;
          const storageRef = ref(firebaseStorage, `avances/${selectedObraId}/${nombreArchivo}`);
          await uploadBytes(storageRef, file);
          return await getDownloadURL(storageRef);
        })
      );

      const colRef = collection(firebaseDb, 'obras', selectedObraId, 'avancesDiarios');

      const docData = {
        obraId: selectedObraId,
        actividadId: actividadId === 'null' ? null : actividadId,
        porcentajeAvance: porcentaje,
        comentario: comentario.trim(),
        fotos: urlsFotos,
        visibleParaCliente: !!visibleCliente,
        creadoPor: {
          uid: user.uid,
          displayName: user.displayName || user.email || 'Usuario Anónimo',
        },
        fecha: serverTimestamp(),
      };

      const docRef = await addDoc(colRef, docData);

      toast({
        title: 'Avance registrado con éxito',
        description: `El avance para la obra ha sido guardado.`,
      });

      const nuevoAvance = {
        id: docRef.id,
        ...docData,
        fecha: new Date().toISOString(),
      };

      onAvanceRegistrado?.(nuevoAvance);

      setFormAvance({ actividadId: 'null', fecha: new Date().toISOString().slice(0, 10), porcentajeAvance: '', comentario: '' });
      setArchivos([]);
      previews.forEach((url) => URL.revokeObjectURL(url));
      setPreviews([]);
      const fileInput = document.getElementById('foto-avance-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      console.error(err);
      setError('No se pudo registrar el avance. ' + err.message);
      toast({
        variant: 'destructive',
        title: 'Error al registrar avance',
        description: err.message || 'Ocurrió un problema. Inténtalo de nuevo.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleObraSelectionChange = (obraId: string) => {
    setSelectedObraId(obraId);
    if(onObraChanged) {
        onObraChanged(obraId);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar avance del día</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAvanceSubmit} className="space-y-4">
          {allowObraSelection && (
            <div className="space-y-1">
              <Label htmlFor="obra-selector" className="text-xs font-medium">Obra*</Label>
              <Select value={selectedObraId} onValueChange={handleObraSelectionChange}>
                <SelectTrigger id="obra-selector">
                  <SelectValue placeholder="Seleccionar obra" />
                </SelectTrigger>
                <SelectContent>
                  {obras.map((obra) => (
                    <SelectItem key={obra.id} value={obra.id}>
                      {obra.nombreFaena}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="avance-actividad" className="text-xs font-medium">Actividad (opcional)</Label>
            <Select value={formAvance.actividadId} onValueChange={(value) => setFormAvance((prev) => ({ ...prev, actividadId: value }))}>
              <SelectTrigger id="avance-actividad">
                <SelectValue placeholder="Seleccionar actividad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="null">
                  <div>Avance General de Obra</div>
                  <div className="text-xs text-muted-foreground">Para fotos o comentarios que no afectan el % de una tarea específica.</div>
                </SelectItem>
                {actividades.map((act) => (
                  <SelectItem key={act.id} value={act.id}>
                    {act.nombreActividad}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="avance-fecha" className="text-xs font-medium">Fecha*</Label>
              <Input id="avance-fecha" type="date" value={formAvance.fecha} onChange={(e) => setFormAvance((prev) => ({ ...prev, fecha: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="avance-porcentaje" className="text-xs font-medium">Avance Acumulado (%)</Label>
              <Input id="avance-porcentaje" type="number" min={0} max={100} value={formAvance.porcentajeAvance} onChange={(e) => setFormAvance((prev) => ({ ...prev, porcentajeAvance: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="avance-comentario" className="text-xs font-medium">Comentario*</Label>
            <textarea id="avance-comentario" value={formAvance.comentario} onChange={(e) => setFormAvance((prev) => ({ ...prev, comentario: e.target.value }))} rows={3} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="foto-avance-input" className="text-xs font-medium">Fotos (máx. {MAX_FOTOS}, hasta {MAX_TAMANO_MB}MB c/u)</Label>
            <Input id="foto-avance-input" type="file" accept="image/*" capture="environment" multiple onChange={handleFileChange} />
          </div>
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img src={preview} alt={`Vista previa ${index}`} className="w-full h-24 object-cover rounded-md" />
                  <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-50 group-hover:opacity-100" onClick={() => handleRemoveFile(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Checkbox id="visibleCliente" checked={visibleCliente} onCheckedChange={(c) => setVisibleCliente(c === true)} />
            <Label htmlFor="visibleCliente" className="text-xs text-muted-foreground">Visible para el cliente</Label>
          </div>
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          <Button type="submit" disabled={uploading || !selectedObraId}>
            {uploading ? 'Guardando avance y subiendo fotos...' : 'Registrar avance'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
