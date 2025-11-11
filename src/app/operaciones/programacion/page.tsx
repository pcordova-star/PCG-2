"use client";

import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';

type Obra = {
  id: string;
  nombreFaena: string;
};

type EstadoActividad = "Pendiente" | "En curso" | "Completada";

type ActividadProgramada = {
  id: string;
  obraId: string;
  nombreActividad: string;
  fechaInicio: string;  // ej: "2025-11-15"
  fechaFin: string;
  responsable: string;
  estado: EstadoActividad;
};

const OBRAS_SIMULADAS: Obra[] = [
  { id: '1', nombreFaena: 'Edificio Central' },
  { id: '2', nombreFaena: 'Condominio El Roble' },
  { id: '3', nombreFaena: 'Remodelación Oficinas Corp' },
];

const ACTIVIDADES_SIMULADAS: ActividadProgramada[] = [
  { id: 'a1', obraId: '1', nombreActividad: 'Fundaciones', fechaInicio: '2025-11-01', fechaFin: '2025-11-15', responsable: 'Juan Pérez', estado: 'Completada' },
  { id: 'a2', obraId: '1', nombreActividad: 'Obra gruesa primer piso', fechaInicio: '2025-11-16', fechaFin: '2025-12-10', responsable: 'Juan Pérez', estado: 'En curso' },
  { id: 'a3', obraId: '1', nombreActividad: 'Instalaciones eléctricas', fechaInicio: '2025-12-11', fechaFin: '2025-12-20', responsable: 'Ana Gómez', estado: 'Pendiente' },
  { id: 'a4', obraId: '2', nombreActividad: 'Cierre perimetral', fechaInicio: '2025-10-20', fechaFin: '2025-10-30', responsable: 'Carlos Soto', estado: 'Completada' },
  { id: 'a5', obraId: '2', nombreActividad: 'Movimiento de tierras', fechaInicio: '2025-11-01', fechaFin: '2025-11-10', responsable: 'Carlos Soto', estado: 'En curso' },
  { id: 'a6', obraId: '3', nombreActividad: 'Demoliciones', fechaInicio: '2025-12-01', fechaFin: '2025-12-05', responsable: 'Luis Marín', estado: 'Pendiente' },
];

export default function ProgramacionPage() {
  const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>(OBRAS_SIMULADAS[0].id);

  const actividadesFiltradas = ACTIVIDADES_SIMULADAS.filter(
    (act) => act.obraId === obraSeleccionadaId
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-headline tracking-tight">Programación de Obras - PCG 2.0</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Seleccione una obra para ver sus actividades programadas. Los datos son simulados y se reiniciarán al recargar.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selector de Obra</CardTitle>
          <CardDescription>Filtre las actividades por obra.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-2">
            <Label htmlFor="obra-select">Seleccione una obra</Label>
            <Select value={obraSeleccionadaId} onValueChange={setObraSeleccionadaId}>
              <SelectTrigger id="obra-select">
                <SelectValue placeholder="Seleccione una obra" />
              </SelectTrigger>
              <SelectContent>
                {OBRAS_SIMULADAS.map((obra) => (
                  <SelectItem key={obra.id} value={obra.id}>
                    {obra.nombreFaena}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Actividades Programadas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Nombre de actividad</TableHead>
                        <TableHead>Fecha inicio</TableHead>
                        <TableHead>Fecha término</TableHead>
                        <TableHead>Responsable</TableHead>
                        <TableHead>Estado</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {actividadesFiltradas.length > 0 ? (
                        actividadesFiltradas.map((actividad) => (
                        <TableRow key={actividad.id}>
                            <TableCell className="font-medium">{actividad.nombreActividad}</TableCell>
                            <TableCell>{actividad.fechaInicio}</TableCell>
                            <TableCell>{actividad.fechaFin}</TableCell>
                            <TableCell>{actividad.responsable}</TableCell>
                            <TableCell>{actividad.estado}</TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No hay actividades programadas para esta obra.
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
