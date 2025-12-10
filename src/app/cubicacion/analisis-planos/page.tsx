// src/app/cubicacion/analisis-planos/page.tsx
"use client";

import React, { useState, FormEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import type { AnalisisPlanoInput, AnalisisPlanoOutput } from "@/types/analisis-planos";
import { ArrowLeft, Loader2, Wand2, TableIcon, StickyNote, FileUp, Building, Droplets, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';

type OpcionesDeAnalisis = {
  superficieUtil: boolean;
  m2Muros: boolean;
  m2Losas: boolean;
  m2Revestimientos: boolean;
  instalacionesHidraulicas: boolean;
  instalacionesElectricas: boolean;
};

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

const progressSteps = [
  { percent: 0, text: "Iniciando conexión segura..." },
  { percent: 15, text: "Cargando plano en el motor de IA..." },
  { percent: 40, text: "Analizando estructura y recintos..." },
  { percent: 65, text: "Extrayendo mediciones y cubicaciones..." },
  { percent: 85, text: "Compilando el informe de resultados..." },
  { percent: 95, text: "Finalizando análisis, casi listo..." },
];

export default function AnalisisPlanosPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [opciones, setOpciones] = useState<OpcionesDeAnalisis>({
    superficieUtil: false,
    m2Muros: false,
    m2Losas: false,
    m2Revestimientos: false,
    instalacionesHidraulicas: false,
    instalacionesElectricas: false,
  });

  const [planoFile, setPlanoFile] = useState<File | null>(null);
  const [notas, setNotas] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<AnalisisPlanoOutput | null>(null);

  // Estados para la barra de progreso animada
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("Iniciando...");

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading) {
      setProgress(0);
      setProgressText("Iniciando conexión...");

      // Simula el progreso
      const totalDuration = 45000; // 45 segundos para simular
      let currentTime = 0;

      const updateProgress = () => {
        const simulatedProgress = (currentTime / totalDuration) * 100;
        
        // No pasar del 95% hasta que la respuesta real llegue
        const displayProgress = Math.min(simulatedProgress, 95);
        setProgress(displayProgress);

        const currentStep = progressSteps.slice().reverse().find(step => displayProgress >= step.percent);
        if (currentStep) {
            setProgressText(currentStep.text);
        }

        currentTime += 100;
        if (displayProgress < 95) {
          timer = setTimeout(updateProgress, 100 + Math.random() * 200); // Intervalo variable
        }
      };

      timer = setTimeout(updateProgress, 100);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [loading]);

  const handleCheckboxChange = (key: keyof OpcionesDeAnalisis) => {
    setOpciones(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // Límite de 10MB
        toast({
          variant: 'destructive',
          title: 'Archivo demasiado grande',
          description: 'Por favor, sube un archivo de menos de 10MB.',
        });
        return;
      }
      setPlanoFile(file);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResultado(null);

    if (!planoFile) {
      toast({
        variant: "destructive",
        title: "Falta el plano",
        description: "Debes subir un archivo de plano (PDF o imagen).",
      });
      return;
    }

    const opcionesSeleccionadasValues = Object.entries(opciones)
      .filter(([_, value]) => value)
      .map(([key]) => key);

    if (opcionesSeleccionadasValues.length === 0) {
      toast({
        variant: "destructive",
        title: "Sin selección",
        description: "Debes seleccionar al menos una opción de análisis.",
      });
      return;
    }

    setLoading(true);

    try {
      const photoDataUri = await fileToDataUri(planoFile);

      const input: AnalisisPlanoInput = {
        photoDataUri,
        opcionesSeleccionadas: opcionesSeleccionadasValues,
        notasUsuario: notas,
        obraId: "temp-obra-id",
      };

      const res = await fetch("/api/analizar-plano", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message =
          body?.error || "Ocurrió un error durante el análisis del plano.";
        throw new Error(message);
      }

      const analisisResult = (await res.json()) as AnalisisPlanoOutput;
      setProgress(100);
      setResultado(analisisResult);
    } catch (err: any) {
      console.error("Error al analizar el plano:", err);
      const message =
        err?.message || "Ocurrió un error desconocido durante el análisis.";
      setError(message);
      toast({
        variant: "destructive",
        title: "Error de análisis",
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const tipoElementoConfig: Record<string, { icon: React.ElementType, color: string }> = {
    recinto: { icon: Building, color: 'text-blue-500' },
    muro: { icon: Building, color: 'text-gray-500' },
    losa: { icon: Building, color: 'text-gray-600' },
    revestimiento: { icon: Building, color: 'text-purple-500' },
    "instalaciones hidráulicas": { icon: Droplets, color: 'text-sky-500' },
    "instalaciones eléctricas": { icon: Zap, color: 'text-yellow-500' },
    "arquitectura": { icon: Building, color: 'text-orange-500'},
    default: { icon: StickyNote, color: 'text-gray-400' },
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Análisis de planos con IA (beta)</h1>
          <p className="text-muted-foreground">Sube un plano, selecciona qué quieres analizar y deja que la IA te dé una cubicación de referencia.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>1. Sube tu plano</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="plano-file">Archivo del plano (PDF o Imagen, máx. 10MB)</Label>
              <Input id="plano-file" type="file" accept="application/pdf,image/*" onChange={handleFileChange} />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader><CardTitle>2. Selecciona qué analizar</CardTitle></CardHeader>
            <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                    {Object.keys(opciones).map(key => (
                         <Label key={key} className="flex items-center gap-2 p-3 border rounded-md hover:bg-muted/50 cursor-pointer">
                            <Checkbox checked={opciones[key as keyof OpcionesDeAnalisis]} onCheckedChange={() => handleCheckboxChange(key as keyof OpcionesDeAnalisis)} />
                            <span>
                                {
                                    {
                                        superficieUtil: 'Superficie útil',
                                        m2Muros: 'm² de Muros',
                                        m2Losas: 'm² de Losas',
                                        m2Revestimientos: 'm² de Revestimientos',
                                        instalacionesHidraulicas: 'Inst. Hidráulicas',
                                        instalacionesElectricas: 'Inst. Eléctricas'
                                    }[key]
                                }
                            </span>
                        </Label>
                    ))}
                </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>3. Notas adicionales (opcional)</CardTitle></CardHeader>
            <CardContent>
              <Textarea
                placeholder="Ej: La altura de piso a cielo es 2.4m. La escala del plano es 1:50. Considerar solo el Nivel 1."
                value={notas}
                onChange={e => setNotas(e.target.value)}
              />
            </CardContent>
          </Card>

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
            {loading ? 'Analizando plano...' : 'Iniciar Análisis con IA'}
          </Button>
        </form>

        <div className="sticky top-24">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TableIcon /> Resultado del Análisis</CardTitle>
            </CardHeader>
            <CardContent>
              {loading && (
                 <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center py-8 space-y-4"
                  >
                    <Progress value={progress} className="w-full h-2" />
                    <p className="text-sm font-medium text-primary animate-pulse">{progressText}</p>
                    <p className="text-xs text-muted-foreground/80">(El análisis puede tardar hasta un minuto)</p>
                </motion.div>
              )}
              {error && <p className="text-destructive font-medium">{error}</p>}
              {resultado && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold">Resumen de la IA</h3>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md mt-1">{resultado.summary}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Elementos Analizados</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead className="text-right">Cantidad</TableHead>
                            <TableHead>Confianza</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {resultado.elements.map((el, i) => {
                            const config = tipoElementoConfig[el.type.toLowerCase()] || tipoElementoConfig.default;
                            return (
                              <TableRow key={i}>
                                <TableCell>
                                    <Badge variant="outline" className="flex items-center gap-1.5">
                                        <config.icon className={`h-3 w-3 ${config.color}`} />
                                        {el.type}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-xs">{el.name}</TableCell>
                                <TableCell className="text-right font-mono text-xs">{el.estimatedQuantity.toFixed(2)} {el.unit}</TableCell>
                                <TableCell className="text-right text-xs">{(el.confidence * 100).toFixed(0)}%</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}
              {!loading && !resultado && !error && (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Los resultados del análisis aparecerán aquí.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
