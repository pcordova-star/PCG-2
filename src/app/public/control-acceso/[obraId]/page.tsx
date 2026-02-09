// src/app/public/control-acceso/[obraId]/page.tsx
"use client";
import { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Obra } from '@/types/pcg';
import { PcgLogo } from '@/components/branding/PcgLogo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function PublicControlAccesoPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const obraId = params.obraId as string;

  const [obra, setObra] = useState<Obra | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    rut: '',
    empresa: '',
    motivo: '',
    archivo: null as File | null,
  });

  useEffect(() => {
    if (obraId) {
      const fetchObra = async () => {
        try {
          const obraRef = doc(firebaseDb, "obras", obraId);
          const obraSnap = await getDoc(obraRef);
          if (obraSnap.exists()) {
            setObra({ id: obraSnap.id, ...obraSnap.data() } as Obra);
          } else {
            setError("La obra especificada no fue encontrada.");
          }
        } catch (err) {
          setError("No se pudo cargar la información de la obra.");
        } finally {
          setLoading(false);
        }
      };
      fetchObra();
    } else {
      setError("No se ha especificado una obra.");
      setLoading(false);
    }
  }, [obraId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({ variant: 'destructive', title: 'Archivo demasiado grande', description: 'Por favor, sube un archivo de menos de 10MB.' });
        setFormData(prev => ({ ...prev, archivo: null }));
        e.target.value = '';
      } else {
        setFormData(prev => ({ ...prev, archivo: file }));
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.archivo) {
      toast({ variant: 'destructive', title: 'Falta archivo', description: 'Por favor, adjunta el archivo requerido.' });
      return;
    }
    
    setIsSubmitting(true);
    const data = new FormData();
    data.append('obraId', obraId);
    data.append('nombreCompleto', formData.nombreCompleto);
    data.append('rut', formData.rut);
    data.append('empresa', formData.empresa);
    data.append('motivo', formData.motivo);
    data.append('archivo', formData.archivo);

    try {
      const response = await fetch('/api/control-acceso/submit', {
        method: 'POST',
        body: data,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Ocurrió un error en el servidor.');
      }
      
      router.push('/public/control-acceso/success');

    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Error al registrar', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>;
  }
  
  if (error) {
     return (
      <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
           <Button variant="link" asChild className="mt-4"><Link href="/">Volver al Inicio</Link></Button>
        </Alert>
      </div>
     );
  }

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
            <div className="mx-auto mb-4"><PcgLogo /></div>
          <CardTitle>Registro de Acceso a Obra</CardTitle>
          <CardDescription>
            Completando el ingreso para: <span className="font-semibold">{obra?.nombreFaena}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombreCompleto">Nombre Completo*</Label>
              <Input id="nombreCompleto" name="nombreCompleto" onChange={handleInputChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rut">RUT/Cédula de Identidad*</Label>
              <Input id="rut" name="rut" onChange={handleInputChange} required />
            </div>
             <div className="space-y-2">
              <Label htmlFor="empresa">Empresa*</Label>
              <Input id="empresa" name="empresa" onChange={handleInputChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo de la visita*</Label>
              <Select name="motivo" onValueChange={(v) => setFormData(p => ({...p, motivo: v}))} required>
                <SelectTrigger id="motivo"><SelectValue placeholder="Seleccione un motivo..."/></SelectTrigger>
                <SelectContent>
                    <SelectItem value="visita_tecnica">Visita Técnica</SelectItem>
                    <SelectItem value="proveedor">Proveedor / Despacho</SelectItem>
                    <SelectItem value="reunion">Reunión</SelectItem>
                    <SelectItem value="inspeccion">Inspección</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
             <div className="space-y-2">
              <Label htmlFor="archivo">Adjuntar Archivo* (CI, Guía Despacho, etc.)</Label>
              <Input id="archivo" name="archivo" type="file" onChange={handleFileChange} required />
              {formData.archivo && <p className="text-xs text-muted-foreground">{formData.archivo.name}</p>}
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
              Registrar Ingreso
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
