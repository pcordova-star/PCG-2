"use client";

import { useState, FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addDoc, collection, doc, serverTimestamp } from "firebase/firestore";
import { firebaseDb, firebaseStorage } from "@/lib/firebaseClient";
import { useAuth } from "@/context/AuthContext";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ActividadProgramada, Obra } from "../page";

interface RegistroFotograficoFormProps {
    obras: Obra[];
    actividades: ActividadProgramada[];
    onRegistroGuardado: () => void;
    obraId?: string;
}

export default function RegistroFotograficoForm({ obras, actividades, onRegistroGuardado, obraId }: RegistroFotograficoFormProps) {
    const { user } = useAuth();
    const { toast } = useToast();

    const [selectedObraId, setSelectedObraId] = useState(obraId || '');
    const [actividadId, setActividadId] = useState('');
    const [comentario, setComentario] = useState('');
    const [foto, setFoto] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (obraId) {
            setSelectedObraId(obraId);
        } else if (obras.length > 0 && !selectedObraId) {
            setSelectedObraId(obras[0].id);
        }
    }, [obraId, obras, selectedObraId]);

    const actividadesFiltradas = actividades.filter(a => a.obraId === selectedObraId);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            if (e.target.files[0].size > 10 * 1024 * 1024) { // 10MB limit
                 toast({ variant: 'destructive', title: 'Archivo demasiado grande', description: 'Por favor, sube una imagen de menos de 10MB.' });
                 setFoto(null);
                 e.target.value = ''; // Limpiar el input
                 return;
            }
            setFoto(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!selectedObraId || !foto) {
            toast({ variant: 'destructive', title: 'Error', description: 'La obra y la foto son requeridas.' });
            return;
        }

        setLoading(true);

        try {
            // 1. Upload photo to storage
            const storagePath = `avances/${selectedObraId}/${Date.now()}_${foto.name}`;
            const storageRef = ref(firebaseStorage, storagePath);
            await uploadBytes(storageRef, foto);
            const fotoUrl = await getDownloadURL(storageRef);

            // 2. Create document in avancesDiarios
            const avancesRef = collection(firebaseDb, "obras", selectedObraId, "avancesDiarios");
            await addDoc(avancesRef, {
                obraId: selectedObraId,
                actividadId: actividadId === 'none' ? null : actividadId,
                comentario,
                fotos: [fotoUrl], // Almacenar en un array para consistencia
                storagePaths: [storagePath], // Guardar el path para poder borrarlo después si es necesario
                visibleCliente: true, // Por defecto visible
                fecha: serverTimestamp(),
                creadoPor: { uid: user.uid, displayName: user.displayName || user.email },
                tipoRegistro: 'FOTOGRAFICO',
            });

            toast({ title: 'Éxito', description: 'Registro fotográfico guardado correctamente.' });
            setActividadId('');
            setComentario('');
            setFoto(null);
            if(onRegistroGuardado) onRegistroGuardado();

        } catch (error: any) {
            console.error("Error en registro fotográfico:", error);
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Nuevo Registro Fotográfico</CardTitle>
                <CardDescription>Sube una foto como evidencia de un hito o avance en la obra.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                     {!obraId && (
                        <div className="space-y-2">
                            <Label htmlFor="obra-foto">Obra</Label>
                            <Select value={selectedObraId} onValueChange={setSelectedObraId}>
                                <SelectTrigger id="obra-foto"><SelectValue placeholder="Seleccione obra..." /></SelectTrigger>
                                <SelectContent>
                                    {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nombreFaena}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                     )}
                    <div className="space-y-2">
                        <Label htmlFor="actividad-foto">Actividad Asociada (Opcional)</Label>
                        <Select value={actividadId} onValueChange={setActividadId} disabled={!selectedObraId}>
                            <SelectTrigger id="actividad-foto"><SelectValue placeholder="Seleccione actividad..." /></SelectTrigger>
                            <SelectContent>
                                 <SelectItem value="none">Sin actividad específica</SelectItem>
                                {actividadesFiltradas.map(act => <SelectItem key={act.id} value={act.id}>{act.nombreActividad}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="foto-upload">Fotografía*</Label>
                        <Input id="foto-upload" type="file" accept="image/*" onChange={handleFileChange} />
                         {foto && <p className="text-xs text-muted-foreground">Archivo: {foto.name}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="comentario-foto">Comentario (opcional)</Label>
                        <Textarea id="comentario-foto" value={comentario} onChange={e => setComentario(e.target.value)} />
                    </div>
                    <Button type="submit" disabled={loading || !foto}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                        Guardar Registro
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
