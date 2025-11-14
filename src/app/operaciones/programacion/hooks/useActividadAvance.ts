// src/app/operaciones/programacion/hooks/useActividadAvance.ts
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, where, orderBy, onSnapshot, DocumentData } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { ActividadProgramada, AvanceDiario } from '../page';

type AvanceInfo = {
    cantidadAcumulada: number;
    porcentajeAcumulado: number;
};

export function useActividadAvance(obraId: string | null) {
    const [avances, setAvances] = useState<AvanceDiario[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refetchAvances = useCallback(() => {
        if (!obraId) {
            setAvances([]);
            setLoading(false);
            return;
        }
        
        setLoading(true);
        const avancesColRef = collection(firebaseDb, "obras", obraId, "avancesDiarios");
        const q = query(avancesColRef, orderBy("fecha", "desc"));

        const unsubscribe = onSnapshot(q, 
            (snapshot) => {
                const data: AvanceDiario[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AvanceDiario));
                setAvances(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching avances: ", err);
                setError("No se pudieron cargar los avances.");
                setLoading(false);
            }
        );

        return unsubscribe;
    }, [obraId]);

    useEffect(() => {
        const unsubscribe = refetchAvances();
        return () => unsubscribe?.();
    }, [refetchAvances]);
    
    const avancesPorActividad = useMemo(() => {
        const resultado: Record<string, AvanceInfo> = {};
        // Placeholder para un cálculo más complejo si fuera necesario
        return resultado;
    }, [avances]);

    const calcularAvanceParaActividades = useCallback((actividades: ActividadProgramada[]) => {
         const resultado: Record<string, AvanceInfo> = {};
         
         // Filtra solo avances que tengan cantidad, ignorando los fotográficos
         const avancesConCantidad = avances.filter(a => a.tipoRegistro !== 'FOTOGRAFICO' && typeof a.cantidadEjecutada === 'number');

         const avancesPorActividadMap: Record<string, number> = {};

         for (const avance of avancesConCantidad) {
             if (avance.actividadId) {
                if (!avancesPorActividadMap[avance.actividadId]) {
                    avancesPorActividadMap[avance.actividadId] = 0;
                }
                avancesPorActividadMap[avance.actividadId] += Number(avance.cantidadEjecutada || 0);
             }
         }

         for (const act of actividades) {
             const cantidadAcumulada = avancesPorActividadMap[act.id] || 0;
             const porcentajeAcumulado = act.cantidad > 0 ? (cantidadAcumulada / act.cantidad) * 100 : 0;
             resultado[act.id] = {
                 cantidadAcumulada,
                 porcentajeAcumulado: Math.min(100, porcentajeAcumulado),
             };
         }
         return resultado;

    }, [avances]);


    return { avances, avancesPorActividad: calcularAvanceParaActividades(useMemo(() => [], [])), loading, error, refetchAvances, calcularAvanceParaActividades };
}
