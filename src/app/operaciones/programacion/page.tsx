
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
} from "firebase/firestore";
import { firebaseDb, firebaseStorage } from "../../../lib/firebaseClient";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
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
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { FilePlus2, FileText, Trash2, Edit, PlusCircle, X } from 'lucide-react';

type Obra = {
  id: string;
  nombreFaena: string;
};

type EstadoActividad = "Pendiente" | "En curso" | "Completada";

const ESTADOS_ACTIVIDAD: EstadoActividad[] = [
  "Pendiente",
  "En curso",
  "Completada",
];

type ActividadProgramada = {
  id: string;
  obraId: string;
  nombreActividad: string;
  fechaInicio: string;
  fechaFin: string;
  estado: EstadoActividad;
  precioContrato: number;
};

type AvanceDiario = {
  id: string;
  obraId: string;
  actividadId: string;
  fecha: string; // "YYYY-MM-DD"
  porcentajeAvance: number; // avance acumulado a esa fecha (0-100)
  comentario: string;
  fotoUrl?: string; // Para compatibilidad con registros antiguos
  fotos?: string[];   // Nuevo campo para múltiples fotos
  visibleParaCliente: boolean;
  creadoPor: string;
};

type EstadoDePago = {
  id: string;
  correlativo: number;
  fechaGeneracion: string;
  fechaDeCorte: string;
  subtotal: number;
  iva: number;
  total: number;
  obraId: string;
};

function EstadoBadge({ estado }: { estado: EstadoActividad }) {
  const variant: "default" | "secondary" | "outline" = {
    Completada: "default",
    "En curso": "secondary",
    Pendiente: "outline",
  }[estado];

  const className = {
    Completada: "bg-green-100 text-green-800 border-green-200",
    "En curso": "bg-blue-100 text-blue-800 border-blue-200",
    Pendiente: "bg-yellow-100 text-yellow-800 border-yellow-200",
  }[estado];

  return (
    <Badge variant={variant} className={cn("font-semibold whitespace-nowrap", className)}>
      {estado}
    </Badge>
  );
}

const MAX_FOTOS = 5;
const MAX_TAMANO_MB = 5;

function ProgramacionPageInner() {
  const { user, loading: loadingAuth } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [obras, setObras] = useState<Obra[]>([]);
  const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>("");

  const [actividades, setActividades] = useState<ActividadProgramada[]>([]);
  const [avances, setAvances] = useState<AvanceDiario[]>([]);
  const [estadosDePago, setEstadosDePago] = useState<EstadoDePago[]>([]);

  const [cargandoActividades, setCargandoActividades] = useState(true);
  const [cargandoAvances, setCargandoAvances] = useState(true);
  const [cargandoEdp, setCargandoEdp] = useState(true);
  const [generandoEdp, setGenerandoEdp] = useState(false);
  
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentActividad, setCurrentActividad] = useState<Partial<ActividadProgramada> | null>(null);

  // Estados para el formulario de avance
  const [formAvance, setFormAvance] = useState({
    actividadId: "",
    fecha: new Date().toISOString().slice(0, 10),
    porcentajeAvance: "",
    comentario: "",
    creadoPor: "",
    visibleParaCliente: true,
  });
  const [archivos, setArchivos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  
  // Estado para el modal de generación de EDP
  const [dialogEdpOpen, setDialogEdpOpen] = useState(false);
  const [fechaCorteEdp, setFechaCorteEdp] = useState(new Date().toISOString().slice(0, 10));


  const resumenActividades = useMemo(() => {
    const total = actividades.length;
    const pendientes = actividades.filter(a => a.estado === "Pendiente").length;
    const enCurso = actividades.filter(a => a.estado === "En curso").length;
    const completadas = actividades.filter(a => a.estado === "Completada").length;
    return { total, pendientes, enCurso, completadas };
  }, [actividades]);

  useEffect(() => {
    if (!loadingAuth && !user) {
      router.replace("/login");
    }
  }, [loadingAuth, user, router]);

  useEffect(() => {
    if (!user) return;
    async function cargarObras() {
      try {
        setError(null);
        const colRef = collection(firebaseDb, "obras");
        const snapshot = await getDocs(colRef);
        const data: Obra[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          nombreFaena: doc.data().nombreFaena ?? "",
        }));
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
  }, [user, searchParams]);

  useEffect(() => {
    if (!obraSeleccionadaId || !user) {
      setActividades([]);
      setAvances([]);
      setEstadosDePago([]);
      return;
    };

    const cargarDatosDeObra = async () => {
      setError(null);
      // Cargar Actividades
      setCargandoActividades(true);
      try {
        const actColRef = collection(firebaseDb, "obras", obraSeleccionadaId, "actividades");
        const qAct = query(actColRef, orderBy("fechaInicio", "asc"));
        const snapshotAct = await getDocs(qAct);
        const dataAct: ActividadProgramada[] = snapshotAct.docs.map((d) => ({ ...d.data(), id: d.id } as ActividadProgramada));
        setActividades(dataAct);
      } catch (err) {
        console.error("Error cargando actividades:", err);
        setError("No se pudieron cargar las actividades de la obra.");
      } finally {
        setCargandoActividades(false);
      }

      // Cargar Avances
      setCargandoAvances(true);
      try {
        const avColRef = collection(firebaseDb, "obras", obraSeleccionadaId, "avancesDiarios");
        const qAv = query(avColRef, orderBy("fecha", "desc"));
        const snapshotAv = await getDocs(qAv);
        const dataAv: AvanceDiario[] = snapshotAv.docs.map((d) => ({ ...d.data(), id: d.id } as AvanceDiario));
        setAvances(dataAv);
      } catch (err) {
        console.error("Error cargando avances:", err);
        setError((prev) => (prev ? prev + " " : "") + "No se pudieron cargar los avances diarios.");
      } finally {
        setCargandoAvances(false);
      }

      // Cargar Estados de Pago
      setCargandoEdp(true);
      try {
        const edpColRef = collection(firebaseDb, "obras", obraSeleccionadaId, "estadosDePago");
        const qEdp = query(edpColRef, orderBy("correlativo", "desc"));
        const snapshotEdp = await getDocs(qEdp);
        const dataEdp: EstadoDePago[] = snapshotEdp.docs.map((d) => ({ ...d.data(), id: d.id } as EstadoDePago));
        setEstadosDePago(dataEdp);
      } catch(err) {
        console.error("Error cargando estados de pago:", err);
      } finally {
        setCargandoEdp(false);
      }
    }
    
    cargarDatosDeObra();
  }, [obraSeleccionadaId, user]);

  const handleOpenDialog = (actividad: Partial<ActividadProgramada> | null = null) => {
    setCurrentActividad(actividad || { nombreActividad: "", fechaInicio: "", fechaFin: "", estado: "Pendiente", precioContrato: 0 });
    setDialogOpen(true);
    setError(null);
  };
  
  const handleEstadoChange = async (id: string, nuevoEstado: EstadoActividad) => {
    if (!obraSeleccionadaId) return;
    try {
        const docRef = doc(firebaseDb, "obras", obraSeleccionadaId, "actividades", id);
        await updateDoc(docRef, { estado: nuevoEstado });
        setActividades((prev) => prev.map((act) => act.id === id ? { ...act, estado: nuevoEstado } : act));
    } catch(err) {
        console.error(err);
        setError("No se pudo actualizar el estado de la actividad.");
    }
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

    const { nombreActividad, fechaInicio, fechaFin, estado, precioContrato } = currentActividad;
    const precioNum = Number(precioContrato);

    if (!nombreActividad || !fechaInicio || !precioContrato) {
      setError("Nombre, fecha inicio y precio son obligatorios.");
      return;
    }
    if (isNaN(precioNum) || precioNum <= 0) {
      setError("El precio del contrato debe ser un número mayor que cero.");
      return;
    }

    try {
      const docData = { obraId: obraSeleccionadaId, nombreActividad, fechaInicio, fechaFin, estado, precioContrato: precioNum };
      
      if (currentActividad.id) {
        // Actualizar
        const docRef = doc(firebaseDb, "obras", obraSeleccionadaId, "actividades", currentActividad.id);
        await updateDoc(docRef, docData);
        setActividades(prev => prev.map(act => act.id === currentActividad.id ? { ...act, ...docData } : act));
      } else {
        // Crear
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
        const docRef = doc(firebaseDb, "obras", obraSeleccionadaId, "actividades", actividadId);
        await deleteDoc(docRef);
        setActividades(prev => prev.filter(act => act.id !== actividadId));
    } catch(err) {
        console.error(err);
        setError("No se pudo eliminar la actividad.");
    }
  }

  // ---- Lógica para el formulario de avance ----
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const nuevosArchivos = Array.from(e.target.files);
    const archivosAProcesar = [...archivos, ...nuevosArchivos];

    if (archivosAProcesar.length > MAX_FOTOS) {
      setError(`No puedes subir más de ${MAX_FOTOS} fotos por avance.`);
      return;
    }

    const archivosValidos = archivosAProcesar.filter(file => {
      const esValido = file.size <= MAX_TAMANO_MB * 1024 * 1024;
      if (!esValido) {
        setError(`El archivo "${file.name}" supera el tamaño máximo de ${MAX_TAMANO_MB} MB.`);
      }
      return esValido;
    });

    setArchivos(archivosValidos);

    const nuevasPreviews = archivosValidos.map(file => URL.createObjectURL(file));
    // Limpiar previews antiguas para evitar fugas de memoria
    previews.forEach(url => URL.revokeObjectURL(url));
    setPreviews(nuevasPreviews);
  };
  
  const handleRemoveFile = (index: number) => {
    const nuevosArchivos = archivos.filter((_, i) => i !== index);
    setArchivos(nuevosArchivos);
    
    const nuevasPreviews = nuevosArchivos.map(file => URL.createObjectURL(file));
    previews.forEach(url => URL.revokeObjectURL(url));
    setPreviews(nuevasPreviews);
  };

  const handleAvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obraSeleccionadaId || !user) {
      setError("Debes seleccionar una obra y estar autenticado.");
      return;
    }
    const { actividadId, fecha, porcentajeAvance, comentario, creadoPor, visibleParaCliente } = formAvance;
    if (!actividadId || !fecha || !porcentajeAvance || !creadoPor) {
      setError("Actividad, fecha, porcentaje y 'registrado por' son obligatorios.");
      return;
    }
    const porcentaje = Number(porcentajeAvance);
    if (isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100) {
      setError("El porcentaje de avance debe ser un número entre 0 y 100.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      // Subir fotos a Storage y obtener URLs
      const urlsFotos: string[] = await Promise.all(
        archivos.map(async (file, index) => {
          const nombreArchivo = `${Date.now()}-${index}-${file.name}`;
          const storageRef = ref(firebaseStorage, `avances/${obraSeleccionadaId}/${nombreArchivo}`);
          await uploadBytes(storageRef, file);
          return await getDownloadURL(storageRef);
        })
      );
      
      const colRef = collection(firebaseDb, "obras", obraSeleccionadaId, "avancesDiarios");
      const docData = { 
        obraId: obraSeleccionadaId, 
        actividadId, 
        fecha, 
        porcentajeAvance: porcentaje, 
        comentario: comentario.trim(), 
        fotos: urlsFotos,
        fotoUrl: urlsFotos[0] ?? null, // Para compatibilidad
        creadoPor: creadoPor.trim(), 
        visibleParaCliente, 
        creadoEn: new Date().toISOString(), 
        creadoPorUid: user.uid 
      };
      const docRef = await addDoc(colRef, docData);
      const nuevoAvance: AvanceDiario = { ...docData, id: docRef.id };

      setAvances((prev) => [nuevoAvance, ...prev].sort((a,b) => a.fecha < b.fecha ? 1 : -1));
      
      // Resetear formulario
      setFormAvance({ actividadId: "", fecha: new Date().toISOString().slice(0, 10), porcentajeAvance: "", comentario: "", creadoPor: "", visibleParaCliente: true });
      setArchivos([]);
      previews.forEach(url => URL.revokeObjectURL(url));
      setPreviews([]);
      const fileInput = document.getElementById('foto-avance-input') as HTMLInputElement;
      if (fileInput) fileInput.value = "";

    } catch (err) {
      console.error(err);
      setError("No se pudo registrar el avance. Intenta nuevamente.");
    } finally {
      setUploading(false);
    }
  }

  const handleGenerarEstadoDePago = async () => {
    if (!obraSeleccionadaId) return;

    setGenerandoEdp(true);
    setError(null);

    try {
      // 1. Obtener el siguiente correlativo
      const ultimoCorrelativo = estadosDePago.reduce((max, edp) => Math.max(max, edp.correlativo), 0);
      const nuevoCorrelativo = ultimoCorrelativo + 1;
      
      // 2. Calcular montos con la fecha de corte
      const actividadesConAvance = actividades.map(act => {
        const ultimoAvance = avances
          .filter(av => av.actividadId === act.id && av.fecha <= fechaCorteEdp) // Filtrar por fecha de corte
          .sort((a, b) => a.fecha > b.fecha ? -1 : 1)[0];
        
        const porcentajeAvance = ultimoAvance?.porcentajeAvance ?? 0;
        const montoProyectado = act.precioContrato * (porcentajeAvance / 100);
        
        return { ...act, porcentajeAvance, montoProyectado };
      });
      
      const subtotal = actividadesConAvance.reduce((sum, act) => sum + act.montoProyectado, 0);
      const iva = subtotal * 0.19;
      const total = subtotal + iva;

      // 3. Crear el nuevo documento de Estado de Pago
      const edpColRef = collection(firebaseDb, "obras", obraSeleccionadaId, "estadosDePago");
      const nuevoEdpDoc = {
        obraId: obraSeleccionadaId,
        correlativo: nuevoCorrelativo,
        fechaGeneracion: new Date().toISOString().slice(0, 10),
        fechaDeCorte: fechaCorteEdp,
        subtotal,
        iva,
        total,
        actividades: actividadesConAvance, // Guardamos una copia de las actividades y su estado en ese momento
        creadoEn: new Date().toISOString(),
      };
      
      const docRef = await addDoc(edpColRef, nuevoEdpDoc);
      
      // 4. Actualizar el estado local y navegar a la página de visualización
      setEstadosDePago(prev => [{...nuevoEdpDoc, id: docRef.id } as EstadoDePago, ...prev]);
      setDialogEdpOpen(false);
      router.push(`/operaciones/programacion/estado-pago/${obraSeleccionadaId}?edpId=${docRef.id}&fechaCorte=${fechaCorteEdp}`);

    } catch (err) {
      console.error("Error generando estado de pago:", err);
      setError("No se pudo generar el estado de pago. Inténtelo de nuevo.");
    } finally {
      setGenerandoEdp(false);
    }
  }

  const handleEliminarEstadoDePago = async (edpId: string) => {
    if (!obraSeleccionadaId) return;

    try {
        const docRef = doc(firebaseDb, "obras", obraSeleccionadaId, "estadosDePago", edpId);
        await deleteDoc(docRef);
        setEstadosDePago(prev => prev.filter(edp => edp.id !== edpId));
    } catch(err) {
        console.error("Error eliminando estado de pago:", err);
        setError("No se pudo eliminar el estado de pago.");
    }
  }
  
  if (loadingAuth) return <p className="text-sm text-muted-foreground">Cargando sesión...</p>;
  if (!user) return <p className="text-sm text-muted-foreground">Redirigiendo a login...</p>;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold font-headline tracking-tight">Programación de Obras v2.0</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Gestione actividades con precios y registre avances para generar estados de pago.
        </p>
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
                <span>Completadas: {resumenActividades.completadas}</span>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Actividades Programadas</CardTitle>
                <CardDescription>{cargandoActividades ? "Cargando..." : `Mostrando ${actividades.length} actividades.`}</CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nueva Actividad
            </Button>
        </CardHeader>
        <CardContent className="p-0">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Actividad</TableHead>
                        <TableHead>Precio</TableHead>
                        <TableHead>Inicio</TableHead>
                        <TableHead>Fin</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                    {cargandoActividades ? <TableRow><TableCell colSpan={6} className="text-center">Cargando...</TableCell></TableRow> : 
                    actividades.length > 0 ? (actividades.map((act) => (
                        <TableRow key={act.id}>
                            <TableCell className="font-medium">{act.nombreActividad}</TableCell>
                            <TableCell>{act.precioContrato.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })}</TableCell>
                            <TableCell>{act.fechaInicio}</TableCell>
                            <TableCell>{act.fechaFin}</TableCell>
                            <TableCell>
                                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                    <EstadoBadge estado={act.estado} />
                                    <Select value={act.estado} onValueChange={(v) => handleEstadoChange(act.id, v as EstadoActividad)}>
                                        <SelectTrigger className="text-xs h-8 w-full md:w-[120px]"><SelectValue /></SelectTrigger>
                                        <SelectContent>{ESTADOS_ACTIVIDAD.map(e => <SelectItem key={e} value={e} className="text-xs">{e}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
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
                                        <AlertDialogTitle>¿Estás seguro de que deseas eliminar esta actividad?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Esta acción no se puede deshacer. Se eliminará permanentemente la actividad "{act.nombreActividad}".
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
                    ))) : (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No hay actividades para esta obra.</TableCell></TableRow>
                    )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleActividadSubmit}>
            <DialogHeader>
              <DialogTitle>{currentActividad?.id ? "Editar Actividad" : "Crear Nueva Actividad"}</DialogTitle>
              <DialogDescription>
                {currentActividad?.id ? "Modifica los detalles y haz clic en Guardar." : "Completa los detalles para registrar una nueva actividad."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nombreActividad" className="text-right">Nombre</Label>
                <Input id="nombreActividad" name="nombreActividad" value={currentActividad?.nombreActividad || ""} onChange={(e) => setCurrentActividad(prev => prev ? {...prev, nombreActividad: e.target.value} : null)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="fechaInicio" className="text-right">Inicio</Label>
                <Input id="fechaInicio" name="fechaInicio" type="date" value={currentActividad?.fechaInicio || ""} onChange={(e) => setCurrentActividad(prev => prev ? {...prev, fechaInicio: e.target.value} : null)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="fechaFin" className="text-right">Fin</Label>
                <Input id="fechaFin" name="fechaFin" type="date" value={currentActividad?.fechaFin || ""} onChange={(e) => setCurrentActividad(prev => prev ? {...prev, fechaFin: e.target.value} : null)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="precioContrato" className="text-right">Precio</Label>
                <Input id="precioContrato" name="precioContrato" type="number" value={currentActividad?.precioContrato || ""} onChange={(e) => setCurrentActividad(prev => prev ? {...prev, precioContrato: Number(e.target.value)} : null)} className="col-span-3" />
              </div>
              {error && <p className="col-span-4 text-sm font-medium text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button type="submit">Guardar Actividad</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <section className="space-y-4 mt-8">
        <header className="space-y-1">
          <h3 className="text-xl font-semibold">Avance diario por actividad</h3>
          <p className="text-sm text-muted-foreground">Registra el avance para una actividad específica. Esta información alimentará el Estado de Pago.</p>
        </header>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Registrar avance del día</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleAvanceSubmit} className="space-y-4">
                 <div className="space-y-1">
                    <Label htmlFor="avance-actividad" className="text-xs font-medium">Actividad*</Label>
                    <Select value={formAvance.actividadId} onValueChange={(v) => setFormAvance(prev => ({...prev, actividadId: v}))}>
                        <SelectTrigger id="avance-actividad"><SelectValue placeholder="Seleccione una actividad" /></SelectTrigger>
                        <SelectContent>{actividades.map(a => <SelectItem key={a.id} value={a.id}>{a.nombreActividad}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1"><Label htmlFor="avance-fecha" className="text-xs font-medium">Fecha*</Label><Input id="avance-fecha" type="date" value={formAvance.fecha} onChange={(e) => setFormAvance(prev => ({...prev, fecha: e.target.value}))} /></div>
                  <div className="space-y-1"><Label htmlFor="avance-porcentaje" className="text-xs font-medium">Avance Acumulado (%)*</Label><Input id="avance-porcentaje" type="number" min={0} max={100} value={formAvance.porcentajeAvance} onChange={(e) => setFormAvance(prev => ({...prev, porcentajeAvance: e.target.value}))} /></div>
                </div>
                <div className="space-y-1"><Label htmlFor="avance-comentario" className="text-xs font-medium">Comentario</Label><textarea id="avance-comentario" value={formAvance.comentario} onChange={(e) => setFormAvance(prev => ({...prev, comentario: e.target.value}))} rows={3} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" /></div>
                <div className="space-y-1">
                    <Label htmlFor="foto-avance-input" className="text-xs font-medium">Fotos (máx. {MAX_FOTOS}, hasta {MAX_TAMANO_MB}MB c/u)</Label>
                    <Input id="foto-avance-input" type="file" accept="image/*" multiple onChange={handleFileChange} />
                </div>
                 {previews.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                        {previews.map((preview, index) => (
                            <div key={index} className="relative group">
                                <img src={preview} alt={`Vista previa ${index}`} className="w-full h-24 object-cover rounded-md" />
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-1 right-1 h-6 w-6 opacity-50 group-hover:opacity-100"
                                    onClick={() => handleRemoveFile(index)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                 )}
                 <div className="space-y-1"><Label htmlFor="avance-creadoPor" className="text-xs font-medium">Registrado por*</Label><Input id="avance-creadoPor" type="text" value={formAvance.creadoPor} onChange={(e) => setFormAvance(prev => ({...prev, creadoPor: e.target.value}))} placeholder="Ej: Jefe de Obra" /></div>
                <div className="flex items-center gap-2"><Checkbox id="visibleCliente" checked={formAvance.visibleParaCliente} onCheckedChange={(checked) => setFormAvance(prev => ({...prev, visibleParaCliente: !!checked}))} /><Label htmlFor="visibleCliente" className="text-xs text-muted-foreground">Visible para el cliente</Label></div>
                <Button type="submit" disabled={uploading}>
                  {uploading ? "Guardando avance y subiendo fotos..." : "Registrar avance"}
                </Button>
              </form>
            </CardContent>
          </Card>
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-card-foreground">Historial de avances de esta obra</h4>
            {cargandoAvances ? <p className="text-sm text-muted-foreground">Cargando avances...</p> : 
            avances.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay avances registrados para esta obra.</p> : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {avances.map((av) => {
                  const actividadAsociada = actividades.find(a => a.id === av.actividadId);
                  const imagenes = av.fotos && av.fotos.length > 0 ? av.fotos : (av.fotoUrl ? [av.fotoUrl] : []);
                  return (
                  <Card key={av.id} className="overflow-hidden">
                    {imagenes.length > 0 && (
                      <div className={cn("grid gap-1 p-2 bg-muted/20", imagenes.length > 1 ? "grid-cols-3" : "grid-cols-1")}>
                          {imagenes.map((imgUrl, idx) => (
                              <img key={idx} src={imgUrl} alt={`Avance ${av.fecha} - ${idx + 1}`} className="h-48 w-full object-cover rounded-md"/>
                          ))}
                      </div>
                    )}
                    <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="font-semibold text-primary">{av.fecha} · {av.porcentajeAvance}% avance</p>
                                <p className="text-xs font-medium text-foreground mt-1">{actividadAsociada?.nombreActividad ?? "Actividad no encontrada"}</p>
                                <p className="text-xs text-muted-foreground mt-1">Registrado por: {av.creadoPor}</p>
                            </div>
                            <Badge variant="outline" className={cn(av.visibleParaCliente ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600")}>
                                {av.visibleParaCliente ? "Visible cliente" : "Interno"}
                            </Badge>
                        </div>
                        <p className="text-card-foreground/90 text-sm whitespace-pre-line pt-1">{av.comentario}</p>
                    </CardContent>
                  </Card>
                )})}
              </div>
            )}
          </div>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Estados de Pago</CardTitle>
          <CardDescription>Genere y revise los estados de pago de la obra. Cada estado de pago es una foto del avance en un momento determinado.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setDialogEdpOpen(true)}>
            <FilePlus2 className="mr-2 h-4 w-4" />
            Generar Nuevo Estado de Pago
          </Button>

          <Dialog open={dialogEdpOpen} onOpenChange={setDialogEdpOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Generar Estado de Pago</DialogTitle>
                  <DialogDescription>
                    Seleccione la fecha de corte para calcular el avance y generar el informe.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="fecha-corte-edp">Fecha de corte del informe</Label>
                    <Input id="fecha-corte-edp" type="date" value={fechaCorteEdp} onChange={(e) => setFechaCorteEdp(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleGenerarEstadoDePago} disabled={generandoEdp}>
                    {generandoEdp ? "Generando..." : "Confirmar y Generar"}
                  </Button>
                </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-semibold">Historial de Estados de Pago</h4>
            {cargandoEdp ? <p className="text-xs text-muted-foreground">Cargando historial...</p> :
            estadosDePago.length === 0 ? <p className="text-xs text-muted-foreground">No se han generado estados de pago para esta obra.</p> : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Correlativo</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estadosDePago.map(edp => (
                      <TableRow key={edp.id}>
                        <TableCell className="font-medium">EDP-{edp.correlativo.toString().padStart(3, '0')}</TableCell>
                        <TableCell>{edp.fechaGeneracion}</TableCell>
                        <TableCell className="text-right">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(edp.total)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button asChild variant="outline" size="sm">
                                <Link href={`/operaciones/programacion/estado-pago/${obraSeleccionadaId}?edpId=${edp.id}&fechaCorte=${edp.fechaDeCorte}`}>
                                <FileText className="mr-2 h-3 w-3" />
                                Ver
                                </Link>
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm">
                                        <Trash2 className="mr-2 h-3 w-3"/>
                                        Eliminar
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>¿Está seguro de que desea eliminar este estado de pago?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción no se puede deshacer. Se eliminará el registro EDP-{edp.correlativo.toString().padStart(3, '0')} y el correlativo quedará libre.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={() => handleEliminarEstadoDePago(edp.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                        Eliminar
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

export default function ProgramacionPage() {
  return (
    <Suspense fallback={<div>Cargando programación...</div>}>
      <ProgramacionPageInner />
    </Suspense>
  );
}
