// src/app/operaciones/programacion/hooks/useActividadAvance.ts
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, where, orderBy, onSnapshot, DocumentData } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { ActividadProgramada } from '../page';

type AvanceDiarioDoc = {
    id: string;
    actividadId: string;
    cantidadEjecutada: number;
    porcentajeAvance?: number; // Para compatibilidad con datos antiguos
    fecha: { toDate: () => Date };
} & DocumentData;

type AvanceInfo = {
    cantidadAcumulada: number;
    porcentajeAcumulado: number;
};

export function useActividadAvance(obraId: string | null) {
    const [avances, setAvances] = useState<AvanceDiarioDoc[]>([]);
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
                const data: AvanceDiarioDoc[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AvanceDiarioDoc));
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
        const mapa = new Map<string, { cantidadAcumulada: number; ultimoPorcentaje: number }>();
        
        // No necesitamos ordenar aquí porque sumamos todo
        for (const avance of avances) {
            if (avance.actividadId) {
                const info = mapa.get(avance.actividadId) || { cantidadAcumulada: 0, ultimoPorcentaje: 0 };
                info.cantidadAcumulada += Number(avance.cantidadEjecutada || 0);

                // Para mantener el porcentaje si es el más reciente (aunque ahora se calcula).
                // Ordenar primero por fecha descendente asegura que el primer `porcentajeAvance` que encontremos es el más reciente.
                if (info.ultimoPorcentaje === 0 && avance.porcentajeAcumuladoCalculado) {
                    info.ultimoPorcentaje = avance.porcentajeAcumuladoCalculado;
                } else if (info.ultimoPorcentaje === 0 && avance.porcentajeAvance) {
                    // Fallback para datos antiguos
                    info.ultimoPorcentaje = avance.porcentajeAvance;
                }

                mapa.set(avance.actividadId, info);
            }
        }
        
        // Ahora convertimos el mapa al formato final con el porcentaje calculado
        const resultado: Record<string, AvanceInfo> = {};
        for(const [actividadId, info] of mapa.entries()) {
            resultado[actividadId] = {
                cantidadAcumulada: info.cantidadAcumulada,
                porcentajeAcumulado: info.ultimoPorcentaje, // Usamos el porcentaje más reciente guardado
            };
        }

        return resultado;

    }, [avances]);

    const calcularAvanceParaActividades = useCallback((actividades: ActividadProgramada[]) => {
         const resultado: Record<string, AvanceInfo> = {};
         
         const avancesPorActividadMap: Record<string, number> = {};

         for (const avance of avances) {
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


    return { avances, avancesPorActividad, loading, error, refetchAvances, calcularAvanceParaActividades };
}
