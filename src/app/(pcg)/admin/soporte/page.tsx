// src/app/(pcg)/admin/soporte/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Eye } from 'lucide-react';
import Link from 'next/link';
import { SupportTicket } from '@/types/pcg';

export default function AdminSoportePage() {
  const { role, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && role !== 'superadmin') {
      router.replace('/dashboard');
    }
  }, [authLoading, role, router]);

  useEffect(() => {
    if (role !== 'superadmin') return;

    setLoading(true);
    const ticketsQuery = query(collection(firebaseDb, 'supportTickets'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(ticketsQuery, (snapshot) => {
      const ticketsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      } as SupportTicket));
      setTickets(ticketsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [role]);

  return (
    <div className="space-y-6">
      <header>
        <Button asChild variant="outline" size="sm" className="mb-4">
          <Link href="/admin/dashboard"><ArrowLeft className="mr-2 h-4 w-4"/>Volver al Dashboard de Admin</Link>
        </Button>
        <h1 className="text-3xl font-bold">Bandeja de Tickets de Soporte</h1>
        <p className="text-muted-foreground">Gestiona las solicitudes y problemas reportados por los usuarios.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Tickets</CardTitle>
          <CardDescription>
            {loading ? 'Cargando tickets...' : `Mostrando ${tickets.length} tickets.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Asunto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center h-24"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
              ) : tickets.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center h-24">No hay tickets de soporte.</TableCell></TableRow>
              ) : (
                tickets.map(ticket => (
                  <TableRow key={ticket.id}>
                    <TableCell>{ticket.createdAt?.toLocaleDateString('es-CL')}</TableCell>
                    <TableCell className="font-medium">{ticket.userName || ticket.userEmail}</TableCell>
                    <TableCell>{ticket.subject}</TableCell>
                    <TableCell><Badge variant="secondary">{ticket.category}</Badge></TableCell>
                    <TableCell><Badge variant={ticket.status === 'cerrado' ? 'default' : 'outline'}>{ticket.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/soporte/${ticket.id}`}>
                          <Eye className="mr-2 h-4 w-4" /> Ver / Responder
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
