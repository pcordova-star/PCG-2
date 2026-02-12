// src/app/(pcg)/prevencion/formularios-generales/iper/page.tsx

"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Obra, IPERRegistro } from '@/types/pcg';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// Componente para la matriz de riesgo visual
const RiskMatrix = ({ probability, consequence }: { probability: number, consequence: number }) => {
    const riskLevel = probability * consequence;
    const getColor = (p: number, c: number) => {
        const level = p * c;
        if (level >= 17) return "bg-red-500";
        if (level >= 10) return "bg-orange-500";
        if (level >= 5) return "bg-yellow-400";
        return "bg-green-500";
    };

    return (
        <div className="grid grid-cols-5 gap-1">
            {Array.from({ length: 5 }, (_, c) => 5 - c).map(consequenceVal => (
                Array.from({ length: 5 }, (_, p) => p + 1).map(probVal => (
                    <div
                        key={`${probVal}-${consequenceVal}`}
                        className={cn(
                            "w-full aspect-square border text-white text-xs flex items-center justify-center",
                            getColor(probVal, consequenceVal),
                            probability === probVal && consequence === consequenceVal && "ring-2 ring-offset-2 ring-black"
                        )}
                    >
                        {probVal * consequenceVal}
                    </div>
                ))
            ))}
        </div>
    );
};

const RiskLevelIndicator = ({ level }: { level: number }) => {
    const getLevelInfo = () => {
        if (level >= 17) return { text: "Crítico", color: "bg-red-500 text-white" };
        if (level >= 10) return { text: "Alto", color: "bg-orange-500 text-white" };
        if (level >= 5) return { text: "Medio", color: "bg-yellow-400 text-black" };
        return { text: "Bajo", color: "bg-green-500 text-white" };
    };
    const { text, color } = getLevelInfo();
    return (
        <div className={cn("px-3 py-1 rounded-full text-sm font-bold text-center", color)}>
            {level} - {text}
        </div>
    )
};


export default function IperFormPage() {
    const { user, companyId, role } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [obras, setObras] = useState<Obra[]>([]);
    const [loadingObras, setLoadingObras] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [iperData, setIperData] = useState<Partial<IPERRegistro>>({
        // Valores iniciales
        probabilidad_hombre: 1,
        consecuencia_hombre: 1,
        probabilidad_mujer: 1,
        consecuencia_mujer: 1,
        probabilidad_residual: 1,
        consecuencia_residual: 1,
        jerarquiaControl: 'EPP',
        estadoControl: 'PENDIENTE'
    });

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
                setIperData(prev => ({...prev, obraId: obrasList[0].id}));
            }
            setLoadingObras(false);
        });
    }, [companyId, role]);

    const nivelRiesgoHombre = useMemo(() => (iperData.probabilidad_hombre || 1) * (iperData.consecuencia_hombre || 1), [iperData.probabilidad_hombre, iperData.consecuencia_hombre]);
    const nivelRiesgoMujer = useMemo(() => (iperData.probabilidad_mujer || 1) * (iperData.consecuencia_mujer || 1), [iperData.probabilidad_mujer, iperData.consecuencia_mujer]);
    const nivelRiesgoResidual = useMemo(() => (iperData.probabilidad_residual || 1) * (iperData.consecuencia_residual || 1), [iperData.probabilidad_residual, iperData.consecuencia_residual]);

    const handleInputChange = (field: keyof IPERRegistro, value: any) => {
        setIperData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!user || !iperData.obraId || !iperData.tarea || !iperData.peligro || !iperData.riesgo) {
            toast({ variant: 'destructive', title: 'Error de validación', description: 'Obra, Tarea, Peligro y Riesgo son campos obligatorios.' });
            return;
        }
        setIsSaving(true);
        try {
            const iperCollection = collection(firebaseDb, 'iperRegistros');
            await addDoc(iperCollection, {
                ...iperData,
                nivel_riesgo_hombre: nivelRiesgoHombre,
                nivel_riesgo_mujer: nivelRiesgoMujer,
                nivel_riesgo_residual: nivelRiesgoResidual,
                createdAt: serverTimestamp(),
                createdBy: user.uid,
                companyId: companyId,
            });
            toast({ title: 'Éxito', description: 'Matriz IPER guardada correctamente.' });
            router.push('/prevencion/panel'); // Redirigir a un panel o listado
        } catch (error) {
            console.error("Error saving IPER:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la matriz IPER.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex items-center gap-4">
                <Button asChild variant="outline" size="sm">
                    <Link href="/prevencion/formularios-generales"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Matriz IPER con Enfoque de Género (DS-44)</h1>
                    <p className="text-muted-foreground">Identifica peligros y evalúa riesgos, considerando las variables de género.</p>
                </div>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>1. Identificación del Peligro y Riesgo</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="obra">Obra</Label>
                        <Select value={iperData.obraId} onValueChange={(val) => handleInputChange('obraId', val)} disabled={loadingObras}>
                            <SelectTrigger id="obra"><SelectValue placeholder="Seleccionar obra..." /></SelectTrigger>
                            <SelectContent>{obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nombreFaena}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2"><Label htmlFor="tarea">Tarea</Label><Input id="tarea" value={iperData.tarea || ''} onChange={(e) => handleInputChange('tarea', e.target.value)} placeholder="Ej: Instalación de moldaje de muro"/></div>
                    <div className="space-y-2"><Label htmlFor="zona">Zona / Lugar</Label><Input id="zona" value={iperData.zona || ''} onChange={(e) => handleInputChange('zona', e.target.value)} placeholder="Ej: Nivel -1, Sector A"/></div>
                    <div className="space-y-2"><Label htmlFor="peligro">Peligro Identificado</Label><Input id="peligro" value={iperData.peligro || ''} onChange={(e) => handleInputChange('peligro', e.target.value)} placeholder="Ej: Caída de objetos desde altura"/></div>
                    <div className="space-y-2"><Label htmlFor="riesgo">Riesgo Asociado</Label><Input id="riesgo" value={iperData.riesgo || ''} onChange={(e) => handleInputChange('riesgo', e.target.value)} placeholder="Ej: Golpes, contusiones, fracturas"/></div>
                    <div className="space-y-2"><Label htmlFor="categoriaPeligro">Categoría del Peligro</Label><Select value={iperData.categoriaPeligro} onValueChange={(val) => handleInputChange('categoriaPeligro', val)}><SelectTrigger id="categoriaPeligro"><SelectValue placeholder="Seleccionar..."/></SelectTrigger><SelectContent><SelectItem value="Fisico">Físico</SelectItem><SelectItem value="Quimico">Químico</SelectItem><SelectItem value="Biologico">Biológico</SelectItem><SelectItem value="Ergonomico">Ergonómico</SelectItem><SelectItem value="Psicosocial">Psicosocial</SelectItem></SelectContent></Select></div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>2. Evaluación de Riesgo Inherente (Diferenciada por Género)</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4 p-4 border rounded-lg">
                        <h3 className="font-semibold text-center">Evaluación para Hombres</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Probabilidad (1-5)</Label><Input type="number" min="1" max="5" value={iperData.probabilidad_hombre} onChange={e => handleInputChange('probabilidad_hombre', parseInt(e.target.value))} /></div>
                            <div className="space-y-2"><Label>Consecuencia (1-5)</Label><Input type="number" min="1" max="5" value={iperData.consecuencia_hombre} onChange={e => handleInputChange('consecuencia_hombre', parseInt(e.target.value))} /></div>
                        </div>
                        <RiskMatrix probability={iperData.probabilidad_hombre || 1} consequence={iperData.consecuencia_hombre || 1} />
                        <RiskLevelIndicator level={nivelRiesgoHombre} />
                    </div>
                     <div className="space-y-4 p-4 border rounded-lg">
                        <h3 className="font-semibold text-center">Evaluación para Mujeres</h3>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Probabilidad (1-5)</Label><Input type="number" min="1" max="5" value={iperData.probabilidad_mujer} onChange={e => handleInputChange('probabilidad_mujer', parseInt(e.target.value))} /></div>
                            <div className="space-y-2"><Label>Consecuencia (1-5)</Label><Input type="number" min="1" max="5" value={iperData.consecuencia_mujer} onChange={e => handleInputChange('consecuencia_mujer', parseInt(e.target.value))} /></div>
                        </div>
                         <RiskMatrix probability={iperData.probabilidad_mujer || 1} consequence={iperData.consecuencia_mujer || 1} />
                        <RiskLevelIndicator level={nivelRiesgoMujer} />
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                 <CardHeader>
                    <CardTitle>3. Medidas de Control</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2"><Label htmlFor="jerarquiaControl">Jerarquía de Control</Label><Select value={iperData.jerarquiaControl} onValueChange={(val) => handleInputChange('jerarquiaControl', val)}><SelectTrigger id="jerarquiaControl"><SelectValue placeholder="Seleccionar..."/></SelectTrigger><SelectContent><SelectItem value="Eliminacion">Eliminación</SelectItem><SelectItem value="Sustitucion">Sustitución</SelectItem><SelectItem value="Control de Ingenieria">Control de Ingeniería</SelectItem><SelectItem value="Control Administrativo">Control Administrativo</SelectItem><SelectItem value="EPP">EPP</SelectItem></SelectContent></Select></div>
                     <div className="space-y-2"><Label htmlFor="control_especifico_genero">Control Específico con Enfoque de Género (Si aplica)</Label><Textarea id="control_especifico_genero" value={iperData.control_especifico_genero || ''} onChange={(e) => handleInputChange('control_especifico_genero', e.target.value)} placeholder="Ej: EPP de tallas adecuadas, ajuste ergonómico del puesto de trabajo..."/></div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="responsable">Responsable</Label><Input id="responsable" value={iperData.responsable || ''} onChange={(e) => handleInputChange('responsable', e.target.value)} /></div>
                        <div className="space-y-2"><Label htmlFor="plazo">Plazo</Label><Input id="plazo" type="date" value={iperData.plazo || ''} onChange={(e) => handleInputChange('plazo', e.target.value)} /></div>
                     </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>4. Evaluación de Riesgo Residual</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-4 p-4 border rounded-lg">
                        <h3 className="font-semibold text-center">Evaluación Residual (Post-Controles)</h3>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Probabilidad (1-5)</Label><Input type="number" min="1" max="5" value={iperData.probabilidad_residual} onChange={e => handleInputChange('probabilidad_residual', parseInt(e.target.value))} /></div>
                            <div className="space-y-2"><Label>Consecuencia (1-5)</Label><Input type="number" min="1" max="5" value={iperData.consecuencia_residual} onChange={e => handleInputChange('consecuencia_residual', parseInt(e.target.value))} /></div>
                        </div>
                         <RiskMatrix probability={iperData.probabilidad_residual || 1} consequence={iperData.consecuencia_residual || 1} />
                        <RiskLevelIndicator level={nivelRiesgoResidual} />
                    </div>
                </CardContent>
            </Card>
            
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                    Guardar IPER
                </Button>
            </div>
        </div>
    );
}
