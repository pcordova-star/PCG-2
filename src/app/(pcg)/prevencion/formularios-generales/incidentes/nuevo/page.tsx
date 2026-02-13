// src/app/(pcg)/prevencion/formularios-generales/incidentes/nuevo/page.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import { Obra, TipoIncidente, GravedadIncidente, RegistroIncidente } from '@/types/pcg';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const initialIncidenteState: Partial<RegistroIncidente> = {
    tipoIncidente: 'Accidente sin tiempo perdido',
    gravedad: 'Leve',
    estadoCierre: 'Abierto',
};

const tiposDeIncidente: TipoIncidente[] = [
    "Accidente con tiempo perdido",
    "Accidente sin tiempo perdido",
    "Casi accidente",
    "Daño a la propiedad",
];

const gravedades: GravedadIncidente[] = ["Leve", "Grave", "Fatal potencial"];


export default function ReportarIncidentePage() {
    const { user, companyId, role } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [obras, setObras] = useState<Obra[]>([]);
    const [loadingObras, setLoadingObras] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [incidente, setIncidente] = useState<Partial<RegistroIncidente>>(initialIncidenteState);
    
    useEffect(() => {
        if (!companyId && role !== 'superadmin') return;
        setLoadingObras(true);
        const obrasRef = collection(firebaseDb, "obras");
        const q = role === 'superadmin' ? 
            query(obrasRef, orderBy("nombreFaena")) :
            query(obrasRef, where("empresaId", "==", companyId), orderBy("nombreFaena"));

        getDocs(q).then(snapshot => {
            const obrasList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra));
            setObras(obrasList);
            if (obrasList.length > 0) {
                setIncidente(prev => ({...prev, obraId: obrasList[0].id}));
            }
            setLoadingObras(false);
        });
    }, [companyId, role]);

    const handleInputChange = (field: keyof RegistroIncidente, value: any) => {
        setIncidente(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        if (!user || !companyId || !incidente.obraId || !incidente.descripcionHecho || !incidente.fecha) {
            toast({ variant: 'destructive', title: 'Faltan datos', description: 'Obra, fecha y descripción son obligatorios.' });
            return;
        }
        setIsSaving(true);
        try {
            const incidentesCollection = collection(firebaseDb, 'incidentes');
            const dataToSave = {
                ...incidente,
                companyId: companyId,
                createdBy: user.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };
            
            const docRef = await addDoc(incidentesCollection, dataToSave);
            toast({ title: 'Incidente reportado', description: 'El reporte ha sido guardado correctamente.' });
            router.push(`/prevencion/formularios-generales/incidentes/detalle/${docRef.id}`);
        } catch (error) {
            console.error("Error guardando incidente:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el reporte del incidente.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
             <header className="flex items-center gap-4">
                <Button asChild variant="outline" size="sm">
                    <Link href="/prevencion/formularios-generales/incidentes"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Listado</Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Declaración de Incidente / Accidente</h1>
                    <p className="text-muted-foreground">Formulario para el reporte inicial de cualquier suceso en obra.</p>
                </div>
            </header>

            <form onSubmit={handleSave}>
                <Card>
                    <CardHeader>
                        <CardTitle>1. Identificación del Suceso</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="obra">Obra*</Label>
                            <Select value={incidente.obraId} onValueChange={(val) => handleInputChange('obraId', val)} disabled={loadingObras} required>
                                <SelectTrigger id="obra"><SelectValue placeholder={loadingObras ? "Cargando..." : "Selecciona obra"} /></SelectTrigger>
                                <SelectContent>{obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nombreFaena}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2"><Label htmlFor="fecha">Fecha del Incidente*</Label><Input id="fecha" type="date" value={incidente.fecha || ''} onChange={e => handleInputChange('fecha', e.target.value)} required/></div>
                        <div className="space-y-2"><Label htmlFor="lugar">Lugar Específico</Label><Input id="lugar" value={incidente.lugar || ''} onChange={e => handleInputChange('lugar', e.target.value)} placeholder="Ej: Nivel -2, Sector B"/></div>
                        <div className="space-y-2"><Label htmlFor="tipoIncidente">Tipo de Incidente*</Label><Select value={incidente.tipoIncidente} onValueChange={(val) => handleInputChange('tipoIncidente', val as TipoIncidente)} required><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{tiposDeIncidente.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label htmlFor="gravedad">Gravedad*</Label><Select value={incidente.gravedad} onValueChange={(val) => handleInputChange('gravedad', val as GravedadIncidente)} required><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{gravedades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>2. Descripción del Hecho</CardTitle>
                        <CardDescription>Describe de forma objetiva qué sucedió. No incluyas suposiciones ni juicios de valor.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2"><Label htmlFor="descripcionHecho">Descripción*</Label><Textarea id="descripcionHecho" value={incidente.descripcionHecho || ''} onChange={e => handleInputChange('descripcionHecho', e.target.value)} rows={5} required/></div>
                        <div className="space-y-2"><Label htmlFor="lesionDescripcion">Lesión (si aplica)</Label><Input id="lesionDescripcion" value={incidente.lesionDescripcion || ''} onChange={e => handleInputChange('lesionDescripcion', e.target.value)} placeholder="Ej: Contusión en mano derecha"/></div>
                        <div className="space-y-2"><Label htmlFor="parteCuerpoAfectada">Parte del Cuerpo Afectada</Label><Input id="parteCuerpoAfectada" value={incidente.parteCuerpoAfectada || ''} onChange={e => handleInputChange('parteCuerpoAfectada', e.target.value)} /></div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>3. Acciones Inmediatas</CardTitle>
                        <CardDescription>Describe qué medidas se tomaron inmediatamente después del suceso para controlar la situación.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Label htmlFor="medidasCorrectivas">Medidas Tomadas</Label>
                        <Textarea id="medidasCorrectivas" value={incidente.medidasCorrectivas || ''} onChange={e => handleInputChange('medidasCorrectivas', e.target.value)} placeholder="Ej: Se detuvo el trabajo, se prestó primeros auxilios, se aisló el área..."/>
                    </CardContent>
                    <CardFooter className="justify-end">
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2"/>}
                            {isSaving ? 'Guardando...' : 'Guardar Reporte Inicial'}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
}