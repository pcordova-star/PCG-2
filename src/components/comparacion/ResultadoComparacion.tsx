"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ComparacionPlanosOutput } from '@/types/comparacion-planos';
import { ChevronRight, Zap, AlertTriangle, TrendingUp, Lightbulb, Building, FileText, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import React from 'react';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';

interface ResultadoComparacionProps {
  resultado: ComparacionPlanosOutput;
}

// Helper para renderizar Markdown simple
function SimpleMarkdownRenderer({ content }: { content: string }) {
    const createMarkup = () => {
        let html = content;
        // Reemplazar **texto** con <strong>texto</strong>
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>');
        // Reemplazar *texto* o _texto_ con <em>texto</em>
        html = html.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');
        // Reemplazar `texto` con <code>texto</code>
        html = html.replace(/`(.*?)`/g, '<code class="text-sm bg-muted text-foreground p-1 rounded-sm">$1</code>');

        // Manejar tablas de Markdown
        const tableRegex = /\|(.+)\|\n\|-+\|([\s\S]*?)(?=\n\n|\n$|$)/g;
        html = html.replace(tableRegex, (match, header, body) => {
            const headers = header.split('|').map(h => h.trim()).filter(Boolean);
            const rows = body.trim().split('\n').map(r => r.split('|').map(c => c.trim()).filter(Boolean));
            
            let tableHtml = '<div class="overflow-x-auto my-4 border rounded-lg"><table class="min-w-full divide-y divide-border">';
            tableHtml += '<thead class="bg-muted/50"><tr>';
            headers.forEach(h => tableHtml += `<th class="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">${h}</th>`);
            tableHtml += '</tr></thead><tbody class="bg-card divide-y divide-border">';
            rows.forEach(row => {
                tableHtml += '<tr>';
                row.forEach(cell => tableHtml += `<td class="px-4 py-3 text-sm text-foreground">${cell}</td>`);
                tableHtml += '</tr>';
            });
            tableHtml += '</tbody></table></div>';
            return tableHtml;
        });

        // Reemplazar listas no ordenadas
        html = html.replace(/^\s*-\s+(.*)/gm, '<li class="ml-4 list-disc">$1</li>');
        html = html.replace(/<\/li>\n<li/g, '</li><li'); // Limpiar saltos de línea entre LIs
        if (html.includes('<li')) {
           html = `<ul>${html.replace(/<li.*<\/li>/g, (match) => match)}</ul>`;
        }
        
        return { __html: html };
    };

    return <div className="prose prose-sm max-w-none text-muted-foreground" dangerouslySetInnerHTML={createMarkup()} />;
}


// Nuevo componente para renderizar un nodo del árbol de impacto
const ImpactoNode = ({ node, level = 0 }: { node: any, level?: number }) => {
    const severidadColor: Record<string, string> = {
        baja: 'border-blue-500',
        media: 'border-yellow-500',
        alta: 'border-red-500',
    };

    const iconMap: Record<string, React.ElementType> = {
        arquitectura: Building,
        estructura: Zap,
        electricidad: Zap,
        sanitarias: TrendingUp,
        climatizacion: Lightbulb,
        default: AlertTriangle,
    };
    
    const Icon = iconMap[node.especialidad] || iconMap.default;

    return (
        <div style={{ marginLeft: `${level * 20}px` }} className={`relative pl-6`}>
             {level > 0 && <div className="absolute left-2 top-4 w-4 border-b border-l h-full border-dashed"></div>}
            <div className={`mt-4 border-l-4 p-4 rounded-r-lg bg-card shadow-sm ${severidadColor[node.severidad] || 'border-gray-300'}`}>
                <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-base flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        {node.especialidad.charAt(0).toUpperCase() + node.especialidad.slice(1)}
                    </h4>
                    <Badge variant={node.severidad === 'alta' ? 'destructive' : node.severidad === 'media' ? 'secondary' : 'outline'}>
                        Severidad {node.severidad}
                    </Badge>
                </div>
                <p className="mt-2 text-sm"><strong>Impacto Directo:</strong> {node.impactoDirecto}</p>
                {node.riesgo && <p className="text-sm mt-1"><strong>Riesgo:</strong> <span className="text-destructive font-medium">{node.riesgo}</span></p>}
                
                {node.consecuencias && node.consecuencias.length > 0 && (
                    <div className="mt-3">
                        <p className="text-xs font-semibold text-muted-foreground">Consecuencias:</p>
                        <ul className="list-disc pl-5 mt-1 text-xs space-y-1">
                            {node.consecuencias.map((c: string, i: number) => <li key={i}>{c}</li>)}
                        </ul>
                    </div>
                )}

                 {node.recomendaciones && node.recomendaciones.length > 0 && (
                    <div className="mt-3">
                        <p className="text-xs font-semibold text-muted-foreground">Recomendaciones:</p>
                        <ul className="list-disc pl-5 mt-1 text-xs space-y-1">
                            {node.recomendaciones.map((r: string, i: number) => <li key={i}>{r}</li>)}
                        </ul>
                    </div>
                )}
            </div>
            {node.subImpactos && node.subImpactos.map((subNode: any, i: number) => (
                <ImpactoNode key={i} node={subNode} level={level + 1} />
            ))}
        </div>
    );
};


export function ResultadoComparacion({ resultado }: ResultadoComparacionProps) {
  const { toast } = useToast();

  const handleDownloadJson = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(resultado, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = "analisis_comparacion_planos.json";
    link.click();
  };

  const handleDownloadPdf = () => {
      toast({
          title: "Funcionalidad en desarrollo",
          description: "La exportación a PDF estará disponible próximamente.",
      });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-start">
        <div>
            <CardTitle>Resultados de la Comparación de Planos</CardTitle>
        </div>
         <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadJson}>
                <Download className="mr-2 h-4 w-4" />
                Descargar JSON
            </Button>
             <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
                <FileText className="mr-2 h-4 w-4" />
                Generar Reporte PDF (Próximamente)
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="arbol-impacto" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="arbol-impacto">Árbol de Impactos</TabsTrigger>
            <TabsTrigger value="diff-tecnico">Diff. Técnico</TabsTrigger>
            <TabsTrigger value="cubicacion">Cubicación Diferencial</TabsTrigger>
          </TabsList>
          
           <TabsContent value="arbol-impacto" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Árbol de Impactos por Especialidad</CardTitle></CardHeader>
              <CardContent>
                 {resultado.arbolImpactos && resultado.arbolImpactos.length > 0 ? (
                    resultado.arbolImpactos.map((rootNode, i) => <ImpactoNode key={i} node={rootNode} />)
                ) : (
                    <p className="text-muted-foreground">No se generó un árbol de impactos.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="diff-tecnico" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Diferencias Técnicas Detectadas</CardTitle></CardHeader>
              <CardContent>
                <SimpleMarkdownRenderer content={resultado.diffTecnico || "No se encontraron diferencias técnicas significativas."} />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="cubicacion" className="mt-4">
             <Card>
              <CardHeader><CardTitle>Análisis de Cubicación Diferencial</CardTitle></CardHeader>
              <CardContent>
                 <SimpleMarkdownRenderer content={resultado.cubicacionDiferencial || "No se encontraron variaciones en la cubicación."} />
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </CardContent>
    </Card>
  );
}
