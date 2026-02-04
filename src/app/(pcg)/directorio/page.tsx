// src/app/(pcg)/directorio/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, getDocs, doc } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import { Obra } from "@/types/pcg";
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
import { differenceInDays } from "date-fns";

interface ObraConKPIs extends Obra {
  kpis: {
    rdiAbiertos: number;
    hallazgosAbiertos: number;
  };
  avanceProgramadoLineal: number;
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

          const [rdiSnap, hallazgosSnap] = await Promise.all([
            getDocs(rdiQuery),
            getDocs(hallazgosQuery),
          ]);

          // Calculate linear projected progress
          let avanceProgramadoLineal = 0;
          if (obra.fechaInicio && obra.fechaTermino) {
              const inicio = (obra.fechaInicio as any).toDate ? (obra.fechaInicio as any).toDate() : new Date(obra.fechaInicio + 'T00:00:00');
              const fin = (obra.fechaTermino as any).toDate ? (obra.fechaTermino as any).toDate() : new Date(obra.fechaTermino + 'T00:00:00');
              const hoy = new Date();
              
              if (hoy < inicio) {
                  avanceProgramadoLineal = 0;
              } else if (hoy > fin) {
                  avanceProgramadoLineal = 100;
              } else {
                  const totalDias = differenceInDays(fin, inicio);
                  const diasPasados = differenceInDays(hoy, inicio);
                  if (totalDias > 0) {
                      avanceProgramadoLineal = (diasPasados / totalDias) * 100;
                  }
              }
          }

          return {
            ...obra,
            kpis: {
              rdiAbiertos: rdiSnap.size,
              hallazgosAbiertos: hallazgosSnap.size,
            },
            avanceProgramadoLineal: Math.min(100, avanceProgramadoLineal),
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
                                        <Progress value={obra.avanceAcumulado ?? 0} className="h-2" />
                                        <span className="font-mono text-xs w-12 text-right">
                                            {(obra.avanceAcumulado ?? 0).toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 w-full" title="Avance Programado (Lineal)">
                                        <span className="text-xs w-10 text-muted-foreground text-left">Prog:</span>
                                        <Progress value={obra.avanceProgramadoLineal ?? 0} className="h-2 bg-slate-200" indicatorClassName="bg-slate-400" />
                                        <span className="font-mono text-xs w-12 text-right">
                                            {(obra.avanceProgramadoLineal ?? 0).toFixed(1)}%
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
