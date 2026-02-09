"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PcgLogo } from '@/components/branding/PcgLogo';

// Esta página es pública y NO debe usar useAuth o lógica de sesión.

export default function PublicInduccionPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();

    const obraId = params.obraId as string;

    const [formData, setFormData] = useState({
        nombreCompleto: '',
        rut: '',
        empresa: '',
        motivo: '',
    });
    const [archivo, setArchivo] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [obraNombre, setObraNombre] = useState('Cargando...');

    // Simple fetch para obtener el nombre de la obra.
    // Esta es una solución temporal. Idealmente, se haría con una API route.
    useEffect(() => {
        if (obraId) {
            setObraNombre(`Obra ID: ${obraId}`); // Placeholder
        }
    }, [obraId]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                toast({ variant: 'destructive', title: 'Archivo demasiado grande', description: 'Por favor, sube un archivo de menos de 10MB.' });
                setArchivo(null);
                e.target.value = '';
            } else {
                setArchivo(file);
            }
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!archivo) {
            toast({ variant: 'destructive', title: 'Falta Archivo', description: 'Debes adjuntar el archivo de respaldo.' });
            return;
        }
        setLoading(true);

        const submissionData = new FormData();
        submissionData.append('obraId', obraId);
        submissionData.append('nombreCompleto', formData.nombreCompleto);
        submissionData.append('rut', formData.rut);
        submissionData.append('empresa', formData.empresa);
        submissionData.append('motivo', formData.motivo);
        submissionData.append('archivo', archivo);

        try {
            const response = await fetch('/api/control-acceso/submit', {
                method: 'POST',
                body: submissionData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Ocurrió un error en el servidor.');
            }

            toast({ title: 'Registro Exitoso', description: 'Tu ingreso ha sido registrado correctamente.' });
            router.push('/public/control-acceso/success');

        } catch (error: any) {
            console.error("Error al enviar registro:", error);
            toast({ variant: 'destructive', title: 'Error al Enviar', description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center">
                    <div className="mx-auto w-fit mb-4">
                        <PcgLogo />
                    </div>
                    <CardTitle>Registro de Acceso a Obra</CardTitle>
                    <CardDescription>Estás ingresando a la obra seleccionada. Completa tus datos para continuar.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="nombreCompleto">Nombre Completo*</Label>
                                <Input id="nombreCompleto" name="nombreCompleto" onChange={handleInputChange} required />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="rut">RUT*</Label>
                                <Input id="rut" name="rut" onChange={handleInputChange} required />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="empresa">Empresa*</Label>
                            <Input id="empresa" name="empresa" onChange={handleInputChange} required />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="motivo">Motivo de Visita*</Label>
                            <Input id="motivo" name="motivo" onChange={handleInputChange} required />
                        </div>
                         <div className="space-y-1.5">
                            <Label htmlFor="archivo">Adjuntar respaldo (carnet, firma, etc.)*</Label>
                            <Input id="archivo" type="file" onChange={handleFileChange} required accept="image/*,application/pdf" />
                             {archivo && <p className="text-xs text-muted-foreground pt-1">Archivo seleccionado: {archivo.name}</p>}
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ShieldCheck className="mr-2 h-4 w-4"/>}
                            Registrar Ingreso
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
