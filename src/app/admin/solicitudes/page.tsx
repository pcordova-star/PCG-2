'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, orderBy, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type ModuleActivationRequest = {
  id: string;
  companyId: string;
  companyName: string;
  moduleId: string;
  moduleTitle: string;
  requestedAt: Timestamp;
  requestedByUserName: string;
  status: 'pending' | 'approved' | 'rejected';
};

export default function AdminSolicitudesPage() {
  const { role, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const isSuperAdmin = role === 'superadmin';

  const [requests, setRequests] = useState<ModuleActivationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isSuperAdmin) {
      router.replace('/dashboard');
    }
  }, [isSuperAdmin, authLoading, router]);

  useEffect(() => {
    if (!isSuperAdmin) return;

    const fetchRequests = async () => {
      setLoading(true);
      try {
        const q = query(collection(firebaseDb, 'moduleActivationRequests'), orderBy('requestedAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const requestsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ModuleActivationRequest));
        setRequests(requestsData);
      } catch (err) {
        console.error("Error fetching module requests:", err);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las solicitudes.' });
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [isSuperAdmin, toast]);
  
  const handleUpdateStatus = async (requestId: string, companyId: string, moduleId: string, newStatus: 'approved' | 'rejected') => {
      try {
        const requestRef = doc(firebaseDb, 'moduleActivationRequests', requestId);
        await updateDoc(requestRef, { status: newStatus });
        
        if (newStatus === 'approved') {
            const companyRef = doc(firebaseDb, 'companies', companyId);
            await updateDoc(companyRef, { [moduleId]: true });
        }
        
        setRequests(prev => prev.map(req => req.id === requestId ? { ...req, status: newStatus } : req));
        toast({ title: 'Estado actualizado', description: `La solicitud ha sido marcada como ${newStatus === 'approved' ? 'aprobada' : 'rechazada'}.`});

      } catch (error) {
          console.error("Error updating status:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el estado de la solicitud.' });
      }
  }

  if (authLoading || !isSuperAdmin) {
    return (
      <div className="flex justify-center items-center h-full p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <Button asChild variant="outline" size="sm" className="mb-4">
            <Link href="/admin/dashboard"><ArrowLeft className="mr-2 h-4 w-4"/>Volver al Dashboard</Link>
        </Button>
        <h1 className="text-3xl font-bold">Solicitudes de Activación de Módulos</h1>
        <p className="text-muted-foreground">Revisa y gestiona las solicitudes de nuevos módulos realizadas por las empresas.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Solicitudes</CardTitle>
          <CardDescription>{loading ? 'Cargando...' : `Mostrando ${requests.length} solicitudes.`}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Módulo Solicitado</TableHead>
                <TableHead>Solicitado Por</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center h-24"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
              ) : requests.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center h-24">No hay solicitudes pendientes.</TableCell></TableRow>
              ) : (
                requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.companyName}</TableCell>
                    <TableCell>{req.moduleTitle}</TableCell>
                    <TableCell>{req.requestedByUserName}</TableCell>
                    <TableCell>{req.requestedAt.toDate().toLocaleDateString('es-CL')}</TableCell>
                    <TableCell><Badge variant={req.status === 'pending' ? 'secondary' : (req.status === 'approved' ? 'default' : 'destructive')}>{req.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      {req.status === 'pending' && (
                        <div className="flex gap-2 justify-end">
                            <Button size="sm" onClick={() => handleUpdateStatus(req.id, req.companyId, req.moduleId, 'approved')}>Aprobar</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus(req.id, req.companyId, req.moduleId, 'rejected')}>Rechazar</Button>
                        </div>
                      )}
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
