// src/components/comparacion-planos/ResultadoDiffTecnico.tsx
import { DiffTecnicoOutput } from "@/types/comparacion-planos";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


export default function ResultadoDiffTecnico({ data }: { data: DiffTecnicoOutput }) {
  if (!data || !data.elementos || data.elementos.length === 0) {
    return (
        <Card>
            <CardHeader><CardTitle>Diff Técnico</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground">No se encontraron diferencias técnicas significativas.</p></CardContent>
        </Card>
    );
  }

  const variantMap: Record<string, 'default' | 'destructive' | 'secondary'> = {
    agregado: 'default',
    eliminado: 'destructive',
    modificado: 'secondary',
  };
  
  const bgClassMap: Record<string, string> = {
    agregado: 'bg-green-50/50 hover:bg-green-50',
    eliminado: 'bg-red-50/50 hover:bg-red-50',
    modificado: 'bg-yellow-50/50 hover:bg-yellow-50',
  }

  return (
     <Card>
        <CardHeader><CardTitle>Diff Técnico</CardTitle></CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground italic mb-4">{data.resumen}</p>
            <div className="border rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[120px]">Tipo de Cambio</TableHead>
                            <TableHead>Descripción del Cambio</TableHead>
                            <TableHead className="w-[200px]">Ubicación (Aprox.)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TooltipProvider>
                        {data.elementos.map((e, index) => (
                            <TableRow key={index} className={cn(bgClassMap[e.tipo])}>
                                <TableCell>
                                     <Tooltip>
                                        <TooltipTrigger asChild>
                                             <Badge variant={variantMap[e.tipo]}>{e.tipo}</Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{e.tipo === 'agregado' ? 'Elemento nuevo en Plano B.' : e.tipo === 'eliminado' ? 'Elemento solo presente en Plano A.' : 'Elemento con cambios entre A y B.'}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TableCell>
                                <TableCell>{e.descripcion}</TableCell>
                                <TableCell className="text-muted-foreground">{e.ubicacion || 'General'}</TableCell>
                            </TableRow>
                        ))}
                        </TooltipProvider>
                    </TableBody>
                </Table>
            </div>
        </CardContent>
    </Card>
  );
}
