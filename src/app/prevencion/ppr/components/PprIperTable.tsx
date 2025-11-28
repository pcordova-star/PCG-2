// src/app/prevencion/ppr/components/PprIperTable.tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IPERRegistro } from "@/types/pcg";

interface Props {
  iperData: IPERRegistro[];
}

export function PprIperTable({ iperData }: Props) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tarea</TableHead>
            <TableHead>Peligro</TableHead>
            <TableHead>Riesgo</TableHead>
            <TableHead>Riesgo Inherente (H/M)</TableHead>
            <TableHead>Riesgo Residual</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {iperData.map((iper) => (
            <TableRow key={iper.id}>
              <TableCell className="font-medium">{iper.tarea}</TableCell>
              <TableCell>{iper.peligro}</TableCell>
              <TableCell>{iper.riesgo}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <span className="font-bold text-blue-600">{iper.nivel_riesgo_hombre}</span>
                  <span>/</span>
                  <span className="font-bold text-pink-600">{iper.nivel_riesgo_mujer}</span>
                </div>
              </TableCell>
              <TableCell className="font-bold text-green-600">{iper.nivel_riesgo_residual}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
