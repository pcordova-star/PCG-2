// src/app/operaciones/avance-en-terreno/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import RegistrarAvanceForm from "@/app/operaciones/programacion/components/RegistrarAvanceForm";
import { ActividadProgramada } from "@/app/operaciones/programacion/page";
import { Obra } from "../programacion/page";

export default function AvanceEnTerrenoPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [obras, setObras] = useState<Obra[]>([]);
  const [actividades, setActividades] = useState<ActividadProgramada[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Cargar obras
        const colRef = collection(firebaseDb, "obras");
        const qObras = query(colRef, orderBy("nombreFaena", "asc"));
        const snapshotObras = await getDocs(qObras);
        const dataObras: Obra[] = snapshotObras.docs.map((d) => ({ ...d.data(), id: d.id } as Obra));
        setObras(dataObras);

        // Si hay obras, carga las actividades de la primera por defecto (o podrías dejarlo vacío)
        if (dataObras.length > 0) {
          const actColRef = collection(firebaseDb, "obras", dataObras[0].id, "actividades");
          const qAct = query(actColRef, orderBy("fechaInicio", "asc"));
          const snapshotAct = await getDocs(qAct);
          const dataAct: ActividadProgramada[] = snapshotAct.docs.map((d) => ({ ...d.data(), id: d.id } as ActividadProgramada));
          setActividades(dataAct);
        }

      } catch (err) {
        console.error("Error fetching data for advance form:", err);
        setError(err instanceof Error ? err.message : "No se pudieron cargar los datos necesarios.");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [user]);
  
  const handleObraChange = async (obraId: string) => {
    if (!obraId) {
        setActividades([]);
        return;
    }
    try {
        const actColRef = collection(firebaseDb, "obras", obraId, "actividades");
        const qAct = query(actColRef, orderBy("fechaInicio", "asc"));
        const snapshotAct = await getDocs(qAct);
        const dataAct: ActividadProgramada[] = snapshotAct.docs.map((d) => ({ ...d.data(), id: d.id } as ActividadProgramada));
        setActividades(dataAct);
    } catch(err) {
        console.error("Error fetching activities for selected obra:", err);
        setError("No se pudieron cargar las actividades de la obra seleccionada.");
    }
  }


  const handleAvanceRegistrado = () => {
    // Redirigir al dashboard después de registrar
    router.push(`/dashboard`);
  };

  if (authLoading || loading) {
    return <p className="text-center text-muted-foreground">Cargando formulario de avance...</p>;
  }

  if (error) {
    return <p className="text-center text-destructive">{error}</p>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold">Registrar Avance en Terreno</h1>
            <p className="text-muted-foreground">Formulario rápido para registrar avances desde tu dispositivo móvil.</p>
        </div>
      </div>
      <RegistrarAvanceForm
        obras={obras}
        actividades={actividades}
        onAvanceRegistrado={handleAvanceRegistrado}
        allowObraSelection={true}
        onObraChanged={handleObraChange}
      />
    </div>
  );
}
