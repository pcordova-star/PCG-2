// src/app/admin/facturacion/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { Company } from '@/types/pcg';

const IVA_RATE = 0.19;

// --- PRECIOS FIJOS DE PLATAFORMA PARA ESTIMACIÓN ---
const PLATFORM_BASE_MENSUAL = 100000;
const PLATFORM_VALOR_POR_USUARIO = 35000;


type FacturacionData = {
  company: Company;
  userCount: number;
  obraCount: number;
  totalSinIVA: number;
  totalConIVA: number;
};

function formatCurrency(value: number) {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
}

export default function AdminFacturacionPage() {
  const { role, loading: authLoading } = useAuth();
  const router = useRouter();
  const isSuperAdmin = role === 'superadmin';

  const [data, setData] = useState<FacturacionData[]>([]);
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
        const companiesSnap = await getDocs(collection(firebaseDb, 'companies'));
        const allCompanies = companiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));

        const facturacionPromises = allCompanies.map(async (company) => {
            const usersQuery = query(collection(firebaseDb, 'users'), where('empresaId', '==', company.id));
            const obrasQuery = query(collection(firebaseDb, 'obras'), where('empresaId', '==', company.id));

            const [usersSnap, obrasSnap] = await Promise.all([
                getDocs(usersQuery),
                getDocs(obrasQuery)
            ]);

            const userCount = usersSnap.size;
            const obraCount = obrasSnap.size;
            
            // --- CALCULO BASADO EN VALORES FIJOS DE PLATAFORMA ---
            const totalSinIVA = PLATFORM_BASE_MENSUAL + (userCount * PLATFORM_VALOR_POR_USUARIO);
            const totalConIVA = totalSinIVA * (1 + IVA_RATE);

            return { company, userCount, obraCount, totalSinIVA, totalConIVA };
        });

        const facturacionData = await Promise.all(facturacionPromises);
        facturacionData.sort((a, b) => (a.company.nombreFantasia || a.company.razonSocial).localeCompare(b.company.nombreFantasia || b.company.razonSocial));
        setData(facturacionData);
        
      } catch (err) {
        console.error("Error fetching facturacion data:", err);
        setError("No se pudieron cargar los datos de facturación.");
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
        <h1 className="text-3xl font-bold">Facturación Estimada</h1>
        <p className="text-muted-foreground">Cálculo de facturación mensual por empresa basado en los precios de la plataforma.</p>
      </header>

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Detalle de Facturación Estimada por Empresa</CardTitle>
          <CardDescription>Los cálculos se basan en {formatCurrency(PLATFORM_BASE_MENSUAL)} (base) + {formatCurrency(PLATFORM_VALOR_POR_USUARIO)} por usuario + IVA (19%).</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead className="text-center">Obras</TableHead>
                <TableHead className="text-center">Usuarios</TableHead>
                <TableHead className="text-right">Total Neto</TableHead>
                <TableHead className="text-right">Total con IVA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center h-24"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
              ) : data.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center h-24">No hay empresas para facturar.</TableCell></TableRow>
              ) : (
                data.map(({ company, userCount, obraCount, totalSinIVA, totalConIVA }) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.nombreFantasia || company.razonSocial}</TableCell>
                    <TableCell className="text-center">{obraCount}</TableCell>
                    <TableCell className="text-center">{userCount}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(totalSinIVA)}</TableCell>
                    <TableCell className="text-right font-bold text-primary">{formatCurrency(totalConIVA)}</TableCell>
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
