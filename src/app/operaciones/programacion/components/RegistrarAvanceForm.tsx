// src/app/operaciones/programacion/components/RegistrarAvanceForm.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { firebaseFunctions, firebaseStorage } from '@/lib/firebaseClient';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ActividadProgramada, Obra } from '../page';
import { useActividadAvance } from '../hooks/useActividadAvance';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

  const [cantidadesHoy, setCantidadesHoy] = useState<Record<string, number>>({});
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [fotos, setFotos] = useState<Record<string, File[]>>({});
  
  const actividadesAMostrar = useMemo(() => {
    return initialActividades.filter(act => act.obraId === selectedObraId);
  }, [initialActividades, selectedObraId]);

  const { avancesPorActividad } = useActividadAvance(selectedObraId, actividadesAMostrar);
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialObraId) {
      setSelectedObraId(initialObraId);
    }
  }, [initialObraId]);
  
  const resetFormStates = () => {
    setCantidadesHoy({});
    setComentarios({});
    setFotos({});
    setError(null);
  };

  const handleFileChange = (actividadId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const archivosSeleccionados = Array.from(e.target.files);
    
    const archivosValidos: File[] = [];
    let heicDetectado = false;

    for (const file of archivosSeleccionados) {
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
      e.target.value = ""; 
    }
    
    if (archivosValidos.length > 0) {
       setFotos(prev => {
          const actuales = prev[actividadId] || [];
          const total = actuales.length + archivosValidos.length;
          if(total > MAX_FOTOS) {
              setError(`No más de ${MAX_FOTOS} fotos por actividad.`);
              toast({ variant: 'destructive', title: 'Límite de fotos excedido' });
              return prev;
          }
          return { ...prev, [actividadId]: [...actuales, ...archivosValidos] };
      });
    }
  };
  
  const handleRemoveFile = (actividadId: string, index: number) => {
    setFotos(prev => ({
        ...prev,
        [actividadId]: prev[actividadId]?.filter((_, i) => i !== index) || []
    }));
  }

  const handleAvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObraId || !user) {
      setError('Debes seleccionar una obra y estar autenticado.');
      return;
    }

    const registrarAvanceFn = httpsCallable(firebaseFunctions, 'registrarAvanceRapido');

    const avancesParaGuardar = Object.entries(cantidadesHoy).filter(([_, cant]) => cant > 0);
    if (avancesParaGuardar.length === 0) {
      setError('No hay cantidades para registrar. Ingresa un valor en "Cantidad de Hoy" para al menos una actividad.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      for (const [actividadId, cantidadHoy] of avancesParaGuardar) {
        const actividad = actividadesAMostrar.find(a => a.id === actividadId);
        if (!actividad) continue;

        const cantidadAcumuladaAnterior = avancesPorActividad[actividadId]?.cantidadAcumulada || 0;
        const maxPermitidaHoy = Math.max(0, actividad.cantidad - cantidadAcumuladaAnterior);

        if (maxPermitidaHoy <= 0 || cantidadHoy > maxPermitidaHoy) {
           throw new Error(`La cantidad para "${actividad.nombreActividad}" (${cantidadHoy}) excede la disponible (${maxPermitidaHoy.toFixed(2)}).`);
        }

        const urlsFotos: string[] = [];
        if (fotos[actividadId] && fotos[actividadId].length > 0) {
          for (const file of fotos[actividadId]) {
            const nombreArchivo = `${Date.now()}-${file.name}`;
            const storageRef = ref(firebaseStorage, `avances/${selectedObraId}/${nombreArchivo}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            urlsFotos.push(url);
          }
        }
        
        await registrarAvanceFn({
          obraId: selectedObraId,
          actividadId: actividadId,
          porcentaje: (cantidadHoy / actividad.cantidad) * 100, // Enviar porcentaje
          comentario: comentarios[actividadId] || '',
          fotos: urlsFotos,
          visibleCliente: true,
          fecha: fechaAvance
        });
      }

      toast({ title: 'Avance registrado con éxito', description: `Se guardaron ${avancesParaGuardar.length} registros de avance.` });
      onAvanceRegistrado?.(avancesParaGuardar);
      resetFormStates();

    } catch (err: any) {
      console.error("Error al registrar el avance:", err);
      setError(err.message);
      toast({ variant: "destructive", title: "Error de validación", description: err.message });
    } finally {
      setIsSaving(false);
    }
  };
  
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
        <CardTitle>Registro de Avance por Cantidad</CardTitle>
        <CardDescription>Seleccione la obra e ingrese las cantidades ejecutadas para cada actividad.</CardDescription>
      </CardHeader>
      <CardContent>
          <form onSubmit={handleAvanceSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-end mb-6">
              {allowObraSelection && (
                <div className="space-y-1 flex-grow">
                  <Label htmlFor="obra-selector" className="text-xs font-medium">Obra*</Label>
                  <Select value={selectedObraId} onValueChange={handleObraSelectionChange} required>
                    <SelectTrigger id="obra-selector"><SelectValue placeholder="Seleccionar obra" /></SelectTrigger>
                    <SelectContent>
                      {obras.map((obra) => (<SelectItem key={obra.id} value={obra.id}>{obra.nombreFaena}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              )}
               <div className="space-y-1">
                <Label htmlFor="avance-fecha" className="text-xs font-medium">Fecha de Avance*</Label>
                <Input id="avance-fecha" type="date" value={fechaAvance} onChange={(e) => setFechaAvance(e.target.value)} required />
              </div>
            </div>
            
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
                      {actividadesAMostrar.length > 0 ? actividadesAMostrar.map(act => {
                          const avanceActual = avancesPorActividad[act.id] || { cantidadAcumulada: 0, porcentajeAcumulado: 0 };
                          const cantidadHoy = cantidadesHoy[act.id] || 0;
                          const nuevaCantidadAcumulada = avanceActual.cantidadAcumulada + cantidadHoy;
                          const nuevoPorcentaje = act.cantidad > 0 ? (nuevaCantidadAcumulada / act.cantidad) * 100 : 0;
                          const maxPermitidaHoy = Math.max(0, act.cantidad - avanceActual.cantidadAcumulada);

                          return (
                              <TableRow key={act.id}>
                                  <TableCell className="font-medium text-xs">{act.nombreActividad}</TableCell>
                                  <TableCell className="text-xs">{act.cantidad} {act.unidad}</TableCell>
                                  <TableCell className="text-xs font-semibold">{avanceActual.cantidadAcumulada.toFixed(2)} ({avanceActual.porcentajeAcumulado.toFixed(1)}%)</TableCell>
                                  <TableCell>
                                      <Input type="number" placeholder="0" value={cantidadesHoy[act.id] || ''} onChange={(e) => setCantidadesHoy(prev => ({...prev, [act.id]: Number(e.target.value)}))} className="h-8 text-xs" />
                                       <p className="text-xs text-muted-foreground mt-1">Disponible: {maxPermitidaHoy.toFixed(2)}</p>
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
                      }) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                            No hay actividades programadas para la obra seleccionada.
                          </TableCell>
                        </TableRow>
                      )}
                  </TableBody>
              </Table>
            </div>
             {error && <p className="text-sm font-medium text-destructive">{error}</p>}
             <div className="flex items-center gap-4">
                <Button type="submit" disabled={isSaving || !selectedObraId}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSaving ? 'Guardando...' : 'Registrar Avances del Día'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => {}}>
                    Cancelar
                </Button>
             </div>
          </form>
      </CardContent>
    </Card>
  );
}
