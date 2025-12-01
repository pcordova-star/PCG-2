// src/app/prevencion/formularios-generales/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { InvestigacionIncidentesTab } from './components/InvestigacionIncidentesTab';
import { InvestigacionAccidentesTab } from './components/InvestigacionAccidentesTab';
import { Obra, RegistroIncidente } from '@/types/pcg';

export default function FormulariosGeneralesPrevencionPage() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>("");
  const [investigaciones, setInvestigaciones] = useState<RegistroIncidente[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { companyId, role } = useAuth();

  useEffect(() => {
    if (!companyId && role !== 'superadmin') return;

    let obrasQuery;
    if (role === 'superadmin') {
      obrasQuery = query(collection(firebaseDb, "obras"), orderBy("nombreFaena"));
    } else {
      obrasQuery = query(collection(firebaseDb, "obras"), where("empresaId", "==", companyId), orderBy("nombreFaena"));
    }

    const unsubscribe = onSnapshot(obrasQuery, (snapshot) => {
      const obrasList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra));
      setObras(obrasList);
      if (obrasList.length > 0 && !obraSeleccionadaId) {
        setObraSeleccionadaId(obrasList[0].id);
      }
    }, (error) => {
      console.error("Error fetching obras:", error);
    });

    return () => unsubscribe();
  }, [companyId, role]);

  useEffect(() => {
    if (!obraSeleccionadaId) {
      setInvestigaciones([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(firebaseDb, "investigacionesIncidentes"),
      where("obraId", "==", obraSeleccionadaId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const investigacionesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RegistroIncidente));
      setInvestigaciones(investigacionesList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching investigaciones:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [obraSeleccionadaId]);

  return (
    <section className="space-y-6">
      <header className="flex items-center gap-4 no-print">
        <Button variant="outline" size="icon" onClick={() => router.push('/prevencion')}>
          <ArrowLeft />
        </Button>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Investigación de Incidentes y Accidentes
          </h1>
          <p className="text-lg text-muted-foreground">
            Herramientas para registrar y analizar eventos, desde casi accidentes hasta accidentes graves.
          </p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Selección de Obra</CardTitle>
          <CardDescription>
            Seleccione la obra para ver y registrar investigaciones.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-md space-y-2">
            <Label htmlFor="obra-select">Obra Activa</Label>
            <Select value={obraSeleccionadaId} onValueChange={setObraSeleccionadaId}>
              <SelectTrigger id="obra-select">
                <SelectValue placeholder="Seleccione una obra..." />
              </SelectTrigger>
              <SelectContent>
                {obras.map(obra => <SelectItem key={obra.id} value={obra.id}>{obra.nombreFaena}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="incidentes">
        <TabsList>
          <TabsTrigger value="incidentes">Incidentes / Casi Accidentes</TabsTrigger>
          <TabsTrigger value="accidentes">Accidentes (Árbol de Causas)</TabsTrigger>
        </TabsList>
        <TabsContent value="incidentes">
          <InvestigacionIncidentesTab
            obraId={obraSeleccionadaId}
            investigaciones={investigaciones.filter(inv => inv.metodoAnalisis !== 'arbol_causas')}
            loading={loading}
            onUpdate={() => { /* Lógica para forzar recarga si es necesario */ }}
          />
        </TabsContent>
        <TabsContent value="accidentes">
          <InvestigacionAccidentesTab
            obraId={obraSeleccionadaId}
            investigaciones={investigaciones.filter(inv => inv.metodoAnalisis === 'arbol_causas')}
            loading={loading}
            onUpdate={() => { /* Lógica para forzar recarga si es necesario */ }}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}
