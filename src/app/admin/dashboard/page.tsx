'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, collectionGroup, orderBy, limit } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building, HardHat, Users, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type Obra = {
  id: string;
  nombreFaena: string;
  estado?: 'Activa' | 'Terminada' | 'Pausada' | 'Inactiva';
  creadoEn: { toDate: () => Date };
  companyId: string;
  companyName?: string;
};

type SummaryData = {
  totalEmpresas: number;
  totalObras: number;
  totalUsuarios: number;
};

export default function AdminDashboardPage() {
  const { role, loading: authLoading } = useAuth();
  const router = useRouter();
  const isSuperAdmin = role === 'superadmin';

  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [recentObras, setRecentObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isSuperAdmin) {
      router.replace('/dashboard');
    }
  }, [isSuperAdmin, authLoading, router]);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!isSuperAdmin) return;
      setLoading(true);
      setError(null);
      try {
        // Fetch companies, obras, and users in parallel
        const [companiesSnap, obrasSnap, usersSnap] = await Promise.all([
          getDocs(collection(firebaseDb, 'companies')),
          getDocs(query(collectionGroup(firebaseDb, 'obras'), orderBy('creadoEn', 'desc'), limit(10))),
          getDocs(collection(firebaseDb, 'users'))
        ]);
        
        const totalEmpresas = companiesSnap.size;
        const totalObras = await getDocs(collectionGroup(firebaseDb, 'obras')).then(snap => snap.size);
        const totalUsuarios = usersSnap.size;

        setSummary({ totalEmpresas, totalObras, totalUsuarios });

        const companyMap = new Map(companiesSnap.docs.map(doc => [doc.id, doc.data().nombre]));
        
        const obrasData = obrasSnap.docs.map(doc => {
            const companyId = doc.ref.parent.parent!.id;
            return {
                id: doc.id,
                companyId: companyId,
                companyName: companyMap.get(companyId) || 'Empresa Desconocida',
                ...doc.data()
            } as Obra;
        });
        setRecentObras(obrasData);
        
      } catch (err) {
        console.error("Error fetching admin dashboard data:", err);
        setError("No se pudieron cargar los datos. Revisa la consola para más detalles.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [isSuperAdmin]);
  
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
        <h1 className="text-3xl font-bold">Dashboard del Superadministrador</h1>
        <p className="text-muted-foreground">Vista general de la plataforma PCG.</p>
      </header>

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardHeader><CardTitle>Total Empresas</CardTitle></CardHeader><CardContent><Loader2 className="animate-spin"/></CardContent></Card>
          <Card><CardHeader><CardTitle>Total Obras</CardTitle></CardHeader><CardContent><Loader2 className="animate-spin"/></CardContent></Card>
          <Card><CardHeader><CardTitle>Total Usuarios</CardTitle></CardHeader><CardContent><Loader2 className="animate-spin"/></CardContent></Card>
        </div>
      ) : summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Empresas</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalEmpresas}</div>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Obras</CardTitle>
              <HardHat className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalObras}</div>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalUsuarios}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className='flex-row justify-between items-center'>
          <CardTitle>Obras Recientes</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/obras">Ver Todas las Obras</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre Obra</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creada En</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="text-center h-24"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                ) : recentObras.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center h-24">No hay obras recientes.</TableCell></TableRow>
                ) : (
                  recentObras.map((obra) => (
                    <TableRow key={obra.id}>
                      <TableCell className="font-medium">{obra.nombreFaena}</TableCell>
                      <TableCell>{obra.companyName}</TableCell>
                      <TableCell><Badge variant={obra.estado === 'Activa' ? 'default' : 'secondary'}>{obra.estado || 'No definido'}</Badge></TableCell>
                      <TableCell>{obra.creadoEn ? obra.creadoEn.toDate().toLocaleDateString() : 'N/A'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    