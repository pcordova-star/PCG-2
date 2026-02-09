"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import { Obra } from "@/types/pcg";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { PcgLogo } from "@/components/branding/PcgLogo";

export default function PublicInduccionPage() {
    const { obraId } = useParams();
    const router = useRouter();
    const { toast } = useToast();

    const [obra, setObra] = useState<Obra | null>(null);
    const [loadingObra, setLoadingObra] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (typeof obraId === 'string') {
            const fetchObra = async () => {
                setLoadingObra(true);
                const obraRef = doc(firebaseDb, "obras", obraId);
                const obraSnap = await getDoc(obraRef);
                if (obraSnap.exists()) {
                    setObra({ id: obraSnap.id, ...obraSnap.data() } as Obra);
                } else {
                    setError("La obra especificada no existe.");
                }
                setLoadingObra(false);
            };
            fetchObra();
        }
    }, [obraId]);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);
        
        const formData = new FormData(e.currentTarget);
        
        if (!obraId) {
            setError("ID de obra no encontrado.");
            setIsSubmitting(false);
            return;
        }
        formData.append("obraId", obraId as string);

        try {
            const response = await fetch('/api/control-acceso/submit', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Error al enviar el formulario.");
            }

            toast({
                title: "Registro Exitoso",
                description: "Tu ingreso ha sido registrado correctamente.",
            });
            router.push('/public/control-acceso/success');

        } catch (err: any) {
            setError(err.message);
            toast({
                variant: "destructive",
                title: "Error en el envío",
                description: err.message,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loadingObra) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    if (error) {
        return (
             <div className="flex min-h-screen items-center justify-center p-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="text-destructive">Error</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>{error}</p>
                        <Button asChild variant="link" className="mt-4">
                            <Link href="/"><ArrowLeft className="mr-2"/> Volver al inicio</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-muted/40 py-8 px-4">
            <Card className="mx-auto w-full max-w-2xl">
                <CardHeader className="text-center">
                    <div className="mx-auto w-fit mb-4">
                        <PcgLogo size={80} />
                    </div>
                    <CardTitle>Registro de Ingreso a Obra</CardTitle>
                    <CardDescription>
                        Completando este formulario para: <strong className="text-primary">{obra?.nombreFaena}</strong>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="nombreCompleto">Nombre Completo*</Label>
                                <Input id="nombreCompleto" name="nombreCompleto" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="rut">RUT*</Label>
                                <Input id="rut" name="rut" required />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="empresa">Empresa*</Label>
                            <Input id="empresa" name="empresa" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="motivo">Motivo de la Visita*</Label>
                            <Textarea id="motivo" name="motivo" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="archivo">Adjuntar Archivo (CI, firma, etc.)*</Label>
                            <Input id="archivo" name="archivo" type="file" required accept="image/*,application/pdf" />
                             <p className="text-xs text-muted-foreground">Sube una foto de tu carnet, una firma o el respaldo de tu visita. Máximo 10MB.</p>
                        </div>
                        {error && <p className="text-sm text-destructive">{error}</p>}
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSubmitting ? "Enviando Registro..." : "Registrar Ingreso"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
