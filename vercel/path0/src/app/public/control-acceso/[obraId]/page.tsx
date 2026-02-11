
"use client";

import { useEffect, useState, useRef, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, QrCode, Upload, X, Camera, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Obra } from '@/types/pcg';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import jsQR from 'jsqr';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AccessoObraPage() {
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
    const [tipoPersona, setTipoPersona] = useState('visita');
    const [duracionIngreso, setDuracionIngreso] = useState('visita breve');
    const [archivo, setArchivo] = useState<File | null>(null);

    const [isScanning, setIsScanning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [inductionData, setInductionData] = useState<{ text: string, audioUrl: string, evidenceId: string } | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!obraId) return;
        const fetchObra = async () => {
            setLoadingObra(true);
            const obraRef = doc(firebaseDb, "obras", obraId);
            const snap = await getDoc(obraRef);
            if (snap.exists()) {
                setObra({ id: snap.id, ...snap.data() } as Obra);
            } else {
                setError("La obra no existe o el enlace es incorrecto.");
            }
            setLoadingObra(false);
        };
        fetchObra();
    }, [obraId]);

    const handleScan = () => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                .then(stream => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        videoRef.current.play();
                        setIsScanning(true);
                        requestAnimationFrame(tick);
                    }
                })
                .catch(err => {
                    console.error("Error al acceder a la cámara:", err);
                    toast({ variant: 'destructive', title: 'Error de cámara', description: 'No se pudo acceder a la cámara.' });
                });
        }
    };

    const stopScan = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsScanning(false);
    };

    const processQrData = (data: string) => {
        try {
            const parts = data.split('|');
            if (parts.length < 4) { // Cédulas chilenas tienen al menos RUT, Apellidos y Nombres
                throw new Error("Formato de QR no reconocido.");
            }
            const parsedRut = parts[0];
            const apellidoPaterno = parts[1];
            const apellidoMaterno = parts[2];
            const nombres = parts[3];

            const nombreCompleto = `${nombres} ${apellidoPaterno} ${apellidoMaterno}`.trim();
            setNombreCompleto(nombreCompleto);

            // Formatear RUT si es necesario
            const rutBody = parsedRut.slice(0, -2);
            const dv = parsedRut.slice(-1);
            const rutFormateado = `${parseInt(rutBody, 10).toLocaleString('es-CL')}-${dv}`;
            setRut(rutFormateado);

            toast({ title: "Datos escaneados", description: "Se han autocompletado el nombre y RUT." });
            stopScan();
        } catch (e) {
            toast({ variant: "destructive", title: "Error al leer QR", description: "El código QR no parece ser de una cédula chilena válida." });
        }
    };

    const tick = () => {
        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
                canvas.height = video.videoHeight;
                canvas.width = video.videoWidth;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: 'dontInvert',
                });

                if (code) {
                    processQrData(code.data);
                } else if (isScanning) { // Check isScanning flag to prevent loop after stop
                    requestAnimationFrame(tick);
                }
            }
        } else if (isScanning) {
            requestAnimationFrame(tick);
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!archivo && !nombreCompleto) {
            setError("Debes escanear tu cédula o subir un archivo con tus datos.");
            return;
        }
        if (!obraId) {
            setError("ID de obra no encontrado.");
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
        if (archivo) {
            formData.append('archivo', archivo);
        }

        try {
            const res = await fetch('/api/control-acceso/submit', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Error en el servidor.");
            }

            if (data.inductionText) {
                setInductionData({ text: data.inductionText, audioUrl: data.audioUrl, evidenceId: data.evidenciaId });
            } else {
                toast({ title: "Registro Exitoso", description: "Tu ingreso ha sido registrado. No se generó inducción de IA esta vez." });
                router.push('/dashboard'); // Or a success page
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmInduction = async () => {
        if (!inductionData) return;
        setIsConfirming(true);
        try {
            await fetch('/api/control-acceso/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ evidenciaId: inductionData.evidenceId }),
            });
            toast({ title: "Confirmación Exitosa", description: "Tu ingreso y la lectura de la inducción han sido registrados." });
            setInductionData(null); // Reset
            router.push('/dashboard'); // Or success page
        } catch (error) {
            console.error("Error al confirmar inducción:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo confirmar la inducción.' });
        } finally {
            setIsConfirming(false);
        }
    };
    
    if (loadingObra) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
    }

    if (error && !obra) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Alert variant="destructive" className="max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }
    
    if (inductionData) {
        return (
            <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
                <Card className="w-full max-w-2xl">
                    <CardHeader>
                        <CardTitle>Inducción de Seguridad Contextual</CardTitle>
                        <CardDescription>Por favor, lee y escucha atentamente la siguiente información de seguridad antes de ingresar.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="max-h-60 overflow-y-auto p-4 bg-slate-100 rounded-md border text-sm whitespace-pre-wrap">
                            {inductionData.text}
                        </div>
                        {inductionData.audioUrl && (
                            <div>
                                <Label>Escuchar Inducción</Label>
                                <audio controls src={inductionData.audioUrl} className="w-full mt-1">Tu navegador no soporta el audio.</audio>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground">Al hacer clic en "Confirmar Lectura y Acepto", declaras haber leído y comprendido la información de seguridad presentada.</p>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" onClick={handleConfirmInduction} disabled={isConfirming}>
                            {isConfirming && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Confirmar Lectura y Acepto
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <CardTitle>Registro de Acceso a Obra</CardTitle>
                    <CardDescription>{obra?.nombreFaena}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="p-4 border-2 border-dashed rounded-lg text-center">
                            <Button type="button" onClick={handleScan} disabled={isScanning}>
                                <Camera className="mr-2 h-4 w-4"/> Escanear Cédula (QR)
                            </Button>
                            <p className="text-xs text-muted-foreground mt-2">Apunta la cámara al código QR de tu cédula para autocompletar tu nombre y RUT.</p>
                        </div>

                        {isScanning && (
                            <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4">
                                <video ref={videoRef} className="w-full max-w-md h-auto rounded-lg" />
                                <canvas ref={canvasRef} className="hidden" />
                                <Button type="button" variant="destructive" onClick={stopScan} className="mt-4">
                                    <X className="mr-2 h-4 w-4"/> Cancelar Escaneo
                                </Button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="nombreCompleto">Nombre Completo*</Label>
                                <Input id="nombreCompleto" value={nombreCompleto} onChange={(e) => setNombreCompleto(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="rut">RUT*</Label>
                                <Input id="rut" value={rut} onChange={(e) => setRut(e.target.value)} required />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="empresa">Empresa a la que pertenece*</Label>
                            <Input id="empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="motivo">Tarea o motivo del ingreso*</Label>
                            <Textarea id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} required />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="tipoPersona">Tipo de Persona</Label>
                                <Select value={tipoPersona} onValueChange={setTipoPersona}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="visita">Visita</SelectItem>
                                        <SelectItem value="subcontratista">Subcontratista</SelectItem>
                                        <SelectItem value="trabajador">Trabajador</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="duracionIngreso">Duración Estimada</Label>
                                <Select value={duracionIngreso} onValueChange={setDuracionIngreso}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="visita breve">Visita Breve (hasta 2 horas)</SelectItem>
                                        <SelectItem value="jornada parcial">Jornada Parcial (hasta 4 horas)</SelectItem>
                                        <SelectItem value="jornada completa">Jornada Completa</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="text-center text-xs text-muted-foreground my-4">-- O --</div>

                        <div className="space-y-2">
                             <Label htmlFor="archivo" className="font-semibold">Si no puedes escanear, adjunta tu cédula*</Label>
                             <Input id="archivo" type="file" onChange={(e) => setArchivo(e.target.files ? e.target.files[0] : null)} />
                        </div>

                        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                        
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : null}
                            {isSubmitting ? 'Enviando...' : 'Enviar y Continuar a Inducción'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
