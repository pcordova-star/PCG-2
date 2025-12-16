// src/app/cubicacion/analisis-planos/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Wand2, TableIcon, StickyNote, FileUp, Building, Droplets, Zap, Image as ImageIcon, File as FileIcon, FileDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { AnalisisPlanoOutput, AnalisisPlanoInput, OpcionesAnalisis } from '@/types/analisis-planos';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PdfToImageUploader from '@/components/cubicacion/PdfToImageUploader';
import { generarAnalisisPlanoPdf } from '@/lib/pdf/generarAnalisisPlanoPdf';

const progressSteps = [
  { percent: 0, text: "Iniciando conexión segura..." },
  { percent: 15, text: "Cargando plano en el motor de IA..." },
  { percent: 40, text: "Analizando estructura y recintos..." },
  { percent: 65, text: "Extrayendo mediciones y cubicaciones..." },
  { percent: 85, text: "Compilando el informe de resultados..." },
  { percent: 95, text: "Finalizando análisis, casi listo..." },
];

async function fetchJsonSafe(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();

  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // no es JSON
  }

  if (!res.ok) {
    const preview = text?.slice(0, 200) || "";
    const detail =
      data?.error || data?.message || preview || `HTTP ${res.status}`;
    throw new Error(
      `API error ${res.status} (${contentType}): ${detail}`
    );
  }

  if (!data) {
    const preview = text?.slice(0, 200) || "";
    throw new Error(
      `Respuesta no-JSON desde API (${contentType}). Preview: ${preview}`
    );
  }

  return data;
}


export default function AnalisisPlanosPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, company } = useAuth();
  
  const [opciones, setOpciones] = useState<OpcionesAnalisis>({
    superficieUtil: false, m2Muros: false, m2Losas: false,
    m2Revestimientos: false, instalacionesHidraulicas: false, instalacionesElectricas: false,
  });

  const [planoFile, setPlanoFile] = useState<File | null>(null);
  const [notas, setNotas] = useState('');
  
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<AnalisisPlanoOutput | null>(null);
  const [errorAnalisis, setErrorAnalisis] = useState<string | null>(null);

  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("Iniciando...");

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cargando) {
      setProgress(0); setProgressText("Iniciando conexión...");
      const totalDuration = 45000;
      let currentTime = 0;
      const updateProgress = () => {
        const simulatedProgress = (currentTime / totalDuration) * 100;
        const displayProgress = Math.min(simulatedProgress, 95);
        setProgress(displayProgress);
        const currentStep = progressSteps.slice().reverse().find(step => displayProgress >= step.percent);
        if (currentStep) { setProgressText(currentStep.text); }
        currentTime += 100;
        if (displayProgress < 95) { timer = setTimeout(updateProgress, 100 + Math.random() * 200); }
      };
      timer = setTimeout(updateProgress, 100);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [cargando]);

  const handleCheckboxChange = (key: keyof OpcionesAnalisis) => {
    setOpciones(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ variant: 'destructive', title: 'Archivo demasiado grande', description: 'Por favor, sube un archivo de menos de 10MB.' });
        return;
      }
      setPlanoFile(file);
    }
  };
  
  const handleSubmit = async (dataUri: string) => {
    if (!dataUri) {
        setErrorAnalisis("No se proporcionó una imagen para analizar.");
        return;
    }

    setCargando(true);
    setErrorAnalisis(null);
    setResultado(null);

    try {
        const input: AnalisisPlanoInput = {
            photoDataUri: dataUri,
            opciones,
            notas,
            obraId: company?.id ?? 'obra-desconocida',
            obraNombre: company?.nombreFantasia ?? 'Obra Desconocida',
        };

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;
        const url = `${baseUrl}/api/analizar-plano`;

        const data = await fetchJsonSafe(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        
        setResultado(data as AnalisisPlanoOutput);

    } catch (err: any) {
        console.error("Error al analizar el plano:", err);
        setErrorAnalisis(err.message || "Ocurrió un error desconocido.");
    } finally {
        setCargando(false);
    }
  };

  const handleDirectImageSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!planoFile) {
        setErrorAnalisis("Debes seleccionar un archivo de imagen.");
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUri = e.target?.result as string;
        handleSubmit(dataUri);
    };
    reader.readAsDataURL(planoFile);
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}><ArrowLeft /></Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Análisis de planos con IA (beta)</h1>
          <p className="text-muted-foreground">Sube un plano, selecciona qué quieres analizar y deja que la IA te dé una cubicación de referencia.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle>1. Sube tu plano</CardTitle></CardHeader>
                <CardContent>
                    <Tabs defaultValue="imagen">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="imagen"><ImageIcon className="mr-2"/>Desde Imagen</TabsTrigger>
                            <TabsTrigger value="pdf"><FileIcon className="mr-2"/>Desde PDF</TabsTrigger>
                        </TabsList>
                        <TabsContent value="imagen" className="pt-4">
                            <form onSubmit={handleDirectImageSubmit} className="space-y-4">
                                <Label htmlFor="plano-file">Archivo del plano (JPG, PNG, máx. 10MB)</Label>
                                <Input id="plano-file" type="file" accept="image/jpeg, image/png" onChange={handleFileChange} />
                                <Button type="submit" size="sm" className="w-full" disabled={!planoFile || cargando}>
                                    {cargando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                                    Analizar desde Imagen
                                </Button>
                            </form>
                        </TabsContent>
                         <TabsContent value="pdf" className="pt-4">
                           <PdfToImageUploader onImageReady={handleSubmit} disabled={cargando}/>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader><CardTitle>2. Selecciona qué analizar</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                        {Object.keys(opciones).map(key => (
                            <Label key={key} className="flex items-center gap-2 p-3 border rounded-md hover:bg-muted/50 cursor-pointer">
                                <Checkbox checked={opciones[key as keyof OpcionesAnalisis]} onCheckedChange={() => handleCheckboxChange(key as keyof OpcionesAnalisis)} />
                                <span>{{
                                    superficieUtil: 'Superficie útil', m2Muros: 'm² de Muros', m2Losas: 'm² de Losas',
                                    m2Revestimientos: 'm² de Revestimientos', instalacionesHidraulicas: 'Inst. Hidráulicas',
                                    instalacionesElectricas: 'Inst. Eléctricas'
                                }[key]}</span>
                            </Label>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>3. Notas adicionales (opcional)</CardTitle></CardHeader>
                <CardContent>
                    <Textarea placeholder="Ej: La altura de piso a cielo es 2.4m. La escala del plano es 1:50..." value={notas} onChange={e => setNotas(e.target.value)} />
                </CardContent>
            </Card>
        </div>

        <div className="sticky top-24">
          <Card>
            <CardHeader className="flex flex-row justify-between items-start">
              <div className="flex items-center gap-2">
                <TableIcon />
                <CardTitle>Resultado del Análisis</CardTitle>
              </div>
               {resultado && (
                <Button variant="outline" size="sm" onClick={() => generarAnalisisPlanoPdf(resultado, company?.nombreFantasia || 'Obra', company)}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Descargar PDF
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {cargando && (
                 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center py-8 space-y-4">
                    <Progress value={progress} className="w-full h-2" />
                    <p className="text-sm font-medium text-primary animate-pulse">{progressText}</p>
                    <p className="text-xs text-muted-foreground/80">(El análisis puede tardar hasta un minuto)</p>
                </motion.div>
              )}
              {errorAnalisis && (
                  <div className="text-center py-8 text-destructive bg-destructive/10 rounded-md">
                      <p className="font-semibold">Error en el análisis</p>
                      <p className="text-sm">{errorAnalisis}</p>
                  </div>
              )}
              {resultado && (
                 <div className="prose prose-sm max-w-none text-card-foreground">
                    <p className='font-semibold'>Resumen de la IA:</p>
                    <p className='text-muted-foreground text-sm italic'>"{resultado.summary}"</p>
                    {resultado.elements.length > 0 && (
                        <Table>
                            <TableHeader><TableRow><TableHead>Elemento</TableHead><TableHead>Cantidad</TableHead><TableHead>Confianza</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {resultado.elements.map((el, i) => (
                                    <TableRow key={i}>
                                        <TableCell className='font-medium'>{el.name}</TableCell>
                                        <TableCell>{el.estimatedQuantity.toLocaleString('es-CL')} {el.unit}</TableCell>
                                        <TableCell><Badge variant={el.confidence > 0.7 ? "default" : "secondary"}>{(el.confidence * 100).toFixed(0)}%</Badge></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                 </div>
              )}
              {!cargando && !resultado && !errorAnalisis && (
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
