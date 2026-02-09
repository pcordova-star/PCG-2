
"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getDoc, doc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Obra } from '@/types/pcg';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PcgLogo } from '@/components/branding/PcgLogo';

export default function PublicControlAccesoPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const obraId = params.obraId as string;

    const [obra, setObra] = useState<Obra | null>(null);
    const [loadingObra, setLoadingObra] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (obraId) {
            const fetchObra = async () => {
                setLoadingObra(true);
                const obraRef = doc(firebaseDb, "obras", obraId);
                const obraSnap = await getDoc(obraRef);
                if (obraSnap.exists()) {
                    setObra({ id: obraSnap.id, ...obraSnap.data() } as Obra);
                } else {
                    setError("La obra especificada no existe.");
                }
                setLoadingObra(false);
            };
            fetchObra();
        }
    }, [obraId]);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);
        formData.append('obraId', obraId);

        try {
            const response = await fetch('/api/control-acceso/submit', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Ocurrió un error al enviar el formulario.');
            }

            // Redirect to a success page
            router.push('/public/control-acceso/success');

        } catch (err: any) {
            setError(err.message);
            toast({
                variant: 'destructive',
                title: 'Error al enviar registro',
                description: err.message,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loadingObra) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                <p>Cargando información de la obra...</p>
            </div>
        );
    }
    
    if (error) {
        return (
             <div className="flex items-center justify-center min-h-screen bg-muted/40">
                <Card className="w-full max-w-md mx-4 text-center">
                     <CardHeader>
                        <CardTitle className="text-destructive">Error</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>{error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto w-fit">
                        <PcgLogo />
                    </div>
                    <CardTitle className="text-2xl">Registro de Acceso a Obra</CardTitle>
                    <CardDescription>
                        Estás ingresando a: <span className="font-bold text-primary">{obra?.nombreFaena}</span>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="nombreCompleto">Nombre Completo*</Label>
                            <Input id="nombreCompleto" name="nombreCompleto" required />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="rut">RUT*</Label>
                                <Input id="rut" name="rut" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="empresa">Empresa*</Label>
                                <Input id="empresa" name="empresa" required />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="motivo">Motivo de la Visita*</Label>
                            <Textarea id="motivo" name="motivo" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="archivo">Adjuntar Archivo (Carnet, respaldo, etc.)*</Label>
                            <Input id="archivo" name="archivo" type="file" required accept="image/*,application/pdf" />
                             <p className="text-xs text-muted-foreground">Tamaño máximo: 10MB.</p>
                        </div>
                        
                         {error && <p className="text-sm font-medium text-destructive text-center pt-2">{error}</p>}

                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                            {isSubmitting ? 'Enviando Registro...' : 'Registrar Ingreso'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
