"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash2 } from 'lucide-react';

interface Miembro {
  id: number;
  nombre: string;
  cargo: string;
  email: string;
}

const initialTeam: Miembro[] = [
  { id: 1, nombre: 'Juan Pérez', cargo: 'Jefe de Obra', email: 'j.perez@constructora.com' },
  { id: 2, nombre: 'Ana Gómez', cargo: 'Prevencionista de Riesgos', email: 'a.gomez@constructora.com' },
  { id: 3, nombre: 'Carlos Soto', cargo: 'Jefe de Terreno', email: 'c.soto@constructora.com' },
];

export default function EquipoResponsablePage() {
  const [team, setTeam] = useState<Miembro[]>(initialTeam);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Configuración de Equipo Responsable de Hallazgos</h1>
        <p className="text-muted-foreground">
          Define el equipo que recibirá notificaciones y gestionará los hallazgos de seguridad reportados.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Miembros del Equipo</CardTitle>
            <CardDescription>
              Este es el equipo que será asignado por defecto para la gestión de nuevos hallazgos.
            </CardDescription>
          </div>
          <Button disabled>
            <PlusCircle className="mr-2 h-4 w-4" />
            Agregar Miembro
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.nombre}</TableCell>
                  <TableCell>{member.cargo}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" disabled>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-sm text-muted-foreground text-center mt-4">La funcionalidad para agregar y eliminar miembros estará disponible próximamente.</p>
        </CardContent>
      </Card>
    </div>
  );
}
