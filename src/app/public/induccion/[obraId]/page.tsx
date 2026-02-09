// src/app/public/induccion/[obraId]/page.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Obra, InduccionAccesoFaena } from '@/types/pcg';
import { getDoc, doc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { guardarInduccionQR } from '@/lib/induccionAccesoFaena';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowRight } from 'lucide-react';
import { PcgLogo } from '@/components/branding/PcgLogo';
import SignaturePad from '@/components/ui/SignaturePad';

type FormDataState = Omit<InduccionAccesoFaena, 'id' | 'createdAt' | 'obraId' | 'obraNombre' | 'generadorId' | 'origenRegistro'>;

const initialFormState: FormDataState = {
  tipoVisita: 'VISITA',
  nombreCompleto: '',
  rut: '',
  empresa: '',
  cargo: '',
  telefono: '',
  correo: '',
  fechaIngreso: new Date().toISOString().slice(0, 10),
  horaIngreso: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit'}),
  respuestaPregunta1: 'NO',
  respuestaPregunta2: 'SI',
  respuestaPregunta3: 'SI',
  aceptaReglamento: false,
  aceptaEpp: false,
  aceptaTratamientoDatos: false,
  firmaDataUrl: '',
};

export default function PublicInduccionPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const obraId = params.obraId as string;

    const [obra, setObra] = useState<Obra | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [formData, setFormData] = useState<FormDataState>(initialFormState);

    useEffect(() => {
        if (!obraId) return;
        const fetchObra = async () => {
            setLoading(true);
            const obraRef = doc(firebaseDb, "obras", obraId);
            const obraSnap = await getDoc(obraRef);
            if (obraSnap.exists()) {
                setObra({ id: obraSnap.id, ...obraSnap.data() } as Obra);
            } else {
                setError("La obra especificada no fue encontrada.");
            }
            setLoading(false);
        };
        fetchObra();
    }, [obraId]);

    const handleInputChange = (field: keyof FormDataState, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!obra) return;

        if (!formData.aceptaReglamento || !formData.aceptaEpp || !formData.aceptaTratamientoDatos) {
            toast({ variant: 'destructive', title: 'Confirmación requerida', description: 'Debes aceptar todos los compromisos de seguridad.' });
            return;
        }

        if (!formData.firmaDataUrl) {
            toast({ variant: 'destructive', title: 'Firma requerida', description: 'Por favor, firma en el recuadro para continuar.' });
            return;
        }

        setIsSaving(true);
        try {
            await guardarInduccionQR({
                ...formData,
                obraId: obraId,
                obraNombre: obra.nombreFaena,
                generadorId: null, // From QR
            });
            setIsCompleted(true);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: `No se pudo guardar el registro: ${error.message}` });
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>;
    if (error) return <div className="flex justify-center items-center h-screen text-destructive">{error}</div>;

    if (isCompleted) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-green-50">
                 <Card className="w-full max-w-md mx-4 text-center">
                    <CardHeader>
                        <CardTitle className="text-green-700">¡Registro Exitoso!</CardTitle>
                        <CardDescription>Tu ingreso a la obra {obra?.nombreFaena} ha sido registrado. Por favor, preséntate en la portería.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4">
            <Card className="max-w-2xl mx-auto">
                <CardHeader className="text-center">
                    <div className="w-20 mx-auto mb-4"><PcgLogo /></div>
                    <CardTitle>Inducción de Acceso a Faena</CardTitle>
                    <CardDescription>Obra: {obra?.nombreFaena}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <section className="space-y-4">
                            <h3 className="font-semibold text-lg border-b pb-2">1. Tus Datos</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="nombreCompleto">Nombre Completo*</Label>
                                    <Input id="nombreCompleto" value={formData.nombreCompleto} onChange={(e) => handleInputChange('nombreCompleto', e.target.value)} required />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="rut">RUT/ID*</Label>
                                    <Input id="rut" value={formData.rut} onChange={(e) => handleInputChange('rut', e.target.value)} required />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="empresa">Empresa*</Label>
                                    <Input id="empresa" value={formData.empresa} onChange={(e) => handleInputChange('empresa', e.target.value)} required />
                                </div>
                                 <div className="space-y-1">
                                    <Label htmlFor="cargo">Cargo/Ocupación</Label>
                                    <Input id="cargo" value={formData.cargo} onChange={(e) => handleInputChange('cargo', e.target.value)} />
                                </div>
                            </div>
                        </section>
                        
                        <section className="space-y-4">
                             <h3 className="font-semibold text-lg border-b pb-2">2. Compromisos de Seguridad</h3>
                             <div className="items-top flex space-x-2">
                                <Checkbox id="aceptaReglamento" checked={formData.aceptaReglamento} onCheckedChange={(c) => handleInputChange('aceptaReglamento', !!c)} />
                                <Label htmlFor="aceptaReglamento" className="text-sm font-normal">Declaro haber recibido y comprendido el Reglamento Especial para Empresas Contratistas y Subcontratistas.</Label>
                            </div>
                            <div className="items-top flex space-x-2">
                                <Checkbox id="aceptaEpp" checked={formData.aceptaEpp} onCheckedChange={(c) => handleInputChange('aceptaEpp', !!c)} />
                                <Label htmlFor="aceptaEpp" className="text-sm font-normal">Me comprometo a usar en todo momento los Elementos de Protección Personal (EPP) requeridos para ingresar y permanecer en la obra.</Label>
                            </div>
                            <div className="items-top flex space-x-2">
                                <Checkbox id="aceptaTratamientoDatos" checked={formData.aceptaTratamientoDatos} onCheckedChange={(c) => handleInputChange('aceptaTratamientoDatos', !!c)} />
                                <Label htmlFor="aceptaTratamientoDatos" className="text-sm font-normal">Acepto el tratamiento de mis datos personales para fines de seguridad y control de acceso.</Label>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h3 className="font-semibold text-lg border-b pb-2">3. Firma</h3>
                            <p className="text-xs text-muted-foreground">Firma en el siguiente recuadro para confirmar tu identidad y la aceptación de los compromisos.</p>
                            <SignaturePad onChange={(dataUrl) => handleInputChange('firmaDataUrl', dataUrl || '')} />
                        </section>

                        <Button type="submit" className="w-full" disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ArrowRight className="mr-2 h-4 w-4"/>}
                            {isSaving ? 'Registrando...' : 'Finalizar y Registrar Ingreso'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
