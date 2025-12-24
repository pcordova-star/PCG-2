// src/app/operaciones/presupuestos/itemizados/importar/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Upload, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { pdfPageToDataUrl } from '@/lib/pdf/pdfToImage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';


export default function ImportarItemizadoPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, company, companyId } = useAuth();

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [selectedPage, setSelectedPage] = useState('1');
  const [notas, setNotas] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [convertedImageDataUrl, setConvertedImageDataUrl] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({ variant: 'destructive', title: 'Archivo inválido', description: 'Por favor, selecciona un archivo PDF.' });
        setPdfFile(null);
        setPageCount(0);
        setConvertedImageDataUrl(null);
        return;
      }
      setPdfFile(file);
      setConvertedImageDataUrl(null);
      try {
        const { pageCount: numPages } = await pdfPageToDataUrl(file, 1, 0.1); // Escala baja solo para contar
        setPageCount(numPages);
        setSelectedPage('1');
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error al leer PDF', description: error.message });
      }
    }
  };

  const handleConvert = async () => {
    if (!pdfFile) return;
    setIsConverting(true);
    try {
      const { dataUrl } = await pdfPageToDataUrl(pdfFile, parseInt(selectedPage, 10), 2.0);
      setConvertedImageDataUrl(dataUrl);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error de conversión', description: error.message });
    } finally {
      setIsConverting(false);
    }
  };

  const handleStartAnalysis = async () => {
    if (!convertedImageDataUrl) {
      toast({ variant: 'destructive', title: 'Error', description: 'No hay una imagen generada para analizar.' });
      return;
    }
    if (!companyId || !company) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo identificar la obra o empresa.' });
      return;
    }

    setIsUploading(true);

    try {
      const response = await fetch('/api/itemizados/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfDataUri: convertedImageDataUrl,
          obraId: companyId, // Se asume que companyId es la obraId para este contexto
          obraNombre: company.nombreFantasia,
          notas,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al iniciar el trabajo de importación.');
      }

      const { jobId } = await response.json();
      toast({ title: "Análisis iniciado", description: "Tu documento ha sido enviado a la IA. Serás redirigido." });
      
      router.push(`/operaciones/presupuestos/itemizados/importar/${jobId}`);

    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Error', description: err.message });
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
       <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4"/> Volver
        </Button>

      <Card>
        <CardHeader>
          <CardTitle>Importar Itemizado desde PDF con IA</CardTitle>
          <CardDescription>
            Sube un itemizado en formato PDF, conviértelo a imagen y la IA extraerá las partidas para crear un presupuesto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pdf-upload">1. Archivo PDF del itemizado*</Label>
            <Input id="pdf-upload" type="file" accept="application/pdf" onChange={handleFileChange} required />
          </div>

          {pdfFile && pageCount > 0 && (
            <div className="flex flex-col sm:flex-row gap-4 items-end pt-4 border-t">
              <div className="space-y-2 flex-grow">
                <Label htmlFor="page-select">2. Página a analizar*</Label>
                <Select value={selectedPage} onValueChange={setSelectedPage} disabled={isConverting}>
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
              <Button onClick={handleConvert} disabled={isConverting}>
                {isConverting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Convertir a Imagen
              </Button>
            </div>
          )}

          {convertedImageDataUrl && (
            <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold">3. Previsualización y Análisis</h3>
                <div className="border rounded-md p-2 bg-muted">
                    <Image src={convertedImageDataUrl} alt={`Página ${selectedPage} del PDF`} width={800} height={600} className="w-full h-auto object-contain rounded-md" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notas">Notas para la IA (opcional)</Label>
                  <Textarea
                    id="notas"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Ej: Todos los precios están en UF. Considerar que la página 3 es un resumen y debe ser ignorada."
                  />
                </div>
                 <Button onClick={handleStartAnalysis} disabled={isUploading} className="w-full">
                  {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {isUploading ? 'Enviando a análisis...' : 'Analizar Documento con IA'}
                </Button>
            </div>
          )}
          
        </CardContent>
      </Card>
    </div>
  );
}
