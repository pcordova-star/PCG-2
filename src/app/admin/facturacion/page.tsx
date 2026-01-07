// src/app/admin/facturacion/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { Company } from '@/types/pcg';

const IVA_RATE = 0.19;

type PricingConfig = {
  baseMensual: number;
  valorPorUsuario: number;
  currency: 'CLP' | 'UF';
  ufValue: number;
};

type FacturacionData = {
  company: Company;
  userCount: number;
  obraCount: number;
  totalSinIvaUF: number | null;
  totalSinIvaCLP: number;
  totalConIvaCLP: number;
};

function formatCurrency(value: number, currency: 'CLP' | 'UF' = 'CLP') {
  if (currency === 'UF') {
    return `UF ${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value)}`;
  }
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
}

export default function AdminFacturacionPage() {
  const { role, loading: authLoading } = useAuth();
  const router = useRouter();
  const isSuperAdmin = role === 'superadmin';

  const [data, setData] = useState<FacturacionData[]>([]);
  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null);
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
        const configRef = doc(firebaseDb, "config", "pricing");
        const configSnap = await getDoc(configRef);
        const configData = configSnap.exists() ? configSnap.data() as PricingConfig : null;
        setPricingConfig(configData);
        
        const platBaseMensual = configData?.baseMensual ?? 100000;
        const platValorPorUsuario = configData?.valorPorUsuario ?? 35000;
        const currency = configData?.currency ?? 'CLP';
        const ufValue = configData?.ufValue ?? 37000;

        const companiesSnap = await getDocs(collection(firebaseDb, 'companies'));
        const allCompanies = companiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));

        const facturacionPromises = allCompanies.map(async (company) => {
            const usersQuery = query(collection(firebaseDb, 'users'), where('empresaId', '==', company.id), where('activo', '==', true));
            const obrasQuery = query(collection(firebaseDb, 'obras'), where('empresaId', '==', company.id));

            const [usersSnap, obrasSnap] = await Promise.all([ getDocs(usersQuery), getDocs(obrasQuery) ]);

            const userCount = usersSnap.size;
            const obraCount = obrasSnap.size;
            
            const totalSinIvaBase = platBaseMensual + (userCount * platValorPorUsuario);
            
            let totalSinIvaUF: number | null = null;
            let totalSinIvaCLP: number;

            if (currency === 'UF') {
                totalSinIvaUF = totalSinIvaBase;
                totalSinIvaCLP = totalSinIvaUF * ufValue;
            } else {
                totalSinIvaCLP = totalSinIvaBase;
            }

            const totalConIvaCLP = totalSinIvaCLP * (1 + IVA_RATE);

            return { company, userCount, obraCount, totalSinIvaUF, totalSinIvaCLP, totalConIvaCLP };
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

  const currency = pricingConfig?.currency || 'CLP';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Facturación Estimada</h1>
        <p className="text-muted-foreground">Cálculo de facturación mensual por empresa basado en los precios vigentes de la plataforma.</p>
      </header>

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Detalle de Facturación Estimada por Empresa</CardTitle>
          <CardDescription>
            Los cálculos se basan en los precios definidos en el panel de Precios Globales.
            Moneda actual: <span className="font-bold">{currency}</span>.
            {currency === 'UF' && ` (Valor UF usado: ${formatCurrency(pricingConfig?.ufValue || 0, 'CLP')})`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead className="text-center">Obras</TableHead>
                <TableHead className="text-center">Usuarios</TableHead>
                {currency === 'UF' && <TableHead className="text-right">Total Neto (UF)</TableHead>}
                <TableHead className="text-right">Total Neto (CLP)</TableHead>
                <TableHead className="text-right">Total con IVA (CLP)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center h-24"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
              ) : data.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center h-24">No hay empresas para facturar.</TableCell></TableRow>
              ) : (
                data.map(({ company, userCount, obraCount, totalSinIvaUF, totalSinIvaCLP, totalConIvaCLP }) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.nombreFantasia || company.razonSocial}</TableCell>
                    <TableCell className="text-center">{obraCount}</TableCell>
                    <TableCell className="text-center">{userCount}</TableCell>
                    {currency === 'UF' && <TableCell className="text-right font-semibold">{totalSinIvaUF !== null ? formatCurrency(totalSinIvaUF, 'UF') : 'N/A'}</TableCell>}
                    <TableCell className="text-right font-semibold">{formatCurrency(totalSinIvaCLP, 'CLP')}</TableCell>
                    <TableCell className="text-right font-bold text-primary">{formatCurrency(totalConIvaCLP, 'CLP')}</TableCell>
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
