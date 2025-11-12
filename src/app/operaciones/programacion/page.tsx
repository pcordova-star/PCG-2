

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
} from "firebase/firestore";
import { firebaseDb, firebaseStorage } from "../../../lib/firebaseClient";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
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

type EstadoActividad = "Pendiente" | "En curso" | "Terminada" | "Atrasada";


type ActividadProgramada = {
  id: string;
  obraId: string;
  nombreActividad: string;
  fechaInicio: string;
  fechaFin: string;
  precioContrato: number;
};

type AvanceDiario = {
  id: string;
  obraId: string;
  actividadId?: string; 
  fecha: string; 
  porcentajeAvance: number;
  comentario: string;
  fotoUrl?: string; 
  fotos?: string[];  
  visibleParaCliente: boolean;
  creadoPor: {
    uid: string;
    displayName: string;
  };
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
  const className = {
    Terminada: "bg-green-100 text-green-800 border-green-200",
    "En curso": "bg-blue-100 text-blue-800 border-blue-200",
    Pendiente: "bg-yellow-100 text-yellow-800 border-yellow-200",
    Atrasada: "bg-red-100 text-red-800 border-red-200"
  }[estado];

  return (
    <Badge variant="outline" className={cn("font-semibold whitespace-nowrap", className)}>
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

  const [formAvance, setFormAvance] = useState({
    actividadId: "null", 
    fecha: new Date().toISOString().slice(0, 10),
    porcentajeAvance: "",
    comentario: "",
    creadoPor: "",
    visibleParaCliente: true,
  });
  const [archivos, setArchivos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const [dialogEdpOpen, setDialogEdpOpen] = useState(false);
  const [fechaCorteEdp, setFechaCorteEdp] = useState(new Date().toISOString().slice(0, 10));

  const avancesPorActividad = useMemo(() => {
    const mapaAvances = new Map<string, number>();
    const avancesOrdenados = [...avances].sort((a,b) => a.fecha < b.fecha ? 1 : -1);

    for (const avance of avancesOrdenados) {
        if (avance.actividadId && !mapaAvances.has(avance.actividadId)) {
            mapaAvances.set(avance.actividadId, avance.porcentajeAvance);
        }
    }
    return mapaAvances;
  }, [avances]);

  const getEstadoActividad = (act: ActividadProgramada): EstadoActividad => {
    const avance = avancesPorActividad.get(act.id) ?? 0;
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
    const estados = actividades.map(getEstadoActividad);
    const pendientes = estados.filter(e => e === "Pendiente").length;
    const enCurso = estados.filter(e => e === "En curso").length;
    const completadas = estados.filter(e => e === "Terminada").length;
    const atrasadas = estados.filter(e => e === "Atrasada").length;
    return { total, pendientes, enCurso, completadas, atrasadas };
  }, [actividades, avancesPorActividad]);

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

      setCargandoAvances(true);
      try {
        const avColRef = collection(firebaseDb, "obras", obraSeleccionadaId, "avancesDiarios");
        const qAv = query(avColRef, orderBy("fecha", "desc"));
        const snapshotAv = await getDocs(qAv);
        const dataAv: AvanceDiario[] = snapshotAv.docs.map((d) => {
          const data = d.data();
          return { 
            id: d.id,
            ...data,
            fecha: data.fecha instanceof Timestamp ? data.fecha.toDate().toISOString() : data.fecha,
          } as AvanceDiario
        });
        setAvances(dataAv);
      } catch (err) {
        console.error("Error cargando avances:", err);
        setError((prev) => (prev ? prev + " " : "") + "No se pudieron cargar los avances diarios.");
      } finally {
        setCargandoAvances(false);
      }

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
    setCurrentActividad(actividad || { nombreActividad: "", fechaInicio: "", fechaFin: "", precioContrato: 0 });
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

    const { nombreActividad, fechaInicio, fechaFin, precioContrato } = currentActividad;
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
      const docData = { obraId: obraSeleccionadaId, nombreActividad, fechaInicio, fechaFin, precioContrato: precioNum };
      
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
        const docRef = doc(firebaseDb, "obras", obraSeleccionadaId, "actividades", actividadId);
        await deleteDoc(docRef);
        setActividades(prev => prev.filter(act => act.id !== actividadId));
    } catch(err) {
        console.error(err);
        setError("No se pudo eliminar la actividad.");
    }
  }

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
    const { actividadId, fecha, porcentajeAvance, comentario, visibleParaCliente } = formAvance;
    const creadoPorNombre = formAvance.creadoPor.trim();
    if (!fecha || !comentario.trim()) {
      setError("La fecha y el comentario son obligatorios.");
      return;
    }
    
    let porcentaje = 0;
    if (porcentajeAvance) {
      porcentaje = Number(porcentajeAvance);
      if (isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100) {
        setError("El porcentaje de avance debe ser un número entre 0 y 100.");
        return;
      }
    }


    setUploading(true);
    setError(null);
    try {
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
        actividadId: actividadId === "null" ? null : actividadId || null, 
        fecha, 
        porcentajeAvance: porcentaje, 
        comentario: comentario.trim(), 
        fotos: urlsFotos,
        fotoUrl: urlsFotos[0] ?? null, 
        creadoPor: {
          uid: user.uid,
          displayName: creadoPorNombre || user.displayName || user.email || ''
        },
        visibleParaCliente, 
        creadoEn: new Date().toISOString(), 
      };
      const docRef = await addDoc(colRef, docData);
      const nuevoAvance: AvanceDiario = { ...docData, id: docRef.id };

      setAvances((prev) => [nuevoAvance, ...prev].sort((a,b) => a.fecha < b.fecha ? 1 : -1));
      
      setFormAvance({ actividadId: "null", fecha: new Date().toISOString().slice(0, 10), porcentajeAvance: "", comentario: "", creadoPor: "", visibleParaCliente: true });
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

  const handleDeleteAvance = async (avance: AvanceDiario) => {
    if (!obraSeleccionadaId) return;

    try {
      // 1. Delete photos from Storage
      const photoUrls = avance.fotos || (avance.fotoUrl ? [avance.fotoUrl] : []);
      if (photoUrls.length > 0) {
        await Promise.all(
          photoUrls.map(async (url) => {
            try {
              const photoRef = ref(firebaseStorage, url);
              await deleteObject(photoRef);
            } catch (storageError: any) {
              // If file not found, we can ignore the error
              if (storageError.code !== 'storage/object-not-found') {
                throw storageError;
              }
            }
          })
        );
      }

      // 2. Delete document from Firestore
      const docRef = doc(firebaseDb, "obras", obraSeleccionadaId, "avancesDiarios", avance.id);
      await deleteDoc(docRef);

      // 3. Update UI state
      setAvances(prev => prev.filter(a => a.id !== avance.id));

    } catch (err) {
      console.error("Error deleting daily progress:", err);
      setError("No se pudo eliminar el registro de avance. Inténtelo de nuevo.");
    }
  };

  const handleGenerarEstadoDePago = async () => {
    if (!obraSeleccionadaId) return;

    setGenerandoEdp(true);
    setError(null);

    try {
      const ultimoCorrelativo = estadosDePago.reduce((max, edp) => Math.max(max, edp.correlativo), 0);
      const nuevoCorrelativo = ultimoCorrelativo + 1;
      
      const actividadesConAvance = actividades.map(act => {
        const ultimoAvance = avances
          .filter(av => av.actividadId === act.id && av.fecha <= fechaCorteEdp) 
          .sort((a, b) => a.fecha > b.fecha ? -1 : 1)[0];
        
        const porcentajeAvance = ultimoAvance?.porcentajeAvance ?? 0;
        const montoProyectado = act.precioContrato * (porcentajeAvance / 100);
        
        return { ...act, porcentajeAvance, montoProyectado };
      });
      
      const subtotal = actividadesConAvance.reduce((sum, act) => sum + act.montoProyectado, 0);
      const iva = subtotal * 0.19;
      const total = subtotal + iva;

      const edpColRef = collection(firebaseDb, "obras", obraSeleccionadaId, "estadosDePago");
      const nuevoEdpDoc = {
        obraId: obraSeleccionadaId,
        correlativo: nuevoCorrelativo,
        fechaGeneracion: new Date().toISOString().slice(0, 10),
        fechaDeCorte: fechaCorteEdp,
        subtotal,
        iva,
        total,
        actividades: actividadesConAvance, 
        creadoEn: new Date().toISOString(),
      };
      
      const docRef = await addDoc(edpColRef, nuevoEdpDoc);
      
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
                <span>Atrasadas: {resumenActividades.atrasadas}</span>
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
                        <TableHead>% Avance Real</TableHead>
                        <TableHead>Inicio</TableHead>
                        <TableHead>Fin</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                    {cargandoActividades ? <TableRow><TableCell colSpan={7} className="text-center">Cargando...</TableCell></TableRow> : 
                    actividades.length > 0 ? (actividades.map((act) => (
                        <TableRow key={act.id}>
                            <TableCell className="font-medium">{act.nombreActividad}</TableCell>
                            <TableCell>{act.precioContrato.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })}</TableCell>
                            <TableCell className="font-semibold">
                                {avancesPorActividad.get(act.id)?.toFixed(1) ?? '0.0'}%
                            </TableCell>
                            <TableCell>{act.fechaInicio}</TableCell>
                            <TableCell>{act.fechaFin}</TableCell>
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
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No hay actividades para esta obra.</TableCell></TableRow>
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
          <h3 className="text-xl font-semibold">Avance diario</h3>
          <p className="text-sm text-muted-foreground">Registra el avance de la obra. Esta información alimentará el Estado de Pago.</p>
        </header>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Registrar avance del día</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleAvanceSubmit} className="space-y-4">
                <div className="space-y-1">
                    <Label htmlFor="avance-actividad" className="text-xs font-medium">Actividad (opcional)</Label>
                    <Select value={formAvance.actividadId} onValueChange={(value) => setFormAvance(prev => ({ ...prev, actividadId: value }))}>
                        <SelectTrigger id="avance-actividad">
                            <SelectValue placeholder="Seleccionar actividad" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="null">
                              <div>Avance General de Obra</div>
                              <div className="text-xs text-muted-foreground">Para fotos o comentarios que no afectan el % de una tarea específica.</div>
                            </SelectItem>
                            {actividades.map(act => (
                                <SelectItem key={act.id} value={act.id}>
                                    {act.nombreActividad}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1"><Label htmlFor="avance-fecha" className="text-xs font-medium">Fecha*</Label><Input id="avance-fecha" type="date" value={formAvance.fecha} onChange={(e) => setFormAvance(prev => ({...prev, fecha: e.target.value}))} /></div>
                  <div className="space-y-1"><Label htmlFor="avance-porcentaje" className="text-xs font-medium">Avance Acumulado (%)</Label><Input id="avance-porcentaje" type="number" min={0} max={100} value={formAvance.porcentajeAvance} onChange={(e) => setFormAvance(prev => ({...prev, porcentajeAvance: e.target.value}))} /></div>
                </div>
                <div className="space-y-1"><Label htmlFor="avance-comentario" className="text-xs font-medium">Comentario*</Label><textarea id="avance-comentario" value={formAvance.comentario} onChange={(e) => setFormAvance(prev => ({...prev, comentario: e.target.value}))} rows={3} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" /></div>
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
                  const actividadAsociada = av.actividadId ? actividades.find(a => a.id === av.actividadId) : null;
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
                                <p className="font-semibold text-primary">{av.fecha}{av.porcentajeAvance ? ` · ${av.porcentajeAvance}% avance` : ''}</p>
                                {actividadAsociada ? (
                                    <p className="text-xs font-medium text-foreground mt-1">{actividadAsociada.nombreActividad}</p>
                                ) : (
                                    <p className="text-xs italic text-muted-foreground mt-1">Avance General</p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">Registrado por: {av.creadoPor?.displayName || av.creadoPor?.uid || 'N/A'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className={cn(av.visibleParaCliente ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600")}>
                                    {av.visibleParaCliente ? "Visible cliente" : "Interno"}
                                </Badge>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-7 w-7">
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">Eliminar Avance</span>
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>¿Desea eliminar este registro de avance?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Esta acción es irreversible. Se eliminará el registro del día {av.fecha} y todas sus fotos asociadas.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteAvance(av)} className="bg-destructive hover:bg-destructive/90">
                                                Eliminar Permanentemente
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
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
