// src/app/(pcg)/operaciones/presupuestos/itemizados/importar/page.tsx
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Obra } from '@/types/pcg';
import { iniciarImportacionAction } from './actions';


export default function ImportarItemizadoPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, companyId, role } = useAuth();
  
  const [obras, setObras] = useState<Obra[]>([]);
  const [selectedObraId, setSelectedObraId] = useState('');

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [notas, setNotas] = useState('');
  const [isUploading, setIsUploading] = useState(false);

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


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({ variant: 'destructive', title: 'Archivo inválido', description: 'Por favor, selecciona un archivo PDF.' });
        setPdfFile(null);
        return;
      }
      setPdfFile(file);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pdfFile) {
      toast({ variant: 'destructive', title: 'Error', description: 'Debes seleccionar un archivo PDF.' });
      return;
    }
    if (!selectedObraId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Debes seleccionar una obra.' });
      return;
    }

    const selectedObra = obras.find(o => o.id === selectedObraId);
    if (!selectedObra) {
        toast({ variant: 'destructive', title: 'Error', description: 'La obra seleccionada no es válida.' });
        return;
    }

    setIsUploading(true);
    toast({ title: "Analizando documento...", description: "La IA está procesando el PDF. Esto puede tardar hasta 2 minutos." });

    const formData = new FormData();
    formData.append('obraId', selectedObraId);
    formData.append('obraNombre', selectedObra.nombreFaena);
    formData.append('notas', notas);
    formData.append('pdfFile', pdfFile);

    try {
        const result = await iniciarImportacionAction(formData);

        if (result.error) {
            throw new Error(result.error);
        }
        
        if (result.jobId) {
            router.push(`/operaciones/presupuestos/itemizados/importar/${result.jobId}`);
        } else {
            throw new Error('No se recibió un ID de trabajo del servidor.');
        }

    } catch (err: any) {
        console.error(err);
        toast({ variant: 'destructive', title: 'Error al analizar', description: `Ocurrió un problema: ${err.message}` });
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
            Sube un itemizado en formato PDF y la IA extraerá las partidas para crear un presupuesto. El análisis puede tardar hasta 2 minutos.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <div className="space-y-2">
                    <Label htmlFor="notas">3. Notas para la IA (opcional)</Label>
                    <Textarea id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej: Todos los precios están en UF. Considerar que la página 3 es un resumen y debe ser ignorada." />
                </div>
                <Button type="submit" disabled={isUploading || !pdfFile || !selectedObraId} className="w-full">
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    {isUploading ? 'Enviando a análisis...' : 'Analizar Documento Completo con IA'}
                </Button>
            </form>
        </CardContent>
      </Card>
    </div>
  );
}
