'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, Users, BellRing, DollarSign, Settings, HelpCircle, HardHat, Newspaper, Wrench } from 'lucide-react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export default function AdminDashboardPage() {
  const { role, loading: authLoading } = useAuth();
  const router = useRouter();
  const isSuperAdmin = role === 'superadmin';

  const [loading, setLoading] = useState(true);
  const [totalPendingRequests, setTotalPendingRequests] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!isSuperAdmin) {
      router.replace('/dashboard');
    }
  }, [isSuperAdmin, authLoading, router]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    
    async function fetchRequests() {
      setLoading(true);
      try {
        const [moduleRequestsSnap, userAccessRequestsSnap] = await Promise.all([
          getDocs(query(collection(firebaseDb, 'moduleActivationRequests'), where('status', '==', 'pending'))),
          getDocs(query(collection(firebaseDb, 'userAccessRequests'), where('status', '==', 'pending')))
        ]);
        setTotalPendingRequests(moduleRequestsSnap.size + userAccessRequestsSnap.size);
      } catch (err) {
        console.error("Error fetching admin dashboard requests:", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchRequests();
  }, [isSuperAdmin]);
  
  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-full p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Dashboard del Superadministrador</h1>
        <p className="text-muted-foreground">Centro de control para la gestión de la plataforma PCG.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna 1: Gestión Principal */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestión Principal</CardTitle>
              <CardDescription>Administra las entidades clave de la plataforma.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <Link href="/admin/empresas" className="block p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4"><Building className="h-8 w-8 text-primary" /><h3 className="font-semibold">Empresas</h3></div>
                  <p className="text-sm text-muted-foreground mt-2">Crear, editar y configurar las empresas cliente y sus módulos activados.</p>
               </Link>
               <Link href="/admin/usuarios" className="block p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4"><Users className="h-8 w-8 text-primary" /><h3 className="font-semibold">Usuarios e Invitaciones</h3></div>
                  <p className="text-sm text-muted-foreground mt-2">Supervisar todos los usuarios de la plataforma y las invitaciones pendientes.</p>
               </Link>
                <Link href="/admin/solicitudes" className="block p-4 border rounded-lg hover:bg-muted/50 transition-colors relative">
                    {totalPendingRequests > 0 && (
                        <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white text-xs font-bold animate-pulse z-10">
                            {totalPendingRequests}
                        </div>
                    )}
                  <div className="flex items-center gap-4"><BellRing className="h-8 w-8 text-primary" /><h3 className="font-semibold">Solicitudes</h3></div>
                  <p className="text-sm text-muted-foreground mt-2">Revisar solicitudes de activación de módulos y acceso de nuevos usuarios.</p>
               </Link>
            </CardContent>
          </Card>
          
           <Card>
            <CardHeader>
              <CardTitle>Contenido y Plataforma</CardTitle>
               <CardDescription>Herramientas para la gestión de datos globales y contenido.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <Link href="/admin/obras" className="block p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4"><HardHat className="h-8 w-8 text-primary" /><h3 className="font-semibold">Ver Todas las Obras</h3></div>
                   <p className="text-sm text-muted-foreground mt-2">Panel de supervisión para ver y gestionar todas las obras de todas las empresas.</p>
               </Link>
               <div className="block p-4 border rounded-lg bg-slate-50 text-muted-foreground cursor-not-allowed">
                  <div className="flex items-center gap-4"><Newspaper className="h-8 w-8" /><h3 className="font-semibold text-slate-500">Ingresar Noticia (IA)</h3></div>
                   <p className="text-sm mt-2">Próximamente: Formulario para añadir noticias del sector y que la IA genere alertas.</p>
               </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna 2: Configuración y Soporte */}
        <div className="space-y-6">
            <Card>
                <CardHeader>
                  <CardTitle>Configuración</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                     <Button asChild variant="outline" className="w-full justify-start text-left h-auto py-2">
                        <Link href="/admin/pricing"><Settings className="mr-2 h-4 w-4"/><div><p>Configurar Precios</p><p className="text-xs text-muted-foreground">Define los precios de planes y módulos.</p></div></Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full justify-start text-left h-auto py-2">
                        <Link href="/admin/facturacion"><DollarSign className="mr-2 h-4 w-4"/><div><p>Facturación</p><p className="text-xs text-muted-foreground">Calcula facturación estimada por empresa.</p></div></Link>
                    </Button>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                  <CardTitle>Soporte y Herramientas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                     <Button asChild variant="outline" className="w-full justify-start text-left h-auto py-2">
                        <Link href="/admin/soporte"><HelpCircle className="mr-2 h-4 w-4"/><div><p>Tickets de Soporte</p><p className="text-xs text-muted-foreground">Gestiona tickets de usuarios.</p></div></Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full justify-start text-left h-auto py-2">
                        <Link href="/admin/debug/set-claim"><Wrench className="mr-2 h-4 w-4"/><div><p>Debug: Asignar Claims</p><p className="text-xs text-muted-foreground">Herramienta para asignar roles manualmente.</p></div></Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
