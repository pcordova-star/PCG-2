"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ComparacionPlanosOutput } from '@/types/comparacion-planos';

interface ResultadoComparacionProps {
  resultado: ComparacionPlanosOutput;
}

// Helper para renderizar Markdown simple (listas y negritas)
function SimpleMarkdownRenderer({ content }: { content: string }) {
    const lines = content.split('\n').map((line, index) => {
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>'); // Negrita
        line = line.replace(/\*(.*?)\*/g, '<em>$1</em>'); // Cursiva
        if (line.trim().startsWith('- ')) {
            return `<li class="ml-4 list-disc">${line.trim().substring(2)}</li>`;
        }
        if (line.trim().startsWith('1. ')) {
            return `<li class="ml-4 list-decimal">${line.trim().substring(3)}</li>`;
        }
        return `<p>${line}</p>`;
    });

    return <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: lines.join('') }} />;
}


export function ResultadoComparacion({ resultado }: ResultadoComparacionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resultados de la Comparación de Planos</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="diff-tecnico" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="diff-tecnico">Diff. Técnico</TabsTrigger>
            <TabsTrigger value="cubicacion">Cubicación Diferencial</TabsTrigger>
            <TabsTrigger value="impacto">Árbol de Impactos</TabsTrigger>
          </TabsList>
          
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

          <TabsContent value="impacto" className="mt-4">
             <Card>
              <CardHeader><CardTitle>Árbol de Impactos por Especialidad</CardTitle></CardHeader>
              <CardContent>
                 <SimpleMarkdownRenderer content={resultado.arbolImpactos || "No se pudo generar un árbol de impactos."} />
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </CardContent>
    </Card>
  );
}
