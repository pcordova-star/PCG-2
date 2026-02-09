// src/app/public/induccion/[obraId]/page.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Obra, InduccionAccesoFaena } from '@/types/pcg';
import { guardarInduccionQR } from '@/lib/induccionAccesoFaena';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import { PcgLogo } from '@/components/branding/PcgLogo';
import SignaturePad from '@/app/(pcg)/prevencion/hallazgos/components/SignaturePad';

const initialFormState: Omit<InduccionAccesoFaena, 'id' | 'createdAt' | 'obraId' | 'obraNombre' | 'generadorId' | 'firmaDataUrl' | 'origenRegistro'> = {
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
};

export default function PublicInduccionPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const obraId = params.obraId as string;

    const [obra, setObra] = useState<Obra | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<Omit<InduccionAccesoFaena, 'id' | 'createdAt' | 'obraId' | 'obraNombre' | 'generadorId' | 'origenRegistro'>>(initialFormState);
    
    useEffect(() => {
        if (!obraId) return;
        const fetchObra = async () => {
            setLoading(true);
            const obraRef = doc(firebaseDb, "obras", obraId);
            const obraSnap = await getDoc(obraRef);
            if (obraSnap.exists()) {
                setObra({ id: obraSnap.id, ...obraSnap.data() } as Obra);
            }
            setLoading(false);
        };
        fetchObra();
    }, [obraId]);

    const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
        setFormData(prev => ({...prev, [field]: value}));
    };
    
    const handleNextStep = () => {
        if (step === 1 && (!formData.nombreCompleto || !formData.rut || !formData.empresa)) {
            toast({ variant: 'destructive', title: 'Campos requeridos', description: 'Nombre, RUT y empresa son obligatorios.'});
            return;
        }
        if (step === 2 && (!formData.aceptaReglamento || !formData.aceptaEpp || !formData.aceptaTratamientoDatos)) {
            toast({ variant: 'destructive', title: 'Confirmación requerida', description: 'Debe aceptar todos los puntos para continuar.'});
            return;
        }
        setStep(prev => prev + 1);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!formData.firmaDataUrl) {
             toast({ variant: 'destructive', title: 'Firma requerida', description: 'Por favor, firme en el recuadro para finalizar.'});
             return;
        }
        setIsSubmitting(true);
        try {
            await guardarInduccionQR({ ...formData, obraId, obraNombre: obra?.nombreFaena });
            setStep(4); // Show success step
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error al registrar', description: error.message });
            setIsSubmitting(false);
        }
    };
    
    if (loading) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin"/></div>
    }
    if (!obra) {
        return <div className="min-h-screen flex items-center justify-center"><p>Obra no encontrada o enlace inválido.</p></div>
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center">
                    <div className="mx-auto"><PcgLogo /></div>
                    <CardTitle>Inducción de Acceso a Obra</CardTitle>
                    <CardDescription>{obra.nombreFaena}</CardDescription>
                </CardHeader>
                <CardContent>
                    {step === 1 && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-center">Paso 1: Sus Datos Personales</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1"><Label>Nombre Completo*</Label><Input value={formData.nombreCompleto} onChange={(e) => handleInputChange('nombreCompleto', e.target.value)} required /></div>
                                <div className="space-y-1"><Label>RUT/ID*</Label><Input value={formData.rut} onChange={(e) => handleInputChange('rut', e.target.value)} required /></div>
                                <div className="space-y-1"><Label>Empresa*</Label><Input value={formData.empresa} onChange={(e) => handleInputChange('empresa', e.target.value)} required/></div>
                                <div className="space-y-1"><Label>Cargo/Ocupación</Label><Input value={formData.cargo} onChange={(e) => handleInputChange('cargo', e.target.value)} /></div>
                            </div>
                            <Button onClick={handleNextStep} className="w-full">Siguiente</Button>
                        </div>
                    )}
                    {step === 2 && (
                         <div className="space-y-6">
                            <h3 className="font-semibold text-center">Paso 2: Declaración y Compromiso</h3>
                            <div className="space-y-4 text-sm p-4 border rounded-md bg-slate-50">
                                <Label className="flex items-start gap-3"><Checkbox checked={formData.aceptaReglamento} onCheckedChange={(c) => handleInputChange('aceptaReglamento', !!c)} /><span>Declaro haber recibido y entendido el Reglamento Especial para Empresas Contratistas y Subcontratistas.</span></Label>
                                <Label className="flex items-start gap-3"><Checkbox checked={formData.aceptaEpp} onCheckedChange={(c) => handleInputChange('aceptaEpp', !!c)} /><span>Declaro haber recibido y me comprometo a usar todos los Elementos de Protección Personal (EPP) requeridos para mi labor.</span></Label>
                                <Label className="flex items-start gap-3"><Checkbox checked={formData.aceptaTratamientoDatos} onCheckedChange={(c) => handleInputChange('aceptaTratamientoDatos', !!c)} /><span>Acepto el tratamiento de mis datos personales conforme a la ley para fines de seguridad y control de acceso.</span></Label>
                            </div>
                             <div className="flex justify-between">
                                <Button variant="outline" onClick={() => setStep(1)}>Atrás</Button>
                                <Button onClick={handleNextStep}>Siguiente</Button>
                            </div>
                        </div>
                    )}
                    {step === 3 && (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <h3 className="font-semibold text-center">Paso 3: Firma de Ingreso</h3>
                            <p className="text-xs text-center text-muted-foreground">Firme en el recuadro con su dedo o el mouse.</p>
                            <SignaturePad onChange={(dataUrl) => handleInputChange('firmaDataUrl', dataUrl)} />
                             <div className="flex justify-between">
                                <Button type="button" variant="outline" onClick={() => setStep(2)}>Atrás</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                     {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                    Finalizar y Enviar
                                </Button>
                            </div>
                        </form>
                    )}
                    {step === 4 && (
                        <div className="text-center space-y-4 py-8">
                            <h3 className="text-xl font-bold text-green-600">¡Registro Exitoso!</h3>
                            <p>Su ingreso ha sido registrado. Ya puede presentarse en portería.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
