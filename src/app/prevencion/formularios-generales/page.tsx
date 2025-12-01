// src/app/prevencion/formularios-generales/page.tsx
"use client";

import React, { useState, useEffect, FormEvent, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  onSnapshot,
} from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Edit, FileDown, Search, Trash2, Zap } from 'lucide-react';
import { IperForm, IperFormValues } from './components/IperGeneroRow';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableRow, TableHead, TableHeader } from '@/components/ui/table';
import { Dialog, DialogClose, DialogFooter, DialogHeader, DialogTitle, DialogContent, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';
import { ArbolCausas, MetodoAnalisisIncidente, RegistroIncidente } from '@/types/pcg';
import { ArbolCausasEditor } from './components/ArbolCausasEditor';


// --- Tipos y Datos para IPER ---
type ObraPrevencion = {
  id: string;
  nombreFaena: string;
};

export type IPERRegistro = {
  id: string;
  correlativo?: number;
  obraId: string;
  obraNombre?: string;
  // Identificación
  tarea: string;
  zona: string;
  peligro: string;
  riesgo: string;
  categoriaPeligro: string;
  // Evaluación Inherente (con género)
  probabilidad_hombre: number;
  consecuencia_hombre: number;
  nivel_riesgo_hombre: number;
  probabilidad_mujer: number;
  consecuencia_mujer: number;
  nivel_riesgo_mujer: number;
  // Controles
  jerarquiaControl: string; 
  control_especifico_genero: string;
  responsable: string; 
  plazo: string; 
  // Seguimiento
  estadoControl: string; 
  // Riesgo Residual
  probabilidad_residual: number; 
  consecuencia_residual: number; 
  nivel_riesgo_residual: number; 
  // Meta
  usa_componente_genero?: boolean;
  medidasControlExistentes: string;
  medidasControlPropuestas: string;
  responsableImplementacion: string;
  plazoImplementacion: string;
  fecha?: string;
  createdAt?: any;
};

// --- Tipos y Datos para Charlas ---
type CharlaEstado = "borrador" | "realizada" | "programada" | "cancelada";

type Charla = {
    id: string;
    obraId: string;
    obraNombre: string;
    iperId: string;
    titulo: string;
    tipo: "charla_iper" | "charla_induccion";
    fechaCreacion: Timestamp;
    creadaPorUid: string;
    generadaAutomaticamente: boolean;
    tarea: string;
    zonaSector?: string;
    peligro: string;
    riesgo: string;
    probHombres: number;
    consHombres: number;
    nivelHombres: number;
    probMujeres: number;
    consMujeres: number;
    nivelMujeres: number;
    controlGenero: string;
    estado: CharlaEstado;
    contenido: string;
    // Campos de la Etapa 4
    fechaRealizacion?: Timestamp;
    duracionMinutos?: number;
    participantesTexto?: string;
    observaciones?: string;
};

// --- Tipos y Datos para Hallazgos (copiado de hallazgos/page) ---
export type Criticidad = 'baja' | 'media' | 'alta';

export interface Hallazgo {
  id?: string;
  obraId: string;
  createdAt: Timestamp;
  createdBy: string;
  tipoRiesgo: string;
  descripcion: string;
  tipoHallazgoDetalle?: string;
  descripcionLibre?: string;
  accionesInmediatas: string[];
  responsableId: string;
  responsableNombre?: string;
  plazo: string;
  evidenciaUrl: string;
  criticidad: Criticidad;
  estado: 'abierto' | 'en_progreso' | 'cerrado';
  iperActividadId?: string;
  iperRiesgoId?: string;
  planAccionId?: string;
  investigacionId?: string; 
  fichaFirmadaUrl?: string;
  fechaFichaFirmada?: Timestamp;
}

// --- Tipos y Datos para Plan de Acción ---
export type OrigenAccion =
  | "IPER"
  | "INCIDENTE"
  | "OBSERVACION"
  | "hallazgo"
  | "OTRO";

export type EstadoAccion = "Pendiente" | "En progreso" | "Cerrada";

export type RegistroPlanAccion = {
  id: string;
  obraId: string;
  obraNombre?: string;
  origen: OrigenAccion;
  referencia: string; 
  descripcionAccion: string;
  responsable: string;
  plazo: string;
  estado: EstadoAccion;
  avance: string;
  observacionesCierre: string;
  fechaCreacion: string;
  creadoPor: string;
  createdAt?: any;
  hallazgoId?: string;
};

// Tipo para el "prefill"
export type PlanAccionPrefill = {
  obraId: string;
  origen: OrigenAccion;
  referencia: string;
  descripcionSugerida?: string;
} | null;


// --- Componente IPER ---
type IPERFormSectionProps = {
  onCrearAccionDesdeIPER: (payload: {
    obraId: string;
    iperId: string;
    descripcion?: string;
  }) => void;
};

const initialFormIperState: IperFormValues = {
  tarea: "",
  zona: "",
  peligro: "",
  riesgo: "",
  categoriaPeligro: "",
  probabilidadHombre: 3,
  consecuenciaHombre: 3,
  probabilidadMujer: 3,
  consecuenciaMujer: 3,
  jerarquiaControl: "",
  controlEspecificoGenero: "",
  responsable: "",
  plazo: "",
  estadoControl: "PENDIENTE",
  probabilidadResidual: 1,
  consecuenciaResidual: 1,
};

type CharlaPreviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onContinue: (iper: IPERRegistro) => void;
  iper: IPERRegistro | null;
  charlaContent: string;
}

type CharlaAsistenciaModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedData: {
    fechaRealizacion: string;
    duracionMinutos: number;
    participantesTexto: string;
    observaciones: string;
  }) => Promise<void>;
  charla: Charla | null;
};


function buildCharlaContentFromIper(iper: IPERRegistro): string {
  const nivelH = iper.nivel_riesgo_hombre;
  const nivelM = iper.nivel_riesgo_mujer;

  return `Charla de Seguridad – ${iper.riesgo}

1. Contexto de la tarea
La tarea que realizamos es: ${iper.tarea}, en el sector: ${iper.zona}.
En esta actividad se ha identificado el peligro: ${iper.peligro}, cuyo riesgo principal es: ${iper.riesgo}.

2. Evaluación del riesgo
De acuerdo con la matriz IPER de la obra:
- Nivel de riesgo para HOMBRES: ${nivelH}.
- Nivel de riesgo para MUJERES: ${nivelM}.

Esta diferencia responde al enfoque de género exigido por el DS 44, considerando características físicas, ergonómicas y de exposición diferenciadas.

3. Medidas de control
Las medidas de control definidas para este riesgo son:
${iper.control_especifico_genero ? "- " + iper.control_especifico_genero : "- Aplicar las medidas de control establecidas en la IPER de la obra."}

Además, deben respetarse todas las instrucciones del procedimiento de trabajo seguro asociado y utilizar correctamente los EPP indicados.

4. Compromiso de seguridad
Cada trabajador y trabajadora debe:
- Reconocer este riesgo en su puesto de trabajo.
- Aplicar las medidas de control indicadas.
- Informar de inmediato cualquier condición insegura o desvío.

5. Enfoque de género (DS 44)
Recordamos que esta charla incorpora el enfoque de género, por lo que se consideran diferencias en la exposición y en la respuesta al riesgo entre hombres y mujeres, así como situaciones especiales como embarazo y lactancia.
  `.trim();
}


function CharlaPreviewModal({ isOpen, onClose, iper, onContinue, charlaContent }: CharlaPreviewModalProps) {
  if (!iper) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Previsualización de Charla de Seguridad</DialogTitle>
          <DialogDescription>Esta es la información que se usará como base para generar la charla automática.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 overflow-y-auto pr-6 -mr-6">
          <Card>
            <CardHeader>
              <CardTitle>{iper.tarea}</CardTitle>
              <CardDescription>
                <strong>Zona/Sector:</strong> {iper.zona || 'No especificado'} | <strong>Obra:</strong> {iper.obraNombre || 'No especificada'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm font-semibold">Peligro Identificado</p>
                <p className="text-sm text-muted-foreground">{iper.peligro}</p>
              </div>
              <div>
                <p className="text-sm font-semibold">Riesgo Asociado</p>
                <p className="text-sm text-muted-foreground">{iper.riesgo}</p>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Card>
              <CardHeader>
                <CardTitle className="text-base">Evaluación para Hombres</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-3xl font-bold">{iper.nivel_riesgo_hombre}</p>
                <p className="text-xs text-muted-foreground">({iper.probabilidad_hombre} Prob. x {iper.consecuencia_hombre} Cons.)</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Evaluación para Mujeres</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                 <p className="text-3xl font-bold">{iper.nivel_riesgo_mujer}</p>
                <p className="text-xs text-muted-foreground">({iper.probabilidad_mujer} Prob. x {iper.consecuencia_mujer} Cons.)</p>
              </CardContent>
            </Card>
          </div>

          <Card>
             <CardHeader>
               <div className="flex justify-between items-center">
                  <CardTitle className="text-base">Controles Específicos de Género</CardTitle>
                  <Badge variant="secondary">DS 44 – Enfoque de Género</Badge>
               </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{iper.control_especifico_genero || 'No se especifican controles adicionales.'}</p>
              </CardContent>
          </Card>

          <Card>
              <CardHeader>
                <CardTitle className="text-base">Contenido Sugerido de la Charla</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted rounded-md p-3 whitespace-pre-wrap font-sans max-h-60 overflow-y-auto">{charlaContent}</pre>
              </CardContent>
          </Card>

        </div>
        <DialogFooter className="flex-shrink-0">
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          <Button onClick={() => onContinue(iper)}>Continuar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CharlaAsistenciaModal({ isOpen, onClose, onSave, charla }: CharlaAsistenciaModalProps) {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [duracion, setDuracion] = useState(15);
  const [participantes, setParticipantes] = useState('');
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    if (charla) {
        setFecha(charla.fechaRealizacion ? charla.fechaRealizacion.toDate().toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
        setDuracion(charla.duracionMinutos || 15);
        setParticipantes(charla.participantesTexto || '');
        setObservaciones(charla.observaciones || '');
    }
  }, [charla]);


  if (!charla) return null;

  const handleSave = () => {
    onSave({
      fechaRealizacion: fecha,
      duracionMinutos: duracion,
      participantesTexto: participantes,
      observaciones: observaciones,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Asistencia y Realización de Charla</DialogTitle>
          <DialogDescription>{charla.titulo}</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha-realizacion">Fecha de Realización</Label>
              <Input id="fecha-realizacion" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duracion">Duración (minutos)</Label>
              <Input id="duracion" type="number" value={duracion} onChange={e => setDuracion(Number(e.target.value))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="participantes">Participantes (un nombre/RUT por línea)</Label>
            <Textarea id="participantes" value={participantes} onChange={e => setParticipantes(e.target.value)} rows={5} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="observaciones-charla">Observaciones</Label>
            <Textarea id="observaciones-charla" value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar y Marcar como Realizada</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function IPERFormSection({ onCrearAccionDesdeIPER }: IPERFormSectionProps) {
  const [obras, setObras] = useState<ObraPrevencion[]>([]);
  const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>("");
  const [iperRegistros, setIperRegistros] = useState<IPERRegistro[]>([]);
  const [cargandoIper, setCargandoIper] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  
  const [formIPER, setFormIPER] = useState<IperFormValues>(initialFormIperState);
  const [editingIperId, setEditingIperId] = useState<string | null>(null);
  
  const [isCharlaModalOpen, setIsCharlaModalOpen] = useState(false);
  const [selectedIperForCharla, setSelectedIperForCharla] = useState<IPERRegistro | null>(null);
  const [generatedCharlaContent, setGeneratedCharlaContent] = useState('');
  
  const [charlas, setCharlas] = useState<Charla[]>([]);
  const [cargandoCharlas, setCargandoCharlas] = useState(false);
  const [selectedCharla, setSelectedCharla] = useState<Charla | null>(null);
  const [isAsistenciaModalOpen, setIsAsistenciaModalOpen] = useState(false);
  const [filtroCharlas, setFiltroCharlas] = useState('todos');

  const { toast } = useToast();
  const { user, companyId, role } = useAuth();
  
  const handleOpenCharlaModal = (iper: IPERRegistro) => {
    setSelectedIperForCharla(iper);
    setGeneratedCharlaContent(buildCharlaContentFromIper(iper));
    setIsCharlaModalOpen(true);
  };
  
  const handleCreateCharla = async (iper: IPERRegistro) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'Debes estar autenticado para crear una charla.' });
        return;
    }
    const charlaData = {
        obraId: iper.obraId,
        obraNombre: iper.obraNombre || 'N/A',
        iperId: iper.id,
        titulo: `Charla de Seguridad: ${iper.riesgo}`,
        tipo: "charla_iper" as const,
        fechaCreacion: Timestamp.now(),
        creadaPorUid: user.uid,
        generadaAutomaticamente: true,

        tarea: iper.tarea,
        zonaSector: iper.zona,
        peligro: iper.peligro,
        riesgo: iper.riesgo,

        probHombres: iper.probabilidad_hombre,
        consHombres: iper.consecuencia_hombre,
        nivelHombres: iper.nivel_riesgo_hombre,
        probMujeres: iper.probabilidad_mujer,
        consMujeres: iper.consecuencia_mujer,
        nivelMujeres: iper.nivel_riesgo_mujer,

        controlGenero: iper.control_especifico_genero,
        
        contenido: generatedCharlaContent,

        estado: "borrador" as const,
    };

    try {
        await addDoc(collection(firebaseDb, 'charlas'), charlaData);
        setIsCharlaModalOpen(false);
        toast({ title: 'Éxito', description: 'Charla creada como borrador correctamente.' });
    } catch (error) {
        console.error("Error creating charla:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear el borrador de la charla.' });
    }
  };

  useEffect(() => {
    if (!companyId && role !== 'superadmin') return;

    const cargarObras = async () => {
        try {
            let q;
            if (role === 'superadmin') {
                q = query(collection(firebaseDb, "obras"), orderBy("nombreFaena"));
            } else {
                q = query(collection(firebaseDb, "obras"), where("empresaId", "==", companyId), orderBy("nombreFaena"));
            }
            const querySnapshot = await getDocs(q);
            const data: ObraPrevencion[] = querySnapshot.docs.map(doc => ({
                id: doc.id,
                nombreFaena: doc.data().nombreFaena
            } as ObraPrevencion));
            setObras(data);
            if (data.length > 0 && !obraSeleccionadaId) {
                setObraSeleccionadaId(data[0].id);
            }
        } catch (err) {
            console.error("Error al cargar obras: ", err);
        }
    };
    cargarObras();
  }, [companyId, role]);

  const cargarIperDeObra = async (obraId: string) => {
    if (!obraId) {
        setIperRegistros([]);
        return;
    }
    setCargandoIper(true);
    try {
        const q = query(
            collection(firebaseDb, "obras", obraId, "iper"),
            orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        const data: IPERRegistro[] = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as IPERRegistro));
        setIperRegistros(data);
    } catch (err) {
        console.error("Error al cargar registros IPER: ", err);
        setErrorForm("No se pudieron cargar los registros IPER.");
    } finally {
        setCargandoIper(false);
    }
  };

  useEffect(() => {
    if (obraSeleccionadaId) {
      cargarIperDeObra(obraSeleccionadaId);
      
      setCargandoCharlas(true);
      const qCharlas = query(collection(firebaseDb, "charlas"), where("obraId", "==", obraSeleccionadaId), orderBy("fechaCreacion", "desc"));
      const unsubscribe = onSnapshot(qCharlas, (snapshot) => {
        const charlasData = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as Charla));
        setCharlas(charlasData);
        setCargandoCharlas(false);
      }, (error) => {
        console.error("Error fetching charlas:", error);
        setCargandoCharlas(false);
      });

      return () => unsubscribe();
    }
  }, [obraSeleccionadaId]);
  
  const handleSaveAsistencia = async (data: { fechaRealizacion: string, duracionMinutos: number, participantesTexto: string, observaciones: string }) => {
    if (!selectedCharla) return;
    try {
      const charlaRef = doc(firebaseDb, "charlas", selectedCharla.id);
      await updateDoc(charlaRef, {
        estado: "realizada",
        fechaRealizacion: Timestamp.fromDate(new Date(data.fechaRealizacion)),
        duracionMinutos: data.duracionMinutos,
        participantesTexto: data.participantesTexto,
        observaciones: data.observaciones,
      });
      toast({ title: "Éxito", description: "Charla registrada como realizada." });
      setIsAsistenciaModalOpen(false);
      setSelectedCharla(null);
    } catch (error) {
      console.error("Error updating charla:", error);
      toast({ variant: 'destructive', title: "Error", description: "No se pudo actualizar la charla." });
    }
  };

  const handleDeleteCharla = async (charlaId: string) => {
    try {
        await deleteDoc(doc(firebaseDb, "charlas", charlaId));
        toast({ title: 'Charla eliminada', description: 'El borrador de la charla ha sido eliminado.' });
    } catch (error) {
        console.error("Error deleting charla:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la charla.' });
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm(null);

    if (!obraSeleccionadaId) {
      setErrorForm("Debe seleccionar una obra.");
      return;
    }
    if (!formIPER.tarea.trim() || !formIPER.peligro.trim() || !formIPER.riesgo.trim() || !formIPER.zona.trim()) {
      setErrorForm("Los campos 'Tarea', 'Peligro', 'Riesgo' y 'Zona' son obligatorios.");
      return;
    }
    
    const obraSeleccionada = obras.find(o => o.id === obraSeleccionadaId);
    const dataToSave = {
        obraId: obraSeleccionadaId,
        obraNombre: obraSeleccionada?.nombreFaena ?? "N/A",
        tarea: formIPER.tarea,
        zona: formIPER.zona,
        peligro: formIPER.peligro === 'Otro' ? formIPER.peligroOtro || '' : formIPER.peligro,
        riesgo: formIPER.riesgo === 'Otro' ? formIPER.riesgoOtro || '' : formIPER.riesgo,
        categoriaPeligro: formIPER.categoriaPeligro,
        probabilidad_hombre: formIPER.probabilidadHombre,
        consecuencia_hombre: formIPER.consecuenciaHombre,
        nivel_riesgo_hombre: formIPER.probabilidadHombre * formIPER.consecuenciaHombre,
        probabilidad_mujer: formIPER.probabilidadMujer,
        consecuencia_mujer: formIPER.consecuenciaMujer,
        nivel_riesgo_mujer: formIPER.probabilidadMujer * formIPER.consecuenciaMujer,
        jerarquiaControl: formIPER.jerarquiaControl,
        control_especifico_genero: formIPER.controlEspecificoGenero === 'Otro' ? formIPER.controlEspecificoGeneroOtro || '' : formIPER.controlEspecificoGenero,
        responsable: formIPER.responsable,
        plazo: formIPER.plazo,
        estadoControl: formIPER.estadoControl,
        probabilidad_residual: formIPER.probabilidadResidual,
        consecuencia_residual: formIPER.consecuenciaResidual,
        nivel_riesgo_residual: formIPER.probabilidadResidual * formIPER.consecuenciaResidual,
        usa_componente_genero: true,
        medidasControlExistentes: '',
        medidasControlPropuestas: '',
        responsableImplementacion: '',
        plazoImplementacion: '',
    };


    try {
      if (editingIperId) {
        const docRef = doc(firebaseDb, "obras", obraSeleccionadaId, "iper", editingIperId);
        await updateDoc(docRef, {...dataToSave, updatedAt: serverTimestamp()});
        setIperRegistros(prev => prev.map(iper => iper.id === editingIperId ? { ...iper, ...dataToSave } : iper));
      } else {
        const maxCorrelativo = iperRegistros.reduce((max, iper) => Math.max(iper.correlativo || 0, max), 0);
        const nuevoCorrelativo = maxCorrelativo + 1;
        
        const colRef = collection(firebaseDb, "obras", obraSeleccionadaId, "iper");
        await addDoc(colRef, { ...dataToSave, correlativo: nuevoCorrelativo, createdAt: serverTimestamp() });
        cargarIperDeObra(obraSeleccionadaId); 
      }
        
      setFormIPER(initialFormIperState);
      setEditingIperId(null);
      
    } catch (error) {
        console.error("Error al guardar el registro IPER:", error);
        setErrorForm("No se pudo guardar el registro. Intente de nuevo.");
    }
  };
  
  const handleEditIper = (iper: IPERRegistro) => {
    setEditingIperId(iper.id);
    setFormIPER({
        tarea: iper.tarea,
        zona: iper.zona || '',
        peligro: iper.peligro,
        riesgo: iper.riesgo,
        categoriaPeligro: iper.categoriaPeligro || '',
        probabilidadHombre: iper.probabilidad_hombre,
        consecuenciaHombre: iper.consecuencia_hombre,
        probabilidadMujer: iper.probabilidad_mujer,
        consecuenciaMujer: iper.consecuencia_mujer,
        jerarquiaControl: iper.jerarquiaControl || '',
        controlEspecificoGenero: iper.control_especifico_genero,
        responsable: iper.responsable || '',
        plazo: iper.plazo || '',
        estadoControl: iper.estadoControl || 'PENDIENTE',
        probabilidadResidual: iper.probabilidad_residual || 1,
        consecuenciaResidual: iper.consecuencia_residual || 1,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleDeleteIper = async (iperId: string) => {
    if (!obraSeleccionadaId) return;
    try {
      const docRef = doc(firebaseDb, "obras", obraSeleccionadaId, "iper", iperId);
      await deleteDoc(docRef);
      setIperRegistros(prev => prev.filter(iper => iper.id !== iperId));
    } catch (error) {
      console.error("Error al eliminar el registro IPER:", error);
      setErrorForm("No se pudo eliminar el registro. Intente de nuevo.");
    }
  };

  const charlasFiltradas = useMemo(() => {
    return charlas.filter(charla => {
        if (filtroCharlas === 'todos') return true;
        return charla.estado === filtroCharlas;
    });
  }, [charlas, filtroCharlas]);

  return (
    <>
      <Card className="mt-6 no-print">
        <CardHeader>
          <CardTitle>IPER / Matriz de Riesgos por Actividad</CardTitle>
          <CardDescription>
            Identifique peligros, evalúe riesgos y proponga medidas de control para las actividades de la obra.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="max-w-xs space-y-2">
              <Label htmlFor="obra-select-iper">Obra / Faena</Label>
              <Select value={obraSeleccionadaId} onValueChange={setObraSeleccionadaId}>
                <SelectTrigger id="obra-select-iper">
                  <SelectValue placeholder="Seleccione una obra" />
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">{editingIperId ? "Editando Registro IPER" : "Agregar Nuevo Registro IPER"}</h3>
              {errorForm && <p className="text-sm font-medium text-destructive">{errorForm}</p>}
              
              <IperForm value={formIPER} onChange={setFormIPER} />

              <div className="flex gap-2">
                <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">
                  {editingIperId ? "Actualizar Registro" : "Agregar a Matriz IPER"}
                </Button>
                {editingIperId && (
                  <Button variant="ghost" onClick={() => { setEditingIperId(null); setFormIPER(initialFormIperState); }}>
                    Cancelar Edición
                  </Button>
                )}
              </div>
            </form>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold border-b pb-2">Registros IPER de la Obra</h3>
              {cargandoIper ? (<p className="text-sm text-muted-foreground pt-4 text-center">Cargando registros IPER...</p>)
              : (
                <>
                  {iperRegistros.length === 0 ? (
                    <p className="text-sm text-muted-foreground pt-4 text-center">
                      No hay registros IPER para esta obra aún.
                    </p>
                  ) : (
                    <div className="max-h-[600px] overflow-y-auto space-y-3 pr-2">
                      {iperRegistros.map((r) => (
                        <article key={r.id} className="rounded-lg border bg-card p-4 shadow-sm space-y-2 text-sm">
                          <p className="font-semibold text-primary">{r.correlativo ? `IPER-${String(r.correlativo).padStart(3, '0')}: ` : ''}{r.tarea}</p>
                          <p className="text-xs"><strong className="text-muted-foreground">Zona:</strong> {r.zona}</p>
                          <p><strong className="text-muted-foreground">Peligro:</strong> {r.peligro}</p>
                          <p><strong className="text-muted-foreground">Riesgo:</strong> {r.riesgo}</p>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="p-2 rounded bg-blue-50 text-blue-800">
                                  <strong>Riesgo Hombres:</strong> {r.nivel_riesgo_hombre}
                              </div>
                              <div className="p-2 rounded bg-pink-50 text-pink-800">
                                  <strong>Riesgo Mujeres:</strong> {r.nivel_riesgo_mujer}
                              </div>
                          </div>
                          
                          <p className="text-xs"><strong className="text-muted-foreground">Control por Género:</strong> {r.control_especifico_genero}</p>
    
                          <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t">
                            <Button type="button" onClick={() => handleOpenCharlaModal(r)} variant="default" size="sm"><Zap className="mr-2 h-4 w-4" />Generar charla</Button>
                            <Button type="button" onClick={() => onCrearAccionDesdeIPER({ obraId: r.obraId, iperId: r.id, descripcion: `Acción sobre riesgo: ${r.peligro} – ${r.tarea}`})} variant="outline" size="sm">Crear acción</Button>
                            <Button asChild variant="outline" size="sm" type="button">
                                <Link href={`/prevencion/formularios-generales/iper/${r.id}/imprimir`} target="_blank">
                                    Imprimir Ficha
                                </Link>
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleEditIper(r)}><Edit className="h-4 w-4 mr-1"/> Editar</Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4 mr-1"/> Eliminar</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                                        <AlertDialogDescription>Esta acción eliminará permanentemente el registro IPER para la tarea "{r.tarea}". No se puede deshacer.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteIper(r.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="mt-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Charlas de Seguridad de la Obra</CardTitle>
              <CardDescription>
                Listado de charlas generadas. Desde aquí puedes registrar su realización.
              </CardDescription>
            </div>
            <Button variant="outline" asChild>
                <Link href={`/prevencion/formularios-generales/charlas/imprimir-listado?obraId=${obraSeleccionadaId}&estado=${filtroCharlas}`} target="_blank">
                    <FileDown className="mr-2 h-4 w-4" />
                    Exportar Listado
                </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
            <div className="mb-4 max-w-xs">
                <Label>Filtrar por estado</Label>
                <Select value={filtroCharlas} onValueChange={setFiltroCharlas}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="borrador">Borrador</SelectItem>
                        <SelectItem value="realizada">Realizada</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          {cargandoCharlas ? (
            <p className="text-sm text-muted-foreground text-center py-4">Cargando charlas...</p>
          ) : charlas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No hay charlas generadas para esta obra. Crea una desde un registro IPER.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título de la Charla</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Ref. IPER</TableHead>
                  <TableHead>Fecha Creación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {charlasFiltradas.map(charla => (
                  <TableRow key={charla.id}>
                    <TableCell className="font-medium">{charla.titulo}</TableCell>
                    <TableCell>
                      <Badge variant={charla.estado === 'borrador' ? 'secondary' : 'default'}>{charla.estado}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{charla.iperId.substring(0, 8)}...</TableCell>
                    <TableCell>{charla.fechaCreacion.toDate().toLocaleDateString('es-CL')}</TableCell>
                    <TableCell className="text-right">
                       <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="outline" onClick={() => { setSelectedCharla(charla); setIsAsistenciaModalOpen(true); }}>
                                {charla.estado === 'borrador' ? 'Registrar Asistencia' : 'Editar Registro'}
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive h-9 w-9">
                                        <Trash2 className="h-4 w-4"/>
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Eliminar esta charla?</AlertDialogTitle>
                                        <AlertDialogDescription>Esta acción eliminará el registro de la charla "{charla.titulo}".</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteCharla(charla.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                       </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CharlaPreviewModal iper={selectedIperForCharla} isOpen={isCharlaModalOpen} onClose={() => setIsCharlaModalOpen(false)} onContinue={handleCreateCharla} charlaContent={generatedCharlaContent} />
      <CharlaAsistenciaModal charla={selectedCharla} isOpen={isAsistenciaModalOpen} onClose={() => setIsAsistenciaModalOpen(false)} onSave={handleSaveAsistencia} />
    </>
  );
}

// --- Componente Investigación de Incidentes ---
type InvestigacionIncidenteSectionProps = {
  onCrearAccionDesdeIncidente: (payload: {
    obraId: string;
    incidenteId: string;
    descripcion?: string;
  }) => void;
};

function InvestigacionIncidenteSection({ onCrearAccionDesdeIncidente }: InvestigacionIncidenteSectionProps) {
  const [obras, setObras] = useState<ObraPrevencion[]>([]);
  const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>("");

  const [registrosIncidentes, setRegistrosIncidentes] =
    useState<RegistroIncidente[]>([]);
    
  const [cargandoIncidentes, setCargandoIncidentes] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const [formIncidente, setFormIncidente] = useState<Omit<RegistroIncidente, 'id' | 'obraId' | 'obraNombre' | 'createdAt'>>({
    fecha: new Date().toISOString().slice(0, 10),
    lugar: "",
    tipoIncidente: "Casi accidente",
    gravedad: "Leve",
    descripcionHecho: "",
    lesionPersona: "",
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
  });
  
  const { companyId, role } = useAuth();
  
  const isAccident = useMemo(() => 
    formIncidente.tipoIncidente.includes("Accidente"),
    [formIncidente.tipoIncidente]
  );

  useEffect(() => {
    setFormIncidente(prev => ({
      ...prev,
      metodoAnalisis: isAccident ? 'arbol_causas' : 'ishikawa_5p'
    }));
  }, [isAccident]);

  const cargarObras = async () => {
    try {
        let q;
        if (role === 'superadmin') {
            q = query(collection(firebaseDb, "obras"), orderBy("nombreFaena"));
        } else {
            q = query(collection(firebaseDb, "obras"), where("empresaId", "==", companyId), orderBy("nombreFaena"));
        }
        const querySnapshot = await getDocs(q);
        const data: ObraPrevencion[] = querySnapshot.docs.map(doc => ({
            id: doc.id,
            nombreFaena: doc.data().nombreFaena
        } as ObraPrevencion));
        setObras(data);
        if (data.length > 0 && !obraSeleccionadaId) {
          setObraSeleccionadaId(data[0].id);
        }
    } catch (err) {
        console.error("Error al cargar obras: ", err);
    }
  }

  const cargarIncidentes = async (obraId: string) => {
    if (!obraId) {
      setRegistrosIncidentes([]);
      return;
    }
    setCargandoIncidentes(true);
    try {
      const q = query(
        collection(firebaseDb, "investigacionesIncidentes"),
        where("obraId", "==", obraId),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const data: RegistroIncidente[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any),
      }));
      setRegistrosIncidentes(data);
    } catch (err) {
      console.error("Error cargando incidentes:", err);
      setErrorForm("No se pudieron cargar los registros de incidentes.");
    } finally {
      setCargandoIncidentes(false);
    }
  };

  useEffect(() => {
    if (companyId || role === 'superadmin') {
      cargarObras();
    }
  }, [companyId, role]);

  useEffect(() => {
    if (obraSeleccionadaId) {
      cargarIncidentes(obraSeleccionadaId);
    }
  }, [obraSeleccionadaId]);
  
  const handleInputChange = <K extends keyof typeof formIncidente>(campo: K, valor: (typeof formIncidente)[K]) => {
    setFormIncidente(prev => ({ ...prev, [campo]: valor }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm(null);

    if (!obraSeleccionadaId) {
      setErrorForm("Debes seleccionar una obra.");
      return;
    }
    if (!formIncidente.fecha) {
      setErrorForm("Debes indicar la fecha del incidente.");
      return;
    }
    if (!formIncidente.descripcionHecho.trim()) {
      setErrorForm("Debes describir el hecho.");
      return;
    }
    
    const obraSeleccionada = obras.find(o => o.id === obraSeleccionadaId);
    const dataToSave = {
        ...formIncidente,
        obraId: obraSeleccionadaId,
        obraNombre: obraSeleccionada?.nombreFaena ?? "N/A",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    // No guardar el árbol de causas si el método no corresponde
    if(formIncidente.metodoAnalisis !== 'arbol_causas'){
        delete (dataToSave as any).arbolCausas;
    }

    try {
        await addDoc(collection(firebaseDb, "investigacionesIncidentes"), dataToSave);

        setFormIncidente((prev) => ({
            ...prev,
            lugar: "",
            descripcionHecho: "",
            lesionPersona: "",
            actoInseguro: "",
            condicionInsegura: "",
            causasInmediatas: "",
            causasBasicas: "",
            analisisIshikawa: "",
            analisis5Porques: "",
            medidasCorrectivas: "",
            responsableSeguimiento: "",
            plazoCierre: "",
            arbolCausas: undefined,
        }));

        cargarIncidentes(obraSeleccionadaId);

    } catch (error) {
        console.error("Error guardando incidente:", error);
        setErrorForm("No se pudo guardar el incidente. Intente de nuevo.");
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Investigación de incidente / casi accidente</CardTitle>
        <CardDescription>
          Registro de incidentes, investigación de causas (Ishikawa, 5 Porqués, Árbol de Causas) y plan de acción.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
         <div className="max-w-xs space-y-2">
          <Label htmlFor="obra-select-incidente">Obra / Faena</Label>
          <Select value={obraSeleccionadaId} onValueChange={setObraSeleccionadaId}>
            <SelectTrigger id="obra-select-incidente">
              <SelectValue placeholder="Seleccione una obra" />
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

      <div className="grid gap-8 md:grid-cols-2">
        <form
          className="space-y-4"
          onSubmit={handleSubmit}
        >
          <h3 className="text-lg font-semibold border-b pb-2">Registrar Nuevo Incidente/Accidente</h3>
          {errorForm && (
            <p className="text-sm font-medium text-destructive">{errorForm}</p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Fecha del suceso*</Label><Input type="date" value={formIncidente.fecha} onChange={e => handleInputChange('fecha', e.target.value)} /></div>
            <div className="space-y-2"><Label>Lugar del suceso</Label><Input value={formIncidente.lugar} onChange={e => handleInputChange('lugar', e.target.value)} /></div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
               <div className="space-y-2"><Label>Tipo de suceso*</Label>
                  <Select value={formIncidente.tipoIncidente} onValueChange={v => handleInputChange('tipoIncidente', v as any)}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Accidente con tiempo perdido">Accidente con tiempo perdido</SelectItem>
                          <SelectItem value="Accidente sin tiempo perdido">Accidente sin tiempo perdido</SelectItem>
                          <SelectItem value="Casi accidente">Casi accidente</SelectItem>
                          <SelectItem value="Daño a la propiedad">Daño a la propiedad</SelectItem>
                      </SelectContent>
                  </Select>
               </div>
               <div className="space-y-2"><Label>Gravedad</Label>
                  <Select value={formIncidente.gravedad} onValueChange={v => handleInputChange('gravedad', v as any)}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Leve">Leve</SelectItem>
                          <SelectItem value="Grave">Grave</SelectItem>
                          <SelectItem value="Fatal potencial">Fatal potencial</SelectItem>
                      </SelectContent>
                  </Select>
               </div>
          </div>
          <div className="space-y-2"><Label>Descripción del hecho*</Label><Textarea value={formIncidente.descripcionHecho} onChange={e => handleInputChange('descripcionHecho', e.target.value)} /></div>
          <div className="space-y-2"><Label>Lesión a la persona</Label><Input value={formIncidente.lesionPersona} onChange={e => handleInputChange('lesionPersona', e.target.value)} placeholder="Ej: Esguince tobillo, No aplica..." /></div>
          
           <Separator className="my-4"/>
           <h4 className="text-md font-semibold">Análisis de Causas</h4>
           <div className="space-y-2">
            <Label>Método de Análisis</Label>
            <Input value={isAccident ? "Árbol de Causas" : "Ishikawa / 5 Porqués"} disabled />
           </div>

            {isAccident ? (
                 <ArbolCausasEditor 
                    value={formIncidente.arbolCausas} 
                    onChange={arbol => handleInputChange('arbolCausas', arbol)} 
                />
            ) : (
                <>
                    <div className="space-y-2"><Label>Análisis Ishikawa (resumen)</Label><Textarea value={formIncidente.analisisIshikawa} onChange={e => handleInputChange('analisisIshikawa', e.target.value)} rows={2}/></div>
                    <div className="space-y-2"><Label>Análisis 5 porqués (resumen)</Label><Textarea value={formIncidente.analisis5Porques} onChange={e => handleInputChange('analisis5Porques', e.target.value)} rows={2}/></div>
                </>
            )}

            <Separator className="my-4"/>

          <div className="space-y-2"><Label>Medidas correctivas</Label><Textarea value={formIncidente.medidasCorrectivas} onChange={e => handleInputChange('medidasCorrectivas', e.target.value)} rows={3}/></div>
          <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Responsable seguimiento</Label><Input value={formIncidente.responsableSeguimiento} onChange={e => handleInputChange('responsableSeguimiento', e.target.value)} /></div>
              <div className="space-y-2"><Label>Plazo de cierre</Label><Input type="date" value={formIncidente.plazoCierre} onChange={e => handleInputChange('plazoCierre', e.target.value)} /></div>
          </div>
           <div className="space-y-2"><Label>Estado del cierre</Label>
              <Select value={formIncidente.estadoCierre} onValueChange={v => handleInputChange('estadoCierre', v as any)}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="Abierto">Abierto</SelectItem>
                      <SelectItem value="En seguimiento">En seguimiento</SelectItem>
                      <SelectItem value="Cerrado">Cerrado</SelectItem>
                  </SelectContent>
              </Select>
           </div>

          <Button type="submit" className="w-full sm:w-auto">Registrar</Button>
        </form>

        <div className="space-y-2">
          <h4 className="text-lg font-semibold border-b pb-2">Investigaciones Registradas</h4>
          {cargandoIncidentes ? <p className="text-sm text-muted-foreground pt-4 text-center">Cargando...</p> : 
          registrosIncidentes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center pt-8">
              No hay investigaciones para esta obra.
            </p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {registrosIncidentes.map((inc) => (
                <article
                  key={inc.id}
                  className="rounded-lg border bg-card p-3 shadow-sm text-sm space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <p className="font-semibold text-primary">
                      {inc.fecha} – {inc.lugar || "Sin lugar"}
                    </p>
                     <Badge variant="outline">{inc.metodoAnalisis === 'arbol_causas' ? "Árbol de Causas" : "Ishikawa / 5 Porqués"}</Badge>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                      <span>Tipo: {inc.tipoIncidente}</span>
                      <span>Gravedad: {inc.gravedad}</span>
                      <span>Estado: <span className="font-semibold">{inc.estadoCierre}</span></span>
                  </div>
                  <p><strong className="text-muted-foreground">Hecho:</strong> {inc.descripcionHecho}</p>
                  
                  <div className="text-xs pt-2 border-t mt-2 flex justify-between">
                    <span><strong className="text-muted-foreground">Responsable:</strong> {inc.responsableSeguimiento || "N/A"}</span>
                    <span><strong className="text-muted-foreground">Plazo:</strong> {inc.plazoCierre || "N/A"}</span>
                  </div>
                  <Button
                    type="button"
                    onClick={() =>
                      onCrearAccionDesdeIncidente({
                        obraId: inc.obraId,
                        incidenteId: inc.id,
                        descripcion: `Acción por incidente: ${inc.descripcionHecho}`,
                      })
                    }
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    Crear plan de acción
                  </Button>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
      </CardContent>
    </Card>
  );
}

// --- Componente Plan de Acción ---
type PlanAccionSectionProps = {
  prefill: PlanAccionPrefill;
  onPrefillConsumido: () => void;
};

function PlanAccionSection({ prefill, onPrefillConsumido }: PlanAccionSectionProps) {
    const [obras, setObras] = useState<ObraPrevencion[]>([]);
    const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>("");

    const [planesAccion, setPlanesAccion] = useState<RegistroPlanAccion[]>([]);
    const [cargandoPlanes, setCargandoPlanes] = useState(false);
    const [errorForm, setErrorForm] = useState<string | null>(null);

    const [formAccion, setFormAccion] = useState<{
        origen: OrigenAccion;
        referencia: string;
        descripcionAccion: string;
        responsable: string;
        plazo: string;
        estado: EstadoAccion;
        avance: string;
        observacionesCierre: string;
        creadoPor: string;
    }>({
        origen: "IPER",
        referencia: "",
        descripcionAccion: "",
        responsable: "",
        plazo: "",
        estado: "Pendiente",
        avance: "",
        observacionesCierre: "",
        creadoPor: "",
    });
    
    const router = useRouter();
    const searchParams = useSearchParams();
    const { companyId, role } = useAuth();

    const cargarObras = async () => {
      try {
          let q;
          if (role === 'superadmin') {
              q = query(collection(firebaseDb, "obras"), orderBy("nombreFaena"));
          } else {
              q = query(collection(firebaseDb, "obras"), where("empresaId", "==", companyId), orderBy("nombreFaena"));
          }
          const querySnapshot = await getDocs(q);
          const data: ObraPrevencion[] = querySnapshot.docs.map(doc => ({
              id: doc.id,
              nombreFaena: doc.data().nombreFaena
          } as ObraPrevencion));
          setObras(data);
          
          const obraIdFromQuery = searchParams.get('obraId');
          if (obraIdFromQuery && data.some(o => o.id === obraIdFromQuery)) {
            setObraSeleccionadaId(obraIdFromQuery);
          } else if (data.length > 0 && !obraSeleccionadaId) {
            setObraSeleccionadaId(data[0].id);
          }
      } catch (err) {
          console.error("Error al cargar obras: ", err);
      }
    }

    const cargarPlanesAccion = async (obraId: string) => {
        if (!obraId) {
          setPlanesAccion([]);
          return;
        }
        setCargandoPlanes(true);
        try {
          const q = query(
            collection(firebaseDb, "planesAccion"),
            where("obraId", "==", obraId),
            orderBy("createdAt", "desc")
          );
          const querySnapshot = await getDocs(q);
          const data: RegistroPlanAccion[] = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as any),
          }));
          setPlanesAccion(data);
        } catch (err) {
          console.error("Error cargando planes de acción:", err);
          setErrorForm("No se pudieron cargar los planes de acción.");
        } finally {
          setCargandoPlanes(false);
        }
    };
    
    useEffect(() => {
        if (companyId || role === 'superadmin') {
            cargarObras();
        }
    }, [companyId, role]);

    useEffect(() => {
      if (obraSeleccionadaId) {
        cargarPlanesAccion(obraSeleccionadaId);
      }
    }, [obraSeleccionadaId]);

    useEffect(() => {
        if (prefill && prefill.obraId) {
            setObraSeleccionadaId(prefill.obraId);
            setFormAccion((prev) => ({
            ...prev,
            origen: prefill.origen,
            referencia: prefill.referencia,
            descripcionAccion:
                prev.descripcionAccion || prefill.descripcionSugerida || "",
            }));

            onPrefillConsumido();
        }
    }, [prefill, onPrefillConsumido]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorForm(null);

        if (!obraSeleccionadaId) {
            setErrorForm("Debes seleccionar una obra.");
            return;
        }
        if (!formAccion.descripcionAccion.trim()) {
            setErrorForm("Debes describir la acción a implementar.");
            return;
        }
        if (!formAccion.responsable.trim()) {
            setErrorForm("Debes asignar un responsable.");
            return;
        }

        const obraSeleccionada = obras.find(o => o.id === obraSeleccionadaId);

        try {
            await addDoc(collection(firebaseDb, "planesAccion"), {
                ...formAccion,
                obraId: obraSeleccionadaId,
                obraNombre: obraSeleccionada?.nombreFaena ?? "N/A",
                fechaCreacion: new Date().toISOString().slice(0, 10),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            setFormAccion((prev) => ({
                ...prev,
                referencia: "",
                descripcionAccion: "",
                responsable: "",
                plazo: "",
                avance: "",
                observacionesCierre: "",
                creadoPor: "",
            }));

            cargarPlanesAccion(obraSeleccionadaId);
        } catch(error) {
            console.error("Error al guardar el plan de acción:", error);
            setErrorForm("No se pudo guardar el plan de acción. Intente de nuevo.");
        }
    };

    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle>Plan de acción y seguimiento</CardTitle>
                <CardDescription>
                    Define y gestiona acciones correctivas y preventivas asociadas a IPER,
                    incidentes u otras observaciones de seguridad. Datos conectados a Firestore.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="max-w-xs space-y-2">
                    <Label htmlFor="obra-select-plan">Obra / faena</Label>
                    <Select value={obraSeleccionadaId} onValueChange={setObraSeleccionadaId}>
                        <SelectTrigger id="obra-select-plan"><SelectValue placeholder="Seleccione una obra"/></SelectTrigger>
                        <SelectContent>
                            {obras.map((obra) => (
                                <SelectItem key={obra.id} value={obra.id}>
                                    {obra.nombreFaena}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-8 md:grid-cols-2">
                    <form
                        className="space-y-4"
                        onSubmit={handleSubmit}
                    >
                        <h3 className="text-lg font-semibold border-b pb-2">Registrar Nueva Acción</h3>
                        {errorForm && <p className="text-sm font-medium text-destructive">{errorForm}</p>}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-2">
                                <Label>Origen de la Acción</Label>
                                <Select value={formAccion.origen} onValueChange={v => setFormAccion(p => ({...p, origen: v as OrigenAccion}))}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="IPER">IPER / Matriz de Riesgo</SelectItem>
                                        <SelectItem value="INCIDENTE">Investigación de Incidente</SelectItem>
                                        <SelectItem value="hallazgo">Hallazgo en Terreno</SelectItem>
                                        <SelectItem value="OBSERVACION">Observación de Seguridad</SelectItem>
                                        <SelectItem value="OTRO">Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                           </div>
                            <div className="space-y-2">
                                <Label>Referencia (ID Origen)</Label>
                                <Input value={formAccion.referencia} onChange={e => setFormAccion(p => ({...p, referencia: e.target.value}))}/>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Descripción de la Acción*</Label>
                            <Textarea value={formAccion.descripcionAccion} onChange={e => setFormAccion(p => ({...p, descripcionAccion: e.target.value}))} />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Responsable*</Label>
                                <Input value={formAccion.responsable} onChange={e => setFormAccion(p => ({...p, responsable: e.target.value}))}/>
                            </div>
                             <div className="space-y-2">
                                <Label>Plazo</Label>
                                <Input type="date" value={formAccion.plazo} onChange={e => setFormAccion(p => ({...p, plazo: e.target.value}))}/>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Estado de la Acción</Label>
                            <Select value={formAccion.estado} onValueChange={v => setFormAccion(p => ({...p, estado: v as EstadoAccion}))}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                                    <SelectItem value="En progreso">En progreso</SelectItem>
                                    <SelectItem value="Cerrada">Cerrada</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Avance / Comentarios</Label>
                            <Textarea value={formAccion.avance} onChange={e => setFormAccion(p => ({...p, avance: e.target.value}))} rows={2} />
                        </div>

                         <div className="space-y-2">
                            <Label>Observaciones de Cierre</Label>
                            <Textarea value={formAccion.observacionesCierre} onChange={e => setFormAccion(p => ({...p, observacionesCierre: e.target.value}))} rows={2} />
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Creado Por</Label>
                            <Input value={formAccion.creadoPor} onChange={e => setFormAccion(p => ({...p, creadoPor: e.target.value}))}/>
                        </div>

                        <Button type="submit">Registrar Acción</Button>
                    </form>
                    
                    <div className="space-y-2">
                        <h4 className="text-lg font-semibold border-b pb-2">Acciones Registradas en la Obra</h4>
                        {cargandoPlanes ? <p className="text-sm text-muted-foreground pt-4 text-center">Cargando planes de acción...</p> :
                        planesAccion.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center pt-8">
                                No hay acciones registradas para esta obra.
                            </p>
                        ) : (
                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                                {planesAccion.map((p) => (
                                    <article
                                        key={p.id}
                                        className="rounded-lg border bg-card p-3 shadow-sm text-sm space-y-2"
                                    >
                                        <p className="font-semibold">
                                            {p.descripcionAccion}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Origen:{" "}
                                            {p.origen}
                                            {p.referencia && ` · Ref: ${p.referencia}`}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Responsable: {p.responsable || "No asignado"} · Plazo:{" "}
                                            {p.plazo || "Sin plazo"}
                                        </p>
                                        <p className="font-medium">
                                            Estado: {p.estado}
                                        </p>
                                        {p.avance && (
                                            <p className="text-xs">Avance: {p.avance}</p>
                                        )}
                                        {p.observacionesCierre && (
                                            <p className="text-xs">
                                                Cierre: {p.observacionesCierre}
                                            </p>
                                        )}
                                         <Button asChild variant="outline" size="sm" className="mt-2">
                                            <Link href={`/prevencion/formularios-generales/plan-accion/${p.id}/imprimir`}>
                                            Ver / Imprimir Plan
                                            </Link>
                                        </Button>
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function HallazgosSection() {
    const router = useRouter();
    const { toast } = useToast();
    const { companyId, role } = useAuth();
    const [obras, setObras] = useState<ObraPrevencion[]>([]);
    const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>("");
    const [hallazgos, setHallazgos] = useState<Hallazgo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchObras = async () => {
            if (!companyId && role !== 'superadmin') return;
            setLoading(true);
            try {
                let q;
                if (role === 'superadmin') {
                    q = query(collection(firebaseDb, "obras"), orderBy("nombreFaena"));
                } else {
                    q = query(collection(firebaseDb, "obras"), where("empresaId", "==", companyId), orderBy("nombreFaena"));
                }
                const snapshot = await getDocs(q);
                const obrasData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ObraPrevencion));
                setObras(obrasData);
                if (obrasData.length > 0 && !obraSeleccionadaId) {
                    setObraSeleccionadaId(obrasData[0].id);
                }
            } catch (error) {
                console.error("Error fetching obras in HallazgosSection:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las obras.' });
            } finally {
                setLoading(false);
            }
        };
        fetchObras();
    }, [companyId, role]);

    useEffect(() => {
        if (!obraSeleccionadaId) {
            setHallazgos([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const q = query(collection(firebaseDb, "hallazgos"), where("obraId", "==", obraSeleccionadaId), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const hallazgosList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hallazgo));
            setHallazgos(hallazgosList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching hallazgos:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [obraSeleccionadaId]);
    
    const handleCerrarHallazgo = async (hallazgoId: string) => {
        if (!hallazgoId) return;
        try {
            const hallazgoRef = doc(firebaseDb, "hallazgos", hallazgoId);
            await updateDoc(hallazgoRef, { estado: 'cerrado' });
            toast({ title: 'Hallazgo cerrado', description: 'El estado del hallazgo ha sido actualizado.' });
        } catch (error) {
            console.error("Error al cerrar hallazgo:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cerrar el hallazgo.' });
        }
    };

    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle>Gestión de Hallazgos en Terreno</CardTitle>
                <CardDescription>Visualiza, gestiona y crea nuevos hallazgos de seguridad para la obra seleccionada.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                    <div className="space-y-2 flex-grow">
                        <Label htmlFor="obra-hallazgos-select">Seleccionar Obra</Label>
                        <Select value={obraSeleccionadaId} onValueChange={setObraSeleccionadaId}>
                            <SelectTrigger id="obra-hallazgos-select">
                                <SelectValue placeholder="Seleccione una obra..." />
                            </SelectTrigger>
                            <SelectContent>
                                {obras.map(obra => <SelectItem key={obra.id} value={obra.id}>{obra.nombreFaena}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="flex gap-2">
                        <Button onClick={() => router.push(`/prevencion/hallazgos/crear?obraId=${obraSeleccionadaId}`)}>Crear Hallazgo</Button>
                        <Button onClick={() => router.push('/prevencion/hallazgos/equipo-responsable')} variant="outline">Configurar Equipo</Button>
                    </div>
                </div>

                {loading ? <p className="text-center text-muted-foreground">Cargando hallazgos...</p> : (
                    hallazgos.length === 0 ? <p className="text-center text-muted-foreground pt-8">No hay hallazgos para esta obra.</p> : (
                         <div className="border rounded-md overflow-hidden">
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Tipo de Riesgo</TableHead>
                                        <TableHead>Criticidad</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {hallazgos.map(h => (
                                        <TableRow key={h.id}>
                                            <TableCell>{h.createdAt.toDate().toLocaleDateString('es-CL')}</TableCell>
                                            <TableCell>{h.tipoRiesgo}</TableCell>
                                            <TableCell><Badge variant="outline">{h.criticidad}</Badge></TableCell>
                                            <TableCell><HallazgoEstadoBadge estado={h.estado} /></TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex gap-2 justify-end">
                                                    <Button asChild size="sm" variant="outline"><Link href={`/prevencion/hallazgos/detalle/${h.id}`}>Ver Detalle</Link></Button>
                                                    {h.estado !== 'cerrado' && (
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild><Button size="sm">Cerrar</Button></AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>¿Confirmar cierre?</AlertDialogTitle>
                                                                    <AlertDialogDescription>Esto marcará el hallazgo como resuelto.</AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleCerrarHallazgo(h.id!)}>Confirmar</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                             </Table>
                         </div>
                    )
                )}
            </CardContent>
        </Card>
    );
}

// --- Componente Principal ---
type FormularioGeneralActivo = "IPER" | "INCIDENTE" | "PLAN_ACCION" | "HALLAZGO" | null;

export default function FormulariosGeneralesPrevencionPage() {
  const [activeForm, setActiveForm] = useState<FormularioGeneralActivo>("IPER");
  const [planAccionPrefill, setPlanAccionPrefill] = useState<PlanAccionPrefill>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

   useEffect(() => {
    const prefillOrigen = searchParams.get('prefillOrigen');
    const prefillObraId = searchParams.get('obraId');
    const prefillReferencia = searchParams.get('referencia');
    const prefillDescripcion = searchParams.get('descripcion');

    if (prefillOrigen && prefillObraId && prefillReferencia) {
        setPlanAccionPrefill({
            origen: prefillOrigen as OrigenAccion,
            obraId: prefillObraId,
            referencia: prefillReferencia,
            descripcionSugerida: prefillDescripcion || '',
        });
        setActiveForm("PLAN_ACCION");
    }
  }, [searchParams]);

    function handleCrearAccionDesdeIPER(payload: {
        obraId: string;
        iperId: string;
        descripcion?: string;
    }) {
        const queryParams = new URLSearchParams({
            prefillOrigen: "IPER",
            obraId: payload.obraId,
            referencia: payload.iperId,
            descripcion: payload.descripcion || '',
        }).toString();
        router.push(`/prevencion/formularios-generales?${queryParams}`);
    }

    function handleCrearAccionDesdeIncidente(payload: {
        obraId: string;
        incidenteId: string;
        descripcion?: string;
    }) {
        const queryParams = new URLSearchParams({
            prefillOrigen: "INCIDENTE",
            obraId: payload.obraId,
            referencia: payload.incidenteId,
            descripcion: payload.descripcion || '',
        }).toString();
        router.push(`/prevencion/formularios-generales?${queryParams}`);
    }

  return (
    <section className="space-y-6">
      <header className="flex items-center gap-4 no-print">
        <Button variant="outline" size="icon" onClick={() => router.push('/prevencion')}>
            <ArrowLeft />
        </Button>
        <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
            Formularios generales DS44
            </h1>
            <p className="text-lg text-muted-foreground">
            Herramientas transversales del sistema de gestión: IPER/matriz de riesgos,
            investigación de incidentes, planes de acción, etc.
            </p>
        </div>
      </header>

      <div className="no-print">
        <Card>
          <CardContent className="p-4 flex flex-wrap gap-2">
            <Button variant={activeForm === 'IPER' ? 'default' : 'outline'} onClick={() => setActiveForm('IPER')}>Ver IPER / Matriz</Button>
            <Button variant={activeForm === 'INCIDENTE' ? 'default' : 'outline'} onClick={() => setActiveForm('INCIDENTE')}>Ver Investigación de Incidentes</Button>
            <Button variant={activeForm === 'HALLAZGO' ? 'default' : 'outline'} onClick={() => setActiveForm('HALLAZGO')}><Search className="mr-2 h-4 w-4"/>Ir a Hallazgos</Button>
            <Button variant={activeForm === 'PLAN_ACCION' ? 'default' : 'outline'} onClick={() => setActiveForm('PLAN_ACCION')}>Ver Plan de Acción</Button>
          </CardContent>
        </Card>
      </div>

      <div className="no-print">
        {activeForm === 'IPER' && <IPERFormSection onCrearAccionDesdeIPER={handleCrearAccionDesdeIPER} />}
        {activeForm === 'INCIDENTE' && <InvestigacionIncidenteSection onCrearAccionDesdeIncidente={handleCrearAccionDesdeIncidente} />}
        {activeForm === 'HALLAZGO' && <HallazgosSection />}
        {activeForm === 'PLAN_ACCION' && <PlanAccionSection prefill={planAccionPrefill} onPrefillConsumido={() => setPlanAccionPrefill(null)} />}
      </div>

    </section>
  );
}
