// src/app/operaciones/presupuestos/itemizados/importar/page.tsx
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Wand2, Upload, Folder, FileText, ListTree } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ItemizadoImportOutput, ItemNode } from '@/types/itemizados-import';

const MAX_FILE_SIZE_MB = 15;
const WARNING_FILE_SIZE_MB = 10;

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function slugify(text: string): string {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w-]+/g, '')       // Remove all non-word chars
        .replace(/--+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

const ItemTree = ({ items }: { items: ItemNode[] }) => {
    const renderNode = (node: ItemNode, level: number, index: number, parentPath: string) => {
        const nodeKeyPart = node.code ? node.code : `${level}-${index}-${slugify(node.name)}`;
        const currentPath = `${parentPath}/${nodeKeyPart}`;

        return (
            <div key={currentPath} style={{ marginLeft: `${level * 20}px` }} className="mt-2">
                <div className="flex items-center gap-2">
                    <ListTree className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-semibold">{node.name}</span>
                    {node.total !== null && <span className="text-xs text-muted-foreground">({node.total?.toLocaleString()})</span>}
                </div>
                {node.children && node.children.length > 0 && (
                    <div className="pl-4 border-l">
                        {node.children.map((child, childIndex) => renderNode(child, level + 1, childIndex, currentPath))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div>
            {items.map((item, index) => renderNode(item, 0, index, 'root'))}
        </div>
    );
};


export default function ImportarItemizadoPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [obraId, setObraId] = useState('obra-test-01');
  const [obraNombre, setObraNombre] = useState('Obra de Prueba');
  
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ItemizadoImportOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

      if (!isPdf) {
        toast({
          variant: 'destructive',
          title: 'Archivo no válido',
          description: 'Por favor, selecciona un archivo en formato PDF.',
        });
        e.target.value = ""; // Limpiar el input
        setPdfFile(null);
        return;
      }
      
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'Archivo demasiado grande',
          description: `Por favor, sube un archivo de menos de ${MAX_FILE_SIZE_MB}MB.`,
        });
        e.target.value = "";
        setPdfFile(null);
        return;
      }
      setPdfFile(file);
    } else {
        setPdfFile(null);
    }
  };
  
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!pdfFile) {
        setError("Debes seleccionar un archivo PDF.");
        return;
    }

    setLoading(true);
    setError(null);
    setResultado(null);

    try {
        const pdfDataUri = await fileToDataUri(pdfFile);

        const input = {
            pdfDataUri,
            obraId,
            obraNombre,
            notas: "Analizar el itemizado completo.",
        };

        const response = await fetch('/api/itemizados/importar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input)
        });

        const body = await response.json();

        if (!response.ok) {
            throw new Error(body.error || "Ocurrió un error en el servidor de análisis.");
        }
        
        setResultado(body as ItemizadoImportOutput);
        toast({ title: 'Análisis completado', description: 'El itemizado se ha procesado con éxito.' });

    } catch (err: any) {
        console.error("Error al importar el itemizado:", err);
        setError(err.message || "Ocurrió un error desconocido.");
        toast({ variant: 'destructive', title: 'Error de importación', description: err.message });
    } finally {
        setLoading(false);
    }
  };
  
  const isFileLarge = pdfFile && pdfFile.size > WARNING_FILE_SIZE_MB * 1024 * 1024;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <header className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Importar Itemizado con IA (beta)</h1>
          <p className="text-muted-foreground">Sube un itemizado en PDF y deja que la IA lo estructure por ti.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>1. Carga tu itemizado</CardTitle>
                    <CardDescription>Selecciona el archivo PDF que quieres analizar (máx. {MAX_FILE_SIZE_MB}MB).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="pdf-file">Archivo del itemizado (PDF)</Label>
                        <Input id="pdf-file" type="file" accept="application/pdf,.pdf" onChange={handleFileChange} />
                        {pdfFile && (
                            <div className="text-xs text-muted-foreground pt-1">
                                <p>Archivo seleccionado: <strong>{pdfFile.name}</strong></p>
                                {isFileLarge && (
                                    <p className="text-yellow-600 font-semibold">
                                        Advertencia: El archivo es grande y el análisis podría tardar más de lo normal o fallar.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="obra-nombre">Nombre de la Obra (referencial)</Label>
                        <Input id="obra-nombre" value={obraNombre} onChange={e => setObraNombre(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="obra-id">ID de la Obra (referencial)</Label>
                        <Input id="obra-id" value={obraId} onChange={e => setObraId(e.target.value)} />
                    </div>
                </CardContent>
            </Card>

            <Button type="submit" size="lg" className="w-full" disabled={loading || !pdfFile}>
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
                {loading ? 'Analizando PDF...' : 'Importar con IA'}
            </Button>
        </form>

        <div className="sticky top-24">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">Resultado de la Importación</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[70vh] overflow-y-auto">
              {loading && (
                 <div className="text-center py-8 space-y-4">
                    <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
                    <p className="text-sm font-medium text-primary">Procesando el documento...</p>
                    <p className="text-xs text-muted-foreground/80">(El análisis de PDF puede tardar varios minutos)</p>
                </div>
              )}
              {error && (
                  <div className="text-center py-8 text-destructive bg-destructive/10 rounded-md">
                      <p className="font-semibold">Error en la importación</p>
                      <p className="text-sm">{error}</p>
                  </div>
              )}
              {resultado && (
                 <div className="space-y-6">
                    <div>
                        <h3 className="font-semibold flex items-center gap-2 mb-2"><ListTree /> Vista Jerárquica</h3>
                         <div className="p-4 border rounded-md bg-muted/50">
                            {resultado.chapters.map(chapter => (
                                <div key={chapter.code || chapter.name} className="mb-4">
                                    <div className="flex items-center gap-2">
                                        <Folder className="h-5 w-5 text-primary" />
                                        <h4 className="font-bold text-lg">{chapter.name}</h4>
                                    </div>
                                    <div className="pl-6 border-l-2 border-primary/50 ml-2">
                                       <ItemTree items={chapter.items} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold flex items-center gap-2 mb-2"><FileText /> JSON Completo</h3>
                        <pre className="text-xs bg-slate-900 text-slate-100 p-4 rounded-md overflow-x-auto">
                            {JSON.stringify(resultado, null, 2)}
                        </pre>
                    </div>
                 </div>
              )}
              {!loading && !resultado && !error && (
                <div className="text-center py-12 text-muted-foreground">
                  <Upload className="h-12 w-12 mx-auto mb-4" />
                  <p>Sube un archivo PDF para comenzar.</p>
                  <p className="text-sm">El resultado del análisis aparecerá aquí.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
