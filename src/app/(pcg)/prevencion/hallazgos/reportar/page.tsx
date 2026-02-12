// src/app/(pcg)/prevencion/hallazgos/reportar/page.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseDb, firebaseStorage } from '@/lib/firebaseClient';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, Save, Upload } from 'lucide-react';
import { Obra, Criticidad, Hallazgo } from '@/types/pcg';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const initialHallazgoState: Partial<Hallazgo> = {
    tipoRiesgo: 'Caída de distinto nivel',
    criticidad: 'media',
    accionesInmediatas: [],
    estado: 'abierto',
};

export default function ReportarHallazgoPage() {
    const { user, companyId, role } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [obras, setObras] = useState<Obra[]>([]);
    const [loadingObras, setLoadingObras] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [hallazgo, setHallazgo] = useState<Partial<Hallazgo>>(initialHallazgoState);
    const [evidencia, setEvidencia] = useState<File | null>(null);

    useEffect(() => {
        if (!companyId && role !== 'superadmin') return;

        const obrasRef = collection(firebaseDb, "obras");
        const q = role === 'superadmin' 
            ? query(obrasRef, orderBy("nombreFaena")) 
            : query(obrasRef, where("empresaId", "==", companyId), orderBy("nombreFaena"));
        
        getDocs(q).then((snapshot) => {
            const obrasList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra));
            setObras(obrasList);
            if (obrasList.length > 0) {
                setHallazgo(prev => ({...prev, obraId: obrasList[0].id}));
            }
            setLoadingObras(false);
        });
    }, [companyId, role]);

    const handleInputChange = (field: keyof Hallazgo, value: any) => {
        setHallazgo(prev => ({ ...prev, [field]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setEvidencia(e.target.files[0]);
        }
    };

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        if (!user || !companyId || !hallazgo.obraId || !hallazgo.descripcion || !evidencia) {
            toast({ variant: 'destructive', title: 'Faltan datos', description: 'Obra, descripción y evidencia son obligatorios.' });
            return;
        }

        setIsSaving(true);
        try {
            // 1. Subir la evidencia a Storage
            const storagePath = `hallazgos/${hallazgo.obraId}/${Date.now()}_${evidencia.name}`;
            const storageRef = ref(firebaseStorage, storagePath);
            await uploadBytes(storageRef, evidencia);
            const evidenciaUrl = await getDownloadURL(storageRef);

            // 2. Crear el documento del hallazgo en Firestore
            const hallazgosCollection = collection(firebaseDb, 'hallazgos');
            const newHallazgoData = {
                ...hallazgo,
                companyId,
                evidenciaUrl,
                createdBy: user.uid,
                createdAt: serverTimestamp(),
            };
            
            const docRef = await addDoc(hallazgosCollection, newHallazgoData);
            
            toast({ title: 'Hallazgo reportado', description: 'El reporte ha sido guardado y notificado.' });
            router.push(`/prevencion/hallazgos/detalle/${docRef.id}`);

        } catch (error) {
            console.error("Error guardando hallazgo:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el reporte.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex items-center gap-4">
                <Button asChild variant="outline" size="sm">
                    <Link href="/prevencion/hallazgos"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Listado</Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Reportar Nuevo Hallazgo</h1>
                    <p className="text-muted-foreground">Describe la condición o acto inseguro detectado en terreno.</p>
                </div>
            </header>

            <form onSubmit={handleSave}>
                <Card>
                    <CardHeader>
                        <CardTitle>Detalles del Hallazgo</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <Label htmlFor="obra">Obra*</Label>
                            <Select value={hallazgo.obraId} onValueChange={(val) => handleInputChange('obraId', val)} disabled={loadingObras} required>
                                <SelectTrigger id="obra"><SelectValue placeholder={loadingObras ? "Cargando..." : "Selecciona obra"} /></SelectTrigger>
                                <SelectContent>{obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nombreFaena}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2"><Label htmlFor="sector">Sector/Lugar</Label><Input id="sector" value={hallazgo.sector || ''} onChange={e => handleInputChange('sector', e.target.value)} /></div>
                        <div className="space-y-2 col-span-full"><Label htmlFor="descripcion">Descripción del Hallazgo*</Label><Textarea id="descripcion" value={hallazgo.descripcion || ''} onChange={e => handleInputChange('descripcion', e.target.value)} required /></div>
                        <div className="space-y-2 col-span-full"><Label htmlFor="accionesInmediatas">Acciones Inmediatas Tomadas</Label><Textarea id="accionesInmediatas" value={hallazgo.accionesInmediatas?.[0] || ''} onChange={e => handleInputChange('accionesInmediatas', [e.target.value])} placeholder="Ej: Se detuvo el trabajo, se aisló el área..."/></div>
                        <div className="space-y-2"><Label htmlFor="tipoRiesgo">Tipo de Riesgo</Label><Input id="tipoRiesgo" value={hallazgo.tipoRiesgo || ''} onChange={e => handleInputChange('tipoRiesgo', e.target.value)} /></div>
                        <div className="space-y-2"><Label htmlFor="criticidad">Criticidad</Label>
                            <Select value={hallazgo.criticidad} onValueChange={(val) => handleInputChange('criticidad', val)}><SelectTrigger id="criticidad"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="baja">Baja</SelectItem>
                                    <SelectItem value="media">Media</SelectItem>
                                    <SelectItem value="alta">Alta</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 col-span-full">
                            <Label htmlFor="evidencia">Evidencia Fotográfica*</Label>
                            <Input id="evidencia" type="file" accept="image/*" onChange={handleFileChange} required />
                        </div>
                    </CardContent>
                    <CardFooter className="justify-end">
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2"/>}
                            {isSaving ? 'Guardando...' : 'Guardar Reporte'}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
}
