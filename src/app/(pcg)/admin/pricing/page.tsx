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
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface PricingConfig {
  costoPorObraBajaComplejidad: number;
  costoPorObraAltaComplejidad: number;
  valorPorUsuario: number;
  currency: 'CLP' | 'UF';
  ufValue: number;
}

const defaultPricing: PricingConfig = {
  costoPorObraBajaComplejidad: 100000,
  costoPorObraAltaComplejidad: 200000,
  valorPorUsuario: 35000,
  currency: 'CLP',
  ufValue: 37000,
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
        setConfig({ 
            ...defaultPricing, 
            ...data,
            // For backward compatibility, map old `baseMensual` to new field name
            costoPorObraBajaComplejidad: data.costoPorObraBajaComplejidad || data.baseMensual || defaultPricing.costoPorObraBajaComplejidad,
        });
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
    setConfig(prev => ({
        ...prev,
        [name]: numericValue
    }));
  };
  
  const handleSelectChange = (name: 'currency', value: string) => {
    setConfig(prev => ({...prev, [name]: value}));
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const configRef = doc(firebaseDb, "config", "pricing");
      // Save with both new and old field names for backward compatibility during transition
      const dataToSave = {
        ...config,
        baseMensual: config.costoPorObraBajaComplejidad,
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
                <Label htmlFor="ufValue">Valor UF del día (en CLP)</Label>
                <Input id="ufValue" name="ufValue" type="number" value={config.ufValue} onChange={handleInputChange} />
              </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Valores de Referencia ({config.currency})</CardTitle>
            <CardDescription>Estos valores se usan como predeterminados si una empresa no tiene precios personalizados.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="costoPorObraBajaComplejidad">Costo por Obra (Baja Complejidad)</Label>
              <Input id="costoPorObraBajaComplejidad" name="costoPorObraBajaComplejidad" type="number" value={config.costoPorObraBajaComplejidad} onChange={handleInputChange} />
              <p className="text-xs text-muted-foreground">Obras con hasta 50 partidas en su itemizado.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="costoPorObraAltaComplejidad">Costo por Obra (Alta Complejidad)</Label>
              <Input id="costoPorObraAltaComplejidad" name="costoPorObraAltaComplejidad" type="number" value={config.costoPorObraAltaComplejidad} onChange={handleInputChange} />
              <p className="text-xs text-muted-foreground">Obras con más de 50 partidas.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="valorPorUsuario">Valor por Usuario Adicional</Label>
              <Input id="valorPorUsuario" name="valorPorUsuario" type="number" value={config.valorPorUsuario} onChange={handleInputChange} />
              <p className="text-xs text-muted-foreground">Actualmente no se usa en los cálculos, pero se puede configurar para el futuro.</p>
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
