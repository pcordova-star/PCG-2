// src/components/comparacion-planos/ResultadoCubicacion.tsx
import { CubicacionDiferencialOutput } from "@/types/comparacion-planos";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ResultadoCubicacion({ data }: { data: CubicacionDiferencialOutput }) {
  if (!data || !data.partidas || data.partidas.length === 0) {
     return (
        <Card>
            <CardHeader><CardTitle>Cubicación Diferencial</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground">No se encontraron variaciones significativas en la cubicación.</p></CardContent>
        </Card>
    );
  }
  
  const totalDiferencia = data.partidas.reduce((acc, p) => acc + p.diferencia, 0);

  return (
    <Card>
        <CardHeader><CardTitle>Cubicación Diferencial</CardTitle></CardHeader>
        <CardContent>
             <p className="text-sm text-muted-foreground italic mb-4">{data.resumen}</p>
             <div className="border rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Partida</TableHead>
                            <TableHead className="text-right">Cant. Anterior (A)</TableHead>
                            <TableHead className="text-right">Cant. Nueva (B)</TableHead>
                            <TableHead className="text-right">Diferencia</TableHead>
                            <TableHead>Unidad</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.partidas.map((p, i) => {
                            const isPositive = p.diferencia > 0;
                            const isNegative = p.diferencia < 0;
                            return (
                                <TableRow key={i}>
                                    <TableCell className="font-medium">{p.partida}</TableCell>
                                    <TableCell className="text-right">{p.cantidadA?.toLocaleString('es-CL') ?? 'N/A'}</TableCell>
                                    <TableCell className="text-right">{p.cantidadB?.toLocaleString('es-CL') ?? 'N/A'}</TableCell>
                                    <TableCell className={cn(
                                        "text-right font-bold flex items-center justify-end gap-1",
                                        isPositive && "text-red-600",
                                        isNegative && "text-green-600"
                                    )}>
                                        {isPositive && <ArrowUp className="h-3 w-3" />}
                                        {isNegative && <ArrowDown className="h-3 w-3" />}
                                        {p.diferencia.toLocaleString('es-CL')}
                                    </TableCell>
                                    <TableCell>{p.unidad}</TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
             </div>
        </CardContent>
        {data.partidas.length > 0 && (
             <CardFooter className="justify-end">
                <div className="text-right font-bold mt-4">
                    <span className="text-muted-foreground">Total Variación Neta (sumatoria): </span>
                    <span className={cn(totalDiferencia > 0 && "text-red-600", totalDiferencia < 0 && "text-green-600")}>
                        {totalDiferencia.toLocaleString('es-CL')}
                    </span>
                </div>
            </CardFooter>
        )}
    </Card>
  );
}
