"use client";
// src/app/prevencion/ppr/components/sections/PprSection6Charlas.tsx
import { PprSectionContainer } from "../PprSectionContainer";
import { Charla } from "@/types/pcg";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Props {
  charlasData: Charla[];
}

export function PprSection6Charlas({ charlasData }: Props) {
  return (
    <PprSectionContainer
      title="Charlas y Capacitación"
      description="Calendario de capacitaciones y charlas de seguridad, generado automáticamente a partir de la programación y la matriz IPER."
    >
      {charlasData.length === 0 ? (
        <div className="text-center bg-muted/50 p-8 rounded-lg">
          <p className="text-muted-foreground mb-4">No hay charlas registradas para esta obra. Se pueden generar desde la sección IPER.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Fecha Creación</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Referencia IPER</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {charlasData.map(charla => (
              <TableRow key={charla.id}>
                <TableCell className="font-medium">{charla.titulo}</TableCell>
                <TableCell>{charla.fechaCreacion?.toDate().toLocaleDateString('es-CL')}</TableCell>
                <TableCell><Badge variant={charla.estado === 'borrador' ? 'secondary' : 'default'}>{charla.estado}</Badge></TableCell>
                <TableCell className="font-mono text-xs">{charla.iperId?.substring(0, 8) || 'N/A'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PprSectionContainer>
  );
}
