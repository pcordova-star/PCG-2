import React, { Suspense } from 'react';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Building, Calendar, CheckCircle, Percent, Clock } from 'lucide-react';
import ImageFromStorage from '@/components/client/ImageFromStorage';
import PrintButton from '@/components/client/PrintButton';

// --- Tipos de datos de Firestore ---
type Obra = {
  id: string;
  nombreFaena: string;
  direccion: string;
  mandanteRazonSocial?: string;
  clienteEmail?: string;
};

type AvanceDiario = {
  id: string;
  fecha: string; // "YYYY-MM-DD"
  porcentajeAvance: number; // 0-100
  comentario: string;
  fotos?: string[];
  creadoPor?: string;
};

// --- Obtención de datos del servidor ---
async function getObraData(obraId: string): Promise<{ obra: Obra; avances: AvanceDiario[] } | null> {
  try {
    // 1. Obtener los datos de la obra
    const obraRef = doc(firebaseDb, 'obras', obraId);
    const obraSnap = await getDoc(obraRef);

    if (!obraSnap.exists()) {
      return null; // La obra no existe
    }
    const obra = { id: obraSnap.id, ...obraSnap.data() } as Obra;

    // 2. Obtener los avances de la obra visibles para el cliente
    const avancesColRef = collection(firebaseDb, 'obras', obraId, 'avancesDiarios');
    const q = query(
      avancesColRef,
      where('visibleParaCliente', '==', true),
      orderBy('fecha', 'desc'),
      limit(10) // Limitar a los 10 más recientes
    );
    const avancesSnap = await getDocs(q);
    const avances = avancesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as AvanceDiario));

    return { obra, avances };
  } catch (error) {
    console.error('Error fetching obra data:', error);
    return null;
  }
}

// --- Componente principal de la página (Server Component) ---
export default async function ClienteObraPage({ params }: { params: { obraId: string } }) {
  const data = await getObraData(params.obraId);

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <h1 className="text-2xl font-bold">Obra no encontrada</h1>
        <p className="text-muted-foreground mt-2">
          El enlace de seguimiento no es válido o la obra ha sido eliminada.
        </p>
      </div>
    );
  }

  const { obra, avances } = data;

  // --- Cálculo de KPIs en el servidor ---
  const ultimoAvance = avances[0];
  const porcentajeActual = ultimoAvance?.porcentajeAvance ?? 0;
  
  let ultimaActualizacionFormateada = 'N/D';
  if (ultimoAvance?.fecha) {
    // Formatear fecha en el servidor para evitar hydration mismatch
    const [year, month, day] = ultimoAvance.fecha.split('-').map(Number);
    const fecha = new Date(Date.UTC(year, month - 1, day));
    ultimaActualizacionFormateada = new Intl.DateTimeFormat('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Santiago',
    }).format(fecha);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 print:space-y-4">
      {/* Encabezado */}
      <header className="space-y-2 border-b pb-4 print:border-b-2 print:border-black">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-primary print:text-2xl">
            Avance de obra: {obra.nombreFaena}
          </h1>
          <div className="print:hidden">
            <PrintButton />
          </div>
        </div>
        <div className="text-muted-foreground text-sm space-y-1 print:text-xs">
          <p>
            <strong>Dirección:</strong> {obra.direccion}
          </p>
          <p>
            <strong>Mandante:</strong> {obra.mandanteRazonSocial || 'No especificado'}
          </p>
          <p>
            <strong>Contacto Cliente:</strong> {obra.clienteEmail || 'No especificado'}
          </p>
        </div>
        <Badge variant="secondary" className="mt-2">Panel de seguimiento para el cliente</Badge>
      </header>

      {/* Tarjetas KPI */}
      <div className="grid gap-4 md:grid-cols-3 print:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avance Acumulado</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold">{porcentajeActual.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Progreso total del proyecto</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Última Actualización</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{ultimaActualizacionFormateada}</div>
            <p className="text-xs text-muted-foreground">Fecha del último reporte visible</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actividades</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">N/D</div>
            <p className="text-xs text-muted-foreground">Programadas / Completadas</p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Feed de Avances */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold print:text-xl">Últimos Avances Publicados</h2>
        {avances.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            <p>Todavía no hay avances publicados para esta obra.</p>
            <p className="text-sm">Vuelve a revisar más tarde.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {avances.map((avance) => (
              <Card key={avance.id} className="overflow-hidden shadow-sm print:shadow-none print:border-gray-300">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span>Fecha: {avance.fecha}</span>
                    <span className="text-base font-semibold text-primary">{avance.porcentajeAvance}%</span>
                  </CardTitle>
                  <CardDescription>
                    Registrado por: {avance.creadoPor || 'Equipo de Obra'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="whitespace-pre-line">{avance.comentario}</p>
                  {avance.fotos && avance.fotos.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {avance.fotos.map((fotoPath, index) => (
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
