// src/app/operaciones/estados-de-pago/page.tsx
"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, getDocs, query, orderBy, addDoc, doc, deleteDoc, serverTimestamp, writeBatch, getDoc } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import { useActividadAvance } from "@/app/operaciones/programacion/hooks/useActividadAvance";
import { ActividadProgramada, AvanceDiario } from "@/app/operaciones/programacion/page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DollarSign, Percent, TrendingUp, ArrowLeft, FilePlus2, FileText, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";


type Obra = {
  id: string;
  nombreFaena: string;
  [key: string]: any;
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


function formatCurrency(value: number) {
  return value.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
}

function EstadosDePagoPageInner() {
  const { user, loading: loadingAuth } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [obras, setObras] = useState<Obra[]>([]);
  const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>("");
  const [actividades, setActividades] = useState<ActividadProgramada[]>([]);
  const [estadosDePago, setEstadosDePago] = useState<EstadoDePago[]>([]);
  
  const { avances, calcularAvanceParaActividades } = useActividadAvance(obraSeleccionadaId);
  const [cargandoActividades, setCargandoActividades] = useState(true);
  const [cargandoEdp, setCargandoEdp] = useState(true);
  const [generandoEdp, setGenerandoEdp] = useState(false);
  
  const [error, setError] = useState<string | null>(null);

  const [dialogEdpOpen, setDialogEdpOpen] = useState(false);
  const [fechaCorteEdp, setFechaCorteEdp] = useState(new Date().toISOString().slice(0, 10));

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
          ...doc.data(),
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
    if (!obraSeleccionadaId || !user) return;

    const cargarDatosObra = async () => {
        setCargandoActividades(true);
        setCargandoEdp(true);
        try {
            const actColRef = collection(firebaseDb, "obras", obraSeleccionadaId, "actividades");
            const qAct = query(actColRef, orderBy("fechaInicio", "asc"));
            const snapshotAct = await getDocs(qAct);
            const dataAct: ActividadProgramada[] = snapshotAct.docs.map((d) => ({ ...d.data(), id: d.id } as ActividadProgramada));
            setActividades(dataAct);

            const edpColRef = collection(firebaseDb, "obras", obraSeleccionadaId, "estadosDePago");
            const qEdp = query(edpColRef, orderBy("correlativo", "desc"));
            const snapshotEdp = await getDocs(qEdp);
            const dataEdp: EstadoDePago[] = snapshotEdp.docs.map((d) => ({ ...d.data(), id: d.id } as EstadoDePago));
            setEstadosDePago(dataEdp);

        } catch (err) {
            console.error("Error cargando datos:", err);
            setError("No se pudieron cargar los datos de la obra.");
        } finally {
            setCargandoActividades(false);
            setCargandoEdp(false);
        }
    }
    cargarDatosObra();
  }, [obraSeleccionadaId, user]);

  const avancesPorActividad = useMemo(() => calcularAvanceParaActividades(actividades), [actividades, calcularAvanceParaActividades]);

  const resumenEconomico = useMemo(() => {
    const montoTotalContrato = actividades.reduce((sum, act) => sum + ((act.cantidad || 0) * (act.precioContrato || 0)), 0);
    
    const costoRealAcumulado = actividades.reduce((total, act) => {
        const avance = avancesPorActividad[act.id]?.porcentajeAcumulado ?? 0;
        const montoActividad = (act.cantidad || 0) * (act.precioContrato || 0);
        return total + (montoActividad * (avance / 100));
    }, 0);

    const avanceRealGlobal = montoTotalContrato > 0 ? (costoRealAcumulado / montoTotalContrato) * 100 : 0;
    const montoEjecutado = costoRealAcumulado;
    const saldoPorFacturar = montoEjecutado;

    return {
      montoTotalContrato,
      avanceRealGlobal: Math.min(100, avanceRealGlobal),
      montoEjecutado,
      saldoPorFacturar,
    };
  }, [actividades, avancesPorActividad]);

  const handleGenerarEstadoDePago = async () => {
    if (!obraSeleccionadaId) return;

    setGenerandoEdp(true);
    setError(null);

    try {
      const ultimoCorrelativo = estadosDePago.reduce((max, edp) => Math.max(max, edp.correlativo), 0);
      const nuevoCorrelativo = ultimoCorrelativo + 1;
      
      const avancesCalculados = calcularAvanceParaActividades(actividades, fechaCorteEdp);
      
      const items = actividades.map(act => {
        const avanceInfo = avancesCalculados[act.id];
        const porcentajeAvance = avanceInfo?.porcentajeAcumulado ?? 0;
        const montoProyectado = (act.cantidad || 0) * act.precioContrato * (porcentajeAvance / 100);
        
        return { 
            actividadId: act.id, 
            nombre: act.nombreActividad, 
            precioContrato: act.precioContrato,
            cantidad: act.cantidad,
            unidad: act.unidad,
            porcentajeAvance, 
            montoProyectado 
        };
      });
      
      const subtotal = items.reduce((sum, item) => sum + item.montoProyectado, 0);
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
        actividades: items,
        creadoEn: serverTimestamp(),
      };
      
      const docRef = await addDoc(edpColRef, nuevoEdpDoc);
      
      setEstadosDePago(prev => [{...nuevoEdpDoc, id: docRef.id, creadoEn: new Date().toISOString() } as EstadoDePago, ...prev].sort((a,b) => b.correlativo - a.correlativo));
      setDialogEdpOpen(false);
      
      toast({
        title: "Estado de Pago Generado",
        description: `Se ha creado el EDP-${nuevoCorrelativo.toString().padStart(3, '0')}. Redirigiendo a la vista de impresión...`
      });

      router.push(`/operaciones/programacion/estado-pago/${obraSeleccionadaId}?edpId=${docRef.id}`);

    } catch (err) {
      console.error("Error generando estado de pago:", err);
      setError("No se pudo generar el estado de pago. Inténtelo de nuevo.");
      toast({ variant: "destructive", title: "Error", description: "No se pudo generar el estado de pago." });
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
        toast({ title: "Estado de Pago Eliminado", description: "El registro ha sido eliminado correctamente." });
    } catch(err) {
        console.error("Error eliminando estado de pago:", err);
        setError("No se pudo eliminar el estado de pago.");
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el estado de pago." });
    }
  }


  if (loadingAuth) return <p className="text-sm text-muted-foreground">Cargando sesión...</p>;

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
            <h1 className="text-4xl font-bold font-headline tracking-tight">Estados de Pago</h1>
            <p className="mt-2 text-lg text-muted-foreground">
            Gestiona y visualiza el avance económico de tus obras en base a los contratos y avances registrados.
            </p>
        </div>
      </header>

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Selector de Obra</CardTitle>
          <CardDescription>Filtre para ver el estado de pago de una obra específica.</CardDescription>
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

      {obraSeleccionadaId && (
        <>
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Monto Total Contrato</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(resumenEconomico.montoTotalContrato)}</div>
                      <p className="text-xs text-muted-foreground">Valor total de las actividades programadas.</p>
                  </CardContent>
              </Card>
               <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avance Físico Global</CardTitle>
                      <Percent className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">{resumenEconomico.avanceRealGlobal.toFixed(1)}%</div>
                      <p className="text-xs text-muted-foreground">Basado en el costo real ejecutado vs el total.</p>
                  </CardContent>
              </Card>
               <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Monto Ejecutado a la Fecha</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(resumenEconomico.montoEjecutado)}</div>
                      <p className="text-xs text-muted-foreground">Valor del trabajo completado hasta hoy.</p>
                  </CardContent>
              </Card>
               <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Saldo por Facturar (Ref.)</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(resumenEconomico.saldoPorFacturar)}</div>
                      <p className="text-xs text-muted-foreground">Monto ejecutado pendiente de pago.</p>
                  </CardContent>
              </Card>
          </section>

           <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Estados de Pago Generados</CardTitle>
                <CardDescription>Historial de los estados de pago generados para la obra seleccionada.</CardDescription>
              </div>
              <Button onClick={() => setDialogEdpOpen(true)} className="mt-4 sm:mt-0">
                <FilePlus2 className="mr-2 h-4 w-4" />
                Generar Nuevo Estado de Pago
              </Button>
            </CardHeader>
            <CardContent>
                {cargandoEdp ? <p className="text-sm text-muted-foreground">Cargando historial...</p> :
                estadosDePago.length === 0 ? <p className="text-sm text-muted-foreground">No se han generado estados de pago para esta obra.</p> : (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Correlativo</TableHead>
                          <TableHead>Fecha Generación</TableHead>
                          <TableHead>Fecha Corte</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {estadosDePago.map(edp => (
                          <TableRow key={edp.id}>
                            <TableCell className="font-medium">EDP-{edp.correlativo.toString().padStart(3, '0')}</TableCell>
                            <TableCell>{new Date(edp.fechaGeneracion + 'T00:00:00').toLocaleDateString('es-CL')}</TableCell>
                            <TableCell>{new Date(edp.fechaDeCorte + 'T00:00:00').toLocaleDateString('es-CL')}</TableCell>
                            <TableCell className="text-right">{formatCurrency(edp.total)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button asChild variant="outline" size="sm">
                                    <Link href={`/operaciones/programacion/estado-pago/${obraSeleccionadaId}?edpId=${edp.id}`} target="_blank">
                                    <FileText className="mr-2 h-3 w-3" />
                                    Ver
                                    </Link>
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-9 w-9">
                                            <Trash2 className="h-4 w-4"/>
                                            <span className="sr-only">Eliminar</span>
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>¿Está seguro de que desea eliminar este estado de pago?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta acción no se puede deshacer. Se eliminará el registro EDP-{edp.correlativo.toString().padStart(3, '0')}.
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
            </CardContent>
          </Card>
          
           <Dialog open={dialogEdpOpen} onOpenChange={setDialogEdpOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Generar Estado de Pago</DialogTitle>
                  <DialogDescription>
                    Seleccione la fecha de corte para calcular el avance y generar el informe. El sistema considerará todos los avances registrados hasta esta fecha.
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

          <Card>
            <CardHeader>
              <CardTitle>Borrador de Estado de Pago</CardTitle>
              <CardDescription>Esta es una vista previa del estado de pago basada en el avance real registrado hasta la fecha de hoy.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30%]">Actividad</TableHead>
                      <TableHead>Un.</TableHead>
                      <TableHead>Cant.</TableHead>
                      <TableHead>P. Unitario</TableHead>
                      <TableHead>Total Partida</TableHead>
                      <TableHead>Avance Real (%)</TableHead>
                      <TableHead className="text-right">Monto Ejecutado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cargandoActividades ? (
                      <TableRow><TableCell colSpan={7} className="text-center h-24">Cargando actividades...</TableCell></TableRow>
                    ) : actividades.length === 0 ? (
                       <TableRow><TableCell colSpan={7} className="text-center h-24">No hay actividades programadas para esta obra.</TableCell></TableRow>
                    ) : (
                      actividades.map(act => {
                        const totalPartida = (act.cantidad || 0) * (act.precioContrato || 0);
                        const avance = avancesPorActividad[act.id] || { porcentajeAcumulado: 0 };
                        const montoEjecutado = totalPartida * (avance.porcentajeAcumulado / 100);

                        return (
                          <TableRow key={act.id}>
                            <TableCell className="font-medium">{act.nombreActividad}</TableCell>
                            <TableCell>{act.unidad || '-'}</TableCell>
                            <TableCell>{act.cantidad || '-'}</TableCell>
                            <TableCell>{formatCurrency(act.precioContrato)}</TableCell>
                            <TableCell className="font-semibold">{formatCurrency(totalPartida)}</TableCell>
                            <TableCell className="font-semibold text-blue-600">{avance.porcentajeAcumulado.toFixed(1)}%</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(montoEjecutado)}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default function EstadosDePagoPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <EstadosDePagoPageInner />
        </Suspense>
    )
}
