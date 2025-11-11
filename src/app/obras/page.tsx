import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Obra = {
  id: string;
  nombreFaena: string;
  direccion: string;
  clienteEmail: string;
  modulosActivos: {
    operaciones: boolean;
    prevencion: boolean;
  };
};

const OBRAS_SIMULADAS: Obra[] = [
  {
    id: "1",
    nombreFaena: "Edificio Central",
    direccion: "Av. Principal 123, Santiago",
    clienteEmail: "cliente.losalamos@ejemplo.cl",
    modulosActivos: {
      operaciones: true,
      prevencion: true,
    },
  },
  {
    id: "2",
    nombreFaena: "Condominio El Roble",
    direccion: "Camino del Viento 456, Santiago",
    clienteEmail: "cliente.cuatrovientos@ejemplo.cl",
    modulosActivos: {
      operaciones: true,
      prevencion: false,
    },
  },
  {
    id: "3",
    nombreFaena: "Remodelación Oficinas Corp",
    direccion: "Ruta 5 Sur, Tramo Km 100–120",
    clienteEmail: "cliente.ruta5@ejemplo.cl",
    modulosActivos: {
      operaciones: false,
      prevencion: true,
    },
  },
];

export default function ObrasPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Cartera de Obras</h1>
        <p className="text-lg text-muted-foreground">
          Vista general de las obras en PCG 2.0. Desde aquí puedes ver los
          datos básicos, módulos activos y el link del panel del cliente.
        </p>
      </header>

      <div className="overflow-x-auto rounded-xl border bg-card text-card-foreground shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Obra / Faena</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Módulos Activos</TableHead>
              <TableHead>Panel Cliente</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {OBRAS_SIMULADAS.map((obra) => {
              const clientPath = `/clientes/${obra.id}`;
              return (
                <TableRow key={obra.id}>
                  <TableCell className="align-top">
                    <div className="font-semibold text-primary">
                      {obra.nombreFaena}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ID: {obra.id}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <p className="text-sm">{obra.direccion}</p>
                  </TableCell>
                  <TableCell className="align-top">
                    <p className="text-sm font-mono">{obra.clienteEmail}</p>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex flex-col gap-1.5">
                      <Badge
                        variant={
                          obra.modulosActivos.operaciones
                            ? "default"
                            : "secondary"
                        }
                        className={
                          obra.modulosActivos.operaciones
                            ? "border-green-200 bg-green-100 text-green-800"
                            : ""
                        }
                      >
                        Operaciones
                      </Badge>
                      <Badge
                        variant={
                          obra.modulosActivos.prevencion
                            ? "default"
                            : "secondary"
                        }
                         className={
                          obra.modulosActivos.prevencion
                            ? "border-amber-200 bg-amber-100 text-amber-800"
                            : ""
                        }
                      >
                        Prevención
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex flex-col gap-1">
                      <code className="rounded-lg border bg-muted/50 px-2 py-1 text-xs font-mono">
                        {clientPath}
                      </code>
                       <Button asChild variant="outline" size="sm" className="mt-1">
                        <Link href={clientPath}>Ver como cliente</Link>
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex flex-col gap-2">
                       <Button asChild variant="outline" size="sm">
                        <Link href={`/operaciones/programacion?obraId=${obra.id}`}>
                          Ir a Operaciones
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/prevencion/ds44-subcontratos?obraId=${obra.id}`}>
                           Ir a Prevención
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
