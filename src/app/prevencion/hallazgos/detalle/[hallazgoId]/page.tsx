// src/app/prevencion/hallazgos/detalle/[hallazgoId]/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, Timestamp, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firebaseDb, firebaseStorage } from '@/lib/firebaseClient';
import { Hallazgo, Obra, AppUser, RegistroPlanAccion, RegistroIncidente } from '@/types/pcg';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { generateHallazgoPDF } from '../../pdf/HallazgoPDF';
import { ArrowLeft, Loader2, Upload, FileText, Link as LinkIcon, Siren } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';

function CriticidadBadge({ criticidad }: { criticidad: Hallazgo['criticidad'] }) {
    const variants: Record<Hallazgo['criticidad'], string> = {
        baja: 'bg-green-100 text-green-800 border-green-300',
        media: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        alta: 'bg-red-100 text-red-800 border-red-300',
    };
    return <Badge variant="outline" className={variants[criticidad]}>{criticidad}</Badge>;
}

function EstadoBadge({ estado }: { estado: Hallazgo['estado'] }) {
    const variants: Record<Hallazgo['estado'], string> = {
        abierto: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        en_progreso: 'bg-blue-100 text-blue-800 border-blue-300',
        cerrado: 'bg-green-100 text-green-800 border-green-300',
    };
    return <Badge variant="outline" className={variants[estado]}>{estado.replace('_', ' ')}</Badge>;
}

export default function HallazgoDetallePage() {
    const params = useParams();
    const router = useRouter();
    const hallazgoId = params.hallazgoId as string;
    
    const [hallazgo, setHallazgo] = useState<Hallazgo | null>(null);
    const [obra, setObra] = useState<Obra | null>(null);
    const [responsable, setResponsable] = useState<AppUser | null>(null);
    const [creador, setCreador] = useState<AppUser | null>(null);
    const [planAccion, setPlanAccion] = useState<RegistroPlanAccion | null>(null);
    const [investigacion, setInvestigacion] = useState<RegistroIncidente | null>(null);
    
    const [fichaFirmada, setFichaFirmada] = useState<File | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [creatingAction, setCreatingAction] = useState(false);
    const [escalando, setEscalando] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (!hallazgoId) return;
        const fetchHallazgo = async () => {
            setLoading(true);
            const hallazgoRef = doc(firebaseDb, "hallazgos", hallazgoId);
            const hallazgoSnap = await getDoc(hallazgoRef);
            if (hallazgoSnap.exists()) {
                const data = { id: hallazgoSnap.id, ...hallazgoSnap.data() } as Hallazgo;
                setHallazgo(data);
                
                // Cargar datos relacionados
                const obraRef = doc(firebaseDb, "obras", data.obraId);
                const obraSnap = await getDoc(obraRef);
                if (obraSnap.exists()) setObra({ id: obraSnap.id, ...obraSnap.data() } as Obra);

                if (data.responsableId) {
                    const respRef = doc(firebaseDb, "users", data.responsableId);
                    const respSnap = await getDoc(respRef);
                    if (respSnap.exists()) setResponsable({ id: respSnap.id, ...respSnap.data() } as AppUser);
                }
                
                if (data.createdBy) {
                    const creatorRef = doc(firebaseDb, "users", data.createdBy);
                    const creatorSnap = await getDoc(creatorRef);
                    if (creatorSnap.exists()) setCreador({ id: creatorSnap.id, ...creatorSnap.data() } as AppUser);
                }

                if (data.planAccionId) {
                    const planRef = doc(firebaseDb, "planesAccion", data.planAccionId);
                    const planSnap = await getDoc(planRef);
                    if (planSnap.exists()) setPlanAccion({ id: planSnap.id, ...planSnap.data() } as RegistroPlanAccion);
                }

                if (data.investigacionId) {
                    const invRef = doc(firebaseDb, "investigacionesIncidentes", data.investigacionId);
                    const invSnap = await getDoc(invRef);
                    if (invSnap.exists()) setInvestigacion({ id: invSnap.id, ...invSnap.data() } as RegistroIncidente);
                }

            }
            setLoading(false);
        };
        fetchHallazgo();
    }, [hallazgoId]);

    const handleUploadFicha = async () => {
        if (!fichaFirmada || !hallazgoId) return;
        setUploading(true);
        try {
            const storageRef = ref(firebaseStorage, `hallazgos/${hallazgoId}/fichaFirmada.png`);
            await uploadBytes(storageRef, fichaFirmada);
            const url = await getDownloadURL(storageRef);
            
            const hallazgoRef = doc(firebaseDb, "hallazgos", hallazgoId);
            await updateDoc(hallazgoRef, {
                fichaFirmadaUrl: url,
                fechaFichaFirmada: serverTimestamp(),
            });
            
            setHallazgo(prev => prev ? {...prev, fichaFirmadaUrl: url, fechaFichaFirmada: Timestamp.now()} : null);

            toast({ title: 'Éxito', description: 'Ficha firmada subida correctamente.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo subir la ficha.' });
        } finally {
            setUploading(false);
            setFichaFirmada(null);
        }
    };
    
     const handleEstadoChange = async (nuevoEstado: Hallazgo['estado']) => {
        if (!hallazgo) return;
        try {
            const hallazgoRef = doc(firebaseDb, 'hallazgos', hallazgo.id!);
            await updateDoc(hallazgoRef, { estado: nuevoEstado });
            setHallazgo(prev => prev ? { ...prev, estado: nuevoEstado } : null);
            toast({ title: 'Estado actualizado' });
        } catch (error) {
            console.error('Error actualizando estado:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el estado.' });
        }
    };

    const handleCreatePlanAccion = async () => {
        if (!hallazgo) return;
        setCreatingAction(true);
        try {
            const planRef = await addDoc(collection(firebaseDb, "planesAccion"), {
                obraId: hallazgo.obraId,
                descripcionAccion: `Acción correctiva para hallazgo: ${hallazgo.descripcion}`,
                responsable: responsable?.nombre || hallazgo.responsableId,
                origen: "hallazgo",
                referencia: hallazgo.id,
                hallazgoId: hallazgo.id,
                estado: "Pendiente",
                createdAt: serverTimestamp(),
            });
            
            const hallazgoRef = doc(firebaseDb, "hallazgos", hallazgo.id!);
            await updateDoc(hallazgoRef, { planAccionId: planRef.id });

            const newPlanDoc = await getDoc(planRef);
            setPlanAccion({id: newPlanDoc.id, ...newPlanDoc.data()} as RegistroPlanAccion);
            setHallazgo(prev => prev ? {...prev, planAccionId: planRef.id} : null);

            toast({ title: 'Éxito', description: 'Plan de acción creado y vinculado.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear el plan de acción.' });
        } finally {
            setCreatingAction(false);
        }
    };

    const handleEscalarAInvestigacion = async () => {
        if (!hallazgo || !creador) return;
        setEscalando(true);
        try {
            const investigacionRef = await addDoc(collection(firebaseDb, "investigacionesIncidentes"), {
                obraId: hallazgo.obraId,
                origen: "hallazgo",
                hallazgoId: hallazgo.id,
                fecha: new Date().toISOString().slice(0, 10),
                descripcionHecho: `Investigación originada por hallazgo: ${hallazgo.descripcion}`,
                tipoIncidente: "Casi accidente", // Valor por defecto al escalar
                gravedad: hallazgo.criticidad === 'alta' ? 'Grave' : 'Leve',
                responsableSeguimiento: responsable?.nombre || hallazgo.responsableId,
                estadoCierre: "Abierto",
                createdAt: serverTimestamp(),
                creadoPor: creador.nombre
            });

            const hallazgoRef = doc(firebaseDb, "hallazgos", hallazgo.id!);
            await updateDoc(hallazgoRef, { investigacionId: investigacionRef.id });

            const newInvDoc = await getDoc(investigacionRef);
            setInvestigacion({id: newInvDoc.id, ...newInvDoc.data()} as RegistroIncidente);
            setHallazgo(prev => prev ? {...prev, investigacionId: investigacionRef.id} : null);

            toast({ title: "Hallazgo escalado", description: "Se ha creado una nueva investigación de incidente." });

        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo escalar el hallazgo a una investigación.' });
        } finally {
            setEscalando(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Cargando detalle del hallazgo...</div>;
    if (!hallazgo) return <div className="p-8 text-center text-destructive">No se encontró el hallazgo.</div>;

    return (
        <div className="space-y-6">
            <header className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Detalle del Hallazgo</h1>
                    <p className="text-muted-foreground">ID: {hallazgo.id}</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div className="md:col-span-2 space-y-6">
                     <Card>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>Información Principal</CardTitle>
                                    <CardDescription>Obra: {obra?.nombreFaena || hallazgo.obraId}</CardDescription>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <CriticidadBadge criticidad={hallazgo.criticidad} />
                                    <EstadoBadge estado={hallazgo.estado} />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <p><strong>Tipo de Riesgo:</strong> {hallazgo.tipoRiesgo}</p>
                            <p><strong>Descripción:</strong> {hallazgo.descripcion}</p>
                            <p><strong>Registrado por:</strong> {creador?.nombre || hallazgo.createdBy} el {hallazgo.createdAt.toDate().toLocaleString('es-CL')}</p>
                            <p><strong>Responsable:</strong> {responsable?.nombre || hallazgo.responsableId}</p>
                            <p><strong>Plazo:</strong> {hallazgo.plazo}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Evidencia Fotográfica</CardTitle></CardHeader>
                        <CardContent>
                            <img src={hallazgo.evidenciaUrl} alt="Evidencia" className="max-w-full rounded-md" />
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                         <CardHeader><CardTitle>Gestión del Hallazgo</CardTitle></CardHeader>
                         <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Cambiar Estado</Label>
                                <Select value={hallazgo.estado} onValueChange={handleEstadoChange}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="abierto">Abierto</SelectItem>
                                        <SelectItem value="en_progreso">En Progreso</SelectItem>
                                        <SelectItem value="cerrado">Cerrado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button className="w-full" onClick={() => generateHallazgoPDF(hallazgo, obra!)} disabled={!obra}>
                                <FileText className="mr-2 h-4 w-4" />
                                Imprimir Ficha
                            </Button>
                         </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle>Acciones Asociadas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {hallazgo.planAccionId && planAccion ? (
                                <div className="space-y-3 text-sm">
                                    <p className="text-muted-foreground">Este hallazgo tiene una acción asociada en el Plan de Acción.</p>
                                    <p><strong>Estado:</strong> <Badge variant="outline">{planAccion.estado}</Badge></p>
                                    <p><strong>Responsable:</strong> {planAccion.responsable}</p>
                                    <Button asChild size="sm" className="w-full">
                                        <Link href={`/prevencion/formularios-generales?prefillOrigen=hallazgo&obraId=${hallazgo.obraId}&referencia=${hallazgo.id}`}>
                                            <LinkIcon className="mr-2 h-4 w-4" />
                                            Ver Plan de Acción
                                        </Link>
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-3 text-sm">
                                    <p className="text-muted-foreground">Este hallazgo aún no tiene un plan de acción asociado.</p>
                                    <Button onClick={handleCreatePlanAccion} disabled={creatingAction} className="w-full">
                                        {creatingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Crear Acción en el Plan de Acción
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Siren className="h-5 w-5 text-destructive" />Investigación Asociada</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {hallazgo.investigacionId && investigacion ? (
                                <div className="space-y-3 text-sm">
                                    <p className="text-muted-foreground">Este hallazgo ha sido escalado a una investigación de incidente.</p>
                                    <p><strong>Estado:</strong> <Badge variant="outline">{investigacion.estadoCierre}</Badge></p>
                                    <p><strong>Fecha Incidente:</strong> {investigacion.fecha}</p>
                                    <Button asChild size="sm" className="w-full">
                                        <Link href={`/prevencion/formularios-generales?activeForm=INCIDENTE`}>
                                            <LinkIcon className="mr-2 h-4 w-4" />
                                            Ver Investigación Completa
                                        </Link>
                                    </Button>
                                </div>
                            ) : (
                                 <div className="space-y-3 text-sm">
                                    <p className="text-muted-foreground">Úsalo cuando ya haya ocurrido un incidente o casi accidente relacionado.</p>
                                    <Button onClick={handleEscalarAInvestigacion} disabled={escalando} className="w-full" variant="destructive">
                                        {escalando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Escalar a Investigación de Incidente
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader><CardTitle>Ficha Firmada (Papel)</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            {hallazgo.fichaFirmadaUrl ? (
                                <div>
                                    <p className="text-sm text-green-600 font-semibold mb-2">Ficha firmada cargada.</p>
                                    <img src={hallazgo.fichaFirmadaUrl} alt="Ficha firmada" className="rounded-md border"/>
                                    {hallazgo.fechaFichaFirmada && <p className="text-xs text-muted-foreground mt-1">Subida el: {hallazgo.fechaFichaFirmada.toDate().toLocaleString('es-CL')}</p>}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label htmlFor="ficha-upload">Subir ficha firmada</Label>
                                    <Input id="ficha-upload" type="file" accept="image/*" onChange={e => setFichaFirmada(e.target.files ? e.target.files[0] : null)} />
                                    <Button onClick={handleUploadFicha} disabled={!fichaFirmada || uploading} className="w-full">
                                        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4" />}
                                        {uploading ? 'Subiendo...' : 'Subir Ficha'}
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}
