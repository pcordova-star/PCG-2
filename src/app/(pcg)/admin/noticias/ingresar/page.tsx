"use client";

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader2, Wand2 } from 'lucide-react';
import Link from 'next/link';

export default function IngresarNoticiaPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user, role } = useAuth();
    
    const [formData, setFormData] = useState({
        tituloOriginal: '',
        fuente: '',
        url: '',
        contenidoCrudo: '',
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!user || role !== 'superadmin') {
            toast({ variant: 'destructive', title: 'Error de permisos', description: 'No tienes permiso para realizar esta acción.' });
            return;
        }
        if (!formData.tituloOriginal || !formData.contenidoCrudo) {
            toast({ variant: 'destructive', title: 'Campos requeridos', description: 'El título y el contenido son obligatorios.' });
            return;
        }

        setIsSaving(true);
        try {
            const noticiasRef = collection(firebaseDb, 'noticiasExternas');
            await addDoc(noticiasRef, {
                ...formData,
                createdAt: serverTimestamp(),
                createdBy: user.uid,
                status: 'pending_analysis'
            });

            toast({
                title: 'Noticia Ingresada',
                description: 'El análisis por IA se ha iniciado. Las alertas se distribuirán automáticamente.',
            });
            router.push('/admin/dashboard');

        } catch (error: any) {
            console.error("Error al ingresar noticia:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la noticia para análisis.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <header className="flex items-center gap-4">
                <Button asChild variant="outline" size="sm">
                    <Link href="/admin/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Dashboard</Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Ingresar Noticia para Análisis</h1>
                    <p className="text-muted-foreground">Al guardar, se activará un flujo de IA que analizará y distribuirá la noticia.</p>
                </div>
            </header>

            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>Datos de la Noticia</CardTitle>
                        <CardDescription>Copia y pega la información relevante de la noticia que deseas analizar.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="tituloOriginal">Título Original*</Label>
                            <Input id="tituloOriginal" name="tituloOriginal" value={formData.tituloOriginal} onChange={handleInputChange} required />
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="fuente">Fuente</Label>
                                <Input id="fuente" name="fuente" value={formData.fuente} onChange={handleInputChange} placeholder="Ej: Diario Financiero" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="url">URL Original</Label>
                                <Input id="url" name="url" type="url" value={formData.url} onChange={handleInputChange} placeholder="https://..." />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contenidoCrudo">Contenido Completo de la Noticia*</Label>
                            <Textarea id="contenidoCrudo" name="contenidoCrudo" value={formData.contenidoCrudo} onChange={handleInputChange} required rows={15} placeholder="Pega aquí el cuerpo completo de la noticia..."/>
                        </div>
                    </CardContent>
                    <CardFooter className="justify-end">
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4"/>}
                            {isSaving ? 'Analizando...' : 'Guardar y Analizar Noticia'}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
}
