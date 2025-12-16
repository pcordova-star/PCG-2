
// src/components/cubicacion/PdfToImageUploader.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { pdfPageToDataUrl } from '@/lib/pdf/pdfToImage';
import { Loader2, Wand2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import Image from 'next/image';
import { compressDataUrlJpeg, ImageSize } from "@/lib/image/compressDataUrlJpeg";
import { PLAN_PRESETS, PlanType } from "@/lib/image/planPresets";
import { CubicacionUiMetrics } from '@/types/cubicacion-ui';
import { computeCubicacionMetrics } from '@/lib/image/cubicacionMetrics';
import CubicacionMetricsPanel from './CubicacionMetricsPanel';

interface PdfToImageUploaderProps {
  onImageReady: (dataUrl: string, meta: { width: number; height: number; sizeMb: number; planType: PlanType; }) => void;
  disabled?: boolean;
}

function autoPresetFromFilename(name?: string): PlanType {
  const n = (name || "").toLowerCase();
  if (n.includes("elec")) return "electrico";
  if (n.includes("sanit")) return "sanitario";
  if (n.includes("struct") || n.includes("estr")) return "estructura";
  return "arquitectura";
}

export default function PdfToImageUploader({ onImageReady, disabled = false }: PdfToImageUploaderProps) {
  const { toast } = useToast();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [selectedPage, setSelectedPage] = useState('1');
  const [planType, setPlanType] = useState<PlanType>("arquitectura");
  const [isConverting, setIsConverting] = useState(false);
  const [convertedImage, setConvertedImage] = useState<{ dataUrl: string; meta: { width: number; height: number; sizeMb: number; planType: PlanType; } } | null>(null);
  const [metrics, setMetrics] = useState<CubicacionUiMetrics | null>(null);

  useEffect(() => {
    // Cuando se deselecciona un archivo, limpiar todo.
    if (!pdfFile) {
        setPageCount(0);
        setConvertedImage(null);
        setMetrics(null);
    }
  }, [pdfFile]);
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({ variant: 'destructive', title: 'Archivo inválido', description: 'Por favor, selecciona un archivo PDF.' });
        return;
      }
      setPdfFile(file);
      setConvertedImage(null);
      setMetrics(null);
      setPlanType(autoPresetFromFilename(file.name));
      try {
        const { pageCount: numPages } = await pdfPageToDataUrl(file, 1, 0.1); // Escala baja solo para contar
        setPageCount(numPages);
        setSelectedPage('1');
      } catch (error: any) {
        console.error("Error reading PDF pages:", error);
        toast({ variant: 'destructive', title: 'Error al leer PDF', description: error.message });
      }
    } else {
        setPdfFile(null);
    }
  };

  const handleConvert = async () => {
    if (!pdfFile) return;
    
    setIsConverting(true);
    setMetrics(null);
    setConvertedImage(null);
    try {
      const result = await pdfPageToDataUrl(pdfFile, parseInt(selectedPage, 10), 2.0);
      
      const preset = PLAN_PRESETS[planType];
      const { dataUrl: optimizedDataUrl, size } = await compressDataUrlJpeg(result.dataUrl, {
        maxWidth: preset.maxWidth,
        maxHeight: preset.maxHeight,
        quality: preset.quality,
      });

      if (size.sizeMb > preset.maxSizeMb) {
        throw new Error(
          `La imagen (${size.sizeMb.toFixed(1)} MB) supera el límite de ${preset.maxSizeMb} MB para planos de tipo '${planType}'. Intenta con otro preset o exporta la lámina a JPG.`
        );
      }
      
      const finalMeta = { ...size, planType };
      setConvertedImage({ dataUrl: optimizedDataUrl, meta: finalMeta });

      const calculatedMetrics = computeCubicacionMetrics(optimizedDataUrl, planType, size.width, size.height);
      setMetrics(calculatedMetrics);

    } catch (error: any) {
      console.error("Error converting PDF page:", error);
      toast({ variant: 'destructive', title: 'Error de conversión', description: error.message, duration: 8000 });
    } finally {
      setIsConverting(false);
    }
  };

  const handleAnalyze = () => {
    if (convertedImage) {
        onImageReady(convertedImage.dataUrl, convertedImage.meta);
    }
  };

  const disableAnalysisButton = disabled || metrics?.estimatedCost === 'alto';

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="pdf-file">Archivo PDF del plano</Label>
        <Input id="pdf-file" type="file" accept="application/pdf" onChange={handleFileChange} disabled={disabled} />
      </div>

      {pdfFile && pageCount > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="space-y-2 flex-grow">
            <Label htmlFor="plan-type-select">Tipo de Plano</Label>
            <Select value={planType} onValueChange={(v) => setPlanType(v as PlanType)} disabled={isConverting || disabled}>
                <SelectTrigger id="plan-type-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="arquitectura">Arquitectura</SelectItem>
                    <SelectItem value="estructura">Estructura</SelectItem>
                    <SelectItem value="electrico">Eléctrico</SelectItem>
                    <SelectItem value="sanitario">Sanitario</SelectItem>
                    <SelectItem value="otros">Otros</SelectItem>
                </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">El preset optimiza resolución y compresión.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="page-select">Página</Label>
            <Select value={selectedPage} onValueChange={setSelectedPage} disabled={isConverting || disabled}>
                <SelectTrigger id="page-select" className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                    {Array.from({ length: pageCount }, (_, i) => i + 1).map(pageNum => (
                        <SelectItem key={pageNum} value={String(pageNum)}>
                            Página {pageNum} de {pageCount}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
          <Button onClick={handleConvert} disabled={isConverting || disabled}>
            {isConverting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Convertir
          </Button>
        </div>
      )}

      {convertedImage && (
        <div className="space-y-4 pt-4 border-t">
          <p className="text-sm font-medium">Previsualización y Métricas:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
             <div className="border rounded-md p-2">
                <Image src={convertedImage.dataUrl} alt={`Página ${selectedPage} del PDF`} width={400} height={300} className="w-full h-auto object-contain rounded-md" />
            </div>
            <CubicacionMetricsPanel metrics={metrics} />
          </div>
          <Button onClick={handleAnalyze} className="w-full" disabled={disableAnalysisButton}>
            <Wand2 className="mr-2 h-4 w-4"/>
            Analizar Plano con IA
          </Button>
          {disableAnalysisButton && metrics?.estimatedCost === 'alto' && (
              <p className="text-center text-xs text-destructive font-semibold">El costo estimado es alto. No se puede analizar.</p>
          )}
        </div>
      )}
    </div>
  );
}
