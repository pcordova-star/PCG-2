"use client";

import React, { useEffect, useState, FormEvent, useMemo } from "react";
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
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

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
  responsable: string;
  estado: EstadoActividad;
};

type AvanceDiario = {
  id: string;
  obraId: string;
  fecha: string; // "YYYY-MM-DD"
  porcentajeAvance: number; // avance acumulado a esa fecha (0-100)
  comentario: string;
  fotoUrl?: string;
  visibleParaCliente: boolean;
  creadoPor: string;
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

export default function ProgramacionPage() {
  const { user, loading: loadingAuth } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [obras, setObras] = useState<Obra[]>([]);
  const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>("");

  const [actividades, setActividades] = useState<ActividadProgramada[]>([]);
  const [avances, setAvances] = useState<AvanceDiario[]>([]);

  const [cargandoActividades, setCargandoActividades] = useState(true);
  const [cargandoAvances, setCargandoAvances] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formActividad, setFormActividad] = useState({
    nombreActividad: "",
    fechaInicio: "",
    fechaFin: "",
    responsable: "",
    estado: "Pendiente" as EstadoActividad,
  });

  const [formAvance, setFormAvance] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    porcentajeAvance: "",
    comentario: "",
    creadoPor: "",
    visibleParaCliente: true,
  });
  const [archivoFoto, setArchivoFoto] = useState<File | null>(null);

  const resumenActividades = useMemo(() => {
    const total = actividades.length;
    const pendientes = actividades.filter(a => a.estado === "Pendiente").length;
    const enCurso = actividades.filter(a => a.estado === "En curso").length;
    const completadas = actividades.filter(a => a.estado === "Completada").length;
    return { total, pendientes, enCurso, completadas };
  }, [actividades]);

  // Auth Protection
  useEffect(() => {
    if (!loadingAuth && !user) {
      router.replace("/login");
    }
  }, [loadingAuth, user, router]);

  // Cargar Obras
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

  // Cargar Actividades y Avances de la obra seleccionada
  useEffect(() => {
    if (!obraSeleccionadaId || !user) return;

    async function cargarActividades() {
      try {
        setCargandoActividades(true);
        const actColRef = collection(firebaseDb, "actividadesProgramadas");
        const qAct = query(actColRef, where("obraId", "==", obraSeleccionadaId));
        const snapshotAct = await getDocs(qAct);
        const dataAct: ActividadProgramada[] = snapshotAct.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            obraId: d.obraId,
            nombreActividad: d.nombreActividad ?? "",
            fechaInicio: d.fechaInicio ?? "",
            fechaFin: d.fechaFin ?? "",
            responsable: d.responsable ?? "",
            estado: (d.estado ?? "Pendiente") as EstadoActividad,
          };
        });
        setActividades(dataAct);
      } catch (err) {
        console.error("Error cargando actividades:", err);
        setError("No se pudieron cargar las actividades de la obra.");
      } finally {
        setCargandoActividades(false);
      }
    }

    async function cargarAvances() {
      try {
        setCargandoAvances(true);
        const avColRef = collection(firebaseDb, "avancesDiarios");
        const qAv = query(avColRef, where("obraId", "==", obraSeleccionadaId), orderBy("fecha", "desc"));
        const snapshotAv = await getDocs(qAv);
        const dataAv: AvanceDiario[] = snapshotAv.docs.map((doc) => ({
          ...(doc.data() as any),
          id: doc.id,
        }));
        setAvances(dataAv);
      } catch (err) {
        console.error("Error cargando avances:", err);
        setError((prev) => (prev ? prev + " " : "") + "No se pudieron cargar los avances diarios.");
      } finally {
        setCargandoAvances(false);
      }
    }

    cargarActividades();
    cargarAvances();
  }, [obraSeleccionadaId, user]);
  
  const handleEstadoChange = async (id: string, nuevoEstado: EstadoActividad) => {
    try {
        const docRef = doc(firebaseDb, "actividadesProgramadas", id);
        await updateDoc(docRef, { estado: nuevoEstado });
        setActividades((prev) =>
          prev.map((act) =>
            act.id === id ? { ...act, estado: nuevoEstado } : act
          )
        );
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
    const { nombreActividad, fechaInicio, fechaFin, responsable, estado } = formActividad;
    if (!nombreActividad || !fechaInicio || !fechaFin || !responsable) {
      setError("Todos los campos para la actividad son obligatorios.");
      return;
    }
    try {
      const colRef = collection(firebaseDb, "actividadesProgramadas");
      const docRef = await addDoc(colRef, { obraId: obraSeleccionadaId, ...formActividad });
      const nuevaActividad: ActividadProgramada = { id: docRef.id, obraId: obraSeleccionadaId, ...formActividad };
      setActividades((prev) => [nuevaActividad, ...prev]);
      setFormActividad({ nombreActividad: "", fechaInicio: "", fechaFin: "", responsable: "", estado: "Pendiente" });
    } catch (err) {
      console.error(err);
      setError("No se pudo crear la actividad.");
    }
  }

  const handleAvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obraSeleccionadaId) {
      setError("Debes seleccionar una obra para registrar avance.");
      return;
    }
    if (!user) {
      setError("Debes estar autenticado para registrar avance.");
      return;
    }

    const { fecha, porcentajeAvance, comentario, creadoPor, visibleParaCliente } = formAvance;

    if (!fecha || !porcentajeAvance || !creadoPor) {
      setError("La fecha, el porcentaje de avance y 'registrado por' son obligatorios.");
      return;
    }

    const porcentaje = Number(porcentajeAvance);
    if (isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100) {
      setError("El porcentaje de avance debe ser un número entre 0 y 100.");
      return;
    }

    try {
      setError(null);
      let fotoUrl: string | undefined = undefined;

      if (archivoFoto) {
        const nombreArchivo = `${Date.now()}-${archivoFoto.name}`;
        const storageRef = ref(firebaseStorage, `avances/${obraSeleccionadaId}/${nombreArchivo}`);
        await uploadBytes(storageRef, archivoFoto);
        fotoUrl = await getDownloadURL(storageRef);
      }

      const colRef = collection(firebaseDb, "avancesDiarios");
      const docData = {
        obraId: obraSeleccionadaId,
        fecha,
        porcentajeAvance: porcentaje,
        comentario: comentario.trim(),
        fotoUrl,
        creadoPor: creadoPor.trim(),
        visibleParaCliente,
        creadoEn: new Date().toISOString(),
        creadoPorUid: user.uid,
      };
      const docRef = await addDoc(colRef, docData);

      const nuevoAvance: AvanceDiario = {
        id: docRef.id,
        obraId: obraSeleccionadaId,
        fecha,
        porcentajeAvance: porcentaje,
        comentario: comentario.trim(),
        fotoUrl,
        visibleParaCliente,
        creadoPor: creadoPor.trim(),
      };

      setAvances((prev) => [nuevoAvance, ...prev].sort((a,b) => a.fecha < b.fecha ? 1 : -1));
      setFormAvance({ fecha: new Date().toISOString().slice(0, 10), porcentajeAvance: "", comentario: "", creadoPor: "", visibleParaCliente: true });
      setArchivoFoto(null);
      // Reset file input
      const fileInput = document.getElementById('foto-avance-input') as HTMLInputElement;
      if (fileInput) fileInput.value = "";


    } catch (err) {
      console.error(err);
      setError("No se pudo registrar el avance. Intenta nuevamente.");
      alert("Error: No se pudo registrar el avance. Revisa la consola para más detalles.");
    }
  }
  
  const clientPath = obraSeleccionadaId ? `/clientes/${obraSeleccionadaId}` : "";
  
  if (loadingAuth) {
    return <p className="text-sm text-muted-foreground">Cargando sesión...</p>;
  }
  if (!user) {
    return (
      <p className="text-sm text-muted-foreground">Redirigiendo a login...</p>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-headline tracking-tight">Programación de Obras - PCG 2.0</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Seleccione una obra para ver y gestionar sus actividades programadas.
          Los datos se leen y escriben en Firestore.
        </p>
      </div>

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Selector de Obra</CardTitle>
          <CardDescription>Filtre las actividades por obra.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-2">
            <Label htmlFor="obra-select">Seleccione una obra</Label>
            <Select value={obraSeleccionadaId} onValueChange={setObraSeleccionadaId}>
              <SelectTrigger id="obra-select">
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
        </CardContent>
      </Card>
      
      <section className="mt-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm text-sm flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
            <p className="text-xs font-semibold text-card-foreground">
                Link del panel del cliente para esta obra
            </p>
            <p className="text-[11px] text-muted-foreground">
                Este es el enlace que, en producción, podrás compartir con el mandante
                para que vea el avance diario de su obra.
            </p>
            </div>

            {obraSeleccionadaId ? (
            <div className="flex flex-col items-start gap-1 md:items-end">
                <code className="rounded-lg border bg-muted/50 px-3 py-1 text-xs font-mono text-foreground">
                {clientPath}
                </code>
            </div>
            ) : (
            <p className="text-xs text-muted-foreground">
                Selecciona una obra para ver el link del cliente.
            </p>
            )}
        </div>
      </section>

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
        <CardHeader>
          <CardTitle>Agregar Nueva Actividad</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleActividadSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="nombreActividad">Nombre de la actividad</Label>
                <Input id="nombreActividad" value={formActividad.nombreActividad} onChange={e => setFormActividad(prev => ({...prev, nombreActividad: e.target.value}))} placeholder="Ej: Instalación de faenas" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="responsable">Responsable</Label>
                <Input id="responsable" value={formActividad.responsable} onChange={e => setFormActividad(prev => ({...prev, responsable: e.target.value}))} placeholder="Ej: Ana Gómez" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fechaInicio">Fecha de inicio</Label>
                <Input id="fechaInicio" type="date" value={formActividad.fechaInicio} onChange={e => setFormActividad(prev => ({...prev, fechaInicio: e.target.value}))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fechaFin">Fecha de término</Label>
                <Input id="fechaFin" type="date" value={formActividad.fechaFin} onChange={e => setFormActividad(prev => ({...prev, fechaFin: e.target.value}))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado-select">Estado inicial</Label>
                 <Select value={formActividad.estado} onValueChange={(v) => setFormActividad(prev => ({...prev, estado: v as EstadoActividad}))}>
                  <SelectTrigger id="estado-select">
                    <SelectValue placeholder="Seleccione un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_ACTIVIDAD.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90">
              Agregar Actividad
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Actividades Programadas</CardTitle>
            <CardDescription>
                {cargandoActividades ? "Cargando actividades..." : `Mostrando ${actividades.length} actividades.`}
            </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Actividad</TableHead>
                        <TableHead>Inicio</TableHead>
                        <TableHead>Fin</TableHead>
                        <TableHead>Responsable</TableHead>
                        <TableHead>Estado</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {cargandoActividades ? (
                        <TableRow><TableCell colSpan={5} className="text-center">Cargando...</TableCell></TableRow>
                    ) : actividades.length > 0 ? (
                        actividades.map((actividad) => (
                        <TableRow key={actividad.id}>
                            <TableCell className="font-medium">{actividad.nombreActividad}</TableCell>
                            <TableCell>{actividad.fechaInicio}</TableCell>
                            <TableCell>{actividad.fechaFin}</TableCell>
                            <TableCell>{actividad.responsable}</TableCell>
                            <TableCell>
                                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                    <EstadoBadge estado={actividad.estado} />
                                    <Select 
                                        value={actividad.estado}
                                        onValueChange={(value) => handleEstadoChange(actividad.id, value as EstadoActividad)}
                                    >
                                        <SelectTrigger className="text-xs h-8 w-full md:w-[120px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ESTADOS_ACTIVIDAD.map(e => (
                                                <SelectItem key={e} value={e} className="text-xs">{e}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No hay actividades programadas para esta obra.
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
      
      <section className="space-y-4 mt-8">
        <header className="space-y-1">
          <h3 className="text-xl font-semibold">Avance diario de la obra</h3>
          <p className="text-sm text-muted-foreground">
            Registra el avance del día, sube una foto y deja un comentario. Esta
            información se podrá mostrar en el futuro dashboard del cliente.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Registrar avance del día</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleAvanceSubmit}
                className="space-y-4"
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="avance-fecha" className="text-xs font-medium">Fecha del avance</Label>
                    <Input id="avance-fecha" type="date" value={formAvance.fecha} onChange={(e) => setFormAvance(prev => ({...prev, fecha: e.target.value}))} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="avance-porcentaje" className="text-xs font-medium">Avance acumulado (%)</Label>
                    <Input id="avance-porcentaje" type="number" min={0} max={100} value={formAvance.porcentajeAvance} onChange={(e) => setFormAvance(prev => ({...prev, porcentajeAvance: e.target.value}))} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="avance-comentario" className="text-xs font-medium">Comentario del día</Label>
                  <textarea id="avance-comentario" value={formAvance.comentario} onChange={(e) => setFormAvance(prev => ({...prev, comentario: e.target.value}))} rows={3} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Describe brevemente qué se avanzó hoy en la obra..." />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="foto-avance-input" className="text-xs font-medium">Foto (opcional)</Label>
                  <Input id="foto-avance-input" type="file" accept="image/*" onChange={(e) => setArchivoFoto(e.target.files ? e.target.files[0] : null)} />
                  <p className="text-[11px] text-muted-foreground">La foto se subirá a Firebase Storage.</p>
                </div>
                 <div className="space-y-1">
                    <Label htmlFor="avance-creadoPor" className="text-xs font-medium">Registrado por</Label>
                    <Input id="avance-creadoPor" type="text" value={formAvance.creadoPor} onChange={(e) => setFormAvance(prev => ({...prev, creadoPor: e.target.value}))} placeholder="Ej: Jefe de Obra" />
                </div>
                <div className="flex items-center gap-2">
                    <Checkbox id="visibleCliente" checked={formAvance.visibleParaCliente} onCheckedChange={(checked) => setFormAvance(prev => ({...prev, visibleParaCliente: !!checked}))} />
                    <Label htmlFor="visibleCliente" className="text-xs text-muted-foreground">Mostrar este avance en el dashboard del cliente</Label>
                </div>
                <Button type="submit">Registrar avance</Button>
              </form>
            </CardContent>
          </Card>

          {/* Historial de avances */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-card-foreground">
              Historial de avances de esta obra
            </h4>
            {cargandoAvances ? (
                <p className="text-sm text-muted-foreground">Cargando avances...</p>
            ) : avances.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aún no hay avances registrados para esta obra.
              </p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {avances.map((av) => (
                  <Card key={av.id} className="overflow-hidden">
                    {av.fotoUrl && (
                      <div className="border-b bg-muted/30">
                        <img src={av.fotoUrl} alt={`Avance ${av.fecha}`} className="h-48 w-full object-cover"/>
                      </div>
                    )}
                    <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="font-semibold text-primary">{av.fecha} · {av.porcentajeAvance}% avance</p>
                                <p className="text-xs text-muted-foreground mt-1">Registrado por: {av.creadoPor}</p>
                            </div>
                            <Badge variant="outline" className={cn(av.visibleParaCliente ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600")}>
                                {av.visibleParaCliente ? "Visible cliente" : "Interno"}
                            </Badge>
                        </div>
                        <p className="text-card-foreground/90 text-sm whitespace-pre-line pt-1">{av.comentario}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}
