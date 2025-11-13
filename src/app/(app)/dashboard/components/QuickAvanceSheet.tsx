"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { firebaseDb, firebaseStorage } from "@/lib/firebaseClient";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { X, Loader2 } from "lucide-react";
import Image from "next/image";

type Obra = {
  id: string;
  nombreFaena: string;
};

type Actividad = {
  id: string;
  nombreActividad: string;
};

type QuickAvanceSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const MAX_FOTOS = 5;
const MAX_TAMANO_MB = 5;
const CLOUD_FUNCTION_URL = "https://southamerica-west1-pcg-2-8bf1b.cloudfunctions.net/registrarAvanceRapido";


export function QuickAvanceSheet({ open, onOpenChange }: QuickAvanceSheetProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [obras, setObras] = useState<Obra[]>([]);
  const [loadingObras, setLoadingObras] = useState(true);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loadingActividades, setLoadingActividades] = useState(false);

  const [obraId, setObraId] = useState("");
  const [actividadId, setActividadId] = useState<string | null>(null);
  const [porcentaje, setPorcentaje] = useState("");
  const [comentario, setComentario] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [visibleCliente, setVisibleCliente] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  useEffect(() => {
    async function fetchObras() {
      if (!user) return;
      try {
        setLoadingObras(true);
        const q = query(
          collection(firebaseDb, "obras"),
          orderBy("nombreFaena")
        );
        const snapshot = await getDocs(q);
        const obrasData = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Obra)
        );
        setObras(obrasData);
        if (obrasData.length > 0 && !obraId) {
          setObraId(obrasData[0].id);
        }
      } catch (error) {
        console.error("Error fetching obras:", error);
        toast({
          variant: "destructive",
          title: "Error al cargar obras",
          description: "No se pudieron cargar las obras disponibles.",
        });
      } finally {
        setLoadingObras(false);
      }
    }
    if (open) {
      fetchObras();
    }
  }, [user, open, toast]);

  useEffect(() => {
    async function fetchActividades() {
      if (!obraId) {
        setActividades([]);
        return;
      };
      try {
        setLoadingActividades(true);
        const q = query(collection(firebaseDb, "obras", obraId, "actividades"), orderBy("nombreActividad"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Actividad));
        setActividades(data);
      } catch (error) {
        console.error("Error fetching actividades:", error);
        setActividades([]);
      } finally {
        setLoadingActividades(false);
      }
    }
    fetchActividades();
  }, [obraId]);
  
  const resetForm = () => {
    setActividadId(null);
    setPorcentaje("");
    setComentario("");
    setArchivos([]);
    setPreviews([]);
    setVisibleCliente(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const nuevosArchivos = Array.from(e.target.files).slice(0, MAX_FOTOS - archivos.length);
    if (archivos.length + nuevosArchivos.length > MAX_FOTOS) {
        toast({ title: "Límite de fotos", description: `Solo puedes subir un máximo de ${MAX_FOTOS} fotos.`});
        return;
    }
    const archivosValidos = nuevosArchivos.filter(file => {
      const esValido = file.size <= MAX_TAMANO_MB * 1024 * 1024;
      if (!esValido) {
        toast({ variant: "destructive", title: "Archivo demasiado grande", description: `"${file.name}" supera los ${MAX_TAMANO_MB} MB.`});
      }
      return esValido;
    });
    const combinedArchivos = [...archivos, ...archivosValidos];
    setArchivos(combinedArchivos);
    const nuevasPreviews = combinedArchivos.map(file => URL.createObjectURL(file));
    previews.forEach(url => URL.revokeObjectURL(url)); 
    setPreviews(nuevasPreviews);
  };
  
  const handleRemoveFile = (index: number) => {
    setArchivos(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => {
        const newPreviews = prev.filter((_, i) => i !== index);
        URL.revokeObjectURL(previews[index]);
        return newPreviews;
    });
  };

  const handleSubmit = async () => {
    if (!obraId) {
      toast({ variant: "destructive", title: "Falta la obra", description: "Por favor, selecciona una obra." });
      return;
    }
    if (!user) {
        toast({ variant: "destructive", title: "No autenticado", description: "Debes iniciar sesión para registrar un avance." });
        return;
    }

    const numPorcentaje = Number(porcentaje);
    if (isNaN(numPorcentaje) || numPorcentaje < 0 || numPorcentaje > 100) {
      toast({ variant: "destructive", title: "Porcentaje inválido", description: "El porcentaje debe ser un número entre 0 y 100." });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);
    
    try {
        const token = await user.getIdToken();
        
        const uploadedUrls: string[] = [];
        if (archivos.length > 0) {
            await Promise.all(
                archivos.map(async (file, index) => {
                    const filePath = `avances/${obraId}/${new Date().getFullYear()}/${new Date().getMonth()+1}/${new Date().getDate()}/${user.uid}-${Date.now()}-${file.name}`;
                    const storageRef = ref(firebaseStorage, filePath);
                    const uploadTask = uploadBytesResumable(storageRef, file);
                    return new Promise<void>((resolve, reject) => {
                        uploadTask.on('state_changed',
                            (snapshot) => {
                                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                                setUploadProgress(progress);
                            },
                            (error) => {
                                console.error("Upload error", error);
                                reject(error);
                            },
                            async () => {
                                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                                uploadedUrls.push(downloadURL);
                                resolve();
                            }
                        );
                    });
                })
            );
        }

        setUploadProgress(null);

        const payload = {
            obraId,
            actividadId: actividadId || null,
            porcentaje: numPorcentaje,
            comentario,
            fotos: uploadedUrls,
            visibleCliente: !!visibleCliente,
            creadoPorNombre: user.displayName || user.email,
        };

        const response = await fetch(CLOUD_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok || !result.ok) {
            throw new Error(result.details || result.error || "Error desconocido al registrar avance con la función.");
        }

        toast({
            title: "Avance registrado con éxito",
            description: "El progreso de la obra ha sido actualizado.",
        });
        
        resetForm();
        onOpenChange(false);

    } catch (error: any) {
        console.error("Fallo al enviar el avance:", error);
        toast({
            variant: "destructive",
            title: "Error al registrar avance",
            description: error.message || "Ocurrió un problema inesperado. Inténtalo de nuevo.",
        });
    } finally {
        setIsSubmitting(false);
        setUploadProgress(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Registrar Avance Diario Rápido</SheetTitle>
          <SheetDescription>
            Informa el progreso de una obra. Los campos marcados con * son obligatorios.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto pr-6 -mr-6 space-y-4 py-4">
            <div className="space-y-1">
                <Label htmlFor="obra-select">Obra *</Label>
                {loadingObras ? <p className="text-sm text-muted-foreground">Cargando obras...</p> : 
                obras.length === 0 ? <p className="text-sm text-muted-foreground">No tienes obras asignadas.</p> :
                <Select value={obraId} onValueChange={setObraId}>
                    <SelectTrigger id="obra-select">
                        <SelectValue placeholder="Selecciona una obra" />
                    </SelectTrigger>
                    <SelectContent>
                        {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nombreFaena}</SelectItem>)}
                    </SelectContent>
                </Select>
                }
            </div>

            <div className="space-y-1">
                <Label htmlFor="actividad-select">Actividad (Opcional)</Label>
                {loadingActividades ? <p className="text-sm text-muted-foreground">Cargando actividades...</p> : 
                <Select value={actividadId ?? "general"} onValueChange={value => setActividadId(value === "general" ? null : value)}>
                    <SelectTrigger id="actividad-select">
                        <SelectValue placeholder="Selecciona una actividad" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="general">Avance General de Obra</SelectItem>
                        {actividades.map(a => <SelectItem key={a.id} value={a.id}>{a.nombreActividad}</SelectItem>)}
                    </SelectContent>
                </Select>
                }
            </div>

            <div className="space-y-1">
                <Label htmlFor="porcentaje">Porcentaje de Avance del Día (%) *</Label>
                <Input id="porcentaje" type="number" value={porcentaje} onChange={e => setPorcentaje(e.target.value)} min="0" max="100" />
            </div>

            <div className="space-y-1">
                <Label htmlFor="comentario">Comentario / Descripción</Label>
                <Textarea id="comentario" value={comentario} onChange={e => setComentario(e.target.value)} maxLength={500} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="fotos">Fotos (hasta 5, máx 5MB c/u)</Label>
                <Input id="fotos" type="file" multiple accept="image/*" capture="environment" onChange={handleFileChange} disabled={archivos.length >= MAX_FOTOS}/>
                 {previews.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                        {previews.map((preview, index) => (
                            <div key={index} className="relative group">
                                <Image src={preview} alt={`Preview ${index}`} width={100} height={100} className="w-full h-24 object-cover rounded-md" />
                                <Button
                                    type="button" variant="destructive" size="icon"
                                    className="absolute top-1 right-1 h-6 w-6 opacity-60 group-hover:opacity-100"
                                    onClick={() => handleRemoveFile(index)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                 )}
            </div>
            
            <div className="flex items-center space-x-2">
                <Checkbox id="visible-cliente" checked={visibleCliente} onCheckedChange={(c) => setVisibleCliente(c === true)} />
                <Label htmlFor="visible-cliente">Visible para el cliente</Label>
            </div>
        </div>
        <SheetFooter>
            <Button onClick={handleSubmit} disabled={isSubmitting || !obraId} className="w-full">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? (uploadProgress !== null ? `Subiendo fotos... ${uploadProgress.toFixed(0)}%` : 'Guardando...') : 'Guardar Avance'}
            </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
