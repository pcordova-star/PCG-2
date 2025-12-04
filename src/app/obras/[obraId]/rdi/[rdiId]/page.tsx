// src/app/obras/[obraId]/rdi/[rdiId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Rdi, RdiEstado, RdiPrioridad } from "@/types/pcg";
import { getRdiById, updateRdi } from "@/lib/rdi/rdiService";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Save, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const prioridadColors: Record<RdiPrioridad, string> = {
  baja: "bg-blue-100 text-blue-800 border-blue-200",
  media: "bg-yellow-100 text-yellow-800 border-yellow-200",
  alta: "bg-orange-100 text-orange-800 border-orange-200",
  critica: "bg-red-100 text-red-800 border-red-200",
};

const estadoColors: Record<RdiEstado, string> = {
  borrador: "bg-gray-100 text-gray-800",
  enviada: "bg-blue-100 text-blue-800",
  respondida: "bg-purple-100 text-purple-800",
  cerrada: "bg-green-100 text-green-800",
  anulada: "bg-red-100 text-red-800 line-through",
};


export default function RdiDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, companyId } = useAuth();
  const { toast } = useToast();

  const obraId = params.obraId as string;
  const rdiId = params.rdiId as string;

  const [rdi, setRdi] = useState<Rdi | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!obraId || !rdiId) return;

    const fetchRdi = async () => {
      setLoading(true);
      try {
        const data = await getRdiById(obraId, rdiId);
        if (data) {
          setRdi(data);
        } else {
          setError("RDI no encontrada.");
        }
      } catch (err) {
        console.error("Error fetching RDI:", err);
        setError("No se pudo cargar la RDI.");
      } finally {
        setLoading(false);
      }
    };
    fetchRdi();
  }, [obraId, rdiId]);

  const handleUpdate = async () => {
    if (!rdi) return;
    setIsSaving(true);
    try {
        const { id, createdAt, obraId: rdiObraId, companyId: rdiCompanyId, ...updatableData } = rdi;
        await updateRdi(obraId, rdiId, updatableData);
        toast({ title: "Éxito", description: "RDI actualizada correctamente." });
    } catch(err) {
        console.error("Error updating RDI:", err);
        toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar la RDI." });
    } finally {
        setIsSaving(false);
    }
  };

  const handleAnular = async () => {
    if (!rdi) return;
    try {
        await updateRdi(obraId, rdiId, { deleted: true, estado: 'anulada' });
        toast({ title: "RDI Anulada", description: "El requerimiento ha sido anulado y no se mostrará en los listados."});
        router.back();
    } catch(err) {
        console.error("Error deleting RDI:", err);
        toast({ variant: "destructive", title: "Error", description: "No se pudo anular la RDI." });
    }
  };
  
  const handleInputChange = (field: keyof Rdi, value: any) => {
    setRdi(prev => prev ? { ...prev, [field]: value } : null);
  };
  
  const handleDestinatarioChange = (field: keyof Rdi['destinatario'], value: any) => {
    setRdi(prev => prev ? { ...prev, destinatario: { ...prev.destinatario, [field]: value } } : null);
  };

  if (loading) {
    return <div className="p-8 text-center"><Loader2 className="animate-spin" /> Cargando RDI...</div>;
  }
  
  if (error) {
    return <div className="p-8 text-center text-destructive">{error}</div>;
  }
  
  if (!rdi) {
    return <div className="p-8 text-center">RDI no encontrada.</div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4"/></Button>
            <div>
                <h1 className="text-2xl font-bold">Detalle de RDI: {rdi.correlativo}</h1>
                <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={cn(estadoColors[rdi.estado])}>{rdi.estado}</Badge>
                    <Badge variant="outline" className={cn(prioridadColors[rdi.prioridad])}>{rdi.prioridad}</Badge>
                </div>
            </div>
        </div>
        <div className="flex gap-2">
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">Anular RDI</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Anular esta RDI?</AlertDialogTitle>
                        <AlertDialogDescription>Esta acción marcará la RDI como anulada. No podrá ser editada y no se mostrará en los listados principales. Esta acción no se puede deshacer.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleAnular}>Confirmar Anulación</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Button onClick={handleUpdate} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                Guardar Cambios
            </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
           <Card>
                <CardHeader><CardTitle>Información del Requerimiento</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2"><Label>Título</Label><Input value={rdi.titulo} onChange={e => handleInputChange('titulo', e.target.value)} /></div>
                    <div className="space-y-2"><Label>Descripción</Label><Textarea value={rdi.descripcion} onChange={e => handleInputChange('descripcion', e.target.value)} /></div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                       <div className="space-y-2"><Label>Tipo</Label><Select value={rdi.tipo} onValueChange={(v) => handleInputChange('tipo', v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="a_mandante">A Mandante</SelectItem><SelectItem value="a_contratista">A Contratista</SelectItem><SelectItem value="interna">Interna</SelectItem></SelectContent></Select></div>
                       <div className="space-y-2"><Label>Especialidad</Label><Select value={rdi.especialidad} onValueChange={(v) => handleInputChange('especialidad', v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="arquitectura">Arquitectura</SelectItem><SelectItem value="estructuras">Estructuras</SelectItem><SelectItem value="electrica">Eléctrica</SelectItem><SelectItem value="sanitaria">Sanitaria</SelectItem><SelectItem value="climatizacion">Climatización</SelectItem><SelectItem value="otra">Otra</SelectItem></SelectContent></Select></div>
                       <div className="space-y-2"><Label>Prioridad</Label><Select value={rdi.prioridad} onValueChange={(v) => handleInputChange('prioridad', v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="baja">Baja</SelectItem><SelectItem value="media">Media</SelectItem><SelectItem value="alta">Alta</SelectItem><SelectItem value="critica">Crítica</SelectItem></SelectContent></Select></div>
                    </div>
                </CardContent>
           </Card>

            <Card>
                <CardHeader><CardTitle>Destinatario</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Nombre</Label><Input value={rdi.destinatario.nombre} onChange={e => handleDestinatarioChange('nombre', e.target.value)} /></div>
                    <div className="space-y-2"><Label>Email</Label><Input value={rdi.destinatario.email} onChange={e => handleDestinatarioChange('email', e.target.value)} /></div>
                    <div className="space-y-2"><Label>Empresa</Label><Input value={rdi.destinatario.empresa} onChange={e => handleDestinatarioChange('empresa', e.target.value)} /></div>
                    <div className="space-y-2"><Label>Cargo</Label><Input value={rdi.destinatario.cargo} onChange={e => handleDestinatarioChange('cargo', e.target.value)} /></div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader><CardTitle>Plazos e Impacto</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Plazo de respuesta (días)</Label><Input type="number" value={rdi.plazoRespuestaDias ?? ''} onChange={e => handleInputChange('plazoRespuestaDias', Number(e.target.value))} /></div>
                    <div className="flex items-center space-x-2 pt-6"><Switch id="afecta-plazo" checked={rdi.afectaPlazo} onCheckedChange={c => handleInputChange('afectaPlazo', c)} /><Label htmlFor="afecta-plazo">¿Afecta al plazo de la obra?</Label></div>
                    {rdi.afectaPlazo && <div className="space-y-2"><Label>Días de aumento solicitados</Label><Input type="number" value={rdi.diasAumentoSolicitados ?? ''} onChange={e => handleInputChange('diasAumentoSolicitados', Number(e.target.value))} /></div>}
                </CardContent>
            </Card>
        </div>

        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle>Metadatos</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-2">
                    <p><strong>Emisor:</strong> {rdi.solicitante.nombre} ({rdi.solicitante.email})</p>
                    <p><strong>Fecha Emisión:</strong> {rdi.createdAt.toDate().toLocaleString()}</p>
                    <p><strong>Última Actualización:</strong> {rdi.updatedAt.toDate().toLocaleString()}</p>
                    <div className="space-y-2"><Label>Estado</Label><Select value={rdi.estado} onValueChange={(v) => handleInputChange('estado', v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="borrador">Borrador</SelectItem><SelectItem value="enviada">Enviada</SelectItem><SelectItem value="respondida">Respondida</SelectItem><SelectItem value="cerrada">Cerrada</SelectItem><SelectItem value="anulada">Anulada</SelectItem></SelectContent></Select></div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
