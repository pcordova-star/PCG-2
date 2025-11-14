

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
  writeBatch
} from "firebase/firestore";
import { firebaseDb, firebaseStorage } from "../../../lib/firebaseClient";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { FilePlus2, FileText, Trash2, Edit, PlusCircle } from 'lucide-react';
import RegistrarAvanceForm from "./components/RegistrarAvanceForm";
import { useActividadAvance } from "./hooks/useActividadAvance";

export type Obra = {
  id: string;
  nombreFaena: string;
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

type AvanceDiario = {
  id: string;
  obraId: string;
  actividadId?: string;
  fecha: string; // ISO string
  cantidadEjecutada?: number;
  porcentajeAvance: number; // Esto puede ser el % acumulado calculado
  comentario: string;
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

function ProgramacionPageInner() {
  const { user, loading: loadingAuth } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [obras, setObras] = useState<Obra[]>([]);
  const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>("");

  const [actividades, setActividades] = useState<ActividadProgramada[]>([]);
  const [estadosDePago, setEstadosDePago] = useState<EstadoDePago[]>([]);
  const { avancesPorActividad, avances, loading: cargandoAvances, refetchAvances } = useActividadAvance(obraSeleccionadaId);


  const [cargandoActividades, setCargandoActividades] = useState(true);
  const [cargandoEdp, setCargandoEdp] = useState(true);
  const [generandoEdp, setGenerandoEdp] = useState(false);
  
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentActividad, setCurrentActividad] = useState<Partial<ActividadProgramada> | null>(null);
  
  const [dialogEdpOpen, setDialogEdpOpen] = useState(false);
  const [fechaCorteEdp, setFechaCorteEdp] = useState(new Date().toISOString().slice(0, 10));

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

  const cargarDatosDeObra = async (obraId: string) => {
    if (!obraId || !user) {
        setActividades([]);
        setEstadosDePago([]);
        return;
    };
    
    setError(null);
    setCargandoActividades(true);
    try {
        const actColRef = collection(firebaseDb, "obras", obraId, "actividades");
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
    
    refetchAvances();

    setCargandoEdp(true);
    try {
        const edpColRef = collection(firebaseDb, "obras", obraId, "estadosDePago");
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

  useEffect(() => {
    if (obraSeleccionadaId) {
        cargarDatosDeObra(obraSeleccionadaId);
    }
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

    const { nombreActividad, fechaInicio, fechaFin, precioContrato, unidad, cantidad, avanceProgramado } = currentActividad;
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
        cantidad: cantNum,
        avanceProgramado: Number(avanceProgramado) || 0
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

  const handleGenerarEstadoDePago = async () => {
    if (!obraSeleccionadaId) return;

    setGenerandoEdp(true);
    setError(null);

    try {
      const ultimoCorrelativo = estadosDePago.reduce((max, edp) => Math.max(max, edp.correlativo), 0);
      const nuevoCorrelativo = ultimoCorrelativo + 1;
      
      const actividadesConAvance = actividades.map(act => {
        const avanceInfo = avancesPorActividad[act.id];
        const porcentajeAvance = avanceInfo?.porcentajeAcumulado ?? 0;
        const montoProyectado = (act.cantidad || 0) * act.precioContrato * (porcentajeAvance / 100);
        
        return { 
            id: act.id, 
            nombreActividad: act.nombreActividad, 
            precioContrato: act.precioContrato,
            cantidad: act.cantidad,
            unidad: act.unidad,
            porcentajeAvance, 
            montoProyectado 
        };
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
        actividades: actividadesConAvance.map(({ id, nombreActividad, precioContrato, cantidad, unidad, porcentajeAvance, montoProyectado }) => ({
            actividadId: id,
            nombre: nombreActividad,
            precioContrato,
            cantidad,
            unidad,
            porcentajeAvance,
            montoProyectado
        })),
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

  const formatCurrency = (value: number) => {
    return value.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
  };
  
  if (loadingAuth) return <p className="text-sm text-muted-foreground">Cargando sesión...</p>;
  if (!user) return <p className="text-sm text-muted-foreground">Redirigiendo a login...</p>;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold font-headline tracking-tight">Programación de Obras v3.0</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Gestione actividades por cantidad y precio, registre avances diarios por cantidad ejecutada y genere estados de pago.
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
                        <TableHead className="w-[30%]">Actividad</TableHead>
                        <TableHead>Un.</TableHead>
                        <TableHead>Cant.</TableHead>
                        <TableHead>P. Unitario</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Av. Prog. (%)</TableHead>
                        <TableHead>Av. Real (%)</TableHead>
                        <TableHead className="hidden md:table-cell">Inicio</TableHead>
                        <TableHead className="hidden md:table-cell">Fin</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                    {cargandoActividades ? <TableRow><TableCell colSpan={11} className="text-center">Cargando...</TableCell></TableRow> : 
                    actividades.length > 0 ? (actividades.map((act) => {
                      const total = (act.cantidad ?? 0) * (act.precioContrato ?? 0);
                      const avanceInfo = avancesPorActividad[act.id];
                      return (
                        <TableRow key={act.id}>
                            <TableCell className="font-medium">{act.nombreActividad}</TableCell>
                            <TableCell>{act.unidad ?? '-'}</TableCell>
                            <TableCell>{act.cantidad ?? '-'}</TableCell>
                            <TableCell>{formatCurrency(act.precioContrato)}</TableCell>
                            <TableCell>{total > 0 ? formatCurrency(total) : '-'}</TableCell>
                            <TableCell>{act.avanceProgramado ?? '0'}%</TableCell>
                            <TableCell className="font-semibold">
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
                                        <AlertDialogTitle>¿Estás seguro de que deseas eliminar esta actividad?</AlertDialogTitle>
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
              <DialogTitle>{currentActividad?.id ? "Editar Actividad" : "Crear Nueva Actividad"}</DialogTitle>
              <DialogDescription>
                {currentActividad?.id ? "Modifica los detalles y haz clic en Guardar." : "Completa los detalles para registrar una nueva actividad."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2 col-span-full"><Label>Nombre Actividad*</Label><Input value={currentActividad?.nombreActividad || ""} onChange={(e) => setCurrentActividad(prev => prev ? {...prev, nombreActividad: e.target.value} : null)} /></div>
              <div className="space-y-2"><Label>Unidad*</Label><Input value={currentActividad?.unidad || ""} onChange={(e) => setCurrentActividad(prev => prev ? {...prev, unidad: e.target.value} : null)} placeholder="m², m³, glb, etc."/></div>
              <div className="space-y-2"><Label>Cantidad*</Label><Input type="number" value={currentActividad?.cantidad || ""} onChange={(e) => setCurrentActividad(prev => prev ? {...prev, cantidad: Number(e.target.value)} : null)} /></div>
              <div className="space-y-2"><Label>Precio Unitario*</Label><Input type="number" value={currentActividad?.precioContrato || ""} onChange={(e) => setCurrentActividad(prev => prev ? {...prev, precioContrato: Number(e.target.value)} : null)} /></div>
              <div className="space-y-2"><Label>Fecha Inicio*</Label><Input type="date" value={currentActividad?.fechaInicio || ""} onChange={(e) => setCurrentActividad(prev => prev ? {...prev, fechaInicio: e.target.value} : null)} /></div>
              <div className="space-y-2"><Label>Fecha Fin</Label><Input type="date" value={currentActividad?.fechaFin || ""} onChange={(e) => setCurrentActividad(prev => prev ? {...prev, fechaFin: e.target.value} : null)} /></div>
              <div className="space-y-2"><Label>Avance Programado (%)</Label><Input type="number" min="0" max="100" value={currentActividad?.avanceProgramado || ""} onChange={(e) => setCurrentActividad(prev => prev ? {...prev, avanceProgramado: Number(e.target.value)} : null)} /></div>

              {error && <p className="col-span-full text-sm font-medium text-destructive">{error}</p>}
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
        <div className="grid gap-6">
          {obraSeleccionadaId && <RegistrarAvanceForm obraId={obraSeleccionadaId} actividades={actividades} onAvanceRegistrado={refetchAvances} />}
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
                                <Link href={`/operaciones/programacion/estado-pago/${obraSeleccionadaId}?edpId=${edp.id}&fechaCorte=${edp.fechaDeCorte}`} target="_blank">
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
                                        Esta acción no se puede deshacer. Se eliminará el registro EDP-{edp.correlativo.toString().padStart(3, '0')}} y el correlativo quedará libre.
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
