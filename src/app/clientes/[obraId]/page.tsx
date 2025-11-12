// src/app/clientes/[shareId]/page.tsx
import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Percent, Calendar, CheckCircle } from 'lucide-react';
import ImageFromStorage from '@/components/client/ImageFromStorage';
import PrintButton from '@/components/client/PrintButton';
import { getPublicObraByShareId } from '@/server/queries/publicObra';

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

export default async function ClienteObraPage({ params }: { params: { obraId: string } }) {
  // El nombre del parámetro es 'obraId' por la estructura de la carpeta, pero lo tratamos como 'shareId'
  const shareId = params.obraId;
  const data = await getPublicObraByShareId(shareId);

  if (!data) {
    return notFound();
  }

  const {
    nombre,
    direccion,
    mandante,
    contacto,
    avanceAcumulado,
    ultimaActualizacion,
    actividades,
    avancesPublicados
  } = data;

  return (
    <div className="max-w-6xl mx-auto space-y-8 print:space-y-4">
      {/* Encabezado */}
      <header className="space-y-2 border-b pb-4 print:border-b-2 print:border-black">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-primary print:text-2xl">
            Avance de obra: {nombre}
          </h1>
          <div className="no-print">
            <PrintButton label="Imprimir / Guardar PDF" />
          </div>
        </div>
        <div className="text-muted-foreground text-sm space-y-1 print:text-xs">
          <p><strong>Dirección:</strong> {direccion}</p>
          <p><strong>Mandante:</strong> {mandante}</p>
          {contacto?.email && <p><strong>Contacto Cliente:</strong> {contacto.email}</p>}
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
            <div className="text-5xl font-bold">{(avanceAcumulado ?? 0).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Progreso total del proyecto</p>
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
