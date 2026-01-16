// src/components/comparacion-planos/ResultadoArbolImpactos.tsx
import { ArbolImpactosOutput } from "@/types/comparacion-planos";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Building, Zap, Droplet, Wind, Wrench, AlertTriangle, CornerDownRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type ImpactoNode = ArbolImpactosOutput['impactos'][0];

const iconMap: Record<string, React.ElementType> = {
    arquitectura: Building,
    estructura: Wrench,
    electricidad: Zap,
    sanitarias: Droplet,
    climatizacion: Wind,
    default: AlertTriangle,
};

const colorMap: Record<string, string> = {
    arquitectura: 'text-blue-600',
    estructura: 'text-orange-600',
    electricidad: 'text-yellow-600',
    sanitarias: 'text-green-600',
    climatizacion: 'text-indigo-600',
    default: 'text-gray-600',
}

const severidadBadge: Record<string, 'default' | 'secondary' | 'destructive'> = {
    baja: 'default',
    media: 'secondary',
    alta: 'destructive',
}

const ImpactoNodeComponent = ({ node, level = 0 }: { node: ImpactoNode; level?: number }) => {
    const Icon = iconMap[node.especialidad] || iconMap.default;
    const color = colorMap[node.especialidad] || colorMap.default;

    return (
        <div className={level > 0 ? "ml-6 pl-6 border-l-2 border-dashed" : ""}>
            <Card className="mt-4 shadow-sm">
                <CardHeader className="p-4">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                             {level > 0 && <CornerDownRight className="h-4 w-4 text-muted-foreground" />}
                             <Icon className={`h-6 w-6 ${color}`} />
                            <CardTitle className="text-lg">{node.especialidad.charAt(0).toUpperCase() + node.especialidad.slice(1)}</CardTitle>
                        </div>
                        <Badge variant={severidadBadge[node.severidad] || 'outline'}>Severidad {node.severidad}</Badge>
                    </div>
                </CardHeader>
                 <CardContent className="p-4 pt-0 space-y-3 text-sm">
                     <p><strong>Impacto Directo:</strong> {node.impactoDirecto}</p>
                     {node.riesgo && <p><strong>Riesgo Principal:</strong> <span className="font-semibold text-destructive">{node.riesgo}</span></p>}
                      {node.consecuencias && node.consecuencias.length > 0 && (
                        <div>
                            <p className="font-semibold">Consecuencias:</p>
                            <ul className="list-disc pl-5 mt-1 text-muted-foreground space-y-1">
                                {node.consecuencias.map((c, i) => <li key={i}>{c}</li>)}
                            </ul>
                        </div>
                    )}
                     {node.recomendaciones && node.recomendaciones.length > 0 && (
                        <div>
                            <p className="font-semibold">Recomendaciones:</p>
                            <ul className="list-disc pl-5 mt-1 text-muted-foreground space-y-1">
                                {node.recomendaciones.map((r, i) => <li key={i}>{r}</li>)}
                            </ul>
                        </div>
                    )}
                </CardContent>
            </Card>
             {node.subImpactos && node.subImpactos.length > 0 && (
                <div>
                    {node.subImpactos.map((subNode, i) => (
                        <ImpactoNodeComponent key={i} node={subNode} level={level + 1} />
                    ))}
                </div>
            )}
        </div>
    );
};


export default function ResultadoArbolImpactos({ data }: { data: ArbolImpactosOutput }) {
  if (!data || !data.impactos || data.impactos.length === 0) {
    return (
        <Card>
            <CardHeader><CardTitle>Árbol de Impactos</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground">No se generó un árbol de impactos para este análisis.</p></CardContent>
        </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Árbol de Impactos por Especialidad</CardTitle>
        <CardDescription>Análisis de cómo los cambios afectan en cascada a las diferentes especialidades de la obra.</CardDescription>
      </CardHeader>
      <CardContent>
         {data.impactos.map((rootNode, i) => <ImpactoNodeComponent key={i} node={rootNode} />)}
      </CardContent>
    </Card>
  );
}
