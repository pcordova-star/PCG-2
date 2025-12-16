// src/components/cubicacion/PdfToImageUploader.tsx
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { pdfPageToDataUrl } from '@/lib/pdf/pdfToImage';
import { Loader2, Wand2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import Image from 'next/image';

interface PdfToImageUploaderProps {
  onImageReady: (dataUrl: string) => void;
  disabled?: boolean;
}

export default function PdfToImageUploader({ onImageReady, disabled = false }: PdfToImageUploaderProps) {
  const { toast } = useToast();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [selectedPage, setSelectedPage] = useState('1');
  const [isConverting, setIsConverting] = useState(false);
  const [convertedImageUrl, setConvertedImageUrl] = useState<string | null>(null);
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({ variant: 'destructive', title: 'Archivo inválido', description: 'Por favor, selecciona un archivo PDF.' });
        return;
      }
      setPdfFile(file);
      setConvertedImageUrl(null); // Limpiar previsualización anterior
      
      // Leer el número de páginas
      try {
        const { pageCount: numPages } = await pdfPageToDataUrl(file, 1, 0.1); // Escala baja solo para contar
        setPageCount(numPages);
        setSelectedPage('1');
      } catch (error: any) {
        console.error("Error reading PDF pages:", error);
        toast({ variant: 'destructive', title: 'Error al leer PDF', description: error.message });
      }
    }
  };

  const handleConvert = async () => {
    if (!pdfFile) return;
    
    setIsConverting(true);
    try {
      const { dataUrl } = await pdfPageToDataUrl(pdfFile, parseInt(selectedPage, 10), 2.0);
      
      if (dataUrl.length > 8 * 1024 * 1024) { // Advertencia si es > 8MB
        toast({ variant: 'destructive', title: 'Imagen muy grande', description: 'La imagen convertida es muy pesada y podría fallar. Intenta con un PDF más simple.'});
      }
      
      setConvertedImageUrl(dataUrl);
    } catch (error: any) {
      console.error("Error converting PDF page:", error);
      toast({ variant: 'destructive', title: 'Error de conversión', description: error.message });
    } finally {
      setIsConverting(false);
    }
  };

  const handleAnalyze = () => {
    if (convertedImageUrl) {
        onImageReady(convertedImageUrl);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="pdf-file">Archivo PDF del plano</Label>
        <Input id="pdf-file" type="file" accept="application/pdf" onChange={handleFileChange} disabled={disabled} />
      </div>

      {pdfFile && pageCount > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="space-y-2 flex-grow">
            <Label htmlFor="page-select">Página a analizar</Label>
            <Select value={selectedPage} onValueChange={setSelectedPage} disabled={isConverting || disabled}>
                <SelectTrigger id="page-select"><SelectValue /></SelectTrigger>
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
            Convertir a Imagen
          </Button>
        </div>
      )}

      {convertedImageUrl && (
        <div className="space-y-4 pt-4 border-t">
          <p className="text-sm font-medium">Previsualización de la imagen generada:</p>
          <div className="border rounded-md p-2">
             <Image src={convertedImageUrl} alt={`Página ${selectedPage} del PDF`} width={400} height={300} className="w-full h-auto object-contain rounded-md" />
          </div>
          <Button onClick={handleAnalyze} className="w-full" disabled={disabled}>
            <Wand2 className="mr-2 h-4 w-4"/>
            Analizar Plano con IA
          </Button>
        </div>
      )}
    </div>
  );
}
