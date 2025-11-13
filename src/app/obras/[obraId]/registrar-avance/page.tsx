// src/app/obras/[obraId]/registrar-avance/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { collection, getDocs, query, orderBy, doc, getDoc } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import RegistrarAvanceForm from "@/app/operaciones/programacion/components/RegistrarAvanceForm";
import { ActividadProgramada } from "@/app/operaciones/programacion/page";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

type Obra = {
  id: string;
  nombreFaena: string;
};

export default function RegistrarAvanceObraPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const obraId = params.obraId as string;

  const [obra, setObra] = useState<Obra | null>(null);
  const [actividades, setActividades] = useState<ActividadProgramada[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!obraId || !user) return;

    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Cargar datos de la obra
        const obraRef = doc(firebaseDb, "obras", obraId);
        const obraSnap = await getDoc(obraRef);
        if (!obraSnap.exists()) {
          throw new Error("La obra no fue encontrada.");
        }
        setObra({ id: obraSnap.id, ...obraSnap.data() } as Obra);

        // Cargar actividades de la obra
        const actColRef = collection(firebaseDb, "obras", obraId, "actividades");
        const qAct = query(actColRef, orderBy("fechaInicio", "asc"));
        const snapshotAct = await getDocs(qAct);
        const dataAct: ActividadProgramada[] = snapshotAct.docs.map((d) => ({ ...d.data(), id: d.id } as ActividadProgramada));
        setActividades(dataAct);

      } catch (err) {
        console.error("Error fetching data for advance form:", err);
        setError(err instanceof Error ? err.message : "No se pudieron cargar los datos necesarios.");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [obraId, user]);

  const handleAvanceRegistrado = () => {
    // Redirigir a la página de la obra o a la de programación después de registrar
    router.push(`/obras`);
  };

  if (authLoading || loading) {
    return <p className="text-center text-muted-foreground">Cargando formulario de avance...</p>;
  }

  if (error) {
    return <p className="text-center text-destructive">{error}</p>;
  }

  if (!obra) {
     return <p className="text-center text-muted-foreground">No se encontró la obra.</p>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
         <Button variant="outline" size="icon" asChild>
            <Link href="/obras">
                <ArrowLeft />
            </Link>
         </Button>
        <div>
            <h1 className="text-2xl font-bold">Registrar Avance en Terreno</h1>
            <p className="text-muted-foreground">Estás registrando un avance para la obra: <strong>{obra.nombreFaena}</strong></p>
        </div>
      </div>
      <RegistrarAvanceForm
        obraId={obraId}
        actividades={actividades}
        onAvanceRegistrado={handleAvanceRegistrado}
      />
    </div>
  );
}
