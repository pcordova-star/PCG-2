// src/app/public/control-acceso/[obraId]/page.tsx
"use client";

import { useEffect, useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Obra, InduccionAccesoFaena } from '@/types/pcg';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PcgLogo } from '@/components/branding/PcgLogo';
import { Checkbox } from '@/components/ui/checkbox';
import SignaturePad from '@/components/ui/SignaturePad';

const initialFormState: Omit<InduccionAccesoFaena, 'id' | 'createdAt' | 'obraId' | 'obraNombre' | 'generadorId' | 'origenRegistro' | 'archivoUrl'> = {
    nombreCompleto: '',
    rut: '',
    empresa: '',
    telefono: '',
    correo: '',
    motivo: '',
    fechaIngreso: new Date().toISOString().slice(0, 10),
    horaIngreso: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
    aceptaReglamento: false,
    aceptaEpp: false,
    aceptaTratamientoDatos: false,
    firmaDataUrl: '',
};

export default function PublicInductionPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const obraId = params.obraId as string;

    const [obra, setObra] = useState<Obra | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState(initialFormState);
    const [archivo, setArchivo] = useState<File | null>(null);

    useEffect(() => {
        if (obraId) {
            const fetchObra = async () => {
                const obraRef = doc(firebaseDb, "obras", obraId);
                const obraSnap = await getDoc(obraRef);
                if (obraSnap.exists()) {
                    setObra({ id: obraSnap.id, ...obraSnap.data() } as Obra);
                } else {
                    setError("La obra especificada no existe.");
                }
                setLoading(false);
            };
            fetchObra();
        }
    }, [obraId]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleCheckboxChange = (name: keyof typeof initialFormState, checked: boolean) => {
        setFormData(prev => ({ ...prev, [name]: checked }));
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) { // Límite de 10MB
                toast({ variant: 'destructive', title: 'Archivo demasiado grande', description: 'El archivo no puede superar los 10MB.' });
                setArchivo(null);
                e.target.value = ''; // Limpiar el input
                return;
            }
            setArchivo(file);
        }
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!formData.aceptaReglamento || !formData.aceptaEpp || !formData.aceptaTratamientoDatos) {
            setError("Debes aceptar todos los compromisos para poder registrar tu ingreso.");
            return;
        }
         if (!archivo) {
            setError("Debes adjuntar un archivo (ej: carnet de identidad, documento de respaldo).");
            return;
        }
        setIsSubmitting(true);
        
        try {
            const submissionData = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                submissionData.append(key, String(value));
            });
            submissionData.append('obraId', obraId);
            submissionData.append('archivo', archivo);
            
            const res = await fetch('/api/control-acceso/submit', {
                method: 'POST',
                body: submissionData,
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Ocurrió un error al registrar el ingreso.');
            }

            router.push('/public/control-acceso/success');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /></div>;

    if (error) {
        return (
             <div className="flex items-center justify-center min-h-screen">
                <Card className="m-4">
                    <CardHeader><CardTitle>Error</CardTitle></CardHeader>
                    <CardContent><p className="text-destructive">{error}</p></CardContent>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-muted/40 p-4 flex items-center justify-center">
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center">
                    <div className="mx-auto w-fit mb-4"><PcgLogo /></div>
                    <CardTitle>Registro de Acceso a Obra</CardTitle>
                    <CardDescription>Estás ingresando a la obra: <strong className="text-primary">{obra?.nombreFaena}</strong></CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1"><Label htmlFor="nombreCompleto">Nombre Completo*</Label><Input id="nombreCompleto" name="nombreCompleto" value={formData.nombreCompleto} onChange={handleInputChange} required /></div>
                            <div className="space-y-1"><Label htmlFor="rut">RUT*</Label><Input id="rut" name="rut" value={formData.rut} onChange={handleInputChange} required /></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="space-y-1"><Label htmlFor="empresa">Empresa*</Label><Input id="empresa" name="empresa" value={formData.empresa} onChange={handleInputChange} required /></div>
                             <div className="space-y-1"><Label htmlFor="motivo">Motivo de Visita*</Label><Input id="motivo" name="motivo" value={formData.motivo} onChange={handleInputChange} required /></div>
                        </div>
                         <div className="space-y-1">
                            <Label htmlFor="archivo">Adjuntar Archivo* (CI, doc. respaldo, etc.)</Label>
                            <Input id="archivo" type="file" onChange={handleFileChange} required />
                        </div>
                        <div className="space-y-3 pt-4 border-t">
                            <h3 className="font-semibold">Compromisos de Seguridad</h3>
                             <div className="flex items-start gap-2"><Checkbox id="aceptaEpp" checked={formData.aceptaEpp} onCheckedChange={(c) => handleCheckboxChange('aceptaEpp', !!c)} /><Label htmlFor="aceptaEpp" className="text-xs font-normal">Declaro que cuento con y utilizaré todos los Elementos de Protección Personal (EPP) requeridos para esta obra.</Label></div>
                             <div className="flex items-start gap-2"><Checkbox id="aceptaReglamento" checked={formData.aceptaReglamento} onCheckedChange={(c) => handleCheckboxChange('aceptaReglamento', !!c)} /><Label htmlFor="aceptaReglamento" className="text-xs font-normal">He sido informado y me comprometo a cumplir el Reglamento Interno de Orden, Higiene y Seguridad.</Label></div>
                             <div className="flex items-start gap-2"><Checkbox id="aceptaTratamientoDatos" checked={formData.aceptaTratamientoDatos} onCheckedChange={(c) => handleCheckboxChange('aceptaTratamientoDatos', !!c)} /><Label htmlFor="aceptaTratamientoDatos" className="text-xs font-normal">Autorizo el tratamiento de mis datos personales para fines de seguridad y control de acceso.</Label></div>
                        </div>
                        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registrando...</> : <><ShieldCheck className="mr-2 h-4 w-4" /> Registrar Ingreso</>}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
