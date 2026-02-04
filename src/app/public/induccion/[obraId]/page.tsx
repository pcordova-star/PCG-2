// src/app/public/induccion/[obraId]/page.tsx
"use client";

import { useEffect, useState, FormEvent, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseDb, firebaseStorage } from '@/lib/firebaseClient';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PcgLogo } from '@/components/branding/PcgLogo';
import SignaturePad from '@/app/(pcg)/prevencion/hallazgos/components/SignaturePad';
import { Obra } from '@/types/pcg';
import { guardarInduccionQR } from '@/lib/induccionAccesoFaena';

const initialState = {
    tipoVisita: "VISITA" as "VISITA" | "PROVEEDOR" | "INSPECTOR" | "OTRO",
    nombreCompleto: "",
    rut: "",
    empresa: "",
    cargo: "",
    telefono: "",
    correo: "",
    fechaIngreso: new Date().toISOString().slice(0, 10),
    horaIngreso: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
    respuestaPregunta1: "NO" as "SI" | "NO",
    respuestaPregunta2: "SI" as "SI" | "NO",
    respuestaPregunta3: "NO" as "SI" | "NO",
    aceptaReglamento: false,
    aceptaEpp: false,
    aceptaTratamientoDatos: false,
};


function InduccionQRPageInner() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();

    const obraId = params.obraId as string;
    const token = searchParams.get('token');

    const [obra, setObra] = useState<Obra | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState(initialState);
    const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
    const signatureRef = useRef<{ clear: () => void; }>(null);

    useEffect(() => {
        if (!obraId) {
            setError("ID de obra no encontrado en la URL.");
            setLoading(false);
            return;
        }

        const fetchObraData = async () => {
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
                console.error("Error fetching obra:", err);
                setError("No se pudo cargar la información de la obra.");
            } finally {
                setLoading(false);
            }
        };

        fetchObraData();
    }, [obraId]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };

    const handleRadioChange = (name: string, value: "SI" | "NO") => {
        setFormData(prev => ({...prev, [name]: value}));
    }

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        
        console.log("1️⃣ submit start");

        // VALIDACIÓN
        if (!formData.nombreCompleto || !formData.rut || !formData.empresa) {
            toast({ variant: 'destructive', title: 'Error', description: 'Nombre, RUT y empresa son obligatorios.' });
            return;
        }
        if (!formData.aceptaReglamento || !formData.aceptaEpp || !formData.aceptaTratamientoDatos) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debe aceptar todos los compromisos para continuar.' });
            return;
        }
        if (!signatureDataUrl) {
            toast({ variant: 'destructive', title: 'Error', description: 'La firma es obligatoria.' });
            return;
        }

        setIsSaving(true);
        try {
            const finalData = { ...formData, obraId, firmaDataUrl, generadorId: token };
            
            console.log("2️⃣ after preventDefault");
            console.log("3️⃣ formData", finalData);
            console.log("3️⃣ token", token);
            console.log("3️⃣ obraId", obraId);
            console.log("4️⃣ before signature");
            console.log("4️⃣ signatureRef", signatureRef.current);
            console.log("5️⃣ before save");
            
            // Esta línea es la que falla debido al import circular
            const docId = await guardarInduccionQR(finalData);

            toast({ title: 'Registro Exitoso', description: 'Tu ingreso ha sido registrado. ¡Bienvenido!' });
            
            // Redirigir a una página de éxito
            router.push(`/public/induccion/exito?obraNombre=${obra?.nombreFaena}`);

        } catch (err: any) {
            console.error("Error al guardar la inducción:", err);
            toast({ variant: 'destructive', title: 'Error al Guardar', description: `No se pudo registrar tu ingreso: ${err.message}` });
        } finally {
            setIsSaving(false);
        }
    };


    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /> Cargando...</div>;
    }
    
    if (error) {
        return <div className="p-8 text-center text-destructive">{error}</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-3xl">
                 <CardHeader className="text-center">
                    <PcgLogo />
                    <CardTitle className="text-xl md:text-2xl">Inducción de Acceso a Faena</CardTitle>
                    <CardDescription className="text-base md:text-lg font-semibold text-primary">{obra?.nombreFaena}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSubmit} className="space-y-8">
                        <section>
                            <h3 className="font-semibold text-lg mb-4 border-b pb-2">1. Tus Datos Personales</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Nombre Completo*</Label><Input name="nombreCompleto" value={formData.nombreCompleto} onChange={handleInputChange} /></div>
                                <div className="space-y-2"><Label>RUT*</Label><Input name="rut" value={formData.rut} onChange={handleInputChange} /></div>
                                <div className="space-y-2"><Label>Empresa*</Label><Input name="empresa" value={formData.empresa} onChange={handleInputChange} /></div>
                                <div className="space-y-2"><Label>Cargo</Label><Input name="cargo" value={formData.cargo} onChange={handleInputChange} /></div>
                                <div className="space-y-2"><Label>Teléfono</Label><Input name="telefono" value={formData.telefono} onChange={handleInputChange} /></div>
                                <div className="space-y-2"><Label>Correo</Label><Input type="email" name="correo" value={formData.correo} onChange={handleInputChange} /></div>
                            </div>
                        </section>

                        <section>
                            <h3 className="font-semibold text-lg mb-4 border-b pb-2">2. Declaración de Salud</h3>
                            <div className="space-y-4 text-sm">
                                <div>
                                    <p>1. ¿Presenta algún síntoma de enfermedad (fiebre, tos, etc.)?</p>
                                    <RadioGroup name="respuestaPregunta1" value={formData.respuestaPregunta1} onValueChange={(v) => handleRadioChange("respuestaPregunta1", v as any)} className="flex gap-4 mt-2">
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="SI" id="q1-si" /><Label htmlFor="q1-si">Sí</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="NO" id="q1-no" /><Label htmlFor="q1-no">No</Label></div>
                                    </RadioGroup>
                                </div>
                                 <div>
                                    <p>2. ¿Está en tratamiento médico o utiliza algún medicamento que pueda afectar su desempeño o seguridad?</p>
                                    <RadioGroup name="respuestaPregunta2" value={formData.respuestaPregunta2} onValueChange={(v) => handleRadioChange("respuestaPregunta2", v as any)} className="flex gap-4 mt-2">
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="SI" id="q2-si" /><Label htmlFor="q2-si">Sí</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="NO" id="q2-no" /><Label htmlFor="q2-no">No</Label></div>
                                    </RadioGroup>
                                </div>
                                 <div>
                                    <p>3. ¿Ha consumido alcohol o drogas en las últimas 24 horas?</p>
                                    <RadioGroup name="respuestaPregunta3" value={formData.respuestaPregunta3} onValueChange={(v) => handleRadioChange("respuestaPregunta3", v as any)} className="flex gap-4 mt-2">
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="SI" id="q3-si" /><Label htmlFor="q3-si">Sí</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="NO" id="q3-no" /><Label htmlFor="q3-no">No</Label></div>
                                    </RadioGroup>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h3 className="font-semibold text-lg mb-4 border-b pb-2">3. Compromisos de Seguridad</h3>
                            <div className="space-y-4 text-sm">
                                <div className="flex items-start gap-3"><Checkbox id="c1" checked={formData.aceptaReglamento} onCheckedChange={(c) => setFormData(p => ({...p, aceptaReglamento: !!c}))} /><Label htmlFor="c1" className="font-normal">Declaro haber recibido, leído y comprendido el Reglamento Especial para Empresas Contratistas y Subcontratistas.</Label></div>
                                <div className="flex items-start gap-3"><Checkbox id="c2" checked={formData.aceptaEpp} onCheckedChange={(c) => setFormData(p => ({...p, aceptaEpp: !!c}))} /><Label htmlFor="c2" className="font-normal">Me comprometo a utilizar en todo momento los Elementos de Protección Personal (EPP) básicos y específicos requeridos para mis labores.</Label></div>
                                <div className="flex items-start gap-3"><Checkbox id="c3" checked={formData.aceptaTratamientoDatos} onCheckedChange={(c) => setFormData(p => ({...p, aceptaTratamientoDatos: !!c}))} /><Label htmlFor="c3" className="font-normal">Autorizo el tratamiento de mis datos personales para fines de control de acceso y gestión de seguridad en esta obra.</Label></div>
                            </div>
                        </section>

                        <section>
                            <h3 className="font-semibold text-lg mb-4 border-b pb-2">4. Firma</h3>
                            <p className="text-sm text-muted-foreground mb-2">Al firmar, declaro que toda la información proporcionada es verídica.</p>
                             <div className="border rounded-md bg-white">
                                <SignaturePad ref={signatureRef} onChange={setSignatureDataUrl} />
                            </div>
                             <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => signatureRef.current?.clear()}>Limpiar Firma</Button>
                        </section>

                        <Button type="submit" className="w-full" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            {isSaving ? "Registrando Ingreso..." : "Finalizar y Registrar Ingreso"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

export default function InduccionQRPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /> Cargando...</div>}>
      <InduccionQRPageInner />
    </Suspense>
  );
}
