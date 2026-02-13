"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { addDoc, collection, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, Send, Paperclip } from "lucide-react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadFileToStorage } from "@/lib/storage/uploadFile";

type TicketCategory = "duda_funcional" | "reporte_error" | "sugerencia" | "problema_cuenta" | "otro";

export default function SoportePage() {
    const { user, company } = useAuth();
    const { toast } = useToast();
    
    const [category, setCategory] = useState<TicketCategory>("duda_funcional");
    const [subject, setSubject] = useState("");
    const [description, setDescription] = useState("");
    const [attachment, setAttachment] = useState<File | null>(null);
    const [isSending, setIsSending] = useState(false);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setAttachment(e.target.files[0]);
        } else {
            setAttachment(null);
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!user) {
            toast({ variant: "destructive", title: "Error", description: "Debes iniciar sesión para enviar un ticket." });
            return;
        }
        if (!subject || !description) {
            toast({ variant: "destructive", title: "Error", description: "El asunto y la descripción son obligatorios." });
            return;
        }
        
        setIsSending(true);
        try {
            const SUPERADMIN_EMAIL = "pauloandrescordova@gmail.com";
            const CONTROL_EMAIL = "control@pcgoperacion.com";

            // 1. Crear el documento de ticket inicial para obtener un ID
            const ticketCollection = collection(firebaseDb, "supportTickets");
            const ticketRef = doc(ticketCollection); // Crea una referencia con un ID nuevo

            let adjuntoUrl: string | null = null;
            let storagePath: string | null = null;

            // 2. Si hay adjunto, subirlo
            if (attachment) {
                const path = `support-tickets/${ticketRef.id}/${attachment.name}`;
                storagePath = path;
                adjuntoUrl = await uploadFileToStorage(attachment, path);
            }

            // 3. Guardar el ticket en Firestore con toda la información
            const ticketData = {
                userId: user.uid,
                userEmail: user.email,
                userName: user.displayName,
                companyId: company?.id || null,
                companyName: company?.nombreFantasia || 'No aplicable',
                category,
                subject,
                description,
                status: 'abierto' as const,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                adjuntoUrl,
                storagePath,
                history: [
                    {
                        author: 'user',
                        message: description,
                        timestamp: serverTimestamp(),
                        userId: user.uid,
                        userName: user.displayName || user.email,
                    }
                ]
            };
            await setDoc(ticketRef, ticketData);


            // 4. Enviar email de notificación
            const emailHtml = `
                <h1>Nuevo Ticket de Soporte Recibido</h1>
                <p><strong>Usuario:</strong> ${user.displayName} (${user.email})</p>
                <p><strong>Empresa:</strong> ${company?.nombreFantasia || 'N/A'}</p>
                <p><strong>Categoría:</strong> ${category}</p>
                <p><strong>Asunto:</strong> ${subject}</p>
                <hr/>
                <h3>Descripción del Problema:</h3>
                <p>${description.replace(/\n/g, '<br>')}</p>
                ${adjuntoUrl ? `<p><strong>Adjunto:</strong> <a href="${adjuntoUrl}">Ver archivo</a></p>` : ''}
                <hr/>
                <p>ID del Ticket: ${ticketRef.id}</p>
            `;

            await addDoc(collection(firebaseDb, "mail"), {
                to: [SUPERADMIN_EMAIL, CONTROL_EMAIL],
                message: {
                    subject: `Nuevo Ticket de Soporte PCG: [${category.replace('_',' ')}] ${subject}`,
                    html: emailHtml,
                },
            });

            toast({ title: "Ticket Enviado", description: "Hemos recibido tu solicitud. Nuestro equipo se pondrá en contacto contigo a la brevedad." });
            setSubject("");
            setDescription("");
            setCategory("duda_funcional");
            setAttachment(null);

        } catch (error) {
            console.error("Error al enviar ticket de soporte:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo enviar tu solicitud. Por favor, intenta de nuevo más tarde." });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex items-center gap-4">
                <Button asChild variant="outline" size="sm">
                    <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Dashboard</Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Centro de Soporte</h1>
                    <p className="text-muted-foreground">Reporta un problema, haz una pregunta o envíanos una sugerencia.</p>
                </div>
            </header>
            
            <Card>
                <form onSubmit={handleSubmit}>
                    <CardHeader>
                        <CardTitle>Crear Nuevo Ticket de Soporte</CardTitle>
                        <CardDescription>Completa el formulario y nos pondremos en contacto contigo.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="category">Categoría</Label>
                                <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
                                    <SelectTrigger id="category">
                                        <SelectValue placeholder="Selecciona una categoría..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="duda_funcional">Duda Funcional</SelectItem>
                                        <SelectItem value="reporte_error">Reportar un Error</SelectItem>
                                        <SelectItem value="sugerencia">Sugerencia de Mejora</SelectItem>
                                        <SelectItem value="problema_cuenta">Problema con mi Cuenta</SelectItem>
                                        <SelectItem value="otro">Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="subject">Asunto</Label>
                                <Input id="subject" value={subject} onChange={e => setSubject(e.target.value)} required />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Descripción</Label>
                            <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} required rows={8} placeholder="Por favor, describe detalladamente tu solicitud. Incluye pasos para reproducir un error si es posible."/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="attachment">Adjuntar Pantallazo (Opcional)</Label>
                            <Input id="attachment" type="file" onChange={handleFileChange} accept="image/*" />
                            {attachment && <p className="text-xs text-muted-foreground flex items-center gap-2"><Paperclip className="h-3 w-3"/>{attachment.name}</p>}
                        </div>
                    </CardContent>
                    <CardFooter className="justify-end">
                        <Button type="submit" disabled={isSending}>
                            {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                            {isSending ? 'Enviando...' : 'Enviar Ticket'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
