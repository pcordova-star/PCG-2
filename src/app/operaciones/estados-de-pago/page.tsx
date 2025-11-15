// src/app/operaciones/estados-de-pago/page.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import { useActividadAvance } from "@/app/operaciones/programacion/hooks/useActividadAvance";
import { ActividadProgramada, AvanceDiario, Obra } from "@/app/operaciones/programacion/page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DollarSign, Percent, TrendingUp } from "lucide-react";

function formatCurrency(value: number) {
  return value.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
}

export default function EstadosDePagoPage() {
  const { user, loading: loadingAuth } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [obras, setObras] = useState<Obra[]>([]);
  const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>("");
  const [actividades, setActividades] = useState<ActividadProgramada[]>([]);
  const { avances, calcularAvanceParaActividades } = useActividadAvance(obraSeleccionadaId);
  const [cargandoActividades, setCargandoActividades] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    if (!obraSeleccionadaId || !user) return;
    setCargandoActividades(true);
    async function cargarActividades() {
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
    }
    cargarActividades();
  }, [obraSeleccionadaId, user]);

  const avancesPorActividad = useMemo(() => calcularAvanceParaActividades(actividades), [actividades, calcularAvanceParaActividades]);

  const resumenEconomico = useMemo(() => {
    const montoTotalContrato = actividades.reduce((sum, act) => sum + ((act.cantidad || 0) * (act.precioContrato || 0)), 0);
    const avancesConCantidad = avances.filter(a => a.tipoRegistro !== 'FOTOGRAFICO' && typeof a.cantidadEjecutada === 'number');

    const costoRealAcumulado = avancesConCantidad.reduce((total, avance) => {
        const actividadAsociada = actividades.find(a => a.id === avance.actividadId);
        if (!actividadAsociada) return total;
        const costoDia = (avance.cantidadEjecutada || 0) * (actividadAsociada.precioContrato || 0);
        return total + costoDia;
    }, 0);

    const avanceRealGlobal = montoTotalContrato > 0 ? (costoRealAcumulado / montoTotalContrato) * 100 : 0;
    const montoEjecutado = costoRealAcumulado;
    const saldoPorFacturar = montoEjecutado; // Simplificado por ahora

    return {
      montoTotalContrato,
      avanceRealGlobal: Math.min(100, avanceRealGlobal),
      montoEjecutado,
      saldoPorFacturar,
    };
  }, [actividades, avances]);

  if (loadingAuth) return <p className="text-sm text-muted-foreground">Cargando sesión...</p>;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold font-headline tracking-tight">Estados de Pago</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Gestiona y visualiza el avance económico de tus obras en base a los contratos y avances registrados.
        </p>
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
            <CardHeader>
              <CardTitle>Borrador de Estado de Pago</CardTitle>
              <CardDescription>Esta es una vista previa del estado de pago basada en el avance real registrado.</CardDescription>
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
          
          <div className="flex justify-end">
            <Button disabled>Iniciar Estado de Pago (Próximamente)</Button>
          </div>
        </>
      )}
    </div>
  );
}
