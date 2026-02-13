// src/app/admin/pricing/page.tsx
"use client";

import React, { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Loader2, ArrowLeft, PlusCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PriceTier } from '@/types/pcg';


interface PricingConfig {
  tiersBajaComplejidad: PriceTier[];
  costoPorObraAltaComplejidad: number;
  valorPorUsuario: number;
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
  valorPorUsuario: 0.75, // ej: UF
  currency: 'UF',
  ufValue: 37000,
};

export default function AdminPricingPage() {
  const { role, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [config, setConfig] = useState<Omit<PricingConfig, 'tiersBajaComplejidad'>>(defaultPricing);
  const [tiers, setTiers] = useState<PriceTier[]>(defaultPricing.tiersBajaComplejidad);
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
        const { tiersBajaComplejidad, ...restConfig } = data;
        setConfig({ ...defaultPricing, ...restConfig });
        setTiers(tiersBajaComplejidad || defaultPricing.tiersBajaComplejidad);
      } else {
        setConfig(defaultPricing);
        setTiers(defaultPricing.tiersBajaComplejidad);
      }
      setLoading(false);
    };
    fetchConfig();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericValue = Number(value);
    setConfig(prev => ({ ...prev, [name]: numericValue }));
  };
  
  const handleSelectChange = (name: 'currency', value: string) => {
    setConfig(prev => ({...prev, [name]: value as 'CLP' | 'UF'}));
  }

  const handleTierChange = (id: string, field: 'maxObras' | 'precioUF', value: string) => {
      const numericValue = Number(value);
      setTiers(prev => prev.map(tier => 
          tier.id === id ? { ...tier, [field]: numericValue } : tier
      ));
  };
  
  const handleAddTier = () => {
      setTiers(prev => [...prev, { id: crypto.randomUUID(), maxObras: 0, precioUF: 0 }].sort((a,b) => a.maxObras - b.maxObras));
  };

  const handleRemoveTier = (id: string) => {
      setTiers(prev => prev.filter(tier => tier.id !== id));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const configRef = doc(firebaseDb, "config", "pricing");
      const dataToSave = {
        ...config,
        tiersBajaComplejidad: tiers.sort((a,b) => a.maxObras - b.maxObras),
        updatedAt: serverTimestamp(),
      };

      await setDoc(configRef, dataToSave, { merge: true });
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
        <p className="text-muted-foreground">Define los precios base que se usarán como referencia para los cálculos de facturación.</p>
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
                <Label htmlFor="ufValue">Valor UF del día (para conversión a CLP)</Label>
                <Input id="ufValue" name="ufValue" type="number" value={config.ufValue} onChange={handleInputChange} />
              </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Precios por Obra (en {config.currency})</CardTitle>
            <CardDescription>Define los precios base para los distintos tipos de obra.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 border rounded-lg">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold">Tramos para Obras de Baja Complejidad (&lt;=50 partidas)</h4>
                    <Button type="button" size="sm" variant="outline" onClick={handleAddTier}><PlusCircle className="mr-2 h-4 w-4"/>Añadir Tramo</Button>
                </div>
                 <Table>
                    <TableHeader><TableRow><TableHead>Hasta (N° Obras)</TableHead><TableHead>Precio Unitario ({config.currency})</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {tiers.map(tier => (
                            <TableRow key={tier.id}>
                                <TableCell><Input type="number" value={tier.maxObras} onChange={(e) => handleTierChange(tier.id, 'maxObras', e.target.value)} className="w-24"/></TableCell>
                                <TableCell><Input type="number" step="0.1" value={tier.precioUF} onChange={(e) => handleTierChange(tier.id, 'precioUF', e.target.value)} className="w-24"/></TableCell>
                                <TableCell className="text-right"><Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveTier(tier.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                 </Table>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="costoPorObraAltaComplejidad">Costo por Obra de Alta Complejidad (&gt;50 partidas)</Label>
                  <Input id="costoPorObraAltaComplejidad" name="costoPorObraAltaComplejidad" type="number" step="0.1" value={config.costoPorObraAltaComplejidad} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valorPorUsuario">Costo por Usuario de "Dashboard Ejecutivo"</Label>
                  <Input id="valorPorUsuario" name="valorPorUsuario" type="number" step="0.01" value={config.valorPorUsuario} onChange={handleInputChange} />
                </div>
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
