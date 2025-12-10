// src/app/cubicacion/analisis-planos/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, BrainCircuit, Loader2, Upload } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { firebaseDb, firebaseStorage } from '@/lib/firebaseClient';
import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Obra } from '@/types/pcg';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

type AnalisisOpciones = {
  superficieUtil: boolean;
  m2Muros: boolean;
  m2Losas: boolean;
  m2Revestimientos: boolean;
};

type ResultadoAnalisis = {
  id: string;
  status: 'pendiente_ia' | 'en_proceso' | 'completado' | 'error';
  mensaje: string;
}

export default function AnalisisPlanosPage() {
  const { user, companyId, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [obras, setObras] = useState<Obra[]>([]);
  const [selectedObraId, setSelectedObraId] = useState<string>('');
  const [planoFile, setPlanoFile] = useState<File | null>(null);
  const [opcionesAnalisis, setOpcionesAnalisis] = useState<AnalisisOpciones>({
    superficieUtil: true,
    m2Muros: false,
    m2Losas: false,
    m2Revestimientos: false,
  });
  const [notas, setNotas] = useState('');
  const [isAnalizando, setIsAnalizando] = useState(false);
  
  // Placeholder for results
  const [resultado, setResultado] = useState<ResultadoAnalisis | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
        router.replace('/login');
        return;
    }
    
    const fetchObras = async () => {
      let q;
      const obrasRef = collection(firebaseDb, "obras");
      if (role === 'superadmin') {
          q = query(obrasRef, orderBy("nombreFaena"));
      } else if (companyId) {
          q = query(obrasRef, where("empresaId", "==", companyId), orderBy("nombreFaena"));
      } else {
          return;
      }
      
      const snapshot = await getDocs(q);
      const obrasData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra));
      setObras(obrasData);
      if (obrasData.length > 0) {
        setSelectedObraId(obrasData[0].id);
      }
    };

    fetchObras();
  }, [user, authLoading, companyId, role, router]);

  const handleCheckboxChange = (opcion: keyof AnalisisOpciones) => {
    setOpcionesAnalisis(prev => ({ ...prev, [opcion]: !prev[opcion] }));
  };

  const handleAnalizar = async () => {
    if (!selectedObraId || !planoFile || !user || !companyId) {
        toast({
            variant: "destructive",
            title: "Faltan datos",
            description: "Por favor, selecciona una obra y un archivo de plano.",
        });
        return;
    }
    
    setIsAnalizando(true);
    setResultado(null);

    try {
        // 1. Crear una referencia para el nuevo documento de análisis y obtener su ID
        const newAnalysisRef = doc(collection(firebaseDb, "analisisPlanos"));
        const nuevoIdAnalisis = newAnalysisRef.id;

        // 2. Subir el archivo a Firebase Storage
        const storagePath = `analisis-planos/${companyId}/${selectedObraId}/${nuevoIdAnalisis}/${planoFile.name}`;
        const fileRef = ref(firebaseStorage, storagePath);
        const uploadResult = await uploadBytes(fileRef, planoFile);
        const downloadURL = await getDownloadURL(uploadResult.ref);

        // 3. Guardar metadatos en Firestore
        const analisisData = {
            companyId,
            obraId: selectedObraId,
            storagePath,
            downloadURL,
            nombreArchivoOriginal: planoFile.name,
            opcionesAnalisis,
            notas,
            userId: user.uid,
            userEmail: user.email,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            status: 'pendiente_ia',
            resultado: null, // Campo para los resultados de la IA
        };

        await addDoc(collection(firebaseDb, "analisisPlanos"), analisisData);

        toast({
            title: "Plano cargado con éxito",
            description: "El análisis ha sido registrado y está listo para ser procesado por la IA.",
        });
        
        setResultado({
            id: nuevoIdAnalisis,
            status: 'pendiente_ia',
            mensaje: "Plano cargado y análisis registrado. Recibirás una notificación cuando los resultados estén listos."
        });

    } catch (error) {
        console.error("Error al analizar el plano:", error);
        toast({
            variant: "destructive",
            title: "Error de carga",
            description: "No se pudo subir el plano o registrar el análisis. Inténtalo de nuevo.",
        });
        setResultado({
             id: 'error',
             status: 'error',
             mensaje: "Ocurrió un error. Revisa la consola para más detalles."
        });
    } finally {
        setIsAnalizando(false);
    }
  };

  const isBotonHabilitado = selectedObraId && planoFile && Object.values(opcionesAnalisis).some(v => v);

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Análisis de Planos con IA</h1>
          <p className="text-lg text-muted-foreground mt-1">
            Sube un plano en formato PDF o imagen para obtener cubicaciones y análisis de superficies de forma automática.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Cargar Plano y Seleccionar Obra</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="obra-select">Obra*</Label>
                <Select value={selectedObraId} onValueChange={setSelectedObraId}>
                  <SelectTrigger id="obra-select"><SelectValue placeholder="Seleccionar obra..." /></SelectTrigger>
                  <SelectContent>
                    {obras.map(obra => <SelectItem key={obra.id} value={obra.id}>{obra.nombreFaena}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="plano-upload">Archivo del Plano* (.pdf, .png, .jpg)</Label>
                <Input 
                  id="plano-upload" 
                  type="file" 
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setPlanoFile(e.target.files ? e.target.files[0] : null)} 
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>2. Opciones de Análisis</CardTitle>
              <CardDescription>Selecciona qué elementos quieres que la IA analice y extraiga del plano.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <Label className="flex items-center gap-2 font-normal"><Checkbox checked={opcionesAnalisis.superficieUtil} onCheckedChange={() => handleCheckboxChange('superficieUtil')} /><span>Superficie útil por recinto</span></Label>
                <Label className="flex items-center gap-2 font-normal"><Checkbox checked={opcionesAnalisis.m2Muros} onCheckedChange={() => handleCheckboxChange('m2Muros')} /><span>m² de muros</span></Label>
                <Label className="flex items-center gap-2 font-normal"><Checkbox checked={opcionesAnalisis.m2Losas} onCheckedChange={() => handleCheckboxChange('m2Losas')} /><span>m² de losas</span></Label>
                <Label className="flex items-center gap-2 font-normal"><Checkbox checked={opcionesAnalisis.m2Revestimientos} onCheckedChange={() => handleCheckboxChange('m2Revestimientos')} /><span>m² de revestimientos (baños/cocinas)</span></Label>
              </div>
              <div className="pt-4">
                <Label htmlFor="ia-notes">Notas para la IA (escala, altura de muros, etc.)</Label>
                <Textarea 
                  id="ia-notes" 
                  value={notas} 
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Ej: El plano está en escala 1:50. Considerar altura de muros de 2.40m."
                />
              </div>
            </CardContent>
          </Card>

          <Button size="lg" onClick={handleAnalizar} disabled={!isBotonHabilitado || isAnalizando}>
            {isAnalizando ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Analizando...
              </>
            ) : (
              <>
                <BrainCircuit className="mr-2 h-5 w-5" />
                Analizar plano con IA
              </>
            )}
          </Button>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>3. Resultados del Análisis</CardTitle>
            </CardHeader>
            <CardContent className="min-h-[200px] flex items-center justify-center">
              {isAnalizando ? (
                 <div className="text-center text-muted-foreground space-y-2">
                    <Loader2 className="h-8 w-8 mx-auto animate-spin" />
                    <p>Procesando el plano...</p>
                 </div>
              ) : resultado ? (
                <div className="text-sm text-center">
                    <p>{resultado.mensaje}</p>
                    {resultado.status === 'pendiente_ia' && <p className='mt-2 text-xs font-mono text-muted-foreground'>ID Análisis: {resultado.id}</p>}
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <p>Aquí se mostrarán los resultados del análisis una vez que se complete.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
