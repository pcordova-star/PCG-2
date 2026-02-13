// src/app/(pcg)/admin/soporte/[ticketId]/page.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, updateDoc, arrayUnion, serverTimestamp, addDoc, collection, Timestamp } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Loader2, ArrowLeft, Send, Paperclip } from 'lucide-react';
import { SupportTicket } from '@/types/pcg';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function TicketDetailPage() {
    const { ticketId } = useParams();
    const router = useRouter();
    const { user, role, loading: authLoading } = useAuth();
    const { toast } = useToast();

    const [ticket, setTicket] = useState<SupportTicket | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [respuesta, setRespuesta] = useState("");
    const [newStatus, setNewStatus] = useState<SupportTicket['status']>('abierto');

    useEffect(() => {
        if (!authLoading && role !== 'superadmin') {
            router.replace('/dashboard');
        }
    }, [authLoading, role, router]);

    useEffect(() => {
        if (!ticketId) return;

        const fetchTicket = async () => {
            setLoading(true);
            const ticketRef = doc(firebaseDb, 'supportTickets', ticketId as string);
            const ticketSnap = await getDoc(ticketRef);
            if (ticketSnap.exists()) {
                const data = { id: ticketSnap.id, ...ticketSnap.data(), createdAt: ticketSnap.data().createdAt.toDate() } as SupportTicket;
                setTicket(data);
                setNewStatus(data.status);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Ticket no encontrado.' });
                router.push('/admin/soporte');
            }
            setLoading(false);
        };
        fetchTicket();
    }, [ticketId, router, toast]);
    
    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        if (!ticket || !respuesta) {
            toast({ variant: 'destructive', title: 'Error', description: 'La respuesta no puede estar vacía.' });
            return;
        }
        setIsSaving(true);
        try {
            const ticketRef = doc(firebaseDb, 'supportTickets', ticketId as string);
            
            const newHistoryEntry = {
                author: 'support',
                message: respuesta,
                timestamp: Timestamp.now(), // Usar el Timestamp del cliente aquí
                userId: user?.uid,
                userName: 'Soporte PCG',
            };

            await updateDoc(ticketRef, {
                status: newStatus,
                updatedAt: serverTimestamp(),
                history: arrayUnion(newHistoryEntry)
            });


            // Lógica para enviar email de notificación al usuario
            await addDoc(collection(firebaseDb, "mail"), {
                to: [ticket.userEmail],
                message: {
                    subject: `Re: Tu ticket de soporte PCG [${ticket.subject}]`,
                    html: `
                        <p>Hola ${ticket.userName},</p>
                        <p>Hemos respondido a tu ticket de soporte:</p>
                        <p><strong>Asunto:</strong> ${ticket.subject}</p>
                        <hr>
                        <p><strong>Nuestra respuesta:</strong></p>
                        <p>${respuesta.replace(/\n/g, '<br>')}</p>
                        <hr>
                        <p>El estado de tu ticket ha sido actualizado a: <strong>${newStatus}</strong>.</p>
                        <p>Si tienes más preguntas, por favor, crea un nuevo ticket.</p>
                    `,
                },
            });

            toast({ title: 'Respuesta enviada', description: 'El usuario ha sido notificado.' });
            setRespuesta("");
            // Refrescar datos
            const updatedDoc = await getDoc(ticketRef);
            setTicket({ id: updatedDoc.id, ...updatedDoc.data(), createdAt: updatedDoc.data()?.createdAt.toDate() } as SupportTicket);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la respuesta.' });
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return <div className="text-center p-8"><Loader2 className="animate-spin" /> Cargando ticket...</div>;
    }

    if (!ticket) {
        return <div className="text-center p-8">Ticket no encontrado.</div>;
    }

    return (
        <div className="space-y-6">
            <header>
                 <Button asChild variant="outline" size="sm" className="mb-4">
                    <Link href="/admin/soporte"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Listado</Link>
                </Button>
                <h1 className="text-2xl font-bold">Detalle del Ticket de Soporte</h1>
                <p className="text-muted-foreground">ID: {ticket.id}</p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>{ticket.subject}</CardTitle>
                    <CardDescription>
                        Abierto por {ticket.userName} ({ticket.userEmail}) el {ticket.createdAt.toLocaleDateString('es-CL')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <p className="whitespace-pre-wrap p-4 bg-muted/50 rounded-md border">{ticket.description}</p>
                     {ticket.adjuntoUrl && (
                        <div className="space-y-2">
                            <Label className="font-semibold">Archivo Adjunto</Label>
                            <a href={ticket.adjuntoUrl} target="_blank" rel="noopener noreferrer" className="block border rounded-lg overflow-hidden group relative hover:shadow-lg transition-shadow">
                                <div className="relative w-full aspect-video bg-muted">
                                    <Image src={ticket.adjuntoUrl} alt="Adjunto del ticket" layout="fill" objectFit="contain" className="transition-transform group-hover:scale-105" />
                                </div>
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <p className="text-white font-semibold">Ver en tamaño completo</p>
                                </div>
                            </a>
                        </div>
                     )}
                </CardContent>
            </Card>

            <Card>
                <form onSubmit={handleSave}>
                    <CardHeader>
                        <CardTitle>Responder y Actualizar Estado</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="respuesta">Respuesta</Label>
                            <Textarea id="respuesta" value={respuesta} onChange={e => setRespuesta(e.target.value)} rows={5} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="status">Actualizar Estado</Label>
                            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as SupportTicket['status'])}>
                                <SelectTrigger id="status" className="w-[180px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="abierto">Abierto</SelectItem>
                                    <SelectItem value="en_progreso">En Progreso</SelectItem>
                                    <SelectItem value="cerrado">Cerrado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                    <CardFooter className="justify-end">
                        <Button type="submit" disabled={isSaving}>
                             {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                             {isSaving ? 'Enviando...' : 'Enviar Respuesta y Notificar'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
