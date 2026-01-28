{// src/components/cubicacion/PdfToImageUploader.tsx
"use client";

import React, { useState, FormEvent, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { convertPdfToImage } from "@/lib/pdf/pdfToImage";
import {
  compressDataUrlJpeg,
  ImageSize,
} from "@/lib/image/compressDataUrlJpeg";
import {
  PLAN_PRESETS,
  PlanPreset,
  PlanType,
} from "@/lib/image/planPresets";
import { Wand2, Loader2, FileUp } from "lucide-react";

interface Props {
  onSubmit: (
    dataUrl: string,
    meta: {
      width: number;
      height: number;
      sizeMb: number;
      planType: PlanType;
    }
  ) => void;
  cargando: boolean;
}

export default function PdfToImageUploader({ onSubmit, cargando }: Props) {
  const { toast } = useToast();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({ variant: "destructive", title: "Solo se admiten archivos PDF." });
        return;
      }
      if (file.size > 20 * 1024 * 1024) { // Límite de 20MB para PDF
        toast({ variant: "destructive", title: "Archivo demasiado grande", description: "El PDF no puede superar los 20MB." });
        return;
      }
      setPdfFile(file);
    }
  };

  const handlePdfSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!pdfFile) {
      toast({ variant: "destructive", title: "Selecciona un archivo PDF." });
      return;
    }

    setIsConverting(true);
    setConversionProgress(0);

    try {
      const { dataUrl: rawImageDataUrl, width, height } = await convertPdfToImage(pdfFile, setConversionProgress);
      
      // La compresión JPEG es clave para reducir el tamaño antes de enviarlo
      const planType = "arquitectura"; // Usamos un preset por defecto
      const preset = PLAN_PRESETS[planType];
      const { dataUrl: compressedDataUrl, size } = await compressDataUrlJpeg(
        rawImageDataUrl,
        preset
      );
      
      onSubmit(compressedDataUrl, { ...size, planType });

    } catch (error: any) {
      console.error("Error al procesar el PDF:", error);
      toast({
        variant: "destructive",
        title: "Error al convertir PDF",
        description: error.message || "No se pudo procesar el archivo. Intenta con un PDF más simple o una imagen.",
      });
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <form onSubmit={handlePdfSubmit} className="space-y-4">
      <Label htmlFor="pdf-file">Archivo del plano (PDF, máx. 20MB)</Label>
      <Input
        id="pdf-file"
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        disabled={isConverting || cargando}
      />

      {isConverting && (
        <div className="space-y-2">
          <Progress value={conversionProgress} className="w-full" />
          <p className="text-xs text-muted-foreground text-center">
            Convirtiendo PDF a imagen... ({conversionProgress}%)
          </p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={!pdfFile || isConverting || cargando}
      >
        {isConverting || cargando ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Wand2 className="mr-2 h-4 w-4" />
        )}
        {isConverting ? 'Convirtiendo...' : (cargando ? 'Analizando...' : 'Analizar desde PDF')}
      </Button>
    </form>
  );
}
