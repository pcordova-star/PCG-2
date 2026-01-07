// src/app/admin/pricing/page.tsx
"use client";

import React, { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Loader2, ArrowLeft, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface PricingConfig {
  baseMensual: number;
  valorPorUsuario: number;
  currency: 'CLP' | 'UF';
  ufValue: number;
  modulos: {
    cumplimientoLegal: number;
    analisisPlanosIA: number;
    prevencionRiesgos: number;
    checklists: number;
    controlDocumental: number;
  };
}

const defaultPricing: PricingConfig = {
  baseMensual: 100000,
  valorPorUsuario: 35000,
  currency: 'CLP',
  ufValue: 37000,
  modulos: {
    cumplimientoLegal: 50000,
    analisisPlanosIA: 75000,
    prevencionRiesgos: 60000,
    checklists: 40000,
    controlDocumental: 45000,
  },
};

export default function AdminPricingPage() {
  const { role, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [config, setConfig] = useState<PricingConfig>(defaultPricing);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && role !== 'superadmin') {
      router.replace('/dashboard');
    }
  }, [authLoading, role, router]);

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      const configRef = doc(firebaseDb, "config", "pricing");
      const configSnap = await getDoc(configRef);
      if (configSnap.exists()) {
        const data = configSnap.data();
        setConfig({ ...defaultPricing, ...data } as PricingConfig);
      } else {
        setConfig(defaultPricing);
      }
      setLoading(false);
    };
    fetchConfig();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericValue = Number(value);

    if (name.startsWith('modulos.')) {
        const moduleKey = name.split('.')[1] as keyof PricingConfig['modulos'];
        setConfig(prev => ({
            ...prev,
            modulos: {
                ...prev.modulos,
                [moduleKey]: numericValue
            }
        }));
    } else {
        setConfig(prev => ({
            ...prev,
            [name]: numericValue
        }));
    }
  };
  
  const handleSelectChange = (name: 'currency', value: string) => {
    setConfig(prev => ({...prev, [name]: value}));
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const configRef = doc(firebaseDb, "config", "pricing");
      await setDoc(configRef, {
        ...config,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      toast({ title: "Configuración guardada", description: "Los precios globales han sido actualizados." });
    } catch (error) {
      console.error("Error saving pricing config:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la configuración." });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (authLoading || loading) {
    return <div className="p-8 text-center"><Loader2 className="animate-spin" /> Cargando configuración...</div>
  }

  return (
    <div className="space-y-6">
      <header>
        <Button variant="outline" size="sm" asChild className="mb-4">
            <Link href="/admin/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Dashboard</Link>
        </Button>
        <h1 className="text-3xl font-bold">Precios Globales de la Plataforma</h1>
        <p className="text-muted-foreground">Define los precios base, por módulo y la moneda de facturación que se usarán para los cálculos.</p>
      </header>

      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <CardTitle>Configuración de Moneda</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="currency">Moneda de Facturación</Label>
                <Select value={config.currency} onValueChange={(v) => handleSelectChange('currency', v)}>
                  <SelectTrigger id="currency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLP">Pesos Chilenos (CLP)</SelectItem>
                    <SelectItem value="UF">Unidad de Fomento (UF)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ufValue">Valor UF del día (en CLP)</Label>
                <Input id="ufValue" name="ufValue" type="number" value={config.ufValue} onChange={handleInputChange} disabled={config.currency !== 'UF'} />
              </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Precios Base ({config.currency})</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="baseMensual">Monto Base Mensual</Label>
              <Input id="baseMensual" name="baseMensual" type="number" value={config.baseMensual} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valorPorUsuario">Valor por Usuario Adicional</Label>
              <Input id="valorPorUsuario" name="valorPorUsuario" type="number" value={config.valorPorUsuario} onChange={handleInputChange} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Precios por Módulo Adicional (Mensual, {config.currency})</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="modulos.cumplimientoLegal">Módulo de Cumplimiento Legal</Label>
              <Input id="modulos.cumplimientoLegal" name="modulos.cumplimientoLegal" type="number" value={config.modulos.cumplimientoLegal} onChange={handleInputChange} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="modulos.analisisPlanosIA">Módulo de Análisis de Planos IA</Label>
              <Input id="modulos.analisisPlanosIA" name="modulos.analisisPlanosIA" type="number" value={config.modulos.analisisPlanosIA} onChange={handleInputChange} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="modulos.prevencionRiesgos">Módulo de Prevención de Riesgos</Label>
              <Input id="modulos.prevencionRiesgos" name="modulos.prevencionRiesgos" type="number" value={config.modulos.prevencionRiesgos} onChange={handleInputChange} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="modulos.checklists">Módulo de Checklists Operacionales</Label>
              <Input id="modulos.checklists" name="modulos.checklists" type="number" value={config.modulos.checklists} onChange={handleInputChange} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="modulos.controlDocumental">Módulo de Control Documental</Label>
              <Input id="modulos.controlDocumental" name="modulos.controlDocumental" type="number" value={config.modulos.controlDocumental} onChange={handleInputChange} />
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-end mt-6">
            <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                {isSaving ? "Guardando..." : "Guardar Configuración de Precios"}
            </Button>
        </div>
      </form>
    </div>
  );
}
