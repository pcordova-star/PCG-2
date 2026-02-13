// src/app/(pcg)/soporte/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, PlusCircle, Eye } from 'lucide-react';
import { SupportTicket } from '@/types/pcg';

export default function MisTicketsPage() {
    const { user, loading: authLoading } = useAuth();
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loadingTickets, setLoadingTickets] = useState(true);

    useEffect(() => {
        if (!user) {
            if (!authLoading) setLoadingTickets(false);
            return;
        }

        setLoadingTickets(true);
        const ticketsQuery = query(
            collection(firebaseDb, 'supportTickets'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(ticketsQuery, (snapshot) => {
            const ticketsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate(),
            } as SupportTicket));
            setTickets(ticketsData);
            setLoadingTickets(false);
        }, (error) => {
            console.error("Error fetching user tickets:", error);
            setLoadingTickets(false);
        });

        return () => unsubscribe();
    }, [user, authLoading]);

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button asChild variant="outline" size="sm">
                        <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Dashboard</Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Mis Tickets de Soporte</h1>
                        <p className="text-muted-foreground">Revisa el estado y las respuestas a tus solicitudes.</p>
                    </div>
                </div>
                <Button asChild>
                    <Link href="/soporte/nuevo">
                        <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Ticket
                    </Link>
                </Button>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Historial de Tickets</CardTitle>
                </CardHeader>
                <CardContent>
                    {loadingTickets ? (
                        <div className="text-center p-8"><Loader2 className="animate-spin" /></div>
                    ) : tickets.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No has enviado ninguna solicitud de soporte todavía.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Asunto</TableHead>
                                    <TableHead>Categoría</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tickets.map(ticket => (
                                    <TableRow key={ticket.id}>
                                        <TableCell>{ticket.createdAt?.toLocaleDateString('es-CL')}</TableCell>
                                        <TableCell className="font-medium">{ticket.subject}</TableCell>
                                        <TableCell><Badge variant="secondary">{ticket.category}</Badge></TableCell>
                                        <TableCell><Badge variant={ticket.status === 'cerrado' ? 'default' : 'outline'}>{ticket.status}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={`/soporte/${ticket.id}`}>
                                                    <Eye className="mr-2 h-4 w-4" /> Ver Detalle
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}