// src/app/public/induccion/[obraId]/page.tsx
"use client";

import { useEffect, useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Obra, InduccionAccesoFaena } from '@/types/pcg';
import { guardarInduccionQR } from '@/lib/induccionAccesoFaena';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck } from 'lucide-react';
import { PcgLogo } from '@/components/branding/PcgLogo';
import SignaturePad from '@/components/ui/SignaturePad'; // Corrected Import


const initialFormState: Omit<InduccionAccesoFaena, 'id' | 'createdAt' | 'obraId' | 'obraNombre' | 'generadorId' | 'origenRegistro'> = {
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
    const { obraId } = useParams();
    const router = useRouter();
    const { toast } = useToast();

    const [obra, setObra] = useState<Obra | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formState, setFormState] = useState(initialFormState);
    const [step, setStep] = useState(1);

    useEffect(() => {
        if (!obraId) {
            setError("ID de obra no encontrado.");
            setLoading(false);
            return;
        }

        const fetchObra = async () => {
            const obraRef = doc(firebaseDb, 'obras', obraId as string);
            const obraSnap = await getDoc(obraRef);
            if (obraSnap.exists()) {
                setObra({ id: obraSnap.id, ...obraSnap.data() } as Obra);
            } else {
                setError("La obra especificada no existe.");
            }
            setLoading(false);
        };
        fetchObra();
    }, [obraId]);

    const handleInputChange = (field: keyof typeof formState, value: string | boolean) => {
        setFormState(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        
        if (!formState.aceptaReglamento || !formState.aceptaEpp || !formState.aceptaTratamientoDatos) {
            toast({ variant: 'destructive', title: 'Aceptación requerida', description: 'Debe aceptar todos los compromisos.' });
            return;
        }
        if (!formState.firmaDataUrl) {
            toast({ variant: 'destructive', title: 'Firma requerida', description: 'Por favor, firme en el recuadro.' });
            return;
        }

        setIsSubmitting(true);
        try {
            await guardarInduccionQR({ ...formState, obraId: obraId as string });
            setStep(3); // Go to success step
        } catch (err: any) {
            console.error("Error guardando inducción:", err);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar su registro. Intente de nuevo.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /> Cargando...</div>;
    if (error) return <div className="flex items-center justify-center min-h-screen text-destructive">{error}</div>;

    if (step === 3) {
        return (
             <div className="flex flex-col items-center justify-center min-h-screen bg-muted/40 p-4 text-center">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <ShieldCheck className="mx-auto h-12 w-12 text-green-500" />
                        <CardTitle className="mt-4">¡Registro Exitoso!</CardTitle>
                        <CardDescription>Su ingreso ha sido registrado. Por favor, preséntese en portería.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 w-fit"><PcgLogo /></div>
                    <CardTitle>Inducción de Acceso a Faena</CardTitle>
                    <CardDescription>{obra?.nombreFaena}</CardDescription>
                </CardHeader>

                {step === 1 && (
                     <CardContent className="space-y-4">
                        <h3 className="font-semibold text-center">Reglamento Básico de Seguridad</h3>
                        <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
                            <li>Es obligatorio el uso de todos los Elementos de Protección Personal (EPP) definidos para el área a visitar.</li>
                            <li>Respete toda la señalización de seguridad y las instrucciones del personal de la obra.</li>
                            <li>No ingrese a áreas restringidas o para las cuales no cuenta con autorización.</li>
                            <li>Informe inmediatamente sobre cualquier condición o acto inseguro que observe.</li>
                        </ul>
                         <Button className="w-full" onClick={() => setStep(2)}>Entendido, continuar al registro</Button>
                    </CardContent>
                )}
                
                {step === 2 && (
                    <CardContent>
                         <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1"><Label htmlFor="nombreCompleto">Nombre Completo*</Label><Input id="nombreCompleto" value={formState.nombreCompleto} onChange={(e) => handleInputChange('nombreCompleto', e.target.value)} required /></div>
                                <div className="space-y-1"><Label htmlFor="rut">RUT/ID*</Label><Input id="rut" value={formState.rut} onChange={(e) => handleInputChange('rut', e.target.value)} required /></div>
                                <div className="space-y-1"><Label htmlFor="empresa">Empresa*</Label><Input id="empresa" value={formState.empresa} onChange={(e) => handleInputChange('empresa', e.target.value)} required/></div>
                                <div className="space-y-1"><Label htmlFor="cargo">Cargo/Ocupación</Label><Input id="cargo" value={formState.cargo} onChange={(e) => handleInputChange('cargo', e.target.value)} /></div>
                            </div>
                            
                            <div className="space-y-2 border-t pt-4">
                                <div className="flex items-start gap-3"><Checkbox id="aceptaReglamento" checked={formState.aceptaReglamento} onCheckedChange={(c) => handleInputChange('aceptaReglamento', !!c)} required/><Label htmlFor="aceptaReglamento" className="text-xs font-normal">Declaro haber leído y comprendido el reglamento básico de seguridad.</Label></div>
                                <div className="flex items-start gap-3"><Checkbox id="aceptaEpp" checked={formState.aceptaEpp} onCheckedChange={(c) => handleInputChange('aceptaEpp', !!c)} required/><Label htmlFor="aceptaEpp" className="text-xs font-normal">Declaro que cuento con y utilizaré mis Elementos de Protección Personal (EPP).</Label></div>
                                <div className="flex items-start gap-3"><Checkbox id="aceptaTratamientoDatos" checked={formState.aceptaTratamientoDatos} onCheckedChange={(c) => handleInputChange('aceptaTratamientoDatos', !!c)} required/><Label htmlFor="aceptaTratamientoDatos" className="text-xs font-normal">Acepto el tratamiento de mis datos personales para fines de seguridad y control de acceso.</Label></div>
                            </div>

                             <div className="space-y-2">
                                <Label>Firma de conformidad*</Label>
                                <SignaturePad onChange={(dataUrl) => handleInputChange('firmaDataUrl', dataUrl || '')} />
                            </div>

                            <Button type="submit" disabled={isSubmitting} className="w-full">
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                {isSubmitting ? 'Registrando...' : 'Confirmar y Registrar Ingreso'}
                            </Button>
                        </form>
                    </CardContent>
                )}
            </Card>
        </div>
    );
}
