// src/app/public/induccion/[obraId]/page.tsx
"use client";

import { useEffect, useState, FormEvent, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Obra, InduccionAccesoFaena } from '@/types/pcg';
import { guardarInduccionQR } from '@/lib/induccionAccesoFaena';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldX } from 'lucide-react';
import { PcgLogo } from '@/components/branding/PcgLogo';
import { Checkbox } from '@/components/ui/checkbox';
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
  firmaDataUrl: null,
};


function InduccionForm() {
    const params = useParams();
    const router = useRouter();
    const obraId = params.obraId as string;

    const [obra, setObra] = useState<Obra | null>(null);
    const [loadingObra, setLoadingObra] = useState(true);
    const [formData, setFormData] = useState<FormDataState>(initialFormState);
    const [isSaving, setIsSaving] = useState(false);
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
                    setError("La obra especificada no fue encontrada.");
                }
                setLoadingObra(false);
            };
            fetchObra();
        }
    }, [obraId]);

    const handleInputChange = (field: keyof FormDataState, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSignatureChange = (dataUrl: string | null) => {
        setFormData(prev => ({ ...prev, firmaDataUrl: dataUrl }));
    };

    const isFormValid = () => {
        return (
            formData.nombreCompleto &&
            formData.rut &&
            formData.empresa &&
            formData.aceptaReglamento &&
            formData.aceptaEpp &&
            formData.aceptaTratamientoDatos &&
            formData.firmaDataUrl
        );
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!isFormValid()) {
            setError("Por favor, complete todos los campos obligatorios, acepte las condiciones y firme el documento.");
            return;
        }
        setIsSaving(true);
        try {
            await guardarInduccionQR({ ...formData, obraId });
            router.push('/public/induccion/success');
        } catch (error: any) {
            console.error("Error al guardar inducción QR:", error);
            setError(error.message || "No se pudo guardar el registro. Intente de nuevo.");
        } finally {
            setIsSaving(false);
        }
    };
    
    if (loadingObra) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="mt-2 text-muted-foreground">Cargando información de la obra...</p>
            </div>
        );
    }

    if (error && !obra) {
        return (
            <Card className="border-destructive">
                <CardHeader className="text-center">
                    <ShieldX className="h-10 w-10 text-destructive mx-auto" />
                    <CardTitle className="text-destructive">Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-center">{error}</p>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <Label htmlFor="nombreCompleto">Nombre Completo*</Label>
                    <Input id="nombreCompleto" value={formData.nombreCompleto} onChange={(e) => handleInputChange('nombreCompleto', e.target.value)} required />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="rut">RUT / ID*</Label>
                    <Input id="rut" value={formData.rut} onChange={(e) => handleInputChange('rut', e.target.value)} required />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="empresa">Empresa que representa*</Label>
                    <Input id="empresa" value={formData.empresa} onChange={(e) => handleInputChange('empresa', e.target.value)} required />
                </div>
                 <div className="space-y-1">
                    <Label htmlFor="cargo">Cargo / Ocupación</Label>
                    <Input id="cargo" value={formData.cargo} onChange={(e) => handleInputChange('cargo', e.target.value)} />
                </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
                 <h3 className="font-semibold">Compromisos de Seguridad</h3>
                 <p className="text-xs text-muted-foreground">Por favor, lea y acepte las siguientes declaraciones para poder ingresar a la faena.</p>
                <div className="flex items-start space-x-2">
                    <Checkbox id="aceptaEpp" checked={formData.aceptaEpp} onCheckedChange={(c) => handleInputChange('aceptaEpp', !!c)} />
                    <Label htmlFor="aceptaEpp" className="text-sm font-normal">
                        Declaro haber recibido y acepto utilizar todos los Elementos de Protección Personal (EPP) requeridos para mi seguridad en la obra.
                    </Label>
                </div>
                <div className="flex items-start space-x-2">
                    <Checkbox id="aceptaReglamento" checked={formData.aceptaReglamento} onCheckedChange={(c) => handleInputChange('aceptaReglamento', !!c)} />
                    <Label htmlFor="aceptaReglamento" className="text-sm font-normal">
                        Declaro conocer y me comprometo a cumplir el Reglamento Interno de Orden, Higiene y Seguridad de la obra.
                    </Label>
                </div>
                 <div className="flex items-start space-x-2">
                    <Checkbox id="aceptaTratamientoDatos" checked={formData.aceptaTratamientoDatos} onCheckedChange={(c) => handleInputChange('aceptaTratamientoDatos', !!c)} />
                    <Label htmlFor="aceptaTratamientoDatos" className="text-sm font-normal">
                       Autorizo el tratamiento de mis datos personales para fines de control de acceso y seguridad, conforme a la Ley 19.628.
                    </Label>
                </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
                <Label className="font-semibold">Firma de Conformidad*</Label>
                <SignaturePad onChange={handleSignatureChange} />
            </div>

            {error && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm font-medium">
                    {error}
                </div>
            )}
            
            <Button type="submit" className="w-full" disabled={isSaving || !isFormValid()}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Registrar Ingreso
            </Button>
        </form>
    );
}

export default function PublicInduccionPage() {
    return (
        <div className="min-h-screen bg-muted flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                     <div className="mx-auto w-fit mb-4"><PcgLogo /></div>
                    <CardTitle className="text-2xl">Inducción de Acceso a Obra</CardTitle>
                    <CardDescription>Complete este formulario para registrar su ingreso.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Suspense fallback={<div className="text-center"><Loader2 className="h-6 w-6 animate-spin"/></div>}>
                       <InduccionForm />
                    </Suspense>
                </CardContent>
            </Card>
        </div>
    );
}
