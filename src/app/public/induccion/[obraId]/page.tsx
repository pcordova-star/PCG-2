// src/app/public/induccion/[obraId]/page.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseDb, firebaseStorage } from '@/lib/firebaseClient';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Obra } from '@/types/pcg';
import { guardarInduccionQR } from '@/lib/induccionAccesoFaena';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, CheckCircle } from 'lucide-react';
import SignaturePad from '@/app/(pcg)/prevencion/hallazgos/components/SignaturePad';
import { PcgLogo } from '@/components/branding/PcgLogo';

const initialFormState = {
  tipoVisita: 'VISITA' as const,
  nombreCompleto: '',
  rut: '',
  empresa: '',
  cargo: '',
  telefono: '',
  correo: '',
  fechaIngreso: new Date().toISOString().slice(0, 10),
  horaIngreso: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit'}),
  respuestaPregunta1: 'NO' as const,
  respuestaPregunta2: 'SI' as const,
  respuestaPregunta3: 'SI' as const,
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
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formSubmitted, setFormSubmitted] = useState(false);

    const [formData, setFormData] = useState(initialFormState);
    const [firmaDataUrl, setFirmaDataUrl] = useState<string | null>(null);

    useEffect(() => {
        if (obraId) {
            const fetchObra = async () => {
                setLoading(true);
                try {
                    const obraRef = doc(firebaseDb, 'obras', obraId);
                    const obraSnap = await getDoc(obraRef);
                    if (obraSnap.exists()) {
                        setObra({ id: obraSnap.id, ...obraSnap.data() } as Obra);
                    } else {
                        setError('La obra especificada no existe.');
                    }
                } catch (err) {
                    setError('No se pudo cargar la información de la obra.');
                } finally {
                    setLoading(false);
                }
            };
            fetchObra();
        }
    }, [obraId]);

    const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
        setFormData(prev => ({...prev, [field]: value}));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        
        if (!formData.aceptaReglamento || !formData.aceptaEpp || !formData.aceptaTratamientoDatos) {
            toast({ variant: 'destructive', title: 'Confirmación requerida', description: 'Debe aceptar todos los compromisos para continuar.' });
            return;
        }

        if (!firmaDataUrl) {
            toast({ variant: 'destructive', title: 'Firma requerida', description: 'Debe firmar el formulario.' });
            return;
        }

        if (!obra) {
             toast({ variant: 'destructive', title: 'Error', description: 'No se ha podido cargar la información de la obra.' });
             return;
        }

        setIsSaving(true);
        try {
            let finalFirmaUrl = null;
            if (firmaDataUrl) {
                const blob = await(await fetch(firmaDataUrl)).blob();
                const firmaRef = ref(firebaseStorage, `inducciones/${obraId}/firmas/${Date.now()}.png`);
                await uploadBytes(firmaRef, blob);
                finalFirmaUrl = await getDownloadURL(firmaRef);
            }

            await guardarInduccionQR({
                ...formData,
                obraId: obraId,
                obraNombre: obra.nombreFaena,
                firmaDataUrl: finalFirmaUrl,
            });
            
            setFormSubmitted(true);

        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error al guardar', description: err.message || 'No se pudo guardar el registro.' });
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen bg-muted/40"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (error) {
         return <div className="flex items-center justify-center min-h-screen bg-muted/40 text-destructive">{error}</div>;
    }

    if (formSubmitted) {
        return (
             <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CheckCircle className="mx-auto h-12 w-12 text-green-500"/>
                        <CardTitle className="text-2xl">Registro Exitoso</CardTitle>
                        <CardDescription>
                           Su inducción de acceso a la obra <strong>{obra?.nombreFaena}</strong> ha sido registrada.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center text-sm">
                        <p>Puede presentarse en la portería para validar su ingreso.</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                     <div className="mx-auto w-fit mb-4">
                        <PcgLogo />
                    </div>
                    <CardTitle className="text-2xl flex items-center justify-center gap-2"><ShieldCheck/> Inducción de Acceso a Faena</CardTitle>
                    <CardDescription>Obra: <strong>{obra?.nombreFaena}</strong>. Complete todos los campos para registrar su ingreso.</CardDescription>
                </CardHeader>
                <CardContent>
                     <form onSubmit={handleSubmit} className="space-y-6">
                        <h3 className="font-semibold text-lg border-b pb-2">1. Identificación Personal</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="nombreCompleto">Nombre Completo*</Label>
                                <Input id="nombreCompleto" value={formData.nombreCompleto} onChange={(e) => handleInputChange('nombreCompleto', e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="rut">RUT / ID*</Label>
                                <Input id="rut" value={formData.rut} onChange={(e) => handleInputChange('rut', e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="empresa">Empresa*</Label>
                                <Input id="empresa" value={formData.empresa} onChange={(e) => handleInputChange('empresa', e.target.value)} required/>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cargo">Cargo/Ocupación</Label>
                                <Input id="cargo" value={formData.cargo} onChange={(e) => handleInputChange('cargo', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="telefono">Teléfono de Contacto</Label>
                                <Input id="telefono" type="tel" value={formData.telefono} onChange={(e) => handleInputChange('telefono', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="tipoVisita">Tipo de Ingreso</Label>
                                <Select value={formData.tipoVisita} onValueChange={(v) => handleInputChange('tipoVisita', v)}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="VISITA">Visita</SelectItem>
                                        <SelectItem value="PROVEEDOR">Proveedor</SelectItem>
                                        <SelectItem value="INSPECTOR">Inspector</SelectItem>
                                        <SelectItem value="OTRO">Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <h3 className="font-semibold text-lg border-b pb-2 pt-4">2. Compromisos de Seguridad</h3>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3 rounded-md border p-3">
                                <Checkbox id="aceptaReglamento" checked={formData.aceptaReglamento} onCheckedChange={(c) => handleInputChange('aceptaReglamento', !!c)} />
                                <Label htmlFor="aceptaReglamento" className="text-xs font-normal">Declaro haber recibido, leído y comprendido el Reglamento Especial para Empresas Contratistas y Subcontratistas.</Label>
                            </div>
                            <div className="flex items-start gap-3 rounded-md border p-3">
                                <Checkbox id="aceptaEpp" checked={formData.aceptaEpp} onCheckedChange={(c) => handleInputChange('aceptaEpp', !!c)} />
                                <Label htmlFor="aceptaEpp" className="text-xs font-normal">Declaro haber recibido mis Elementos de Protección Personal (EPP) y conocer los riesgos a los que estaré expuesto.</Label>
                            </div>
                            <div className="flex items-start gap-3 rounded-md border p-3">
                                <Checkbox id="aceptaTratamientoDatos" checked={formData.aceptaTratamientoDatos} onCheckedChange={(c) => handleInputChange('aceptaTratamientoDatos', !!c)} />
                                <Label htmlFor="aceptaTratamientoDatos" className="text-xs font-normal">Autorizo el tratamiento de mis datos personales para fines de seguridad, control y gestión de la obra.</Label>
                            </div>
                        </div>
                        
                        <h3 className="font-semibold text-lg border-b pb-2 pt-4">3. Firma</h3>
                        <SignaturePad onChange={setFirmaDataUrl} />

                        <Button type="submit" className="w-full" disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            {isSaving ? 'Enviando Registro...' : 'Finalizar y Registrar Ingreso'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
