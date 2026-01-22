// src/app/cliente/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Building, ArrowRight, LogOut, Loader2 } from 'lucide-react';

type Obra = {
  id: string;
  nombreFaena: string;
  direccion: string;
  avanceAcumulado?: number;
};

// Interfaz para los datos de la empresa
interface Empresa {
  id: string;
  nombreFantasia?: string;
  razonSocial?: string;
}

export default function ClienteDashboardPage() {
  const { user, role, companyId, loading, logout } = useAuth();
  const router = useRouter();
  
  const [obras, setObras] = useState<Obra[]>([]);
  const [loadingObras, setLoadingObras] = useState(true);
  
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loadingEmpresa, setLoadingEmpresa] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login/cliente');
      return;
    }
    // Protección de ruta por rol: solo 'cliente' y 'superadmin' pueden acceder.
    if (!loading && user && role !== 'cliente' && role !== 'superadmin') {
      router.replace('/dashboard');
    }
  }, [user, loading, role, router]);

  useEffect(() => {
    if (!user) return;

    const fetchObras = async () => {
      setLoadingObras(true);
      try {
        const q = query(
          collection(firebaseDb, 'obras'),
          where('clienteEmail', '==', user.email)
        );
        const querySnapshot = await getDocs(q);
        const obrasData: Obra[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as Obra));
        setObras(obrasData);
      } catch (error) {
        console.error("Error fetching client's obras: ", error);
      } finally {
        setLoadingObras(false);
      }
    };

    fetchObras();
  }, [user]);

  useEffect(() => {
    if (!companyId) {
      setLoadingEmpresa(false);
      return;
    };

    const fetchEmpresa = async () => {
      setLoadingEmpresa(true);
      try {
        const empresaRef = doc(firebaseDb, 'companies', companyId);
        const empresaSnap = await getDoc(empresaRef);
        if (empresaSnap.exists()) {
          setEmpresa({ id: empresaSnap.id, ...empresaSnap.data() } as Empresa);
        } else {
          setEmpresa(null);
        }
      } catch (error) {
        console.error("Error fetching company data:", error);
        setEmpresa(null);
      } finally {
        setLoadingEmpresa(false);
      }
    };
    
    fetchEmpresa();
  }, [companyId]);

  if (loading || loadingObras || loadingEmpresa) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Cargando portal del cliente...</p>
      </div>
    );
  }
  
  if (!user || (role !== 'cliente' && role !== 'superadmin')) {
      return (
        <div className="flex items-center justify-center min-h-screen">
            <p>No tienes permiso para ver esta página. Redirigiendo...</p>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-muted/40">
        <header className="bg-background border-b">
            <div className="container mx-auto flex justify-between items-center p-4">
                 <h1 className="text-xl font-bold text-primary">Portal del Cliente</h1>
                 <div className="flex items-center gap-4">
                     <span className="text-sm text-muted-foreground hidden sm:inline">{user.email}</span>
                    <Button variant="outline" onClick={logout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Cerrar Sesión
                    </Button>
                 </div>
            </div>
        </header>

        <main className="container mx-auto p-4 md:p-8">
            <header className="rounded-lg border p-4 bg-card shadow-sm mb-8">
                <p className="text-sm text-muted-foreground">Dashboard de Cliente</p>
                <h1 className="text-xl font-semibold">
                    Hola, {user?.displayName || user?.email}
                </h1>
                {empresa && (
                    <p className="text-sm text-muted-foreground mt-1">
                    Empresa: <span className="font-medium text-foreground">
                        {empresa.nombreFantasia || empresa.razonSocial || 'Sin nombre registrado'}
                    </span>
                    </p>
                )}
                {!empresa && companyId && (
                    <p className="text-sm text-destructive mt-1">
                    No se encontró la empresa asociada a tu usuario. Contacta al administrador.
                    </p>
                )}
            </header>

            {obras.length === 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle>No tiene obras asignadas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Actualmente no tiene ninguna obra asociada a su correo electrónico. Por favor, contacte con el administrador.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {obras.map(obra => (
                        <Card key={obra.id} className="flex flex-col">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <CardTitle>{obra.nombreFaena}</CardTitle>
                                    <Building className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <CardDescription>{obra.direccion}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <div className="text-sm text-muted-foreground">Avance global</div>
                                <div className="text-4xl font-bold">{(obra.avanceAcumulado ?? 0).toFixed(1)}%</div>
                            </CardContent>
                            <CardFooter>
                                <Button asChild className="w-full">
                                    <Link href={`/cliente/obras/${obra.id}`}>
                                        Ver Detalle de Avance
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </main>
    </div>
  );
}
