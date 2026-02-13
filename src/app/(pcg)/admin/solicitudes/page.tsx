'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, orderBy, Timestamp, doc, updateDoc, where } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowLeft, UserPlus, Archive } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

type UserAccessRequest = {
  id: string;
  empresaId: string;
  obraId: string;
  obraNombre: string;
  directorEmail: string;
  solicitante: {
    uid: string;
    nombre: string;
    email: string;
  };
  createdAt: Timestamp;
  status: 'pending' | 'approved' | 'archived';
};

export default function AdminSolicitudesPage() {
  const { role, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const isSuperAdmin = role === 'superadmin';

  const [moduleRequests, setModuleRequests] = useState<ModuleActivationRequest[]>([]);
  const [userAccessRequests, setUserAccessRequests] = useState<UserAccessRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isSuperAdmin) {
      router.replace('/dashboard');
    }
  }, [isSuperAdmin, authLoading, router]);

  useEffect(() => {
    if (!isSuperAdmin) return;

    const fetchAllRequests = async () => {
      setLoading(true);
      try {
        const moduleQuery = query(collection(firebaseDb, 'moduleActivationRequests'), orderBy('requestedAt', 'desc'));
        const userAccessQuery = query(collection(firebaseDb, 'userAccessRequests'), orderBy('createdAt', 'desc'));
        
        const [moduleSnapshot, userAccessSnapshot] = await Promise.all([
            getDocs(moduleQuery),
            getDocs(userAccessQuery)
        ]);
        
        const moduleData = moduleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ModuleActivationRequest));
        const userAccessData = userAccessSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserAccessRequest));
        
        setModuleRequests(moduleData);
        setUserAccessRequests(userAccessData);

      } catch (err) {
        console.error("Error fetching requests:", err);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las solicitudes.' });
      } finally {
        setLoading(false);
      }
    };

    fetchAllRequests();
  }, [isSuperAdmin, toast]);
  
  const handleUpdateModuleStatus = async (requestId: string, companyId: string, moduleId: string, newStatus: 'approved' | 'rejected') => {
      try {
        const requestRef = doc(firebaseDb, 'moduleActivationRequests', requestId);
        await updateDoc(requestRef, { status: newStatus });
        
        if (newStatus === 'approved') {
            const companyRef = doc(firebaseDb, 'companies', companyId);
            await updateDoc(companyRef, { [moduleId]: true });
        }
        
        setModuleRequests(prev => prev.map(req => req.id === requestId ? { ...req, status: newStatus } : req));
        toast({ title: 'Estado actualizado', description: `La solicitud ha sido marcada como ${newStatus === 'approved' ? 'aprobada' : 'rechazada'}.`});

      } catch (error) {
          console.error("Error updating status:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el estado de la solicitud.' });
      }
  }

  const handleArchiveUserRequest = async (requestId: string) => {
    try {
        const requestRef = doc(firebaseDb, 'userAccessRequests', requestId);
        await updateDoc(requestRef, { status: 'archived' });
        setUserAccessRequests(prev => prev.map(req => req.id === requestId ? { ...req, status: 'archived' } : req));
        toast({ title: 'Solicitud archivada'});
    } catch(err) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo archivar la solicitud.' });
    }
  }

  const pendingUserRequests = userAccessRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <header>
        <Button asChild variant="outline" size="sm" className="mb-4">
            <Link href="/admin/dashboard"><ArrowLeft className="mr-2 h-4 w-4"/>Volver al Dashboard</Link>
        </Button>
        <h1 className="text-3xl font-bold">Gestión de Solicitudes</h1>
        <p className="text-muted-foreground">Revisa y gestiona las solicitudes de nuevos módulos y acceso de usuarios.</p>
      </header>

      <Tabs defaultValue="modulos">
        <TabsList>
            <TabsTrigger value="modulos">Activación de Módulos</TabsTrigger>
            <TabsTrigger value="usuarios">
                Acceso de Usuarios
                {pendingUserRequests > 0 && (
                    <Badge className="ml-2 animate-pulse">{pendingUserRequests}</Badge>
                )}
            </TabsTrigger>
        </TabsList>
        <TabsContent value="modulos">
            <Card>
                <CardHeader>
                <CardTitle>Solicitudes de Módulos</CardTitle>
                <CardDescription>{loading ? 'Cargando...' : `Mostrando ${moduleRequests.length} solicitudes.`}</CardDescription>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow><TableHead>Empresa</TableHead><TableHead>Módulo Solicitado</TableHead><TableHead>Solicitado Por</TableHead><TableHead>Fecha</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                    {loading ? <TableRow><TableCell colSpan={6} className="text-center h-24"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                    : moduleRequests.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center h-24">No hay solicitudes de módulos.</TableCell></TableRow>
                    : moduleRequests.map((req) => (
                        <TableRow key={req.id}>
                        <TableCell className="font-medium">{req.companyName}</TableCell>
                        <TableCell>{req.moduleTitle}</TableCell>
                        <TableCell>{req.requestedByUserName}</TableCell>
                        <TableCell>{req.requestedAt.toDate().toLocaleDateString('es-CL')}</TableCell>
                        <TableCell><Badge variant={req.status === 'pending' ? 'secondary' : (req.status === 'approved' ? 'default' : 'destructive')}>{req.status}</Badge></TableCell>
                        <TableCell className="text-right">
                            {req.status === 'pending' && (
                            <div className="flex gap-2 justify-end">
                                <Button size="sm" onClick={() => handleUpdateModuleStatus(req.id, req.companyId, req.moduleId, 'approved')}>Aprobar</Button>
                                <Button size="sm" variant="destructive" onClick={() => handleUpdateModuleStatus(req.id, req.companyId, req.moduleId, 'rejected')}>Rechazar</Button>
                            </div>
                            )}
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
        </TabsContent>
         <TabsContent value="usuarios">
            <Card>
                <CardHeader>
                    <CardTitle>Solicitudes de Acceso para Directores</CardTitle>
                    <CardDescription>Crea las cuentas de usuario para los directores que han sido invitados a una obra.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow><TableHead>Obra</TableHead><TableHead>Email del Director</TableHead><TableHead>Solicitado por</TableHead><TableHead>Fecha</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow>
                        </TableHeader>
                         <TableBody>
                            {loading ? <TableRow><TableCell colSpan={6} className="text-center h-24"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                            : userAccessRequests.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center h-24">No hay solicitudes de acceso.</TableCell></TableRow>
                            : userAccessRequests.map((req) => (
                                <TableRow key={req.id}>
                                    <TableCell className="font-medium">{req.obraNombre}</TableCell>
                                    <TableCell>{req.directorEmail}</TableCell>
                                    <TableCell>{req.solicitante.nombre}</TableCell>
                                    <TableCell>{req.createdAt.toDate().toLocaleDateString('es-CL')}</TableCell>
                                    <TableCell><Badge variant={req.status === 'pending' ? 'secondary' : 'outline'}>{req.status}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        {req.status === 'pending' && (
                                            <div className="flex gap-2 justify-end">
                                                <Button asChild size="sm">
                                                    <Link href={`/admin/empresas/${req.empresaId}/usuarios`}>
                                                        <UserPlus className="mr-2 h-4 w-4"/>
                                                        Crear Usuario
                                                    </Link>
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => handleArchiveUserRequest(req.id)}>
                                                    <Archive className="mr-2 h-4 w-4" />
                                                    Archivar
                                                </Button>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                         </TableBody>
                     </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
