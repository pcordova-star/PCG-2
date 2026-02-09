// src/app/public/induccion/[obraId]/page.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Obra, InduccionAccesoFaena } from '@/types/pcg';
import { guardarInduccionQR } from '@/lib/induccionAccesoFaena';
import { getDoc, doc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ShieldCheck, UserCheck } from 'lucide-react';
import SignaturePad from '@/components/prevencion/hallazgos/components/SignaturePad';
import { PcgLogo } from '@/components/branding/PcgLogo';

// Definición inicial del estado del formulario
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
  firmaDataUrl: '', // Clave: Inicializar firmaDataUrl
};

export default function PublicInduccionPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const obraId = params.obraId as string;

    const [obra, setObra] = useState<Obra | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState(initialFormState);
    const [isSaving, setIsSaving] = useState(false);
    const [step, setStep] = useState(1);

    useEffect(() => {
        if (!obraId) return;
        const fetchObra = async () => {
            setLoading(true);
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
                setLoading(false);
            }
        };
        fetchObra();
    }, [obraId]);

    const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
        setFormData(prev => ({...prev, [field]: value}));
    };

    const handleSignatureChange = (dataUrl: string) => {
        setFormData(prev => ({ ...prev, firmaDataUrl: dataUrl }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        if (!formData.aceptaReglamento || !formData.aceptaEpp || !formData.aceptaTratamientoDatos) {
            setError("Debes aceptar todos los compromisos para continuar.");
            setIsSaving(false);
            return;
        }

        if (!formData.firmaDataUrl) {
            setError("La firma es obligatoria para registrar el ingreso.");
            setIsSaving(false);
            return;
        }

        try {
            await guardarInduccionQR({
                ...formData,
                obraId,
                obraNombre: obra?.nombreFaena,
            });
            toast({
                title: "Registro Exitoso",
                description: "Tu ingreso ha sido registrado. Puedes presentarte en la portería.",
                duration: 7000
            });
            setStep(4); // Go to success step
        } catch (err: any) {
            console.error("Error al guardar inducción QR:", err);
            setError(`No se pudo registrar tu ingreso: ${err.message}`);
            toast({
                variant: 'destructive',
                title: 'Error al Guardar',
                description: `No se pudo registrar tu ingreso: ${err.message}`
            });
        } finally {
            setIsSaving(false);
        }
    };
    
    if (loading) {
        return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin"/></div>
    }

    if (error) {
         return <div className="flex items-center justify-center min-h-screen text-destructive p-8 text-center">{error}</div>
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
             <Card className="w-full max-w-lg mx-auto">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4"><PcgLogo /></div>
                    <CardTitle>Inducción de Acceso a Faena</CardTitle>
                    <CardDescription>{obra?.nombreFaena}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        {step === 1 && (
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg">1. Datos Personales</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label htmlFor="nombreCompleto">Nombre Completo</Label>
                                        <Input id="nombreCompleto" value={formData.nombreCompleto} onChange={(e) => handleInputChange('nombreCompleto', e.target.value)} required />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="rut">RUT/ID</Label>
                                        <Input id="rut" value={formData.rut} onChange={(e) => handleInputChange('rut', e.target.value)} required />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="empresa">Empresa</Label>
                                    <Input id="empresa" value={formData.empresa} onChange={(e) => handleInputChange('empresa', e.target.value)} required/>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="tipoVisita">Motivo del Ingreso</Label>
                                    <Select value={formData.tipoVisita} onValueChange={(v) => handleInputChange('tipoVisita', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="VISITA">Visita Técnica</SelectItem>
                                            <SelectItem value="PROVEEDOR">Proveedor / Despacho</SelectItem>
                                            <SelectItem value="INSPECTOR">Inspección (Municipal, Sanitaria, etc.)</SelectItem>
                                            <SelectItem value="OTRO">Otro</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button onClick={() => setStep(2)} className="w-full">Siguiente</Button>
                            </div>
                        )}
                        {step === 2 && (
                             <div className="space-y-4">
                                <h3 className="font-semibold text-lg">2. Compromisos de Seguridad</h3>
                                 <div className="space-y-3 text-sm p-4 border rounded-md bg-slate-50">
                                    <div className="flex items-start gap-3">
                                        <Checkbox id="aceptaReglamento" checked={formData.aceptaReglamento} onCheckedChange={(c) => handleInputChange('aceptaReglamento', !!c)} />
                                        <Label htmlFor="aceptaReglamento" className="font-normal">Declaro haber sido informado sobre los riesgos de la obra y me comprometo a seguir las indicaciones del personal de seguridad y el reglamento interno.</Label>
                                    </div>
                                     <div className="flex items-start gap-3">
                                        <Checkbox id="aceptaEpp" checked={formData.aceptaEpp} onCheckedChange={(c) => handleInputChange('aceptaEpp', !!c)} />
                                        <Label htmlFor="aceptaEpp" className="font-normal">Declaro que cuento con y me comprometo a utilizar en todo momento los Elementos de Protección Personal (EPP) requeridos para ingresar a la faena.</Label>
                                    </div>
                                     <div className="flex items-start gap-3">
                                        <Checkbox id="aceptaTratamientoDatos" checked={formData.aceptaTratamientoDatos} onCheckedChange={(c) => handleInputChange('aceptaTratamientoDatos', !!c)} />
                                        <Label htmlFor="aceptaTratamientoDatos" className="font-normal">Acepto el tratamiento de mis datos personales para fines de registro y control de acceso, conforme a la Ley 19.628.</Label>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                     <Button variant="outline" onClick={() => setStep(1)} className="w-full">Anterior</Button>
                                    <Button onClick={() => setStep(3)} className="w-full" disabled={!formData.aceptaReglamento || !formData.aceptaEpp || !formData.aceptaTratamientoDatos}>Siguiente</Button>
                                </div>
                            </div>
                        )}
                        {step === 3 && (
                             <div className="space-y-4">
                                <h3 className="font-semibold text-lg">3. Firma</h3>
                                <p className="text-sm text-muted-foreground">Al firmar, declaro que toda la información proporcionada es verídica.</p>
                                <SignaturePad onChange={handleSignatureChange} />
                                <div className="flex gap-2 pt-4">
                                    <Button variant="outline" onClick={() => setStep(2)} className="w-full">Anterior</Button>
                                    <Button type="submit" className="w-full" disabled={isSaving}>
                                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Finalizar y Registrar Ingreso
                                    </Button>
                                </div>
                            </div>
                        )}
                        {step === 4 && (
                            <div className="text-center space-y-4 py-8">
                                <UserCheck className="mx-auto h-16 w-16 text-green-500"/>
                                <h3 className="font-semibold text-xl text-green-700">¡Registro Exitoso!</h3>
                                <p className="text-muted-foreground">Tu ingreso ha sido registrado correctamente. Ya puedes presentarte en la portería de la obra.</p>
                                <p className="text-xs text-slate-400">Esta ventana se puede cerrar.</p>
                            </div>
                        )}
                    </form>
                </CardContent>
             </Card>
        </div>
    );
}
