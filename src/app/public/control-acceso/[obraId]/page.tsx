// src/app/public/control-acceso/[obraId]/page.tsx
"use client";

import React, { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient'; // Solo para leer datos de obra
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Obra } from '@/types/pcg';

export default function PublicAccessControlPage() {
    const params = useParams();
    const router = useRouter();
    const obraId = params.obraId as string;

    const [obra, setObra] = useState<Obra | null>(null);
    const [loadingObra, setLoadingObra] = useState(true);
    
    const [nombre, setNombre] = useState('');
    const [rut, setRut] = useState('');
    const [empresa, setEmpresa] = useState('');
    const [motivo, setMotivo] = useState('');
    const [archivo, setArchivo] = useState<File | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!obraId) return;
        const fetchObraData = async () => {
            setLoadingObra(true);
            try {
                const obraRef = doc(firebaseDb, "obras", obraId);
                const obraSnap = await getDoc(obraRef);
                if (obraSnap.exists()) {
                    setObra({ id: obraSnap.id, ...obraSnap.data() } as Obra);
                } else {
                    setError("La obra especificada no existe.");
                }
            } catch (err) {
                setError("No se pudo cargar la información de la obra.");
            } finally {
                setLoadingObra(false);
            }
        };
        fetchObraData();
    }, [obraId]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!nombre || !rut || !empresa || !motivo || !archivo) {
            setError("Todos los campos y el archivo adjunto son obligatorios.");
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData();
        formData.append('obraId', obraId);
        formData.append('nombreCompleto', nombre);
        formData.append('rut', rut);
        formData.append('empresa', empresa);
        formData.append('motivo', motivo);
        formData.append('archivo', archivo);

        try {
            const response = await fetch('/api/control-acceso/submit', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Ocurrió un error al enviar el registro.');
            }

            router.push('/public/control-acceso/success');

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loadingObra) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /> Cargando...</div>;
    }
    
    return (
        <main className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle>Registro de Acceso a Obra</CardTitle>
                    <CardDescription>
                        {obra ? `Estás registrando tu ingreso a la obra: ${obra.nombreFaena}` : 'Obra no encontrada.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="nombre">Nombre Completo*</Label>
                            <Input id="nombre" value={nombre} onChange={e => setNombre(e.target.value)} required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="rut">RUT*</Label>
                                <Input id="rut" value={rut} onChange={e => setRut(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="empresa">Empresa*</Label>
                                <Input id="empresa" value={empresa} onChange={e => setEmpresa(e.target.value)} required />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="motivo">Motivo de la Visita*</Label>
                            <Textarea id="motivo" value={motivo} onChange={e => setMotivo(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="archivo">Adjuntar Archivo (Carnet, Firma, etc.)*</Label>
                            <Input id="archivo" type="file" onChange={e => setArchivo(e.target.files?.[0] || null)} required />
                        </div>
                        <Button type="submit" disabled={isSubmitting || !obra} className="w-full">
                            {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <Send className="mr-2" />}
                            {isSubmitting ? 'Enviando Registro...' : 'Registrar Ingreso'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </main>
    );
}