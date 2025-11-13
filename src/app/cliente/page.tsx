// src/app/cliente/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Building, ArrowRight } from 'lucide-react';

type Obra = {
  id: string;
  nombreFaena: string;
  direccion: string;
  avanceAcumulado?: number;
};

export default function ClienteDashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [obras, setObras] = useState<Obra[]>([]);
  const [loadingObras, setLoadingObras] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login/cliente');
    }
  }, [user, loading, router]);

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

  if (loading || loadingObras) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Cargando portal del cliente...</p>
      </div>
    );
  }
  
  if (!user) {
      return null;
  }

  return (
    <div className="min-h-screen bg-muted/40">
        <header className="bg-background border-b">
            <div className="container mx-auto flex justify-between items-center p-4">
                 <h1 className="text-xl font-bold text-primary">Portal del Cliente</h1>
                 <div className="flex items-center gap-4">
                     <span className="text-sm text-muted-foreground hidden sm:inline">{user.email}</span>
                    <Button variant="outline" onClick={logout}>Cerrar Sesión</Button>
                 </div>
            </div>
        </header>

        <main className="container mx-auto p-4 md:p-8">
            <div className="mb-8">
                <h2 className="text-3xl font-bold">Bienvenido, {user.displayName || user.email?.split('@')[0]}</h2>
                <p className="text-muted-foreground">Aquí puede ver un resumen de sus obras en curso.</p>
            </div>

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
