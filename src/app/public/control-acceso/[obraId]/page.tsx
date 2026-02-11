// src/app/public/control-acceso/[obraId]/page.tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, QrCode, FileUp, Shield, X, CheckCircle } from "lucide-react";
import { Obra } from "@/types/pcg";
import { doc, getDoc } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import { Scanner } from 'react-zxing';
import { PcgLogo } from "@/components/branding/PcgLogo";


export default function PublicAccessControlPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();

    const obraId = params.obraId as string;
    const [obra, setObra] = useState<Obra | null>(null);
    const [loadingObra, setLoadingObra] = useState(true);

    const [nombreCompleto, setNombreCompleto] = useState('');
    const [rut, setRut] = useState('');
    const [empresa, setEmpresa] = useState('');
    const [motivo, setMotivo] = useState('');
    const [tipoPersona, setTipoPersona] = useState<'trabajador' | 'subcontratista' | 'visita'>('visita');
    const [duracionIngreso, setDuracionIngreso] = useState<'visita breve' | 'jornada parcial' | 'jornada completa'>('visita breve');
    const [archivo, setArchivo] = useState<File | null>(null);

    const [isScanning, setIsScanning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Estados para el flujo de post-registro (inducción)
    const [submissionSuccess, setSubmissionSuccess] = useState(false);
    const [inductionText, setInductionText] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [evidenciaId, setEvidenciaId] = useState<string | null>(null);
    const [confirmingInduction, setConfirmingInduction] = useState(false);

    useEffect(() => {
        if (obraId) {
            const fetchObra = async () => {
                setLoadingObra(true);
                const obraRef = doc(firebaseDb, "obras", obraId);
                const snap = await getDoc(obraRef);
                if (snap.exists()) {
                    setObra({ id: snap.id, ...snap.data() } as Obra);
                } else {
                    toast({ variant: 'destructive', title: 'Error', description: 'La obra no fue encontrada.' });
                }
                setLoadingObra(false);
            };
            fetchObra();
        }
    }, [obraId, toast]);

    const handleScan = (result: any) => {
        if (result) {
            const text = result.getText();
            setIsScanning(false);
            try {
                // Formato: RUN=11111111-1&type=string&serial=222222222
                const params = new URLSearchParams(text);
                const run = params.get('RUN');
                
                if (!run) throw new Error("El código QR no contiene un RUN válido.");
                
                // Intenta buscar el nombre con otra lógica si es necesario
                // Por ahora, asumimos que no viene en el QR y debe ser ingresado.
                const rutParts = run.split('-');
                const rutNumber = parseInt(rutParts[0], 10).toLocaleString('es-CL');
                const dv = rutParts[1];
                setRut(`${rutNumber}-${dv}`);

                toast({
                    title: "RUT escaneado",
                    description: "El RUT ha sido autocompletado. Por favor, complete el resto de los campos.",
                });

            } catch (e) {
                toast({
                    variant: "destructive",
                    title: "QR no reconocido",
                    description: "El formato del código QR no corresponde al de una cédula de identidad chilena.",
                });
            }
        }
    };
    
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!nombreCompleto || !rut || !empresa || !motivo || !archivo) {
            toast({ variant: "destructive", title: "Error", description: "Todos los campos y el archivo adjunto son obligatorios." });
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData();
        formData.append('obraId', obraId);
        formData.append('nombreCompleto', nombreCompleto);
        formData.append('rut', rut);
        formData.append('empresa', empresa);
        formData.append('motivo', motivo);
        formData.append('tipoPersona', tipoPersona);
        formData.append('duracionIngreso', duracionIngreso);
        formData.append('archivo', archivo);

        try {
            const response = await fetch('/api/control-acceso/submit', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Error en el servidor al enviar el formulario.");
            }

            setSubmissionSuccess(true);
            setInductionText(result.inductionText);
            setAudioUrl(result.audioUrl);
            setEvidenciaId(result.evidenciaId);
            
            toast({ title: "Registro Enviado", description: "Ahora, por favor, complete la inducción de seguridad." });

        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error al registrar", description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmInduction = async () => {
        if (!evidenciaId) return;
        setConfirmingInduction(true);
        try {
            await fetch('/api/control-acceso/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ evidenciaId }),
            });
            // Final step, maybe show a final success message or redirect
            router.push('/public/control-acceso/finalizado');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo confirmar la inducción.' });
        } finally {
            setConfirmingInduction(false);
        }
    }
    
    if (loadingObra) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin"/></div>
    }

    if (!obra) {
        return <div className="min-h-screen flex items-center justify-center"><p>Obra no encontrada.</p></div>
    }
    
    // Vista de éxito / Inducción
    if (submissionSuccess) {
        return (
            <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
                <Card className="w-full max-w-2xl">
                    <CardHeader className="text-center">
                        <Shield className="mx-auto h-12 w-12 text-primary" />
                        <CardTitle>Inducción de Seguridad Obligatoria</CardTitle>
                        <CardDescription>
                            Lea atentamente la siguiente información antes de ingresar a la obra: {obra.nombreFaena}.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {inductionText ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-slate-100 rounded-md border text-sm text-slate-800 whitespace-pre-wrap">
                                    {inductionText}
                                </div>
                                {audioUrl && (
                                    <div className="mt-4">
                                        <Label>Audio de la Inducción</Label>
                                        <audio controls src={audioUrl} className="w-full mt-1">
                                            Tu navegador no soporta el elemento de audio.
                                        </audio>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-4 bg-slate-100 rounded-md border">
                                <p className="font-semibold">Información General de Seguridad:</p>
                                <ul className="list-disc pl-5 mt-2 text-sm text-slate-700">
                                    <li>Transite siempre por las vías peatonales delimitadas.</li>
                                    <li>Esté atento a la circulación de vehículos y maquinaria pesada.</li>
                                    <li>No ingrese a zonas no autorizadas o señalizadas como peligrosas.</li>
                                    <li>Reporte cualquier condición insegura que observe al supervisor del área.</li>
                                </ul>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" onClick={handleConfirmInduction} disabled={confirmingInduction}>
                             {confirmingInduction ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4"/>}
                            Declaro haber leído y entendido la inducción
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // Vista del formulario inicial
    return (
        <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                     <div className="mx-auto mb-4">
                        <PcgLogo />
                    </div>
                    <CardTitle>Control de Acceso a Obra</CardTitle>
                    <CardDescription>Bienvenido a {obra.nombreFaena}. Por favor, complete el formulario para registrar su ingreso.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="nombre">Nombre Completo*</Label>
                                <Input id="nombre" value={nombreCompleto} onChange={(e) => setNombreCompleto(e.target.value)} required />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="rut">RUT*</Label>
                                <Input id="rut" value={rut} onChange={(e) => setRut(e.target.value)} required />
                            </div>
                        </div>

                         <div className="space-y-2">
                            <Label htmlFor="empresa">Empresa que representa*</Label>
                            <Input id="empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)} required />
                        </div>

                         <div className="space-y-2">
                            <Label htmlFor="motivo">Tarea a realizar hoy / Motivo del ingreso*</Label>
                            <Textarea id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} required />
                        </div>
                        
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label>Tipo de Persona*</Label>
                                <Select value={tipoPersona} onValueChange={(v) => setTipoPersona(v as any)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="visita">Visita</SelectItem><SelectItem value="subcontratista">Subcontratista</SelectItem><SelectItem value="trabajador">Trabajador</SelectItem></SelectContent></Select>
                            </div>
                             <div className="space-y-2">
                                <Label>Duración del Ingreso*</Label>
                                <Select value={duracionIngreso} onValueChange={(v) => setDuracionIngreso(v as any)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="visita breve">Visita Breve (hasta 2 hrs)</SelectItem><SelectItem value="jornada parcial">Jornada Parcial (hasta 4 hrs)</SelectItem><SelectItem value="jornada completa">Jornada Completa</SelectItem></SelectContent></Select>
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t">
                            <Button type="button" variant="outline" className="w-full" onClick={() => setIsScanning(true)}>
                                <QrCode className="mr-2 h-4 w-4"/>
                                Escanear Cédula de Identidad
                            </Button>
                            <div className="relative text-center">
                                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">O</span></div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="archivo">Adjuntar Cédula de Identidad (alternativa)*</Label>
                                <Input id="archivo" type="file" accept="image/*,application/pdf" onChange={(e) => setArchivo(e.target.files?.[0] || null)} />
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Registrar Ingreso y Continuar
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {isScanning && (
                <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4">
                    <div className="bg-white p-4 rounded-lg w-full max-w-md relative">
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 z-10" onClick={() => setIsScanning(false)}>
                        <X className="h-4 w-4" />
                    </Button>
                    <h3 className="text-lg font-semibold text-center mb-4">Apunte la cámara al QR de la cédula</h3>
                    <div className="w-full aspect-square bg-gray-200 rounded-lg overflow-hidden">
                        <Scanner
                            onResult={handleScan}
                            onError={(error) => {
                                console.error(error);
                                toast({
                                    variant: "destructive",
                                    title: "Error de Cámara",
                                    description: "No se pudo iniciar la cámara. Verifique los permisos e inténtelo de nuevo.",
                                });
                                setIsScanning(false);
                            }}
                            videoStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </div>
                    <p className="text-xs text-center text-muted-foreground mt-2">
                        Asegure una buena iluminación y enfoque.
                    </p>
                    </div>
                </div>
            )}
        </div>
    );
}