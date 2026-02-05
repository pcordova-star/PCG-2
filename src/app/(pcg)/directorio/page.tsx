
// src/app/(pcg)/directorio/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, getDocs, doc } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import { Obra, ActividadProgramada, AvanceDiario } from "@/types/pcg";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Siren,
  MessageSquare,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useRouter } from "next/navigation";
import { differenceInDays, isAfter } from "date-fns";

interface ObraConKPIs extends Obra {
  kpis: {
    rdiAbiertos: number;
    hallazgosAbiertos: number;
  };
  avanceProgramado: number;
  avanceReal: number;
}

export default function DirectorioDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [obrasData, setObrasData] = useState<ObraConKPIs[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [filtroNombre, setFiltroNombre] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login/cliente');
      return;
    }

    const fetchObrasConKPIs = async () => {
      setLoadingData(true);
      try {
        const obrasQuery = query(
          collection(firebaseDb, "obras"),
          where("clienteEmail", "==", user.email)
        );
        const obrasSnapshot = await getDocs(obrasQuery);
        const obrasList = obrasSnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Obra)
        );

        const dataPromises = obrasList.map(async (obra) => {
          const rdiQuery = query(
            collection(firebaseDb, "obras", obra.id, "rdi"),
            where("estado", "in", ["enviada", "respondida"])
          );
          const hallazgosQuery = query(
            collection(firebaseDb, "hallazgos"),
            where("obraId", "==", obra.id),
            where("estado", "==", "abierto")
          );

          const actividadesRef = collection(firebaseDb, "obras", obra.id, "actividades");
          const avancesRef = collection(firebaseDb, "obras", obra.id, "avancesDiarios");
          
          const [rdiSnap, hallazgosSnap, actividadesSnap, avancesSnap] = await Promise.all([
            getDocs(rdiQuery),
            getDocs(hallazgosQuery),
            getDocs(actividadesRef),
            getDocs(avancesRef)
          ]);

          const actividades = actividadesSnap.docs.map(d => ({id: d.id, ...d.data()}) as ActividadProgramada);
          const avances = avancesSnap.docs.map(d => ({id: d.id, ...d.data(), fecha: (d.data().fecha as any).toDate()}) as AvanceDiario & {fecha: Date});
          
          const montoTotalContrato = actividades.reduce((sum, act) => sum + ((act.cantidad || 0) * (act.precioContrato || 0)), 0);

          // --- Avance REAL (basado en costo) ---
          const avancesPorActividad = new Map<string, number>();
          avances.forEach(avance => {
              if (avance.actividadId && typeof avance.cantidadEjecutada === 'number') {
                  avancesPorActividad.set(avance.actividadId, (avancesPorActividad.get(avance.actividadId) || 0) + avance.cantidadEjecutada);
              }
          });
          
          const costoRealAcumulado = actividades.reduce((total, act) => {
              const cantidadEjecutada = avancesPorActividad.get(act.id) || 0;
              const avancePorcentaje = act.cantidad > 0 ? cantidadEjecutada / act.cantidad : 0;
              const costoActividad = (act.cantidad || 0) * (act.precioContrato || 0);
              return total + (costoActividad * Math.min(1, avancePorcentaje));
          }, 0);
          
          const avanceReal = montoTotalContrato > 0 ? (costoRealAcumulado / montoTotalContrato) * 100 : 0;
          
          // --- Avance PROGRAMADO (basado en costo y tiempo) ---
          const hoy = new Date();
          hoy.setHours(0, 0, 0, 0);

          let costoProgramadoAcumulado = 0;
          actividades.forEach(act => {
              const totalPartida = (act.cantidad || 0) * (act.precioContrato || 0);
              if (totalPartida === 0 || !act.fechaInicio || !act.fechaFin) return;
              
              const inicioAct = new Date(act.fechaInicio + 'T00:00:00');
              const finAct = new Date(act.fechaFin + 'T00:00:00');
              if (inicioAct > finAct) return;

              if (isAfter(hoy, finAct)) {
                  costoProgramadoAcumulado += totalPartida;
              } else if (hoy >= inicioAct) {
                  const duracion = differenceInDays(finAct, inicioAct) + 1;
                  const diasTranscurridos = differenceInDays(hoy, inicioAct) + 1;
                  const avanceActividad = duracion > 0 ? diasTranscurridos / duracion : 0;
                  costoProgramadoAcumulado += totalPartida * avanceActividad;
              }
          });
          
          const avanceProgramado = montoTotalContrato > 0 ? (costoProgramadoAcumulado / montoTotalContrato) * 100 : 0;

          return {
            ...obra,
            kpis: {
              rdiAbiertos: rdiSnap.size,
              hallazgosAbiertos: hallazgosSnap.size,
            },
            avanceReal: isNaN(avanceReal) ? 0 : avanceReal,
            avanceProgramado: isNaN(avanceProgramado) ? 0 : avanceProgramado,
          };
        });

        const resolvedData = await Promise.all(dataPromises);
        setObrasData(resolvedData);
      } catch (error) {
        console.error("Error fetching director's dashboard data:", error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchObrasConKPIs();
  }, [user, authLoading, router]);

  const filteredObras = useMemo(() => {
    return obrasData.filter(obra => 
      obra.nombreFaena.toLowerCase().includes(filtroNombre.toLowerCase())
    );
  }, [obrasData, filtroNombre]);

  if (authLoading || loadingData) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Cargando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Dashboard
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Dashboard de Directorio</h1>
          <p className="text-muted-foreground">
            Vista consolidada del estado de todas las obras designadas.
          </p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm">
            <Label htmlFor="filtro-obra">Buscar por nombre de obra</Label>
            <Input 
              id="filtro-obra"
              placeholder="Escriba para filtrar..."
              value={filtroNombre}
              onChange={(e) => setFiltroNombre(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Resumen de Proyectos</CardTitle>
            <CardDescription>
                Mostrando {filteredObras.length} de {obrasData.length} proyectos asignados.
            </CardDescription>
        </CardHeader>
        <CardContent>
          {obrasData.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No tienes obras asignadas a tu cuenta de director.</p>
              <p className="text-sm mt-2">Contacta al administrador para que te asigne a los proyectos correspondientes.</p>
            </div>
          ) : (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Proyecto</TableHead>
                        <TableHead className="w-[250px]">Avance (Real/Prog.)</TableHead>
                        <TableHead className="text-center">RDI Abiertos</TableHead>
                        <TableHead className="text-center">Hallazgos Abiertos</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredObras.map(obra => (
                        <TableRow key={obra.id}>
                            <TableCell className="font-medium">{obra.nombreFaena}</TableCell>
                            <TableCell className="min-w-[250px]">
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-2 w-full" title="Avance Físico Real Registrado">
                                        <span className="text-xs w-10 text-muted-foreground text-left">Real:</span>
                                        <Progress value={obra.avanceReal ?? 0} className="h-2" />
                                        <span className="font-mono text-xs w-12 text-right">
                                            {(obra.avanceReal ?? 0).toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 w-full" title="Avance Programado (Según cronograma)">
                                        <span className="text-xs w-10 text-muted-foreground text-left">Prog:</span>
                                        <Progress value={obra.avanceProgramado ?? 0} className="h-2 bg-slate-200" indicatorClassName="bg-slate-400" />
                                        <span className="font-mono text-xs w-12 text-right">
                                            {(obra.avanceProgramado ?? 0).toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <MessageSquare className="h-4 w-4 text-blue-500" />
                                    <span className={`font-bold ${obra.kpis.rdiAbiertos > 0 ? 'text-blue-600' : ''}`}>
                                        {obra.kpis.rdiAbiertos}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <Siren className="h-4 w-4 text-red-500" />
                                    <span className={`font-bold ${obra.kpis.hallazgosAbiertos > 0 ? 'text-red-600' : ''}`}>
                                        {obra.kpis.hallazgosAbiertos}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button asChild size="sm">
                                  <Link href={`/cliente/obras/${obra.id}`}>
                                    Ver Detalle
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                  </Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
