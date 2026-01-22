
// src/app/operaciones/programacion/page.tsx

"use client";

import React, { useEffect, useState, FormEvent, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  orderBy,
  deleteDoc,
  Timestamp,
  serverTimestamp,
  writeBatch,
  runTransaction,
  onSnapshot
} from "firebase/firestore";
import { firebaseDb, firebaseStorage } from "../../../lib/firebaseClient";
import { ref, deleteObject } from "firebase/storage";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { FilePlus2, FileText, Trash2, Edit, PlusCircle, Camera, Download, X, DollarSign, FileDown, ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import RegistrarAvanceForm from "./components/RegistrarAvanceForm";
import RegistroFotograficoForm from "./components/RegistroFotograficoForm";
import { useActividadAvance } from "./hooks/useActividadAvance";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { differenceInDays, eachDayOfInterval, format, isAfter, max, min } from 'date-fns';
import { es } from 'date-fns/locale';
import ImageFromStorage from '@/components/client/ImageFromStorage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";


type PresupuestoItem = {
    id: string; 
    parentId: string | null;
    type: "chapter" | "subchapter" | "item";
    descripcion: string;
    unidad: string;
    cantidad: number;
    precioUnitario: number;
};
type Presupuesto = {
    id: string;
    nombre: string;
    fechaCreacion: Timestamp;
    items: PresupuestoItem[];
};


export type Obra = {
  id: string;
  nombreFaena: string;
  empresaId: string;
};

type EstadoActividad = "Pendiente" | "En curso" | "Terminada" | "Atrasada";

export type ActividadProgramada = {
  id: string;
  obraId: string;
  nombreActividad: string;
  fechaInicio: string;
  fechaFin: string;
  precioContrato: number; 
  unidad: string;
  cantidad: number;
  avanceProgramado?: number;
};

export type AvanceDiario = {
  id: string;
  obraId: string;
  actividadId: string;
  fecha: { toDate: () => Date }; // Aseguramos que es un Timestamp de Firestore
  cantidadEjecutada?: number;
  porcentajeAvance?: number;
  comentario: string;
  fotos?: string[];
  visibleCliente: boolean;
  creadoPor: {
    uid: string;
    displayName: string;
  };
  tipoRegistro?: 'CANTIDAD' | 'FOTOGRAFICO';
};

type CurvaSDataPoint = {
  fecha: string;
  programado: number | null;
  real: number | null;
};


// --- Componente Curva S ---
function CurvaSChart({ actividades, avances, montoTotalContrato }: { actividades: ActividadProgramada[], avances: AvanceDiario[], montoTotalContrato: number }) {
  const data = useMemo(() => {
    if (!actividades.length) return [];

    const fechasInicio = actividades.map(a => new Date(a.fechaInicio + 'T00:00:00')).filter(d => !isNaN(d.getTime()));
    const fechasFin = actividades.map(a => new Date(a.fechaFin + 'T00:00:00')).filter(d => !isNaN(d.getTime()));

    if (fechasInicio.length === 0 || fechasFin.length === 0) return [];
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const fechaInicioObra = min(fechasInicio);
    const fechaFinProgramada = max(fechasFin);
    const fechaFinGrafico = max([fechaFinProgramada, hoy]);
    
    if (fechaInicioObra > fechaFinGrafico) return [];

    const rangoFechas = eachDayOfInterval({ start: fechaInicioObra, end: fechaFinGrafico });
    const dataCurva: CurvaSDataPoint[] = [];

    // --- Cálculo Curva Programada ---
    const costosProgramadosDiarios: Record<string, number> = {};
    actividades.forEach(act => {
      const totalPartida = (act.cantidad || 0) * (act.precioContrato || 0);
      if (totalPartida === 0 || !act.fechaInicio || !act.fechaFin) return;
      
      const inicioAct = new Date(act.fechaInicio + 'T00:00:00');
      const finAct = new Date(act.fechaFin + 'T00:00:00');
      if (inicioAct > finAct) return;

      const duracion = differenceInDays(finAct, inicioAct) + 1;
      const costoDiario = totalPartida / duracion;

      eachDayOfInterval({ start: inicioAct, end: finAct }).forEach(dia => {
        const fechaStr = format(dia, 'yyyy-MM-dd');
        if (!costosProgramadosDiarios[fechaStr]) costosProgramadosDiarios[fechaStr] = 0;
        costosProgramadosDiarios[fechaStr] += costoDiario;
      });
    });

    // --- Cálculo Curva Real ---
    const avancesConCantidad = avances.filter(a => a.tipoRegistro !== 'FOTOGRAFICO' && typeof a.cantidadEjecutada === 'number');
    const costosRealesDiarios: Record<string, number> = {};
    avancesConCantidad.forEach(avance => {
      if (!avance.cantidadEjecutada || !avance.actividadId || !avance.fecha) return;
      const actividadAsociada = actividades.find(a => a.id === avance.actividadId);
      if (!actividadAsociada) return;
      
      const costoDia = avance.cantidadEjecutada * (actividadAsociada.precioContrato || 0);
      const fechaStr = format(avance.fecha.toDate(), 'yyyy-MM-dd');
      
      if (!costosRealesDiarios[fechaStr]) costosRealesDiarios[fechaStr] = 0;
      costosRealesDiarios[fechaStr] += costoDia;
    });
    
    let acumuladoProgramado = 0;
    let acumuladoReal = 0;

    for (const dia of rangoFechas) {
        const fechaStr = format(dia, 'yyyy-MM-dd');
        
        acumuladoProgramado += (costosProgramadosDiarios[fechaStr] || 0);
        
        acumuladoReal += (costosRealesDiarios[fechaStr] || 0);

        const porcentajeProgramado = montoTotalContrato > 0 ? Math.min(100, (acumuladoProgramado / montoTotalContrato) * 100) : 0;
        
        const porcentajeReal = montoTotalContrato > 0
            ? dia > hoy ? null : Math.min(100, (acumuladoReal / montoTotalContrato) * 100)
            : 0;

        dataCurva.push({
            fecha: format(dia, 'dd-MM-yy'),
            programado: porcentajeProgramado,
            real: porcentajeReal
        });
    }

    return dataCurva;
  }, [actividades, avances, montoTotalContrato]);

  if (!data.length) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No hay suficientes datos para generar la Curva S. Asegúrese de que las actividades tengan fechas y costos definidos.
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Curva S de Avance (Programado vs. Real)</CardTitle>
        <CardDescription>Comparativa del avance en base al costo acumulado del contrato.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fecha" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(value) => `${value}%`} domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, '']} />
            <Legend />
            <Line type="monotone" dataKey="programado" name="Programado" stroke="#8884d8" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="real" name="Real" stroke="#82ca9d" strokeWidth={2} dot={false} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}



function ProgramacionPageInner() {
  const { user, role, companyId, loading: loadingAuth } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>("");

  const [actividades, setActividades] = useState<ActividadProgramada[]>([]);
  const { avances, loading: cargandoAvances, refetchAvances, avancesPorActividad } = useActividadAvance(obraSeleccionadaId, actividades);

  const [cargandoActividades, setCargandoActividades] = useState(true);
  
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentActividad, setCurrentActividad] = useState<Partial<ActividadProgramada> | null>(null);
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const [presupuestosObra, setPresupuestosObra] = useState<Presupuesto[]>([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [presupuestoSeleccionadoId, setPresupuestoSeleccionadoId] = useState<string>('');
  const [importando, setImportando] = useState(false);

  // Estados para el modal de edición de avance
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAvance, setEditingAvance] = useState<AvanceDiario | null>(null);
  const [newCantidad, setNewCantidad] = useState(0);
  const [newComentario, setNewComentario] = useState('');
  const [newVisibleCliente, setNewVisibleCliente] = useState(true);
  const [isUpdatingAvance, setIsUpdatingAvance] = useState(false);



  const montoTotalContrato = useMemo(() => {
    return actividades.reduce((sum, act) => sum + ((act.cantidad || 0) * (act.precioContrato || 0)), 0);
  }, [actividades]);

  const actividadesConPeso = useMemo(() => {
    if (montoTotalContrato === 0) {
        return actividades.map(act => ({ ...act, peso: 0 }));
    }
    return actividades.map(act => {
      const totalPartida = (act.cantidad || 0) * (act.precioContrato || 0);
      const peso = (totalPartida / montoTotalContrato) * 100;
      return { ...act, peso };
    });
  }, [actividades, montoTotalContrato]);


  const currentActividadConPeso = useMemo(() => {
    if (!currentActividad) return null;
    const totalPartida = (currentActividad.cantidad || 0) * (currentActividad.precioContrato || 0);
    const peso = montoTotalContrato > 0 ? (totalPartida / montoTotalContrato) * 100 : 0;
    return { ...currentActividad, peso };
  }, [currentActividad, montoTotalContrato]);

  const getEstadoActividad = (act: ActividadProgramada): EstadoActividad => {
    const avance = avancesPorActividad[act.id]?.porcentajeAcumulado ?? 0;
    if (avance >= 100) return "Terminada";

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fin = new Date(act.fechaFin + 'T00:00:00');
    if (fin < hoy) return "Atrasada";

    const inicio = new Date(act.fechaInicio + 'T00:00:00');
    if (inicio <= hoy) return "En curso";
    
    return "Pendiente";
  };


  const resumenActividades = useMemo(() => {
    const total = actividades.length;
    if (total === 0) {
        return { total: 0, pendientes: 0, enCurso: 0, completadas: 0, atrasadas: 0 };
    }
    const estados = actividades.map(act => getEstadoActividad(act));
    const pendientes = estados.filter(e => e === "Pendiente").length;
    const enCurso = estados.filter(e => e === "En curso").length;
    const completadas = estados.filter(e => e === "Terminada").length;
    const atrasadas = estados.filter(e => e === "Atrasada").length;
    return { total, total, pendientes, enCurso, completadas, atrasadas };
  }, [actividades, avancesPorActividad]);

  const avancesAgrupadosPorMes = useMemo(() => {
    const grupos: Record<string, AvanceDiario[]> = {};
    avances.forEach(avance => {
        const fecha = avance.fecha.toDate();
        const mesKey = format(fecha, 'yyyy-MM');
        if(!grupos[mesKey]) {
            grupos[mesKey] = [];
        }
        grupos[mesKey].push(avance);
    });
    return Object.entries(grupos).sort((a, b) => b[0].localeCompare(a[0])); // Ordena de más reciente a más antiguo
  }, [avances]);


  useEffect(() => {
    if (!loadingAuth && !user) {
      router.replace("/login/usuario");
    }
  }, [loadingAuth, user, router]);

  useEffect(() => {
    if (!user || loadingAuth) return;
    async function cargarObras() {
      try {
        setError(null);
        const colRef = collection(firebaseDb, "obras");
        let q;
        if (role === 'superadmin') {
            q = query(colRef);
        } else if (companyId) {
            q = query(colRef, where("empresaId", "==", companyId));
        } else {
            setObras([]);
            return;
        }

        const snapshot = await getDocs(q);
        const data: Obra[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Obra));
        setObras(data);
        
        const obraIdFromQuery = searchParams.get("obraId");
        if (obraIdFromQuery && data.some((o) => o.id === obraIdFromQuery)) {
          setObraSeleccionadaId(obraIdFromQuery);
        } else if (data.length > 0) {
          setObraSeleccionadaId(data[0].id);
        }
      } catch (err) {
        console.error(err);
        setError("No se pudieron cargar las obras.");
      }
    }
    cargarObras();
  }, [user, loadingAuth, role, companyId, searchParams]);

  useEffect(() => {
    if (!obraSeleccionadaId || !user) {
        setActividades([]);
        return;
    };

    setCargandoActividades(true);
    const actColRef = collection(firebaseDb, "obras", obraSeleccionadaId, "actividades");
    const qAct = query(actColRef, orderBy("fechaInicio", "asc"));
    const unsubActividades = onSnapshot(qAct, (snapshot) => {
        const dataAct: ActividadProgramada[] = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as ActividadProgramada));
        setActividades(dataAct);
        setCargandoActividades(false);
    }, (err) => {
        console.error("Error cargando actividades:", err);
        setError("No se pudieron cargar las actividades de la obra.");
        setCargandoActividades(false);
    });

    return () => unsubActividades();
}, [obraSeleccionadaId, user]);


  const handleOpenDialog = (actividad: Partial<ActividadProgramada> | null = null) => {
    setCurrentActividad(actividad || { 
      nombreActividad: "", 
      unidad: "glb",
      cantidad: 1,
      precioContrato: 0, 
      fechaInicio: "", 
      fechaFin: "",
      avanceProgramado: 0
    });
    setDialogOpen(true);
    setError(null);
  };
  
  async function handleActividadSubmit(e: FormEvent) {
    e.preventDefault();
    if (!obraSeleccionadaId) {
      setError("Seleccione una obra antes de agregar una actividad.");
      return;
    }
    if (!currentActividad) {
        setError("No hay datos de actividad para guardar.");
        return;
    }

    const { nombreActividad, fechaInicio, fechaFin, precioContrato, unidad, cantidad } = currentActividad;
    const precioNum = Number(precioContrato);
    const cantNum = Number(cantidad);

    if (!nombreActividad || !fechaInicio || !precioContrato) {
      setError("Nombre, fecha inicio y precio son obligatorios.");
      return;
    }
    if (isNaN(precioNum) || precioNum < 0 || isNaN(cantNum) || cantNum <= 0) {
      setError("El precio y la cantidad deben ser números válidos y positivos.");
      return;
    }

    try {
      const docData = { 
        obraId: obraSeleccionadaId, 
        nombreActividad, 
        fechaInicio, 
        fechaFin, 
        precioContrato: precioNum,
        unidad: unidad || 'glb',
        cantidad: cantNum
      };
      
      if (currentActividad.id) {
        const docRef = doc(firebaseDb, "obras", obraSeleccionadaId, "actividades", currentActividad.id);
        await updateDoc(docRef, docData);
        setActividades(prev => prev.map(act => act.id === currentActividad.id ? { ...act, ...docData } : act));
      } else {
        const colRef = collection(firebaseDb, "obras", obraSeleccionadaId, "actividades");
        const docRef = await addDoc(colRef, docData);
        const nuevaActividad: ActividadProgramada = { ...docData, id: docRef.id };
        setActividades((prev) => [...prev, nuevaActividad]);
      }
      
      setDialogOpen(false);
      setCurrentActividad(null);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("No se pudo guardar la actividad.");
    }
  }

  const handleDeleteActividad = async (actividadId: string) => {
    if (!obraSeleccionadaId) return;
    try {
        const avancesASociados = query(collection(firebaseDb, "obras", obraSeleccionadaId, "avancesDiarios"), where("actividadId", "==", actividadId));
        const avancesSnap = await getDocs(avancesASociados);
        
        const batch = writeBatch(firebaseDb);
        
        avancesSnap.forEach(avanceDoc => {
            batch.delete(avanceDoc.ref);
        });

        const docRef = doc(firebaseDb, "obras", obraSeleccionadaId, "actividades", actividadId);
        batch.delete(docRef);

        await batch.commit();
        
        setActividades(prev => prev.filter(act => act.id !== actividadId));
        refetchAvances();
        
    } catch(err) {
        console.error(err);
        setError("No se pudo eliminar la actividad y sus avances.");
    }
  }

  const handleDeleteAvance = async (avance: AvanceDiario) => {
    if (!avance || !avance.id) return;

    try {
        if (avance.fotos && avance.fotos.length > 0) {
            const deletePromises = avance.fotos.map(url => {
                try {
                    const photoRef = ref(firebaseStorage, url);
                    return deleteObject(photoRef);
                } catch(e) {
                    console.warn(`URL inválida para Storage ref, no se pudo borrar: ${url}`, e);
                    return Promise.resolve();
                }
            });
            await Promise.allSettled(deletePromises);
        }
        
        // Re-cálculo del avance acumulado de la obra
        const db = firebaseDb;
        const obraRef = doc(db, "obras", avance.obraId);
        const avanceRef = doc(obraRef, "avancesDiarios", avance.id);
        const actividad = actividades.find(a => a.id === avance.actividadId);
        
        await runTransaction(db, async (tx) => {
            const obraDoc = await tx.get(obraRef);
            if (!obraDoc.exists()) throw new Error("La obra no existe.");

            tx.delete(avanceRef); // Borra el avance

            if (actividad && avance.cantidadEjecutada && avance.cantidadEjecutada > 0) {
                const obraData = obraDoc.data();
                const totalActividades = actividades.length;
                if(totalActividades > 0 && actividad.cantidad > 0) {
                     const pesoActividad = 1 / totalActividades;
                    const avanceParcialActividad = (avance.cantidadEjecutada / actividad.cantidad);
                    const avancePonderadoDelDia = avanceParcialActividad * pesoActividad * 100;
                    
                    if(!isNaN(avancePonderadoDelDia)) {
                        const nuevoAvanceAcumulado = Math.max(0, (obraData.avanceAcumulado || 0) - avancePonderadoDelDia);
                        tx.update(obraRef, { avanceAcumulado: nuevoAvanceAcumulado });
                    }
                }
            }
        });

        toast({ title: "Avance eliminado", description: "El registro de avance y sus fotos asociadas han sido eliminados." });
        
    } catch (err) {
        console.error("Error eliminando avance:", err);
        toast({ variant: "destructive", title: "Error al eliminar", description: "No se pudo eliminar el registro de avance." });
    }
  };

  const handleOpenEditModal = (avance: AvanceDiario) => {
    setEditingAvance(avance);
    setNewCantidad(avance.cantidadEjecutada || 0);
    setNewComentario(avance.comentario || '');
    setNewVisibleCliente(avance.visibleCliente);
    setIsEditModalOpen(true);
  };
  
  const handleUpdateAvance = async () => {
    if (!editingAvance || !obraSeleccionadaId) return;

    if (newCantidad < 0 || !Number.isFinite(newCantidad)) {
        toast({variant: 'destructive', title: 'Cantidad inválida'});
        return;
    }

    setIsUpdatingAvance(true);
    const db = firebaseDb;
    const obraRef = doc(db, "obras", obraSeleccionadaId);
    const avanceRef = doc(obraRef, "avancesDiarios", editingAvance.id);
    const actividad = actividades.find(a => a.id === editingAvance.actividadId);

    try {
        await runTransaction(db, async (tx) => {
            const avanceSnap = await tx.get(avanceRef);
            if (!avanceSnap.exists()) throw new Error("El registro de avance ya no existe.");

            const avanceAnterior = avanceSnap.data() as AvanceDiario;
            const cantidadAnterior = avanceAnterior.cantidadEjecutada || 0;
            const deltaCantidad = newCantidad - cantidadAnterior;

            // 1. Actualizar el documento de avance
            tx.update(avanceRef, {
                cantidadEjecutada: newCantidad,
                comentario: newComentario,
                visibleCliente: newVisibleCliente,
                updatedAt: serverTimestamp()
            });

            // 2. Actualizar el acumulado de la obra
            if (deltaCantidad !== 0 && actividad) {
                const obraSnap = await tx.get(obraRef);
                if (!obraSnap.exists()) throw new Error("La obra no existe.");

                const obraData = obraSnap.data();
                const totalActividades = actividades.length;
                if (totalActividades > 0 && actividad.cantidad > 0) {
                     const pesoActividad = 1 / totalActividades;
                    const avanceParcialDelta = (deltaCantidad / actividad.cantidad);
                    const avancePonderadoDelta = avanceParcialDelta * pesoActividad * 100;

                    if(!isNaN(avancePonderadoDelta)) {
                        const nuevoAvanceAcumulado = Math.max(0, Math.min(100, (obraData.avanceAcumulado || 0) + avancePonderadoDelta));
                        tx.update(obraRef, { avanceAcumulado: nuevoAvanceAcumulado });
                    }
                }
            }
        });
        toast({title: "Avance actualizado"});
        setIsEditModalOpen(false);

    } catch (err: any) {
        console.error("Error actualizando avance:", err);
        toast({variant: 'destructive', title: 'Error', description: err.message});
    } finally {
        setIsUpdatingAvance(false);
    }
  };


  const formatCurrency = (value: number) => {
    return value.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
  };
  
    const handleOpenImportDialog = async () => {
        if (!obraSeleccionadaId) return;
        try {
            const q = query(collection(firebaseDb, "presupuestos"), where("obraId", "==", obraSeleccionadaId));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Presupuesto));
            setPresupuestosObra(data);
            setImportDialogOpen(true);
        } catch (error) {
            console.error("Error fetching budgets for import:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los presupuestos de esta obra.' });
        }
    };
    
    const handleImportarPresupuesto = async () => {
        if (!presupuestoSeleccionadoId || !obraSeleccionadaId) return;
        setImportando(true);

        try {
            const presupuestoAImportar = presupuestosObra.find(p => p.id === presupuestoSeleccionadoId);
            if (!presupuestoAImportar || !presupuestoAImportar.items) {
                throw new Error("El presupuesto seleccionado no tiene ítems para importar.");
            }

            const actividadesActuales = new Set(actividades.map(a => a.nombreActividad.trim().toLowerCase()));
            const batch = writeBatch(firebaseDb);
            const actividadesNuevas: ActividadProgramada[] = [];

            const excludedDescriptions = ["iva", "total", "total bruto", "costo directo", "costo total", "gastos generales", "utilidad", "administración", "imprevistos"];

            for (const item of presupuestoAImportar.items) {
                if (item.type === 'item') {
                    const desc = (item.descripcion ?? '').trim().toLowerCase();
                    if (excludedDescriptions.includes(desc)) {
                        continue;
                    }
                    
                    const normalizedDescription = item.descripcion.trim().toLowerCase();
                    if (!actividadesActuales.has(normalizedDescription)) {
                        const nuevaActividadRef = doc(collection(firebaseDb, "obras", obraSeleccionadaId, "actividades"));
                        const nuevaActividadData = {
                            obraId: obraSeleccionadaId,
                            nombreActividad: item.descripcion,
                            unidad: item.unidad,
                            cantidad: item.cantidad,
                            precioContrato: item.precioContrato,
                            fechaInicio: new Date().toISOString().slice(0, 10), // Fecha por defecto
                            fechaFin: new Date().toISOString().slice(0, 10), // Fecha por defecto
                        };
                        batch.set(nuevaActividadRef, nuevaActividadData);
                        actividadesNuevas.push({ id: nuevaActividadRef.id, ...nuevaActividadData });
                    }
                }
            }

            if (actividadesNuevas.length === 0) {
                 toast({ title: "Nada que importar", description: "Todas las partidas del presupuesto ya existen en la programación o son ítems no válidos." });
            } else {
                await batch.commit();
                setActividades(prev => [...prev, ...actividadesNuevas]);
                toast({ title: "Importación exitosa", description: `Se agregaron ${actividadesNuevas.length} nuevas actividades a la programación.` });
            }

            setImportDialogOpen(false);
            setPresupuestoSeleccionadoId('');
        } catch (err) {
            console.error("Error importing budget:", err);
            toast({ variant: 'destructive', title: 'Error de importación', description: (err as Error).message });
        } finally {
            setImportando(false);
        }
    };
    
  const handleResetProgramacion = async () => {
    if (!obraSeleccionadaId) return;

    try {
      // Obtener todas las actividades y avances para borrarlos
      const actividadesRef = collection(firebaseDb, "obras", obraSeleccionadaId, "actividades");
      const avancesRef = collection(firebaseDb, "obras", obraSeleccionadaId, "avancesDiarios");
      
      const [actividadesSnap, avancesSnap] = await Promise.all([
        getDocs(actividadesRef),
        getDocs(avancesRef)
      ]);
      
      if (actividadesSnap.empty && avancesSnap.empty) {
        toast({ title: "Nada que reiniciar", description: "La programación de esta obra ya está vacía." });
        return;
      }

      const batch = writeBatch(firebaseDb);
      
      actividadesSnap.forEach(doc => batch.delete(doc.ref));
      avancesSnap.forEach(doc => batch.delete(doc.ref));
      
      await batch.commit();
      
      // Limpiar estado local
      setActividades([]);
      refetchAvances();
      
      toast({ title: "Programación Reiniciada", description: "Se han eliminado todas las actividades y avances de la obra." });

    } catch (err) {
      console.error("Error al reiniciar la programación:", err);
      toast({ variant: "destructive", title: "Error", description: "No se pudo reiniciar la programación." });
    }
  };


  
  if (loadingAuth) return <p className="text-sm text-muted-foreground">Cargando sesión...</p>;
  if (!user) return <p className="text-sm text-muted-foreground">Redirigiendo a login...</p>;

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard')}>
                <ArrowLeft />
            </Button>
            <div>
                <h1 className="text-4xl font-bold font-headline tracking-tight">Programación de Obras</h1>
                <p className="mt-2 text-lg text-muted-foreground">
                Gestiona actividades por cantidad y precio, registre avances diarios y genere estados de pago.
                </p>
            </div>
        </div>
         {obraSeleccionadaId && (
            <Button variant="secondary" onClick={() => router.push(`/operaciones/estados-de-pago?obraId=${obraSeleccionadaId}`)}>
                <DollarSign className="mr-2 h-4 w-4" />
                Ver Estados de Pago
            </Button>
        )}
      </header>

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Selector de Obra</CardTitle>
              <CardDescription>Filtre las actividades y avances por obra.</CardDescription>
            </div>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-2">
            <Label htmlFor="obra-select">Seleccione una obra</Label>
            <Select value={obraSeleccionadaId} onValueChange={setObraSeleccionadaId}>
              <SelectTrigger id="obra-select"><SelectValue placeholder="Seleccione una obra" /></SelectTrigger>
              <SelectContent>
                {obras.map((obra) => (
                  <SelectItem key={obra.id} value={obra.id}>{obra.nombreFaena}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Resumen de Actividades</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-2">
                <span className="font-medium text-foreground">Total: {resumenActividades.total}</span>
                <span className="hidden sm:inline">·</span>
                <span>Pendientes: {resumenActividades.pendientes}</span>
                <span className="hidden sm:inline">·</span>
                <span>En curso: {resumenActividades.enCurso}</span>
                 <span className="hidden sm:inline">·</span>
                <span>Atrasadas: {resumenActividades.atrasadas}</span>
                <span className="hidden sm:inline">·</span>
                <span>Completadas: {resumenActividades.completadas}</span>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <CardTitle>Actividades Programadas</CardTitle>
                <CardDescription>{cargandoActividades ? "Cargando..." : `Mostrando ${actividades.length} actividades.`}</CardDescription>
            </div>
            <div className="flex gap-2">
                 <Button onClick={handleOpenImportDialog} variant="outline" disabled={!obraSeleccionadaId}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Importar desde Presupuesto
                </Button>
                <Button onClick={() => handleOpenDialog()}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nueva Actividad
                </Button>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={!obraSeleccionadaId || actividades.length === 0}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Reiniciar Programación
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Está seguro de reiniciar la programación?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción eliminará TODAS las actividades y avances diarios de la obra seleccionada. Es irreversible. Los Estados de Pago generados previamente NO se eliminarán.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleResetProgramacion}>Sí, reiniciar programación</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </CardHeader>
        <CardContent className="p-0">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[30%]">Actividad</TableHead>
                        <TableHead>Un.</TableHead>
                        <TableHead>Cant.</TableHead>
                        <TableHead>P. Unitario</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Peso (%)</TableHead>
                        <TableHead>Av. Real (%)</TableHead>
                        <TableHead className="hidden md:table-cell">Inicio</TableHead>
                        <TableHead className="hidden md:table-cell">Fin</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                    {cargandoActividades ? <TableRow><TableCell colSpan={11} className="text-center">Cargando...</TableCell></TableRow> : 
                    actividadesConPeso.length > 0 ? (actividadesConPeso.map((act) => {
                      const total = (act.cantidad ?? 0) * (act.precioContrato ?? 0);
                      const avanceInfo = avancesPorActividad[act.id];
                      return (
                        <TableRow key={act.id}>
                            <TableCell className="font-medium">{act.nombreActividad}</TableCell>
                            <TableCell>{act.unidad ?? '-'}</TableCell>
                            <TableCell>{act.cantidad ?? '-'}</TableCell>
                            <TableCell>{formatCurrency(act.precioContrato)}</TableCell>
                            <TableCell>{total > 0 ? formatCurrency(total) : '-'}</TableCell>
                            <TableCell className="font-semibold">{act.peso.toFixed(2)}%</TableCell>
                            <TableCell className="font-semibold text-blue-600">
                                {avanceInfo?.porcentajeAcumulado.toFixed(1) ?? '0.0'}%
                            </TableCell>
                            <TableCell className="hidden md:table-cell">{act.fechaInicio}</TableCell>
                            <TableCell className="hidden md:table-cell">{act.fechaFin}</TableCell>
                            <TableCell>
                               <EstadoBadge estado={getEstadoActividad(act)} />
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(act)}>
                                    <Edit className="h-4 w-4" />
                                    <span className="sr-only">Editar</span>
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Eliminar</span>
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>¿Está seguro de que desea eliminar esta actividad?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Esta acción no se puede deshacer. Se eliminará permanentemente la actividad "{act.nombreActividad}" y todos sus avances asociados.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteActividad(act.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                            </TableCell>
                        </TableRow>
                      )
                    })) : (
                        <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">No hay actividades para esta obra.</TableCell></TableRow>
                    )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <form onSubmit={handleActividadSubmit}>
            <DialogHeader>
              <DialogTitle>{currentActividadConPeso?.id ? "Editar Actividad" : "Crear Nueva Actividad"}</DialogTitle>
              <DialogDescription>
                {currentActividadConPeso?.id ? "Modifica los detalles y haz clic en Guardar." : "Completa los detalles para registrar una nueva actividad."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2 col-span-full"><Label>Nombre Actividad*</Label><Input value={currentActividadConPeso?.nombreActividad || ""} onChange={(e) => setCurrentActividad(prev => prev ? {...prev, nombreActividad: e.target.value} : null)} /></div>
              <div className="space-y-2"><Label>Unidad*</Label><Input value={currentActividadConPeso?.unidad || ""} onChange={(e) => setCurrentActividad(prev => prev ? {...prev, unidad: e.target.value} : null)} placeholder="m², m³, glb, etc."/></div>
              <div className="space-y-2"><Label>Cantidad*</Label><Input type="number" value={currentActividadConPeso?.cantidad || ""} onChange={(e) => setCurrentActividad(prev => prev ? {...prev, cantidad: Number(e.target.value)} : null)} /></div>
              <div className="space-y-2"><Label>Precio Unitario*</Label><Input type="number" value={currentActividadConPeso?.precioContrato || ""} onChange={(e) => setCurrentActividad(prev => prev ? {...prev, precioContrato: Number(e.target.value)} : null)} /></div>
              <div className="space-y-2"><Label>Fecha Inicio*</Label><Input type="date" value={currentActividadConPeso?.fechaInicio || ""} onChange={(e) => setCurrentActividad(prev => prev ? {...prev, fechaInicio: e.target.value} : null)} /></div>
              <div className="space-y-2"><Label>Fecha Fin</Label><Input type="date" value={currentActividadConPeso?.fechaFin || ""} onChange={(e) => setCurrentActividad(prev => prev ? {...prev, fechaFin: e.target.value} : null)} /></div>
              <div className="space-y-2">
                <Label>Peso en Contrato (%)</Label>
                <Input type="text" value={currentActividadConPeso?.peso?.toFixed(2) + '%' || '0.00%'} readOnly disabled />
              </div>

              {error && <p className="col-span-full text-sm font-medium text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button type="submit">Guardar Actividad</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Importar Actividades desde Presupuesto</DialogTitle>
                  <DialogDescription>
                      Selecciona un presupuesto de la obra actual. Se importarán todas las partidas que no existan ya en la programación.
                  </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                  <Label htmlFor="presupuesto-select">Presupuesto a importar</Label>
                  <Select value={presupuestoSeleccionadoId} onValueChange={setPresupuestoSeleccionadoId}>
                      <SelectTrigger id="presupuesto-select">
                          <SelectValue placeholder="Seleccione un presupuesto" />
                      </SelectTrigger>
                      <SelectContent>
                          {presupuestosObra.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.nombre} - {p.fechaCreacion.toDate().toLocaleDateString()}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>
              <DialogFooter>
                  <Button variant="ghost" onClick={() => setImportDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleImportarPresupuesto} disabled={importando || !presupuestoSeleccionadoId}>
                      {importando ? 'Importando...' : 'Importar Partidas'}
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* Gráfico Curva S */}
      {obraSeleccionadaId && <CurvaSChart actividades={actividades} avances={avances} montoTotalContrato={montoTotalContrato} />}
      
      <section className="space-y-4 mt-8">
        <header className="space-y-1">
          <h3 className="text-xl font-semibold">Avance diario</h3>
          <p className="text-sm text-muted-foreground">Registra el avance de la obra. Esta información alimentará el Estado de Pago.</p>
        </header>
        <div className="grid gap-6">
          {obraSeleccionadaId && (
             <Tabs defaultValue="cantidad" className="w-full">
                <TabsList>
                  <TabsTrigger value="cantidad">Avance con Cantidad</TabsTrigger>
                  <TabsTrigger value="foto">Solo Registro Fotográfico</TabsTrigger>
                </TabsList>
                <TabsContent value="cantidad">
                  <RegistrarAvanceForm obraId={obraSeleccionadaId} actividades={actividades} onAvanceRegistrado={refetchAvances} />
                </TabsContent>
                <TabsContent value="foto">
                   <RegistroFotograficoForm obras={obras} actividades={actividades} onRegistroGuardado={refetchAvances} />
                </TabsContent>
              </Tabs>
          )}

          {!cargandoAvances && avances.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Historial de Avances Diarios</CardTitle>
                <CardDescription>Últimos avances registrados para la obra seleccionada.</CardDescription>
              </CardHeader>
              <CardContent>
                 <Accordion type="single" collapsible className="w-full" defaultValue={avancesAgrupadosPorMes[0]?.[0]}>
                    {avancesAgrupadosPorMes.map(([mesKey, avancesDelMes]) => {
                         const fechaMes = new Date(mesKey + '-02'); // Usar día 2 para evitar problemas de zona horaria
                         const nombreMes = format(fechaMes, "MMMM 'de' yyyy", { locale: es });

                        return (
                            <AccordionItem value={mesKey} key={mesKey}>
                                <AccordionTrigger className="text-lg font-medium">{nombreMes}</AccordionTrigger>
                                <AccordionContent className="space-y-4 pl-4">
                                     {avancesDelMes.map(avance => {
                                        const actividad = actividades.find(a => a.id === avance.actividadId);
                                        return (
                                            <div key={avance.id} className="border-b pb-4 last:border-b-0">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                <p className="font-semibold">{avance.fecha.toDate().toLocaleDateString('es-CL')} - {actividad?.nombreActividad || 'Avance General'}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Reportado por: {avance.creadoPor.displayName}
                                                </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                <Badge variant="outline" className={avance.tipoRegistro === 'FOTOGRAFICO' ? 'bg-blue-100 text-blue-800' : ''}>
                                                    {avance.tipoRegistro === 'FOTOGRAFICO' ? <Camera className="h-3 w-3 mr-1"/> : null}
                                                    {avance.tipoRegistro === 'FOTOGRAFICO' ? 'Solo Foto' : `Avance: ${avance.cantidadEjecutada} ${actividad?.unidad || ''}`}
                                                </Badge>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => handleOpenEditModal(avance)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>¿Eliminar este registro de avance?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                        Esta acción no se puede deshacer. Se eliminará el registro del día {avance.fecha.toDate().toLocaleDateString('es-CL')} y las fotos asociadas. El cálculo de avance se reajustará.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteAvance(avance)} className="bg-destructive hover:bg-destructive/90">Confirmar Eliminación</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                                </div>
                                            </div>

                                            {avance.comentario && <p className="text-sm mt-1">"{avance.comentario}"</p>}
                                            {avance.fotos && avance.fotos.length > 0 && (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mt-2">
                                                {avance.fotos.map(foto => (
                                                    <div key={foto} className="w-full aspect-square relative group">
                                                    <Suspense fallback={<div className="bg-muted animate-pulse w-full h-full rounded-md"></div>}>
                                                        <ImageFromStorage storagePath={foto} />
                                                    </Suspense>
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => setSelectedImage(foto)}>
                                                            <p className="text-white text-xs text-center">Ver foto</p>
                                                    </div>
                                                    <a href={foto} download target="_blank" rel="noopener noreferrer" 
                                                        onClick={(e) => e.stopPropagation()} 
                                                        className="absolute bottom-1 right-1 bg-white/80 text-black p-1 rounded-full hover:bg-white transition-colors">
                                                        <Download className="h-3 w-3" />
                                                    </a>
                                                    </div>
                                                ))}
                                                </div>
                                            )}
                                            </div>
                                        )
                                    })}
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                </Accordion>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Modal para ver imagen en grande */}
       <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-4xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>Vista de la imagen</DialogTitle>
             <DialogDescription>Imagen registrada en el avance.</DialogDescription>
          </DialogHeader>
          <div className="flex-grow flex items-center justify-center overflow-hidden">
            {selectedImage && <img src={selectedImage} alt="Vista ampliada" className="max-w-full max-h-full object-contain" />}
          </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setSelectedImage(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
       {/* Modal para editar avance */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Registro de Avance</DialogTitle>
            <DialogDescription>
              Ajuste la cantidad, comentario o visibilidad del registro.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
             <div className="space-y-2">
                <Label>Actividad</Label>
                <Input value={actividades.find(a => a.id === editingAvance?.actividadId)?.nombreActividad || 'N/A'} disabled />
             </div>
             <div className="space-y-2">
                <Label htmlFor="edit-cantidad">Cantidad Ejecutada</Label>
                <Input id="edit-cantidad" type="number" value={newCantidad} onChange={e => setNewCantidad(Number(e.target.value))} />
                <p className="text-xs text-muted-foreground">Unidad: {actividades.find(a => a.id === editingAvance?.actividadId)?.unidad}</p>
             </div>
             <div className="space-y-2">
                <Label htmlFor="edit-comentario">Comentario</Label>
                <Textarea id="edit-comentario" value={newComentario} onChange={e => setNewComentario(e.target.value)} />
             </div>
             <div className="flex items-center space-x-2">
                <Switch id="edit-visible" checked={newVisibleCliente} onCheckedChange={setNewVisibleCliente} />
                <Label htmlFor="edit-visible">Visible para el cliente</Label>
             </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)} disabled={isUpdatingAvance}>Cancelar</Button>
            <Button onClick={handleUpdateAvance} disabled={isUpdatingAvance}>
                {isUpdatingAvance && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                {isUpdatingAvance ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const EstadoBadge = ({ estado }: { estado: EstadoActividad }) => {
    const variants: Record<EstadoActividad, string> = {
        "Terminada": "bg-green-100 text-green-800 border-green-200",
        "En curso": "bg-blue-100 text-blue-800 border-blue-200",
        "Pendiente": "bg-gray-100 text-gray-800 border-gray-200",
        "Atrasada": "bg-red-100 text-red-800 border-red-200",
    }
    return <Badge variant="outline" className={cn("font-semibold", variants[estado])}>{estado}</Badge>
}

export default function ProgramacionPage() {
  return (
    <Suspense fallback={<div>Cargando programación...</div>}>
      <ProgramacionPageInner />
    </Suspense>
  );
}




