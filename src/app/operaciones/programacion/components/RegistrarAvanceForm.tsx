"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
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
import { useActividadAvance } from '../hooks/useActividadAvance';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';


type RegistrarAvanceFormProps = {
  obraId?: string;
  obras?: Obra[]; 
  actividades: ActividadProgramada[];
  onAvanceRegistrado?: (avance: any) => void;
  allowObraSelection?: boolean; 
  onObraChanged?: (obraId: string) => void; 
};

const MAX_FOTOS = 5;

export default function RegistrarAvanceForm({ obraId: initialObraId, obras = [], actividades: initialActividades, onAvanceRegistrado, allowObraSelection = false, onObraChanged }: RegistrarAvanceFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedObraId, setSelectedObraId] = useState(initialObraId || (obras.length > 0 ? obras[0].id : ""));
  const [fechaAvance, setFechaAvance] = useState(new Date().toISOString().slice(0, 10));

  // Estado para "Avance con Cantidad"
  const [cantidadesHoy, setCantidadesHoy] = useState<Record<string, number>>({});
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [fotos, setFotos] = useState<Record<string, File[]>>({});
  
  // Estado para "Solo Registro Fotográfico"
  const [actividadFotoId, setActividadFotoId] = useState<string>('');
  const [comentarioFoto, setComentarioFoto] = useState('');
  const [fotosSolo, setFotosSolo] = useState<File[]>([]);


  const { avancesPorActividad: avancesAcumulados } = useActividadAvance(selectedObraId);
  
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actividadesAMostrar = useMemo(() => {
    return initialActividades.filter(act => act.obraId === selectedObraId);
  }, [initialActividades, selectedObraId]);

  useEffect(() => {
    if (initialObraId) {
      setSelectedObraId(initialObraId);
    }
  }, [initialObraId]);
  
  const resetFormStates = () => {
    setCantidadesHoy({});
    setComentarios({});
    setFotos({});
    setActividadFotoId('');
    setComentarioFoto('');
    setFotosSolo([]);
    setError(null);
  };

  const handleFileChange = (actividadId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const nuevosArchivos = Array.from(e.target.files);
    
    setFotos(prev => {
        const actuales = prev[actividadId] || [];
        const total = actuales.length + nuevosArchivos.length;
        if(total > MAX_FOTOS) {
            setError(`No más de ${MAX_FOTOS} fotos por actividad.`);
            toast({ variant: 'destructive', title: 'Límite de fotos excedido' });
            return prev;
        }
        return { ...prev, [actividadId]: [...actuales, ...nuevosArchivos] };
    });
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

  const handleRemoveFile = (actividadId: string, index: number) => {
    setFotos(prev => ({
        ...prev,
        [actividadId]: prev[actividadId]?.filter((_, i) => i !== index) || []
    }));
  }

  const handleRemoveFileSoloFoto = (index: number) => {
    setFotosSolo(prev => prev.filter((_, i) => i !== index));
  }

  const handleAvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObraId || !user) {
      setError('Debes seleccionar una obra y estar autenticado.');
      return;
    }

    const avancesParaGuardar = Object.entries(cantidadesHoy).filter(([_, cant]) => cant > 0);
    if (avancesParaGuardar.length === 0) {
      setError('No hay cantidades para registrar. Ingresa un valor en "Cantidad de Hoy" para al menos una actividad.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const batch = writeBatch(firebaseDb);
      const colRef = collection(firebaseDb, 'obras', selectedObraId, 'avancesDiarios');

      for (const [actividadId, cantidadHoy] of avancesParaGuardar) {
        const actividad = actividadesAMostrar.find(a => a.id === actividadId);
        if (!actividad) continue;

        const urlsFotos: string[] = [];
        if (fotos[actividadId] && fotos[actividadId].length > 0) {
            for(const file of fotos[actividadId]){
                const nombreArchivo = `${Date.now()}-${file.name}`;
                const storageRef = ref(firebaseStorage, `avances/${selectedObraId}/${nombreArchivo}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                urlsFotos.push(url);
            }
        }
        
        const avanceAcumulado = (avancesAcumulados[actividadId]?.cantidadAcumulada || 0) + cantidadHoy;
        const porcentajeAcumulado = actividad.cantidad > 0 ? (avanceAcumulado / actividad.cantidad) * 100 : 0;

        const docData = {
          tipoRegistro: 'CANTIDAD',
          obraId: selectedObraId,
          actividadId,
          cantidadEjecutada: cantidadHoy,
          porcentajeAcumuladoCalculado: Math.min(100, porcentajeAcumulado),
          porcentajeAvance: Math.min(100, porcentajeAcumulado), 
          comentario: comentarios[actividadId] || '',
          fotos: urlsFotos,
          visibleCliente: true,
          creadoPor: { uid: user.uid, displayName: user.displayName || user.email || 'Anónimo', },
          fecha: new Date(fechaAvance + 'T12:00:00Z'),
        };
        
        const nuevoDocRef = doc(colRef);
        batch.set(nuevoDocRef, docData);
      }

      await batch.commit();

      toast({ title: 'Avance registrado con éxito', description: `Se guardaron ${avancesParaGuardar.length} registros de avance.` });
      onAvanceRegistrado?.(avancesParaGuardar);
      resetFormStates();

    } catch (err: any) {
      console.error(err);
      setError('No se pudo registrar el avance. ' + err.message);
    } finally {
      setUploading(false);
    }
  };
  
  const handleFotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObraId || !user || !actividadFotoId) {
      setError('Debes seleccionar obra y actividad.');
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
          actividadId: actividadFotoId,
          comentario: comentarioFoto || '',
          fotos: urlsFotos,
          visibleCliente: true,
          creadoPor: { uid: user.uid, displayName: user.displayName || user.email || 'Anónimo', },
          fecha: new Date(fechaAvance + 'T12:00:00Z'),
        };
        
        await addDoc(colRef, docData);

        toast({ title: 'Registro fotográfico guardado con éxito.' });
        onAvanceRegistrado?.({});
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
    if(onObraChanged) {
        onObraChanged(obraId);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar suceso del día</CardTitle>
        <CardDescription>Seleccione el tipo de registro que desea realizar: un avance con cantidades o un registro solo con fotos y comentarios.</CardDescription>
      </CardHeader>
      <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-end mb-6">
            {allowObraSelection && (
              <div className="space-y-1 flex-grow">
                <Label htmlFor="obra-selector" className="text-xs font-medium">Obra*</Label>
                <Select value={selectedObraId} onValueChange={handleObraSelectionChange}>
                  <SelectTrigger id="obra-selector"><SelectValue placeholder="Seleccionar obra" /></SelectTrigger>
                  <SelectContent>
                    {obras.map((obra) => (<SelectItem key={obra.id} value={obra.id}>{obra.nombreFaena}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
             <div className="space-y-1">
              <Label htmlFor="avance-fecha" className="text-xs font-medium">Fecha de Avance*</Label>
              <Input id="avance-fecha" type="date" value={fechaAvance} onChange={(e) => setFechaAvance(e.target.value)} />
            </div>
          </div>
          
          <Tabs defaultValue="cantidad">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cantidad">Avance con Cantidad</TabsTrigger>
              <TabsTrigger value="foto">Solo Registro Fotográfico</TabsTrigger>
            </TabsList>
            <TabsContent value="cantidad" className="pt-4">
               <form onSubmit={handleAvanceSubmit} className="space-y-4">
                  <div className="overflow-x-auto border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[25%]">Actividad</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Acumulado</TableHead>
                                <TableHead className="w-[120px]">Cant. de Hoy</TableHead>
                                <TableHead>Nuevo %</TableHead>
                                <TableHead>Comentario / Foto</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {actividadesAMostrar.map(act => {
                                const avanceActual = avancesAcumulados[act.id] || { cantidadAcumulada: 0, porcentajeAcumulado: 0 };
                                const cantidadHoy = cantidadesHoy[act.id] || 0;
                                const nuevaCantidadAcumulada = avanceActual.cantidadAcumulada + cantidadHoy;
                                const nuevoPorcentaje = act.cantidad > 0 ? (nuevaCantidadAcumulada / act.cantidad) * 100 : 0;

                                return (
                                    <TableRow key={act.id}>
                                        <TableCell className="font-medium text-xs">{act.nombreActividad}</TableCell>
                                        <TableCell className="text-xs">{act.cantidad} {act.unidad}</TableCell>
                                        <TableCell className="text-xs font-semibold">{avanceActual.cantidadAcumulada.toFixed(2)} ({avanceActual.porcentajeAcumulado.toFixed(1)}%)</TableCell>
                                        <TableCell>
                                            <Input type="number" placeholder="0" value={cantidadesHoy[act.id] || ''} onChange={(e) => setCantidadesHoy(prev => ({...prev, [act.id]: Number(e.target.value)}))} className="h-8 text-xs" />
                                        </TableCell>
                                        <TableCell className="text-xs font-bold text-primary">{Math.min(100, nuevoPorcentaje).toFixed(1)}%</TableCell>
                                        <TableCell className="w-[250px] space-y-2">
                                            <Input type="text" placeholder="Comentario..." value={comentarios[act.id] || ''} onChange={(e) => setComentarios(prev => ({...prev, [act.id]: e.target.value}))} className="h-8 text-xs" />
                                            <Input type="file" accept="image/*" capture="environment" multiple onChange={(e) => handleFileChange(act.id, e)} className="h-8 text-xs" />
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {(fotos[act.id] || []).map((file, index) => (
                                                    <div key={index} className="relative text-xs bg-muted p-1 rounded">
                                                        <span>{file.name.substring(0,10)}...</span>
                                                        <button type="button" onClick={() => handleRemoveFile(act.id, index)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-4 w-4 flex items-center justify-center text-white"><X size={10} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                  </div>
                   {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                   <Button type="submit" disabled={uploading || !selectedObraId}>{uploading ? 'Guardando avances...' : 'Registrar Avances del Día'}</Button>
                </form>
            </TabsContent>
            <TabsContent value="foto" className="pt-4">
                 <form onSubmit={handleFotoSubmit} className="space-y-4 max-w-md mx-auto">
                    <div className="space-y-1">
                      <Label htmlFor="actividad-foto-selector">Actividad Asociada*</Label>
                      <Select value={actividadFotoId} onValueChange={setActividadFotoId}>
                        <SelectTrigger id="actividad-foto-selector"><SelectValue placeholder="Seleccionar actividad" /></SelectTrigger>
                        <SelectContent>
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
            </TabsContent>
          </Tabs>
      </CardContent>
    </Card>
  );
}
