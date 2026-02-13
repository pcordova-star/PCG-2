// src/app/admin/facturacion/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Company } from '@/types/pcg';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const IVA_RATE = 0.19;
const BUNDLE_PREVENCION_PERCENT = 0.35;
const BUNDLE_CALIDAD_PERCENT = 0.25;
const BUNDLE_CONJUNTO_PERCENT = 0.45;

interface PricingConfig {
  costoPorObraBajaComplejidad: number;
  costoPorObraAltaComplejidad: number;
  currency: 'CLP' | 'UF';
  ufValue: number;
}

const defaultPricing: PricingConfig = {
  costoPorObraBajaComplejidad: 100000,
  costoPorObraAltaComplejidad: 200000,
  currency: 'CLP',
  ufValue: 37000,
};

type FacturacionData = {
  company: Company;
  userCount: number;
  obraCount: number;
  costoBaseObras: number;
  costoModulos: number;
  subtotalBruto: number;
  montoDescuento: number;
  totalSinIvaCLP: number;
  totalConIvaCLP: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
}

export default function AdminFacturacionPage() {
  const { role, loading: authLoading } = useAuth();
  const router = useRouter();
  const isSuperAdmin = role === 'superadmin';

  const [data, setData] = useState<FacturacionData[]>([]);
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>(defaultPricing);
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
        const firestoreConfig = configSnap.data();
        const configData: PricingConfig = {
          ...defaultPricing,
          ...firestoreConfig,
          // For backward compatibility, use baseMensual if costoPorObraBajaComplejidad is not set
          costoPorObraBajaComplejidad: firestoreConfig?.costoPorObraBajaComplejidad || firestoreConfig?.baseMensual || defaultPricing.costoPorObraBajaComplejidad,
        };
        setPricingConfig(configData);
        
        const companiesSnap = await getDocs(collection(firebaseDb, 'companies'));
        const allCompanies = companiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));

        const facturacionPromises = allCompanies.map(async (company) => {
            if (company.planTipo === 'trial' || company.planTipo === 'freemium' || company.planTipo === 'bloqueado') {
                return null;
            }

            const usersQuery = query(collection(firebaseDb, 'users'), where('empresaId', '==', company.id), where('activo', '==', true));
            const obrasQuery = query(collection(firebaseDb, 'obras'), where('empresaId', '==', company.id));

            const [usersSnap, obrasSnap] = await Promise.all([ getDocs(usersQuery), getDocs(obrasQuery) ]);

            const userCount = usersSnap.size;
            const obraCount = obrasSnap.size;
            
            // Lógica de cálculo de costo base por obras
            // TODO: Implementar lógica de complejidad de obra. Por ahora, todas son baja complejidad.
            const costoPorObra = configData.costoPorObraBajaComplejidad;
            const costoBaseObras = obraCount * costoPorObra;
            
            // Lógica de cálculo de módulos por porcentaje
            const tieneBundlePrevencion = company.feature_risk_prevention_enabled || company.feature_compliance_module_enabled;
            const tieneBundleCalidad = company.feature_operational_checklists_enabled || company.feature_document_control_enabled;

            let porcentajeModulos = 0;
            if (tieneBundlePrevencion && tieneBundleCalidad) {
                porcentajeModulos = BUNDLE_CONJUNTO_PERCENT;
            } else if (tieneBundlePrevencion) {
                porcentajeModulos = BUNDLE_PREVENCION_PERCENT;
            } else if (tieneBundleCalidad) {
                porcentajeModulos = BUNDLE_CALIDAD_PERCENT;
            }
            
            const costoModulos = costoBaseObras * porcentajeModulos;
            const subtotalBruto = costoBaseObras + costoModulos;

            // Lógica de descuentos
            let montoDescuento = 0;
            if (company.descuentoTipo === 'porcentaje' && company.descuentoValor && company.descuentoValor > 0) {
                montoDescuento = subtotalBruto * (company.descuentoValor / 100);
            } else if (company.descuentoTipo === 'monto_fijo' && company.descuentoValor && company.descuentoValor > 0) {
                montoDescuento = company.descuentoValor;
            }

            const totalSinIva = subtotalBruto - montoDescuento;

            // Conversión a CLP si la moneda es UF
            const multiplicadorUF = configData.currency === 'UF' ? configData.ufValue : 1;
            const totalSinIvaCLP = totalSinIva * multiplicadorUF;
            const totalConIvaCLP = totalSinIvaCLP * (1 + IVA_RATE);

            return { 
                company, 
                userCount, 
                obraCount,
                costoBaseObras: costoBaseObras * multiplicadorUF,
                costoModulos: costoModulos * multiplicadorUF,
                subtotalBruto: subtotalBruto * multiplicadorUF,
                montoDescuento: montoDescuento * multiplicadorUF,
                totalSinIvaCLP, 
                totalConIvaCLP 
            };
        });

        const facturacionData = (await Promise.all(facturacionPromises)).filter(Boolean) as FacturacionData[];
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
       <Button asChild variant="outline" size="sm">
          <Link href="/admin/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Dashboard</Link>
      </Button>
      <header>
        <h1 className="text-3xl font-bold">Facturación Estimada</h1>
        <p className="text-muted-foreground">Cálculo de facturación mensual por empresa basado en obras activas, módulos y descuentos.</p>
      </header>

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Detalle de Facturación Estimada por Empresa</CardTitle>
          <CardDescription>
            Cálculos basados en la configuración de cada empresa. Se excluyen empresas en período de prueba, freemium o bloqueadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead className="text-center">Obras Activas</TableHead>
                <TableHead className="text-center">Usuarios Activos</TableHead>
                <TableHead className="text-right">Subtotal Bruto</TableHead>
                <TableHead className="text-right">Descuento</TableHead>
                <TableHead className="text-right">Total Neto (CLP)</TableHead>
                <TableHead className="text-right">Total con IVA (CLP)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center h-24"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
              ) : data.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center h-24">No hay empresas con planes de pago activos para facturar.</TableCell></TableRow>
              ) : (
                data.map(({ company, obraCount, userCount, subtotalBruto, montoDescuento, totalSinIvaCLP, totalConIvaCLP }) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.nombreFantasia || company.razonSocial}</TableCell>
                    <TableCell className="text-center">{obraCount}</TableCell>
                    <TableCell className="text-center">{userCount}</TableCell>
                    <TableCell className="text-right">{formatCurrency(subtotalBruto)}</TableCell>
                    <TableCell className="text-right text-green-600">
                        {montoDescuento > 0 ? `-${formatCurrency(montoDescuento)}` : formatCurrency(0)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(totalSinIvaCLP)}</TableCell>
                    <TableCell className="text-right font-bold text-primary">{formatCurrency(totalConIvaCLP)}</TableCell>
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
