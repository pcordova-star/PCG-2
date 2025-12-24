// src/app/operaciones/presupuestos/itemizados/importar/page.tsx
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Upload, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

async function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ImportarItemizadoPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, company, companyId } = useAuth();

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [notas, setNotas] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
    } else {
      setPdfFile(null);
      toast({ variant: 'destructive', title: 'Archivo inválido', description: 'Por favor, selecciona un archivo PDF.' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) {
      toast({ variant: 'destructive', title: 'Falta archivo', description: 'Debes seleccionar un PDF para analizar.' });
      return;
    }
    if (!companyId || !company) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo identificar la obra activa.' });
        return;
    }

    setIsUploading(true);

    try {
      const pdfDataUri = await fileToDataUri(pdfFile);

      const response = await fetch('/api/itemizados/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfDataUri,
          obraId: companyId,
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
            <ArrowLeft className="mr-2"/> Volver
        </Button>

      <Card>
        <CardHeader>
          <CardTitle>Importar Itemizado desde PDF con IA</CardTitle>
          <CardDescription>
            Sube un itemizado en formato PDF. La inteligencia artificial analizará el documento y extraerá las partidas, cantidades y precios para crear un presupuesto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pdf-upload">Archivo PDF del itemizado*</Label>
              <Input id="pdf-upload" type="file" accept="application/pdf" onChange={handleFileChange} required />
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
            <Button type="submit" disabled={!pdfFile || isUploading} className="w-full">
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {isUploading ? 'Enviando a análisis...' : 'Analizar Documento'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
