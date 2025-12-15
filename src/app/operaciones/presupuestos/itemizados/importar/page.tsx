// src/app/operaciones/presupuestos/itemizados/importar/page.tsx
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Wand2, Upload, Folder, FileText, ListTree, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ItemizadoImportOutput, ItemNode, ItemRow } from '@/types/itemizados-import';

const MAX_FILE_SIZE_MB = 15;
const WARNING_FILE_SIZE_MB = 10;
const POLLING_INTERVAL = 2500; // 2.5 segundos
const POLLING_TIMEOUT = 180000; // 3 minutos

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function slugify(text: string): string {
    if (!text) return '';
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

const ItemTree = ({ chapters, rows }: { chapters: { name: string }[], rows: ItemRow[] }) => {
    const tree = useMemo(() => {
        if (!rows || !chapters) return [];

        const nodesById: Record<string, ItemNode> = {};
        rows.forEach(row => {
            nodesById[row.id] = { ...row, children: [] };
        });

        const chapterTrees: ItemNode[][] = Array.from({ length: chapters.length }, () => []);

        rows.forEach(row => {
            if (row.parentId && nodesById[row.parentId]) {
                nodesById[row.parentId].children.push(nodesById[row.id]);
            } else if (row.chapterIndex !== undefined && chapterTrees[row.chapterIndex]) {
                chapterTrees[row.chapterIndex].push(nodesById[row.id]);
            }
        });

        return chapters.map((chap, index) => ({
            ...chap,
            items: chapterTrees[index] || []
        }));
    }, [chapters, rows]);

    const renderNode = (node: ItemNode, level: number, parentPath: string, index: number) => {
        const nodeKeyPart = node.code ? node.code : `${level}-${index}-${slugify(node.name)}`;
        const currentPath = `${parentPath}/${nodeKeyPart}`;

        return (
            <div key={currentPath} style={{ marginLeft: `${level * 20}px` }} className="mt-2">
                <div className="flex items-center gap-2">
                    <ListTree className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-semibold">{node.name}</span>
                    {node.total !== null && typeof node.total !== 'undefined' && <span className="text-xs text-muted-foreground">({node.total?.toLocaleString()})</span>}
                </div>
                {node.children && node.children.length > 0 && (
                    <div className="pl-4 border-l">
                        {node.children.map((child, childIndex) => renderNode(child, level + 1, currentPath, childIndex))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div>
            {tree.map((chapter, index) => (
                 <div key={`${slugify(chapter.name)}-${index}`} className="mb-4">
                    <div className="flex items-center gap-2">
                        <Folder className="h-5 w-5 text-primary" />
                        <h4 className="font-bold text-lg">{chapter.name}</h4>
                    </div>
                    <div className="pl-6 border-l-2 border-primary/50 ml-2">
                       {chapter.items.map((item, itemIndex) => renderNode(item, 0, `chap-${index}`, itemIndex))}
                    </div>
                </div>
            ))}
        </div>
    );
};


export default function ImportarItemizadoPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [obraId, setObraId] = useState('obra-test-01');
  const [obraNombre, setObraNombre] = useState('Obra de Prueba');
  
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'queued' | 'processing' | 'done' | 'error'>('idle');
  const [resultado, setResultado] = useState<ItemizadoImportOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId || (status !== 'queued' && status !== 'processing')) {
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(async () => {
        if (Date.now() - startTime > POLLING_TIMEOUT) {
            clearInterval(interval);
            setError("El análisis está tardando más de lo esperado. Por favor, inténtalo de nuevo más tarde.");
            setStatus('error');
            setJobId(null);
            return;
        }

        try {
            const res = await fetch(`/api/itemizados/importar/${jobId}`);
            if (!res.ok) {
                console.warn(`Polling failed with status: ${res.status}`);
                // Si la API de estado falla, asumimos un error temporal y continuamos intentando.
                // Si persiste, el timeout global lo capturará.
                return;
            }
            
            const data = await res.json();
            setStatus(data.status);

            if (data.status === 'done') {
                clearInterval(interval);
                setResultado(data.result);
                setJobId(null);
                toast({ title: 'Análisis completado', description: 'El itemizado se ha procesado con éxito.' });
            } else if (data.status === 'error') {
                clearInterval(interval);
                setError(data.error || "Ocurrió un error desconocido durante el procesamiento.");
                setJobId(null);
            }
        } catch (err) {
            console.error("Error during polling:", err);
            // En caso de un error de red, seguimos intentando hasta el timeout.
        }
    }, POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, [jobId, status, toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

      if (!isPdf) {
        toast({ variant: 'destructive', title: 'Archivo no válido', description: 'Por favor, selecciona un archivo en formato PDF.' });
        e.target.value = "";
        setPdfFile(null);
        return;
      }
      
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast({ variant: 'destructive', title: 'Archivo demasiado grande', description: `Por favor, sube un archivo de menos de ${MAX_FILE_SIZE_MB}MB.` });
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

    setStatus('queued');
    setError(null);
    setResultado(null);
    setJobId(null);

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
            body: JSON.stringify(input),
        });
        
        const body = await response.json();
        
        if (response.status !== 202 || !body.jobId) {
            throw new Error(body.error || `Error del servidor: ${response.statusText}`);
        }
        
        setJobId(body.jobId);
        setStatus('processing');

    } catch (err: any) {
        console.error("Error al iniciar la importación:", err);
        const errorMessage = err.message || "Ocurrió un error desconocido al contactar con el servidor.";
        setError(errorMessage);
        setStatus('error');
        toast({
            variant: "destructive",
            title: "Error al iniciar análisis",
            description: errorMessage
        });
    }
  };
  
  const isLoading = status === 'queued' || status === 'processing';
  const isFileLarge = pdfFile && pdfFile.size > WARNING_FILE_SIZE_MB * 1024 * 1024;

  const renderStatus = () => {
    if (status === 'queued') {
        return <div className="text-center py-8 space-y-4"><Clock className="h-10 w-10 mx-auto text-primary" /><p className="text-sm font-medium text-primary">El análisis está en cola...</p><p className="text-xs text-muted-foreground/80">El trabajo comenzará pronto.</p></div>;
    }
    if (status === 'processing') {
        return <div className="text-center py-8 space-y-4"><Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" /><p className="text-sm font-medium text-primary">Procesando el documento...</p><p className="text-xs text-muted-foreground/80">(Esto puede tardar varios minutos)</p></div>;
    }
    if (status === 'error') {
        return <div className="text-center py-8 text-destructive bg-destructive/10 rounded-md"><AlertTriangle className="h-10 w-10 mx-auto mb-2" /><p className="font-semibold">Error en la importación</p><p className="text-sm">{error}</p></div>;
    }
    if (status === 'done' && resultado) {
        return <div className="space-y-6"><div><h3 className="font-semibold flex items-center gap-2 mb-2"><ListTree /> Vista Jerárquica</h3><div className="p-4 border rounded-md bg-muted/50">{resultado.chapters && resultado.rows ? (<ItemTree chapters={resultado.chapters} rows={resultado.rows} />) : (<p className="text-sm text-muted-foreground">La IA no devolvió un formato válido para construir el árbol.</p>)}</div></div><div><h3 className="font-semibold flex items-center gap-2 mb-2"><FileText /> JSON Completo</h3><pre className="text-xs bg-slate-900 text-slate-100 p-4 rounded-md overflow-x-auto">{JSON.stringify(resultado, null, 2)}</pre></div></div>;
    }
    return <div className="text-center py-12 text-muted-foreground"><Upload className="h-12 w-12 mx-auto mb-4" /><p>Sube un archivo PDF para comenzar.</p><p className="text-sm">El resultado del análisis aparecerá aquí.</p></div>;
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <header className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Importar Itemizado con IA (beta)</h1>
          <p className="text-muted-foreground">Sube un itemizado en PDF y deja que la IA lo estructure por ti.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
                <CardHeader><CardTitle>1. Carga tu itemizado</CardTitle><CardDescription>Selecciona el archivo PDF que quieres analizar (máx. {MAX_FILE_SIZE_MB}MB).</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2"><Label htmlFor="pdf-file">Archivo del itemizado (PDF)</Label><Input id="pdf-file" type="file" accept="application/pdf,.pdf" onChange={handleFileChange} />{pdfFile && (<div className="text-xs text-muted-foreground pt-1"><p>Archivo seleccionado: <strong>{pdfFile.name}</strong></p>{isFileLarge && (<p className="text-yellow-600 font-semibold">Advertencia: El archivo es grande y el análisis podría tardar más de lo normal o fallar.</p>)}</div>)}</div>
                    <div className="space-y-2"><Label htmlFor="obra-nombre">Nombre de la Obra (referencial)</Label><Input id="obra-nombre" value={obraNombre} onChange={e => setObraNombre(e.target.value)} /></div>
                    <div className="space-y-2"><Label htmlFor="obra-id">ID de la Obra (referencial)</Label><Input id="obra-id" value={obraId} onChange={e => setObraId(e.target.value)} /></div>
                </CardContent>
            </Card>
            <Button type="submit" size="lg" className="w-full" disabled={isLoading || !pdfFile}>
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
                {isLoading ? 'Analizando...' : 'Importar con IA'}
            </Button>
        </form>

        <div className="sticky top-24">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2">Resultado de la Importación</CardTitle></CardHeader>
            <CardContent className="max-h-[70vh] overflow-y-auto">{renderStatus()}</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
