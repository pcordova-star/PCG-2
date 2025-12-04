"use client";

import React, { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Rdi, RdiPrioridad, RdiEstado, Obra } from '@/types/pcg';
import { createRdi, listRdiByObra, uploadAndAddRdiAdjunto } from '@/lib/rdi/rdiService';
import { getDoc, doc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Loader2, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper para badges
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

export default function RdiPage() {
  const params = useParams();
  const router = useRouter();
  const { user, companyId, role } = useAuth();
  const { toast } = useToast();

  const obraId = params.obraId as string;

  const [obra, setObra] = useState<Obra | null>(null);
  const [rdis, setRdis] = useState<Rdi[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState<'a_mandante' | 'a_contratista' | 'interna'>('a_mandante');
  const [especialidad, setEspecialidad] = useState<'arquitectura' | 'estructuras' | 'electrica' | 'sanitaria' | 'climatizacion' | 'otra'>('arquitectura');
  const [prioridad, setPrioridad] = useState<RdiPrioridad>('media');
  const [destinatarioNombre, setDestinatarioNombre] = useState('');
  const [destinatarioEmail, setDestinatarioEmail] = useState('');
  const [destinatarioEmpresa, setDestinatarioEmpresa] = useState('');
  const [destinatarioCargo, setDestinatarioCargo] = useState('');
  const [plazoRespuestaDias, setPlazoRespuestaDias] = useState<number | null>(null);
  const [afectaPlazo, setAfectaPlazo] = useState(false);
  const [diasAumentoSolicitados, setDiasAumentoSolicitados] = useState<number | null>(null);
  const [paraCliente, setParaCliente] = useState(false);
  
  // Estado para adjuntos
  const [isAdjuntoModalOpen, setIsAdjuntoModalOpen] = useState(false);
  const [rdiSeleccionada, setRdiSeleccionada] = useState<Rdi | null>(null);
  const [archivoAdjunto, setArchivoAdjunto] = useState<File | null>(null);
  const [isUploadingAdjunto, setIsUploadingAdjunto] = useState(false);

  useEffect(() => {
    if (!obraId || !companyId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const obraDocRef = doc(firebaseDb, "obras", obraId);
        const obraDataPromise = getDoc(obraDocRef);
        const rdiListPromise = listRdiByObra(companyId, obraId);
        
        const [obraData, rdiList] = await Promise.all([
            obraDataPromise,
            rdiListPromise,
        ]);
        
        if (obraData.exists()) {
          setObra({ id: obraData.id, ...obraData.data() } as Obra);
        }
        setRdis(rdiList);
      } catch (error) {
        console.error("Error fetching RDI data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los datos de RDI.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [obraId, companyId, toast]);

  const resetForm = () => {
    setTitulo('');
    setDescripcion('');
    setTipo('a_mandante');
    setEspecialidad('arquitectura');
    setPrioridad('media');
    setDestinatarioNombre('');
    setDestinatarioEmail('');
    setDestinatarioEmpresa('');
    setDestinatarioCargo('');
    setPlazoRespuestaDias(null);
    setAfectaPlazo(false);
    setDiasAumentoSolicitados(null);
    setParaCliente(false);
  };

  const handleCreateRdi = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !companyId || !obraId) {
      toast({ variant: "destructive", title: "Error", description: "Faltan datos de sesión." });
      return;
    }
    if (!titulo || !descripcion || !destinatarioNombre || !destinatarioEmail) {
        toast({ variant: "destructive", title: "Campos requeridos", description: "Título, descripción y datos del destinatario son obligatorios." });
        return;
    }

    setIsSaving(true);
    try {
      const solicitante = {
        userId: user.uid,
        nombre: user.displayName || user.email || 'Usuario desconocido',
        email: user.email || '',
        cargo: ''
      };

      const destinatario = {
        nombre: destinatarioNombre,
        email: destinatarioEmail,
        empresa: destinatarioEmpresa,
        cargo: destinatarioCargo
      };

      const newRdi = await createRdi({
        companyId, obraId, titulo, descripcion, tipo, especialidad, prioridad,
        solicitante, destinatario,
        planoId: null,
        afectaPlazo,
        diasAumentoSolicitados: afectaPlazo ? diasAumentoSolicitados : null,
        plazoRespuestaDias,
        paraCliente,
      });
      
      setRdis(prev => [newRdi, ...prev]);
      toast({ title: "Éxito", description: `RDI "${newRdi.correlativo}" creado correctamente.` });
      setIsModalOpen(false);
      resetForm();

    } catch (error) {
      console.error("Error creating RDI:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo crear el RDI." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenAdjuntoModal = (rdi: Rdi) => {
    setRdiSeleccionada(rdi);
    setArchivoAdjunto(null);
    setIsAdjuntoModalOpen(true);
  };

  const handleUploadAdjunto = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !companyId || !obraId || !rdiSeleccionada || !archivoAdjunto) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Faltan datos o no se ha seleccionado archivo.",
      });
      return;
    }
  
    try {
      setIsUploadingAdjunto(true);
      const rdiActualizada = await uploadAndAddRdiAdjunto({
        companyId,
        obraId,
        rdiId: rdiSeleccionada.id,
        file: archivoAdjunto,
        subidoPorUserId: user.uid,
      });
  
      // Actualizar el listado en memoria
      setRdis(prev =>
        prev.map(r =>
          r.id === rdiActualizada.id ? rdiActualizada : r
        )
      );
  
      toast({
        title: "Adjunto agregado",
        description: "El archivo se ha subido correctamente a la RDI.",
      });
      setIsAdjuntoModalOpen(false);
    } catch (error) {
      console.error("Error uploading adjunto:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo subir el adjunto.",
      });
    } finally {
      setIsUploadingAdjunto(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Requerimientos de Información (RDI)</h1>
          <p className="text-muted-foreground">Obra: {obra?.nombreFaena || 'Cargando...'}</p>
        </div>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Listado de RDI</CardTitle>
            <CardDescription>Mostrando {rdis.length} requerimientos registrados.</CardDescription>
          </div>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsModalOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nueva RDI
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <form onSubmit={handleCreateRdi}>
                <DialogHeader>
                  <DialogTitle>Nuevo Requerimiento de Información</DialogTitle>
                  <DialogDescription>
                    Complete todos los campos para generar un nuevo RDI.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                  <div className="space-y-2"><Label htmlFor="titulo">Título*</Label><Input id="titulo" value={titulo} onChange={e => setTitulo(e.target.value)} /></div>
                  <div className="space-y-2"><Label htmlFor="descripcion">Descripción*</Label><Textarea id="descripcion" value={descripcion} onChange={e => setDescripcion(e.target.value)} /></div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>Tipo*</Label><Select value={tipo} onValueChange={(v) => setTipo(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="a_mandante">A Mandante</SelectItem><SelectItem value="a_contratista">A Contratista</SelectItem><SelectItem value="interna">Interna</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label>Especialidad*</Label><Select value={especialidad} onValueChange={(v) => setEspecialidad(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="arquitectura">Arquitectura</SelectItem><SelectItem value="estructuras">Estructuras</SelectItem><SelectItem value="electrica">Eléctrica</SelectItem><SelectItem value="sanitaria">Sanitaria</SelectItem><SelectItem value="climatizacion">Climatización</SelectItem><SelectItem value="otra">Otra</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label>Prioridad*</Label><Select value={prioridad} onValueChange={(v) => setPrioridad(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="baja">Baja</SelectItem><SelectItem value="media">Media</SelectItem><SelectItem value="alta">Alta</SelectItem><SelectItem value="critica">Crítica</SelectItem></SelectContent></Select></div>
                  </div>
                  
                  <h4 className="font-semibold pt-2 border-t mt-2">Destinatario</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label htmlFor="dest-nombre">Nombre*</Label><Input id="dest-nombre" value={destinatarioNombre} onChange={e => setDestinatarioNombre(e.target.value)} /></div>
                    <div className="space-y-2"><Label htmlFor="dest-email">Email*</Label><Input id="dest-email" type="email" value={destinatarioEmail} onChange={e => setDestinatarioEmail(e.target.value)} /></div>
                    <div className="space-y-2"><Label htmlFor="dest-empresa">Empresa</Label><Input id="dest-empresa" value={destinatarioEmpresa} onChange={e => setDestinatarioEmpresa(e.target.value)} /></div>
                    <div className="space-y-2"><Label htmlFor="dest-cargo">Cargo</Label><Input id="dest-cargo" value={destinatarioCargo} onChange={e => setDestinatarioCargo(e.target.value)} /></div>
                  </div>
                  
                   <h4 className="font-semibold pt-2 border-t mt-2">Plazos e Impacto</h4>
                   <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="plazo-dias">Plazo de respuesta (días)</Label><Input id="plazo-dias" type="number" value={plazoRespuestaDias ?? ''} onChange={e => setPlazoRespuestaDias(e.target.value ? Number(e.target.value) : null)} /></div>
                        <div className="flex items-center space-x-2 pt-6"><Switch id="afecta-plazo" checked={afectaPlazo} onCheckedChange={setAfectaPlazo} /><Label htmlFor="afecta-plazo">¿Afecta al plazo de la obra?</Label></div>
                        {afectaPlazo && <div className="space-y-2"><Label htmlFor="dias-aumento">Días de aumento solicitados</Label><Input id="dias-aumento" type="number" value={diasAumentoSolicitados ?? ''} onChange={e => setDiasAumentoSolicitados(e.target.value ? Number(e.target.value) : null)} /></div>}
                   </div>
                   
                   <div className="flex items-center space-x-2 pt-4"><Switch id="para-cliente" checked={paraCliente} onCheckedChange={setParaCliente} /><Label htmlFor="para-cliente">Hacer visible para el cliente</Label></div>

                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Crear RDI
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Correlativo</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Especialidad</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Emisión</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center h-24">Cargando...</TableCell></TableRow>
                ) : rdis.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center h-24">No hay RDI registrados para esta obra.</TableCell></TableRow>
                ) : (
                  rdis.map(rdi => (
                    <TableRow key={rdi.id}>
                      <TableCell className="font-mono text-xs">{rdi.correlativo}</TableCell>
                      <TableCell className="font-medium">{rdi.titulo}</TableCell>
                      <TableCell>{rdi.especialidad}</TableCell>
                      <TableCell><Badge variant="outline" className={cn(prioridadColors[rdi.prioridad])}>{rdi.prioridad}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className={cn(estadoColors[rdi.estado])}>{rdi.estado}</Badge></TableCell>
                      <TableCell>{rdi.createdAt.toDate().toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm">
                            Ver
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAdjuntoModal(rdi)}
                          >
                            Adjuntar archivo
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={isAdjuntoModalOpen} onOpenChange={setIsAdjuntoModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleUploadAdjunto}>
            <DialogHeader>
              <DialogTitle>Adjuntar archivo a RDI</DialogTitle>
              <DialogDescription>
                {rdiSeleccionada
                  ? `RDI ${rdiSeleccionada.correlativo} - ${rdiSeleccionada.titulo}`
                  : "Seleccione un archivo para adjuntar."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <Label htmlFor="archivo-rdi">Archivo (imagen o PDF)</Label>
              <Input
                id="archivo-rdi"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setArchivoAdjunto(file);
                }}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAdjuntoModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isUploadingAdjunto || !archivoAdjunto}>
                {isUploadingAdjunto && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Subir adjunto
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
