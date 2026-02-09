// src/app/public/control-acceso/[obraId]/page.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertCircle } from 'lucide-react';
import { PcgLogo } from '@/components/branding/PcgLogo';

async function getObraData(obraId: string): Promise<{ nombreFaena: string } | null> {
    try {
        const obraRef = doc(firebaseDb, 'obras', obraId);
        const snap = await getDoc(obraRef);
        if (snap.exists()) {
            return { nombreFaena: snap.data().nombreFaena };
        }
        return null;
    } catch (error) {
        console.error("Error fetching obra data:", error);
        return null;
    }
}

export default function PublicInductionPage() {
    const params = useParams();
    const router = useRouter();
    const obraId = params.obraId as string;

    const [obraNombre, setObraNombre] = useState<string>('');
    const [formData, setFormData] = useState({
        nombre: '',
        rut: '',
        empresa: '',
        motivo: ''
    });
    const [archivo, setArchivo] = useState<File | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (obraId) {
            getObraData(obraId).then(data => {
                if (data) {
                    setObraNombre(data.nombreFaena);
                } else {
                    setError("La obra especificada no existe o no se pudo cargar.");
                }
                setLoading(false);
            });
        }
    }, [obraId]);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setArchivo(e.target.files?.[0] || null);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!archivo) {
            setError("Debe adjuntar un archivo.");
            return;
        }
        setIsSubmitting(true);
        setError(null);
        
        const data = new FormData();
        data.append('obraId', obraId);
        data.append('nombre', formData.nombre);
        data.append('rut', formData.rut);
        data.append('empresa', formData.empresa);
        data.append('motivo', formData.motivo);
        data.append('archivo', archivo);

        try {
            const response = await fetch('/api/control-acceso/submit', {
                method: 'POST',
                body: data,
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Ocurrió un error al enviar el formulario.');
            }
            router.push('/public/control-acceso/success');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center">
                    <div className="mx-auto w-fit mb-4"><PcgLogo /></div>
                    <CardTitle>Registro de Acceso a Obra</CardTitle>
                    <CardDescription>Obra: <span className="font-semibold">{obraNombre}</span></CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-center gap-2 mb-4">
                            <AlertCircle className="h-4 w-4"/>
                            <p>{error}</p>
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="nombre">Nombre Completo*</Label>
                            <Input id="nombre" name="nombre" value={formData.nombre} onChange={handleInputChange} required disabled={isSubmitting} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rut">RUT*</Label>
                            <Input id="rut" name="rut" value={formData.rut} onChange={handleInputChange} required disabled={isSubmitting} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="empresa">Empresa*</Label>
                            <Input id="empresa" name="empresa" value={formData.empresa} onChange={handleInputChange} required disabled={isSubmitting} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="motivo">Motivo de Visita*</Label>
                            <Textarea id="motivo" name="motivo" value={formData.motivo} onChange={handleInputChange} required disabled={isSubmitting} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="archivo">Adjuntar Archivo (Carnet, Firma, etc.)*</Label>
                            <Input id="archivo" name="archivo" type="file" onChange={handleFileChange} required disabled={isSubmitting} accept="image/*,application/pdf" />
                        </div>
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSubmitting ? 'Enviando...' : 'Registrar Ingreso'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
