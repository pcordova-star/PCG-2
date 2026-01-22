"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { AvanceDiario, ActividadProgramada } from '../page';

type AvancesPorActividad = {
  [key: string]: {
    cantidadAcumulada: number;
    porcentajeAcumulado: number;
    ultimaFecha: Date | null;
  };
};

export function useActividadAvance(obraId: string, actividades: ActividadProgramada[]) {
  const [avances, setAvances] = useState<AvanceDiario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAvances = useCallback(() => {
    if (!obraId) {
      setAvances([]);
      setLoading(false);
      return () => {};
    }

    setLoading(true);
    const avancesRef = collection(firebaseDb, "obras", obraId, "avancesDiarios");
    const q = query(avancesRef, orderBy("fecha", "desc"));

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const avancesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AvanceDiario));
        setAvances(avancesData);
        setLoading(false);
        setError(null);
      }, 
      (err) => {
        console.error("Error fetching avances:", err);
        setError("No se pudieron cargar los avances.");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [obraId]);

  useEffect(() => {
    const unsubscribe = fetchAvances();
    return () => unsubscribe();
  }, [fetchAvances]);

  const avancesPorActividad = useMemo((): AvancesPorActividad => {
    const mapa: AvancesPorActividad = {};

    // Initialize map
    actividades.forEach(act => {
      mapa[act.id] = { cantidadAcumulada: 0, porcentajeAcumulado: 0, ultimaFecha: null };
    });

    // Process avances
    avances.forEach(avance => {
      if (!avance.actividadId) return;

      const actividad = actividades.find(a => a.id === avance.actividadId);
      if (!actividad || actividad.cantidad <= 0) return;

      const cantidadEjecutada = avance.cantidadEjecutada || 0;
      if (mapa[actividad.id]) {
          mapa[actividad.id].cantidadAcumulada += cantidadEjecutada;

          const fechaAvance = avance.fecha.toDate();
          if (!mapa[actividad.id].ultimaFecha || fechaAvance > mapa[actividad.id].ultimaFecha!) {
              mapa[actividad.id].ultimaFecha = fechaAvance;
          }
      }
    });

    // Calculate percentages
    Object.keys(mapa).forEach(actividadId => {
      const actividad = actividades.find(a => a.id === actividadId);
      if (actividad && actividad.cantidad > 0) {
        const porcentaje = (mapa[actividadId].cantidadAcumulada / actividad.cantidad) * 100;
        mapa[actividadId].porcentajeAcumulado = Math.min(100, porcentaje);
      }
    });

    return mapa;
  }, [avances, actividades]);

  return { avances, loading, error, refetchAvances: fetchAvances, avancesPorActividad };
}
