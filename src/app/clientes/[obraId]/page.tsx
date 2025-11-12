// src/app/clientes/[shareId]/page.tsx
import React, { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Building, Calendar, CheckCircle, Percent } from 'lucide-react';
import ImageFromStorage from '@/components/client/ImageFromStorage';
import PrintButton from '@/components/client/PrintButton';

type PublicObraData = {
  obra: {
    nombreFaena: string;
    direccion: string;
    mandanteRazonSocial: string;
    clienteEmail: string;
  };
  indicadores: {
    avanceAcumulado: number;
    ultimaActualizacionISO: string | null;
    actividades: {
      programadas: number;
      completadas: number;
    };
  };
  ultimosAvances: {
    fechaISO: string;
    porcentaje: number;
    comentario: string;
    imagenes: string[];
  }[];
};

// URL base de la API. En producción, debería ser una variable de entorno absoluta.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:9002';


async function getPublicObraData(shareId: string): Promise<PublicObraData | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/public/obra/${shareId}`, {
      next: { revalidate: 60 } // Revalida cada 60 segundos
    });

    if (!res.ok) {
      // Si la respuesta no es 200-299, retorna null para mostrar página de error.
      console.error(`Error fetching data for ${shareId}: ${res.status} ${res.statusText}`);
      return null;
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching public obra data:', error);
    return null;
  }
}

export default async function ClienteObraPage({ params }: { params: { obraId: string } }) {
  // El nombre del parámetro es 'obraId' por la estructura de la carpeta, pero lo tratamos como 'shareId'
  const shareId = params.obraId;
  const data = await getPublicObraData(shareId);

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <h1 className="text-2xl font-bold">Panel no disponible</h1>
        <p className="text-muted-foreground mt-2">
          El enlace de seguimiento no es válido, ha sido deshabilitado o la obra ha sido eliminada.
        </p>
      </div>
    );
  }

  const { obra, indicadores, ultimosAvances } = data;

  let ultimaActualizacionFormateada = 'N/D';
  if (indicadores.ultimaActualizacionISO) {
    // Formateo de fecha en el servidor para evitar hydration mismatch.
    const [year, month, day] = indicadores.ultimaActualizacionISO.split('-').map(Number);
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
          <div className="no-print">
            <PrintButton />
          </div>
        </div>
        <div className="text-muted-foreground text-sm space-y-1 print:text-xs">
          <p><strong>Dirección:</strong> {obra.direccion}</p>
          <p><strong>Mandante:</strong> {obra.mandanteRazonSocial}</p>
          <p><strong>Contacto Cliente:</strong> {obra.clienteEmail}</p>
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
            <div className="text-5xl font-bold">{indicadores.avanceAcumulado.toFixed(1)}%</div>
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
            <div className="text-2xl font-bold">{indicadores.actividades.completadas} / {indicadores.actividades.programadas}</div>
            <p className="text-xs text-muted-foreground">Completadas / Programadas</p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Feed de Avances */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold print:text-xl">Últimos Avances Publicados</h2>
        {ultimosAvances.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            <p>Todavía no hay avances publicados para esta obra.</p>
            <p className="text-sm">Vuelve a revisar más tarde.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {ultimosAvances.map((avance, i) => (
              <Card key={`${avance.fechaISO}-${i}`} className="overflow-hidden shadow-sm print:shadow-none print:border-gray-300">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span>Fecha: {new Intl.DateTimeFormat('es-CL', { timeZone: 'UTC' }).format(new Date(avance.fechaISO))}</span>
                    <span className="text-base font-semibold text-primary">{avance.porcentaje}%</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="whitespace-pre-line">{avance.comentario}</p>
                  {avance.imagenes && avance.imagenes.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {avance.imagenes.map((fotoPath, index) => (
                        <Suspense key={index} fallback={<div className="bg-muted aspect-square rounded-md animate-pulse"></div>}>
                          {/* El path aquí puede ser una URL completa de GCS o un path que el componente sepa resolver */}
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
