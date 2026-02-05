
// src/app/cliente/obras/[obraId]/page.tsx
"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { notFound, useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Percent, Calendar, CheckCircle, ArrowLeft } from 'lucide-react';
import ImageFromStorage from '@/components/client/ImageFromStorage';
import PrintButton from '@/components/client/PrintButton';
import { Button } from '@/components/ui/button';
import { collection, getDocs, query, where, orderBy, doc, getDoc, limit } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { useAuth } from '@/context/AuthContext';
import { differenceInDays, isAfter } from 'date-fns';

type Obra = {
    id: string;
    nombreFaena: string;
    direccion: string;
    mandante: string;
    clienteEmail: string;
    [key: string]: any; 
};

// --- Tipos para cálculos de avance ---
type ActividadProgramada = {
    id: string;
    nombreActividad: string;
    fechaInicio: string;
    fechaFin: string;
    precioContrato: number; 
    cantidad: number;
    estado?: string;
};
type AvanceDiario = {
  id: string;
  actividadId: string;
  fecha: { toDate: () => Date };
  cantidadEjecutada?: number;
};

type Avance = {
    id: string;
    fecha: string; 
    porcentaje?: number;
    comentario?: string;
    fotos?: string[];
};

type PublicObraData = {
  obraId: string;
  nombre: string;
  direccion: string;
  mandante: string;
  contacto: { email: string };
  avanceReal: number;
  avanceProgramado: number;
  ultimaActualizacion: string | null;
  actividades: { programadas: number; completadas: number };
  avancesPublicados: Avance[];
};


function formatCL(iso?: string | null) {
  if (!iso) return "N/D";
  try {
    return new Intl.DateTimeFormat("es-CL", {
      dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago"
    }).format(new Date(iso));
  } catch {
    return "N/D";
  }
}

function ClienteObraPageInner() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, role, loading: authLoading } = useAuth();
    const obraId = params.obraId as string;
    
    const [data, setData] = useState<PublicObraData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isPreview = searchParams.get('preview') === 'true';
    
    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/login/usuario'); // Redirige al login general si no hay usuario
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (!obraId || !user) return;

        async function getObraData(id: string): Promise<PublicObraData | null> {
            try {
                const obraRef = doc(firebaseDb, 'obras', id);
                const obraDoc = await getDoc(obraRef);
        
                if (!obraDoc.exists()) return null;
        
                const obraData = obraDoc.data() as Obra;
                
                // Security check:
                const isSuperAdmin = role === 'superadmin';
                const isAssignedDirector = user.email && obraData.clienteEmail && user.email.toLowerCase() === obraData.clienteEmail.toLowerCase();
                
                if (!isPreview && !isSuperAdmin && !isAssignedDirector) {
                    setError("No tienes permiso para ver esta obra.");
                    return null;
                }

                // --- Lógica de cálculo de avance ---
                const actividadesRef = collection(firebaseDb, "obras", obraId, "actividades");
                const avancesRef = collection(firebaseDb, "obras", obraId, "avancesDiarios");
                
                const [actividadesSnap, avancesSnap, avancesPublicadosSnap] = await Promise.all([
                    getDocs(actividadesRef),
                    getDocs(avancesRef),
                    getDocs(query(
                        collection(firebaseDb, "obras", obraId, "avancesDiarios"),
                        where("visibleCliente", "==", true),
                        orderBy("fecha", "desc"),
                        limit(10)
                    )),
                ]);

                const actividades = actividadesSnap.docs.map(d => ({id: d.id, ...d.data()}) as ActividadProgramada);
                const avances = avancesSnap.docs.map(d => ({id: d.id, ...d.data(), fecha: (d.data().fecha as any).toDate()}) as AvanceDiario);
                
                const programadas = actividades.length;
                const completadas = actividades.filter(d => d.estado === 'Completada').length;

                const montoTotalContrato = actividades.reduce((sum, act) => sum + ((act.cantidad || 0) * (act.precioContrato || 0)), 0);

                // Avance REAL (basado en costo)
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
                
                // Avance PROGRAMADO (basado en costo y tiempo)
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
                // --- Fin lógica de cálculo ---

                const avancesPublicados: Avance[] = avancesPublicadosSnap.docs.map(d => {
                    const x = d.data();
                    const fecha = x.fecha?.toDate ? x.fecha.toDate() : new Date(x.fecha);
                    return {
                        id: d.id,
                        fecha: fecha.toISOString(),
                        porcentaje: x.porcentajeAvance,
                        comentario: x.comentario,
                        fotos: x.fotos || (x.fotoUrl ? [x.fotoUrl] : []),
                    };
                });
                
                const ultimoAvance = avancesPublicados[0];
                const ultimaActualizacion = ultimoAvance?.fecha ?? obraData.ultimaActualizacion?.toDate().toISOString() ?? null;

                return {
                    obraId,
                    nombre: obraData.nombreFaena || 'Obra sin nombre',
                    direccion: obraData.direccion || '',
                    mandante: obraData.mandante || '',
                    contacto: { email: obraData.clienteEmail || '' },
                    avanceReal: isNaN(avanceReal) ? 0 : avanceReal,
                    avanceProgramado: isNaN(avanceProgramado) ? 0 : avanceProgramado,
                    ultimaActualizacion,
                    actividades: { programadas, completadas },
                    avancesPublicados,
                };

            } catch (err: any) {
                console.error("Error fetching obra data:", err);
                return null;
            }
        }

        getObraData(obraId).then(result => {
            if (result) {
                setData(result);
            } else {
                setError(prevError => prevError || "No se pudo encontrar la obra con el ID proporcionado.");
            }
            setLoading(false);
        });

    }, [obraId, user, isPreview, role]);

  if (loading || authLoading) {
      return <div className="text-center p-8">Cargando datos de la obra...</div>
  }
  
  if (error && !data) {
      return <div className="p-8 text-center text-destructive">{error}</div>;
  }
  
  if (!user) {
    return (
       <div className="flex flex-col items-center justify-center min-h-screen col-span-full">
          <h1 className="text-2xl font-bold">No has iniciado sesión</h1>
          <p className="text-muted-foreground">Serás redirigido al login.</p>
          <Button asChild variant="link" className="mt-4"><Link href="/">Ir al login ahora</Link></Button>
      </div>
    );
  }

  if (!data) {
    return notFound();
  }

  const {
    nombre,
    direccion,
    mandante,
    contacto,
    avanceReal,
    avanceProgramado,
    ultimaActualizacion,
    actividades,
    avancesPublicados
  } = data;

  return (
    <div className="max-w-6xl mx-auto space-y-8 print:space-y-4 p-4 md:p-8">
      {/* Encabezado */}
      <header className="space-y-2 border-b pb-4 print:border-b-2 print:border-black">
        <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon" className="no-print">
              <Link href="/directorio">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Volver al dashboard del directorio</span>
              </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight text-primary print:text-2xl">
              Avance de obra: {nombre}
            </h1>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2">
            <div className="text-muted-foreground text-sm space-y-1 print:text-xs">
                <p><strong>Dirección:</strong> {direccion}</p>
                <p><strong>Mandante:</strong> {mandante}</p>
                {contacto?.email && <p><strong>Contacto Cliente:</strong> {contacto.email}</p>}
            </div>
            <div className="no-print self-end">
                <PrintButton label="Imprimir / Guardar PDF" />
            </div>
        </div>
        <Badge variant="secondary" className="mt-2">Panel de seguimiento para el cliente</Badge>
      </header>

      {/* Tarjetas KPI */}
      <div className="grid gap-4 md:grid-cols-3 print:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avance Real vs. Programado</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <div className="grid grid-cols-2 gap-4 pt-2 text-center">
                <div>
                    <div className="text-4xl font-bold text-blue-600">{(avanceReal ?? 0).toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">Avance Real</p>
                </div>
                 <div>
                    <div className="text-4xl font-bold">{(avanceProgramado ?? 0).toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">Avance Programado</p>
                </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Última Actualización</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCL(ultimaActualizacion)}</div>
            <p className="text-xs text-muted-foreground">Fecha del último reporte visible</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actividades</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actividades?.completadas ?? 0} / {actividades?.programadas ?? 0}</div>
            <p className="text-xs text-muted-foreground">Completadas / Programadas</p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Feed de Avances */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold print:text-xl">Últimos Avances Publicados</h2>
        {!avancesPublicados || avancesPublicados.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            <p>Todavía no hay avances publicados para esta obra.</p>
            <p className="text-sm">Vuelve a revisar más tarde.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {avancesPublicados.map((avance) => (
              <Card key={avance.id} className="overflow-hidden shadow-sm print:shadow-none print:border-gray-300">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span>Fecha: {formatCL(avance.fecha)}</span>
                    {avance.porcentaje && <span className="text-base font-semibold text-primary">{avance.porcentaje}%</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="whitespace-pre-line">{avance.comentario}</p>
                  {avance.fotos && avance.fotos.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {avance.fotos.map((fotoPath: string, index: number) => (
                        <Suspense key={index} fallback={<div className="bg-muted aspect-square rounded-md animate-pulse"></div>}>
                          <ImageFromStorage storagePath={fotoPath} />
                        </Suspense>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function ClienteObraPage() {
    return (
        <Suspense fallback={<div className="text-center p-8">Cargando...</div>}>
            <ClienteObraPageInner />
        </Suspense>
    );
}
