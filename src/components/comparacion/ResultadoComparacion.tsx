"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ComparacionPlanosOutput } from '@/types/comparacion-planos';

interface ResultadoComparacionProps {
  resultado: ComparacionPlanosOutput;
}

export function ResultadoComparacion({ resultado }: ResultadoComparacionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resultados de la Comparación</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="diff-tecnico">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="diff-tecnico">Diff. Técnico</TabsTrigger>
            <TabsTrigger value="cubicacion">Cubicación Diferencial</TabsTrigger>
            <TabsTrigger value="impacto">Impacto por Especialidad</TabsTrigger>
          </TabsList>
          
          <TabsContent value="diff-tecnico" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Diferencias Técnicas</CardTitle></CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p>{resultado.diffTecnico || "No se encontraron diferencias técnicas significativas o este análisis no fue solicitado."}</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="cubicacion" className="mt-4">
             <Card>
              <CardHeader><CardTitle>Cubicación Diferencial</CardTitle></CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                 <p>{resultado.cubicacionDiferencial || "No se encontraron variaciones en la cubicación o este análisis no fue solicitado."}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="impacto" className="mt-4">
             <Card>
              <CardHeader><CardTitle>Árbol de Impactos por Especialidad</CardTitle></CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                 <p>{resultado.arbolImpactos || "No se pudo generar un árbol de impactos o este análisis no fue solicitado."}</p>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </CardContent>
    </Card>
  );
}
