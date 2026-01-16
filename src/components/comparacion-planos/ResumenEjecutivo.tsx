// src/components/comparacion-planos/ResumenEjecutivo.tsx
import { ComparacionPlanosOutput } from "@/types/comparacion-planos";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, GitCompareArrows } from "lucide-react";
import { useMemo } from "react";

interface Props {
  data: ComparacionPlanosOutput;
}

export default function ResumenEjecutivo({ data }: Props) {
    if (!data) return null;

    const { diffTecnico, cubicacionDiferencial, arbolImpactos } = data;

    const { severidadGlobal, riesgoPrincipal } = useMemo(() => {
        if (!arbolImpactos?.impactos?.length) return { severidadGlobal: 'baja', riesgoPrincipal: 'N/A' };
        
        let maxSeveridad = 'baja';
        let riesgo = 'N/A';
        const severidadMap = { baja: 1, media: 2, alta: 3 };

        arbolImpactos.impactos.forEach(impacto => {
            if (severidadMap[impacto.severidad as keyof typeof severidadMap] > severidadMap[maxSeveridad as keyof typeof severidadMap]) {
                maxSeveridad = impacto.severidad;
                riesgo = impacto.riesgo || 'N/A';
            }
        });
        
        return { severidadGlobal: maxSeveridad, riesgoPrincipal: riesgo };
    }, [arbolImpactos]);
    
    const severidadConfig = {
        baja: { label: 'Baja', color: 'bg-green-100 text-green-800' },
        media: { label: 'Media', color: 'bg-yellow-100 text-yellow-800' },
        alta: { label: 'Alta', color: 'bg-red-100 text-red-800' },
    };
    
    return (
        <Card className="shadow-lg border-border/50">
            <CardHeader>
                <CardTitle className="text-2xl">Resumen Ejecutivo del Análisis</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                <div className="p-4 rounded-lg bg-slate-50 border">
                    <h3 className="text-sm font-semibold text-muted-foreground flex items-center"><GitCompareArrows className="mr-2" />Cambios Detectados</h3>
                    <p className="text-3xl font-bold mt-1">{diffTecnico?.elementos?.length || 0}</p>
                </div>
                
                <div className="p-4 rounded-lg bg-slate-50 border">
                    <h3 className="text-sm font-semibold text-muted-foreground flex items-center"><TrendingUp className="mr-2" />Partidas Modificadas</h3>
                    <p className="text-3xl font-bold mt-1">{cubicacionDiferencial?.partidas?.length || 0}</p>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border">
                    <h3 className="text-sm font-semibold text-muted-foreground flex items-center"><AlertTriangle className="mr-2" />Severidad Global</h3>
                    <Badge className={`mt-2 text-lg ${severidadConfig[severidadGlobal as keyof typeof severidadConfig].color}`}>
                        {severidadConfig[severidadGlobal as keyof typeof severidadConfig].label}
                    </Badge>
                </div>
                
                <div className="p-4 rounded-lg bg-slate-50 border">
                    <h3 className="text-sm font-semibold text-muted-foreground flex items-center"><AlertTriangle className="mr-2" />Riesgo Principal</h3>
                    <p className="text-lg font-bold mt-1">{riesgoPrincipal || "No Identificado"}</p>
                </div>

                <div className="md:col-span-2 lg:col-span-4 space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                        <h4 className="font-semibold text-sm">Resumen Diff Técnico</h4>
                        <p className="text-sm text-muted-foreground italic">{diffTecnico?.resumen || "No disponible."}</p>
                    </div>
                     <div className="space-y-2">
                        <h4 className="font-semibold text-sm">Resumen Cubicación Diferencial</h4>
                        <p className="text-sm text-muted-foreground italic">{cubicacionDiferencial?.resumen || "No disponible."}</p>
                    </div>
                </div>

            </CardContent>
        </Card>
    );
}
