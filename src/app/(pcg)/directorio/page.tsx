// src/app/(pcg)/directorio/page.tsx
"use client";

import { useEffect, useState } from "react";
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Siren,
  MessageSquare,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useRouter } from "next/navigation";

interface ObraConKPIs extends Obra {
  kpis: {
    rdiAbiertos: number;
    hallazgosAbiertos: number;
  };
}

export default function DirectorioDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [obrasData, setObrasData] = useState<ObraConKPIs[]>([]);
  const [loadingData, setLoadingData] = useState(true);

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
          // Consulta para RDIs abiertos
          const rdiQuery = query(
            collection(firebaseDb, "obras", obra.id, "rdi"),
            where("estado", "in", ["enviada", "respondida"])
          );
          // Consulta para Hallazgos de seguridad abiertos
          const hallazgosQuery = query(
            collection(firebaseDb, "hallazgos"),
            where("obraId", "==", obra.id),
            where("estado", "==", "abierto")
          );

          const [rdiSnap, hallazgosSnap] = await Promise.all([
            getDocs(rdiQuery),
            getDocs(hallazgosQuery),
          ]);

          return {
            ...obra,
            kpis: {
              rdiAbiertos: rdiSnap.size,
              hallazgosAbiertos: hallazgosSnap.size,
            },
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

      {obrasData.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Sin Obras Asignadas</CardTitle>
            <CardDescription>
              Actualmente no tienes obras asignadas a tu cuenta de director.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Contacta al administrador para que te asigne a los proyectos correspondientes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {obrasData.map((obra) => (
            <Card key={obra.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{obra.nombreFaena}</CardTitle>
                <CardDescription>
                  Avance Físico General: {obra.avanceAcumulado?.toFixed(1) ?? '0.0'}%
                </CardDescription>
                <Progress value={obra.avanceAcumulado ?? 0} className="mt-2 h-2" />
              </CardHeader>
              <CardContent className="flex-grow space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground">Indicadores Clave</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                      RDI Abiertos
                    </span>
                    <span className={`font-bold ${obra.kpis.rdiAbiertos > 0 ? 'text-blue-600' : ''}`}>
                      {obra.kpis.rdiAbiertos}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2">
                      <Siren className="h-4 w-4 text-red-500" />
                      Hallazgos de Seguridad Abiertos
                    </span>
                    <span className={`font-bold ${obra.kpis.hallazgosAbiertos > 0 ? 'text-red-600' : ''}`}>
                      {obra.kpis.hallazgosAbiertos}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      Último Estado de Pago
                    </span>
                    <span className="font-bold text-muted-foreground">
                      N/A
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href={`/cliente/obras/${obra.id}`}>
                    Ver Detalle de la Obra
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
