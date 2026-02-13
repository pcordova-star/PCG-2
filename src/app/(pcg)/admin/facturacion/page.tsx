// src/app/admin/facturacion/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Company, PriceTier } from '@/types/pcg';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const IVA_RATE = 0.19;
const BUNDLE_PREVENCION_PERCENT = 0.35;
const BUNDLE_CALIDAD_PERCENT = 0.25;
const BUNDLE_CONJUNTO_PERCENT = 0.45;
const COMPLEXITY_THRESHOLD = 50;

interface PricingConfig {
  tiersBajaComplejidad: PriceTier[];
  costoPorObraAltaComplejidad: number;
  currency: 'CLP' | 'UF';
  ufValue: number;
}

const defaultPricing: PricingConfig = {
  tiersBajaComplejidad: [
    { id: '1', maxObras: 5, precioUF: 2.0 },
    { id: '2', maxObras: 20, precioUF: 1.6 },
    { id: '3', maxObras: 50, precioUF: 1.3 },
    { id: '4', maxObras: 80, precioUF: 1.0 },
  ],
  costoPorObraAltaComplejidad: 4.0,
  currency: 'UF',
  ufValue: 37000,
};

type FacturacionData = {
  company: Company;
  userCount: number;
  obrasBajaComplejidad: number;
  obrasAltaComplejidad: number;
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
            const companyObras = obrasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            let obrasBajaComplejidad = 0;
            let obrasAltaComplejidad = 0;

            for (const obra of companyObras) {
              const presupuestosQuery = query(collection(firebaseDb, 'presupuestos'), where('obraId', '==', obra.id), orderBy('fechaCreacion', 'desc'), limit(1));
              const presupuestoSnap = await getDocs(presupuestosQuery);

              if (presupuestoSnap.empty) {
                  obrasBajaComplejidad++;
              } else {
                  const mainPresupuesto = presupuestoSnap.docs[0].data();
                  if (mainPresupuesto.items && mainPresupuesto.items.length > COMPLEXITY_THRESHOLD) {
                      obrasAltaComplejidad++;
                  } else {
                      obrasBajaComplejidad++;
                  }
              }
            }

            // --- Lógica de Cálculo en UF ---
            const { ufValue, tiersBajaComplejidad, costoPorObraAltaComplejidad } = configData;
            
            let costoBaseObrasUF = 0;
            costoBaseObrasUF += obrasAltaComplejidad * costoPorObraAltaComplejidad;
            
            if (obrasBajaComplejidad > 0) {
                const sortedTiers = [...(tiersBajaComplejidad || [])].sort((a,b) => a.maxObras - b.maxObras);
                const tier = sortedTiers.find(t => obrasBajaComplejidad <= t.maxObras);
                const precioUnitarioUF = tier ? tier.precioUF : (sortedTiers.length > 0 ? sortedTiers[sortedTiers.length - 1].precioUF : 0);
                costoBaseObrasUF += obrasBajaComplejidad * precioUnitarioUF;
            }
            
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
            
            const costoModulosUF = costoBaseObrasUF * porcentajeModulos;
            const subtotalBrutoUF = costoBaseObrasUF + costoModulosUF;

            let montoDescuentoUF = 0;
            if (company.descuentoTipo === 'porcentaje' && company.descuentoValor && company.descuentoValor > 0) {
                montoDescuentoUF = subtotalBrutoUF * (company.descuentoValor / 100);
            } else if (company.descuentoTipo === 'monto_fijo' && company.descuentoValor && company.descuentoValor > 0) {
                // Asume que el descuento fijo también está en UF
                montoDescuentoUF = company.descuentoValor;
            }

            const totalNetoUF = subtotalBrutoUF - montoDescuentoUF;
            
            // Conversión a CLP
            const subtotalBrutoCLP = subtotalBrutoUF * ufValue;
            const montoDescuentoCLP = montoDescuentoUF * ufValue;
            const totalSinIvaCLP = totalNetoUF * ufValue;
            const totalConIvaCLP = totalSinIvaCLP * (1 + IVA_RATE);

            return { 
                company, 
                userCount, 
                obrasBajaComplejidad,
                obrasAltaComplejidad,
                subtotalBruto: subtotalBrutoCLP,
                montoDescuento: montoDescuentoCLP,
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
                <TableHead className="text-center">Obras (Baja/Alta Comp.)</TableHead>
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
                data.map(({ company, obrasBajaComplejidad, obrasAltaComplejidad, userCount, subtotalBruto, montoDescuento, totalSinIvaCLP, totalConIvaCLP }) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.nombreFantasia || company.razonSocial}</TableCell>
                    <TableCell className="text-center">{obrasBajaComplejidad} / {obrasAltaComplejidad}</TableCell>
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
