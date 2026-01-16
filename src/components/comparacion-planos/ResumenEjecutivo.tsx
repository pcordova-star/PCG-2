// src/components/comparacion-planos/ResumenEjecutivo.tsx
// Placeholder para el resumen ejecutivo del análisis de comparación.

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, FileDiff, List, Network } from "lucide-react";

export default function ResumenEjecutivo() {
  return (
    <Card className="mb-6 border-l-4 border-primary bg-primary/5">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Resumen Ejecutivo del Análisis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Indicadores Clave */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-card rounded-lg border">
            <p className="text-xs text-muted-foreground">Cambios Detectados</p>
            <p className="text-2xl font-bold">12</p>
          </div>
          <div className="p-3 bg-card rounded-lg border">
            <p className="text-xs text-muted-foreground">Especialidades Afectadas</p>
            <p className="text-2xl font-bold">4</p>
          </div>
          <div className="p-3 bg-card rounded-lg border">
            <p className="text-xs text-muted-foreground">Severidad Global</p>
            <Badge variant="destructive" className="text-lg mt-2">Alta</Badge>
          </div>
          <div className="p-3 bg-card rounded-lg border">
            <p className="text-xs text-muted-foreground">Riesgo Principal</p>
            <p className="text-lg font-semibold text-destructive mt-1">Sobrecosto</p>
          </div>
        </div>

        {/* Resúmenes por Sección */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <FileDiff className="h-5 w-5 text-muted-foreground mt-1" />
            <div>
              <h4 className="font-semibold">Resumen Diff Técnico</h4>
              <p className="text-sm text-muted-foreground">Se detectaron 5 elementos modificados, 3 agregados y 4 eliminados, principalmente en tabiquería y vanos.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <List className="h-5 w-5 text-muted-foreground mt-1" />
            <div>
              <h4 className="font-semibold">Resumen Cubicación Diferencial</h4>
              <p className="text-sm text-muted-foreground">Variación significativa en m² de tabiquería (+15 m²) y una reducción en unidades de ventanas (-2 un).</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Network className="h-5 w-5 text-muted-foreground mt-1" />
            <div>
              <h4 className="font-semibold">Resumen Árbol de Impactos</h4>
              <p className="text-sm text-muted-foreground">El desplazamiento de un muro en arquitectura genera un impacto de alta severidad en la estructura y requiere una revisión completa del trazado eléctrico.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
