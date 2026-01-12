
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, collectionGroup, orderBy, limit } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building, HardHat, Users, Loader2, DollarSign, Settings, BellRing } from 'lucide-react';
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

const adminCards = [
    { title: "Empresas", href: "/admin/empresas", icon: Building, description: "Crear, editar y gestionar empresas cliente." },
    { title: "Usuarios", href: "/admin/usuarios", icon: Users, description: "Invitar y administrar usuarios por empresa." },
    { title: "Solicitudes", href: "/admin/solicitudes", icon: BellRing, description: "Revisar solicitudes de activación de módulos." },
    { title: "Facturación", href: "/admin/facturacion", icon: DollarSign, description: "Calcular facturación estimada por empresa." },
    { title: "Configurar Precios", href: "/admin/pricing", icon: Settings, description: "Definir los precios globales de la plataforma." },
]

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
    if (!isSuperAdmin) return;
    
    async function fetchAllData() {
      setLoading(true);
      setError(null);
      try {
        const [companiesSnap, obrasSnap, usersSnap] = await Promise.all([
          getDocs(collection(firebaseDb, 'companies')),
          getDocs(query(collectionGroup(firebaseDb, 'obras'), orderBy('creadoEn', 'desc'), limit(10))),
          getDocs(collection(firebaseDb, 'users'))
        ]);
        
        const totalEmpresas = companiesSnap.size;
        const totalObras = await getDocs(collectionGroup(firebaseDb, 'obras')).then(snap => snap.size);
        const totalUsuarios = usersSnap.size;

        setSummary({ totalEmpresas, totalObras, totalUsuarios });

        const companyMap = new Map(companiesSnap.docs.map(doc => [doc.id, doc.data().nombreFantasia || doc.data().nombre]));
        
        const obrasData = obrasSnap.docs.map(doc => {
            const companyId = doc.ref.parent.parent?.id;
            if (!companyId) return null;
            return {
                id: doc.id,
                companyId: companyId,
                companyName: companyMap.get(companyId) || 'Empresa Desconocida',
                ...doc.data()
            } as Obra;
        }).filter(Boolean) as Obra[];

        setRecentObras(obrasData);
        
      } catch (err) {
        console.error("Error fetching admin dashboard data:", err);
        if (err instanceof Error) {
            setError("No se pudieron cargar algunos datos. Revisa la consola para más detalles.");
        }
      } finally {
        setLoading(false);
      }
    }

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

      <Card>
        <CardHeader>
          <CardTitle>Gestión Rápida</CardTitle>
          <CardDescription>Accesos directos a los módulos de administración global.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {adminCards.map(card => (
                 <Card key={card.title} className="flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                        <card.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <p className='text-xs text-muted-foreground'>{card.description}</p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild className="w-full mt-2" variant="outline">
                            <Link href={card.href}>
                                Gestionar
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Empresas</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.totalEmpresas ?? <Loader2 className='animate-spin h-6'/>}</div>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Obras</CardTitle>
              <HardHat className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.totalObras ?? <Loader2 className='animate-spin h-6'/>}</div>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.totalUsuarios ?? <Loader2 className='animate-spin h-6'/>}</div>
            </CardContent>
          </Card>
        </div>

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
