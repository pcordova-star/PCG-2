// src/app/public/control-acceso/[obraId]/page.tsx
"use client";

import { useState, useEffect, FormEvent, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import { Obra } from "@/types/pcg";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowRight, QrCode, Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PcgLogo } from "@/components/branding/PcgLogo";
import { Scanner } from '@react-zxing/scanner';
import Link from "next/link";

// Helper para formatear el RUT chileno
function formatRut(rut: string) {
    let actual = rut.replace(/^0+/, "").trim();
    if (actual === '' || actual.length < 2) return actual;

    let rutP = actual.slice(0, -1);
    let dv = actual.slice(-1).toUpperCase();

    // Eliminar puntos y guiones existentes
    rutP = rutP.replace(/\./g, "").replace(/-/g, "");

    let rutFormateado = "";
    while (rutP.length > 3) {
        rutFormateado = "." + rutP.slice(-3) + rutFormateado;
        rutP = rutP.slice(0, -3);
    }
    rutFormateado = rutP + rutFormateado;

    return rutFormateado + "-" + dv;
}

function PublicAccessForm() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const obraId = params.obraId as string;

    const [obra, setObra] = useState<Obra | null>(null);
    const [loadingObra, setLoadingObra] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form state
    const [nombre, setNombre] = useState('');
    const [rut, setRut] = useState('');
    const [empresa, setEmpresa] = useState('');
    const [motivo, setMotivo] = useState('');
    const [tipoIngreso, setTipoIngreso] = useState<'visita' | 'subcontratista' | 'trabajador'>('visita');
    const [duracionIngreso, setDuracionIngreso] = useState<'visita breve' | 'jornada parcial' | 'jornada completa'>('visita breve');
    const [archivo, setArchivo] = useState<File | null>(null);
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    // QR Scanner State
    const [showScanner, setShowScanner] = useState(false);

    // Induction Modal State
    const [isInductionModalOpen, setIsInductionModalOpen] = useState(false);
    const [inductionData, setInductionData] = useState<{ text: string, audioUrl: string, evidenciaId: string } | null>(null);

    useEffect(() => {
        if (obraId) {
            const fetchObra = async () => {
                setLoadingObra(true);
                const obraRef = doc(firebaseDb, "obras", obraId);
                const obraSnap = await getDoc(obraRef);
                if (obraSnap.exists()) {
                    setObra(obraSnap.data() as Obra);
                } else {
                    toast({ variant: 'destructive', title: 'Error', description: 'La obra no fue encontrada.' });
                }
                setLoadingObra(false);
            };
            fetchObra();
        }
    }, [obraId, toast]);

    const handleScan = (result: any) => {
        if (result?.getText()) {
            const scannedText = result.getText();
            setShowScanner(false);
            
            try {
                // RUN=12345678-9|APELLIDO1 APELLIDO2|NOMBRE1 NOMBRE2|...
                const runMatch = scannedText.match(/RUN=(\d{7,8}-[\dkK])/);
                if (runMatch && runMatch[1]) {
                     const parts = scannedText.split('|');
                     const rutVal = parts[0].split('=')[1];
                     const apellidos = parts[1];
                     const nombres = parts[2];
                     
                     setRut(formatRut(rutVal));
                     setNombre(`${nombres} ${apellidos}`);
                     
                     toast({ title: "Datos escaneados", description: "Nombre y RUT autocompletados." });

                } else {
                    // Formato antiguo: 12345678-9|APELLIDO PATERNO|APELLIDO MATERNO|NOMBRES
                    const parts = scannedText.split('|');
                    if (parts.length >= 4) {
                        const rutVal = parts[0];
                        const apellidoPaterno = parts[1];
                        const apellidoMaterno = parts[2];
                        const nombres = parts[3];

                        setRut(formatRut(rutVal));
                        setNombre(`${nombres} ${apellidoPaterno} ${apellidoMaterno}`);
                        toast({ title: "Datos escaneados", description: "Nombre y RUT autocompletados." });
                    } else {
                        throw new Error("Formato de QR no reconocido.");
                    }
                }
            } catch (e) {
                 toast({ variant: 'destructive', title: "Error de escaneo", description: "El código QR escaneado no parece ser una cédula de identidad chilena válida." });
            }
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!acceptedTerms) {
            toast({ variant: 'destructive', title: 'Aceptación requerida', description: 'Debes aceptar los términos y condiciones.' });
            return;
        }
        if (!archivo) {
            toast({ variant: 'destructive', title: 'Archivo requerido', description: 'Por favor, adjunta una foto de tu cédula de identidad.' });
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData();
        formData.append('obraId', obraId);
        formData.append('nombreCompleto', nombre);
        formData.append('rut', rut);
        formData.append('empresa', empresa);
        formData.append('motivo', motivo);
        formData.append('tipoPersona', tipoIngreso);
        formData.append('duracionIngreso', duracionIngreso);
        formData.append('archivo', archivo);
        
        try {
            const response = await fetch('/api/control-acceso/submit', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Ocurrió un error en el servidor.');
            }
            
            // Mostrar modal de inducción
            setInductionData({ text: result.inductionText, audioUrl: result.audioUrl, evidenciaId: result.evidenciaId });
            setIsInductionModalOpen(true);

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error al registrar', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleInductionConfirmation = async () => {
        if (!inductionData) return;
        try {
             await fetch('/api/control-acceso/confirm', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ evidenciaId: inductionData.evidenciaId })
            });
            setIsInductionModalOpen(false);
            router.push(`/public/exito`);
        } catch(e) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo confirmar la inducción." });
        }
    }


    if (loadingObra) {
        return <div className="text-center p-8"><Loader2 className="animate-spin" /> Cargando...</div>;
    }

    if (!obra) {
        return <div className="text-center p-8 text-destructive">Error: Obra no encontrada.</div>;
    }
    
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl">
                 <CardHeader className="text-center">
                    <div className="mx-auto w-fit mb-4"><PcgLogo /></div>
                    <CardTitle>Registro de Acceso a Obra</CardTitle>
                    <CardDescription>Completa tus datos para ingresar a: <strong className="text-primary">{obra.nombreFaena}</strong></CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2"><Label htmlFor="nombre">Nombre Completo*</Label><Input id="nombre" value={nombre} onChange={e => setNombre(e.target.value)} required /></div>
                            <div className="space-y-2"><Label htmlFor="rut">RUT*</Label><Input id="rut" value={rut} onChange={e => setRut(e.target.value)} required /></div>
                        </div>

                         <div className="pt-4 text-center">
                            <Button type="button" onClick={() => setShowScanner(true)}>
                                <QrCode className="mr-2 h-4 w-4"/> Escanear Cédula para autocompletar
                            </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-2"><Label htmlFor="empresa">Empresa que representa*</Label><Input id="empresa" value={empresa} onChange={e => setEmpresa(e.target.value)} required /></div>
                           <div className="space-y-2"><Label htmlFor="tipo-ingreso">Tipo de Ingreso*</Label><Select value={tipoIngreso} onValueChange={(v) => setTipoIngreso(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="visita">Visita</SelectItem><SelectItem value="subcontratista">Subcontratista</SelectItem><SelectItem value="trabajador">Trabajador</SelectItem></SelectContent></Select></div>
                        </div>

                        <div className="space-y-2"><Label htmlFor="motivo">Motivo o Tarea a Realizar*</Label><Textarea id="motivo" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej: Visita técnica a terreno, Reunión con Jefe de Obra, Instalación de faenas eléctricas, etc." required /></div>
                        
                        <div className="space-y-2"><Label htmlFor="duracion">Duración Estimada del Ingreso*</Label><Select value={duracionIngreso} onValueChange={(v) => setDuracionIngreso(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="visita breve">Visita Breve (menos de 2 horas)</SelectItem><SelectItem value="jornada parcial">Jornada Parcial (2-4 horas)</SelectItem><SelectItem value="jornada completa">Jornada Completa</SelectItem></SelectContent></Select></div>

                        <div className="space-y-2"><Label htmlFor="archivo">Adjuntar Cédula de Identidad (foto o PDF)*</Label><Input id="archivo" type="file" onChange={(e) => setArchivo(e.target.files?.[0] || null)} /></div>
                        
                        <div className="flex items-center space-x-2 pt-2">
                            <Checkbox id="terms" checked={acceptedTerms} onCheckedChange={v => setAcceptedTerms(!!v)}/>
                            <Label htmlFor="terms" className="text-xs text-muted-foreground font-normal">Declaro que la información es verídica y acepto que mis datos sean tratados según los <Link href="/terminos" className="underline" target="_blank">Términos y Condiciones</Link>.</Label>
                        </div>
                        
                        <Button type="submit" className="w-full" disabled={isSubmitting || !acceptedTerms}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ArrowRight className="mr-2 h-4 w-4"/>}
                            Siguiente: Inducción de Seguridad
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Dialog open={showScanner} onOpenChange={setShowScanner}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Escanear Código QR de la Cédula</DialogTitle>
                    </DialogHeader>
                     <div className="rounded-md overflow-hidden aspect-video">
                        <Scanner
                            onResult={handleScan}
                            onError={(error) => console.error(error?.message)}
                        />
                    </div>
                </DialogContent>
            </Dialog>

             <Dialog open={isInductionModalOpen} onOpenChange={setIsInductionModalOpen}>
                <DialogContent className="max-w-2xl">
                     <DialogHeader>
                        <DialogTitle>Inducción de Seguridad Contextual</DialogTitle>
                        <DialogDescription>
                            Por favor, lee y/o escucha atentamente la siguiente información de seguridad antes de ingresar.
                        </DialogDescription>
                    </DialogHeader>
                    {inductionData && (
                        <div className="py-4 space-y-4 text-sm">
                             <div className="max-h-60 overflow-y-auto p-4 bg-muted rounded-md border text-muted-foreground whitespace-pre-wrap">
                                {inductionData.text}
                            </div>
                            <div>
                                <Label>Audio de la Inducción</Label>
                                <audio controls src={inductionData.audioUrl} className="w-full mt-1">Tu navegador no soporta el audio.</audio>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button className="w-full" onClick={handleInductionConfirmation}>
                            Declaro haber leído y/o escuchado la inducción y acepto los protocolos.
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="text-center p-8"><Loader2 className="animate-spin" /></div>}>
            <PublicAccessForm/>
        </Suspense>
    )
}
