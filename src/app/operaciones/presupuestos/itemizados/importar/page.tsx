// src/app/operaciones/presupuestos/itemizados/importar/page.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';
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
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Obra } from '@/types/pcg';


export default function ImportarItemizadoPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, company, companyId, role } = useAuth();
  
  const [obras, setObras] = useState<Obra[]>([]);
  const [selectedObraId, setSelectedObraId] = useState('');

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [selectedPage, setSelectedPage] = useState('1');
  const [notas, setNotas] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [convertedImageDataUrl, setConvertedImageDataUrl] = useState<string | null>(null);

   useEffect(() => {
    if (!companyId && role !== 'superadmin') return;
    const fetchObras = async () => {
        let q;
        if(role === 'superadmin') {
            q = query(collection(firebaseDb, "obras"), orderBy("nombreFaena"));
        } else {
            q = query(collection(firebaseDb, "obras"), where("empresaId", "==", companyId), orderBy("nombreFaena"));
        }
        const snapshot = await getDocs(q);
        const obrasList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra));
        setObras(obrasList);
        if (obrasList.length > 0) {
            setSelectedObraId(obrasList[0].id);
        }
    };
    fetchObras();
  }, [companyId, role]);


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
      toast({ variant: 'destructive', title: 'Error', description: 'Primero debes convertir una página del PDF a imagen.' });
      return;
    }
    if (!selectedObraId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Debes seleccionar una obra para asociar el itemizado.' });
      return;
    }

    const selectedObra = obras.find(o => o.id === selectedObraId);
    if (!selectedObra) {
        toast({ variant: 'destructive', title: 'Error', description: 'La obra seleccionada no es válida.' });
        return;
    }

    setIsUploading(true);
    console.log("Iniciando análisis para la obra:", selectedObraId);

    try {
      const response = await fetch('/api/itemizados/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfDataUri: convertedImageDataUrl,
          obraId: selectedObraId,
          obraNombre: selectedObra.nombreFaena,
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
      toast({ variant: 'destructive', title: 'Error al iniciar análisis', description: err.message });
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
            <Label htmlFor="obra-select">1. Obra a la que pertenece el itemizado*</Label>
             <Select value={selectedObraId} onValueChange={setSelectedObraId} required>
                <SelectTrigger id="obra-select"><SelectValue placeholder="Seleccionar obra..." /></SelectTrigger>
                <SelectContent>
                    {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nombreFaena}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pdf-upload">2. Archivo PDF del itemizado*</Label>
            <Input id="pdf-upload" type="file" accept="application/pdf" onChange={handleFileChange} required />
          </div>

          {pdfFile && pageCount > 0 && (
            <div className="flex flex-col sm:flex-row gap-4 items-end pt-4 border-t">
              <div className="space-y-2 flex-grow">
                <Label htmlFor="page-select">3. Página a analizar*</Label>
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
                <h3 className="font-semibold">4. Previsualización y Análisis</h3>
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
