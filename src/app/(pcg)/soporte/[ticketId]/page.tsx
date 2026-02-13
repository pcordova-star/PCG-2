
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Paperclip, ShieldAlert } from 'lucide-react';
import { SupportTicket } from '@/types/pcg';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

const HistoryItem = ({ item }: { item: NonNullable<SupportTicket['history']>[0] }) => {
    const isSupport = item.author === 'support';
    return (
        <div className={cn(
            "flex flex-col p-3 rounded-lg max-w-[85%]",
            isSupport ? "bg-primary/10 self-end items-end" : "bg-muted self-start items-start"
        )}>
            <div className="flex items-center gap-2 text-xs font-semibold mb-1">
                <span>{item.userName}</span>
                <span className="text-muted-foreground font-normal">({isSupport ? 'Soporte' : 'Tú'})</span>
            </div>
            <p className="text-sm whitespace-pre-wrap text-left">{item.message}</p>
            <p className="text-xs text-muted-foreground mt-2">
                {item.timestamp?.toDate().toLocaleString('es-CL') ?? "Enviando..."}
            </p>
        </div>
    );
};


export default function UserTicketDetailPage() {
    const { ticketId } = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();

    const [ticket, setTicket] = useState<SupportTicket | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const sortedHistory = useMemo(() => {
        if (!ticket?.history) return [];
        return [...ticket.history].sort((a, b) => {
            const dateA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
            const dateB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
            return dateA - dateB;
        });
    }, [ticket]);

    useEffect(() => {
        if (authLoading) return;
        if (!user || !ticketId) {
            if(!authLoading) router.replace('/soporte');
            return;
        }

        const fetchTicket = async () => {
            setLoading(true);
            setError(null);
            const ticketRef = doc(firebaseDb, 'supportTickets', ticketId as string);
            const ticketSnap = await getDoc(ticketRef);
            
            if (ticketSnap.exists()) {
                const data = ticketSnap.data() as SupportTicket;
                // Security Check
                if (data.userId !== user.uid) {
                    setError("No tienes permiso para ver este ticket.");
                    setTicket(null);
                } else {
                    setTicket({ id: ticketSnap.id, ...data });
                }
            } else {
                setError("Ticket no encontrado.");
            }
            setLoading(false);
        };
        fetchTicket();
    }, [user, ticketId, authLoading, router]);

    if (loading || authLoading) {
        return <div className="text-center p-8"><Loader2 className="animate-spin" /> Cargando ticket...</div>;
    }
    
    if (error) {
         return (
             <div className="max-w-2xl mx-auto">
                <Card className="max-w-2xl mx-auto border-destructive">
                    <CardHeader className="items-center text-center">
                        <ShieldAlert className="h-12 w-12 text-destructive"/>
                        <CardTitle>Acceso Denegado</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Button asChild variant="outline"><Link href="/soporte">Volver a Mis Tickets</Link></Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!ticket) {
        return <div className="text-center text-muted-foreground p-8">No se encontraron los datos del ticket.</div>;
    }

    return (
        <div className="space-y-6">
            <header>
                 <Button asChild variant="outline" size="sm" className="mb-4">
                    <Link href="/soporte"><ArrowLeft className="mr-2 h-4 w-4" />Volver a Mis Tickets</Link>
                </Button>
                <h1 className="text-2xl font-bold">Detalle del Ticket</h1>
                <p className="text-muted-foreground">ID: {ticket.id}</p>
            </header>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                         <div>
                            <CardTitle className="text-xl">{ticket.subject}</CardTitle>
                            <CardDescription>Categoría: {ticket.category} | Creado el {ticket.createdAt.toDate().toLocaleDateString('es-CL')}</CardDescription>
                         </div>
                         <Badge variant={ticket.status === 'cerrado' ? 'default' : 'outline'}>{ticket.status}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <h4 className="font-semibold">Historial de Conversación</h4>
                        <div className="space-y-3 border p-4 rounded-md max-h-[50vh] overflow-y-auto flex flex-col gap-3">
                            {sortedHistory.length > 0 ? (
                                sortedHistory.map((item, index) => <HistoryItem key={index} item={item} />)
                            ) : (
                                <p className="text-sm text-muted-foreground">No hay mensajes en este ticket todavía.</p>
                            )}
                        </div>
                    </div>
                     {ticket.adjuntoUrl && (
                        <div className="space-y-2">
                            <Label className="font-semibold">Archivo Adjunto</Label>
                            <a href={ticket.adjuntoUrl} target="_blank" rel="noopener noreferrer" className="block border rounded-lg overflow-hidden group relative hover:shadow-lg transition-shadow w-full max-w-sm">
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
                 <CardFooter className="flex justify-end">
                    <p className="text-xs text-muted-foreground">Si necesitas añadir más información, por favor crea un nuevo ticket.</p>
                </CardFooter>
            </Card>
        </div>
    );
}
