// src/app/prevencion/ppr/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { PprSidebar } from './components/PprSidebar';
import { PprSection1InfoGeneral } from './components/sections/PprSection1InfoGeneral';
import { PprSection2Objetivo } from './components/sections/PprSection2Objetivo';
import { PprSection3Organizacion } from './components/sections/PprSection3Organizacion';
import { PprSection4Iper } from './components/sections/PprSection4Iper';
import { PprSection5MedidasControl } from './components/sections/PprSection5MedidasControl';
import { PprSection6Charlas } from './components/sections/PprSection6Charlas';
import { PprSection7CapacitacionDs44 } from './components/sections/PprSection7CapacitacionDs44';
import { PprSection8Procedimientos } from './components/sections/PprSection8Procedimientos';
import { PprSection9ProtocolosEmergencia } from './components/sections/PprSection9ProtocolosEmergencia';
import { PprSection10Fiscalizacion } from './components/sections/PprSection10Fiscalizacion';
import { PprSection11Registro } from './components/sections/PprSection11Registro';
import { PprSection12EnfoqueGenero } from './components/sections/PprSection12EnfoqueGenero';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Obra, IPERRegistro, Charla } from '@/types/pcg';
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { firebaseDb } from '@/lib/firebaseClient';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { generarPprPdf, PprData } from '@/lib/pdf/generarPprPdf';
import { useToast } from '@/hooks/use-toast';
import { PprStatusBanner } from './components/PprStatusBanner';
import { calcularPprStatus, PprStatus } from './pprStatus';
import { useAuth } from '@/context/AuthContext';


export type PprSectionId =
  | "info-general"
  | "objetivo"
  | "organizacion"
  | "iper"
  | "medidas-control"
  | "charlas"
  | "capacitacion-ds44"
  | "procedimientos"
  | "protocolos-emergencia"
  | "fiscalizacion"
  | "registro"
  | "enfoque-genero";

export default function PprPage() {
  const [activeSection, setActiveSection] = useState<PprSectionId>('info-general');
  const [obras, setObras] = useState<Obra[]>([]);
  const [selectedObraId, setSelectedObraId] = useState<string>('');
  
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null);
  const [iperData, setIperData] = useState<IPERRegistro[]>([]);
  const [charlasData, setCharlasData] = useState<Charla[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [pprStatus, setPprStatus] = useState<PprStatus | null>(null);

  const { toast } = useToast();
  const { companyId, role } = useAuth();


  // Cargar lista de obras
  useEffect(() => {
    if (!companyId && role !== 'superadmin') return;

    const fetchObras = async () => {
      let obrasQuery;
      if (role === 'superadmin') {
        obrasQuery = query(collection(firebaseDb, "obras"));
      } else {
        obrasQuery = query(collection(firebaseDb, "obras"), where("empresaId", "==", companyId));
      }
      
      const querySnapshot = await getDocs(obrasQuery);
      const obrasList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra));
      setObras(obrasList);
      if (obrasList.length > 0) {
        setSelectedObraId(obrasList[0].id);
      }
    };
    fetchObras();
  }, [companyId, role]);

  // Cargar datos cuando cambia la obra seleccionada
  useEffect(() => {
    if (!selectedObraId) return;

    const fetchDataForObra = async () => {
      setLoading(true);

      // Fetch Obra
      const obraRef = doc(firebaseDb, "obras", selectedObraId);
      const obraSnap = await getDoc(obraRef);
      if (obraSnap.exists()) {
        setSelectedObra({ id: obraSnap.id, ...obraSnap.data() } as Obra);
      }
      
      // Fetch IPER
      const iperQuery = query(collection(firebaseDb, "obras", selectedObraId, "iper"));
      const iperSnapshot = await getDocs(iperQuery);
      const iperList = iperSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IPERRegistro));
      setIperData(iperList);

      // Fetch Charlas
      const charlasQuery = query(collection(firebaseDb, "charlas"), where("obraId", "==", selectedObraId));
      const charlasSnapshot = await getDocs(charlasQuery);
      const charlasList = charlasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Charla));
      setCharlasData(charlasList);

      // Calcular estado del PPR
      const status = calcularPprStatus({ iperRegistros: iperList, charlas: charlasList });
      setPprStatus(status);
      
      setLoading(false);
    };

    fetchDataForObra();
  }, [selectedObraId]);

  const handleExportPdf = async () => {
    if (!selectedObra) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "No hay una obra seleccionada para exportar."
        });
        return;
    }
    setGenerandoPdf(true);
    try {
        const pprData: PprData = {
            obra: selectedObra,
            iperRegistros: iperData,
            charlas: charlasData,
        };
        await generarPprPdf(pprData);
    } catch (error) {
        console.error("Error generando PDF:", error);
        toast({
            variant: "destructive",
            title: "Error al generar PDF",
            description: "Ocurrió un problema al crear el documento."
        });
    } finally {
        setGenerandoPdf(false);
    }
  };


  const renderSection = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-12 w-1/2" />
          <Skeleton className="h-8 w-3/4" />
          <div className="space-y-2 pt-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-5/6" />
          </div>
        </div>
      );
    }

    switch (activeSection) {
      case 'info-general': return <PprSection1InfoGeneral obra={selectedObra} />;
      case 'objetivo': return <PprSection2Objetivo />;
      case 'organizacion': return <PprSection3Organizacion obra={selectedObra} />;
      case 'iper': return <PprSection4Iper iperData={iperData} />;
      case 'medidas-control': return <PprSection5MedidasControl iperData={iperData} />;
      case 'charlas': return <PprSection6Charlas charlasData={charlasData} />;
      case 'capacitacion-ds44': return <PprSection7CapacitacionDs44 iperData={iperData}/>;
      case 'procedimientos': return <PprSection8Procedimientos />;
      case 'protocolos-emergencia': return <PprSection9ProtocolosEmergencia />;
      case 'fiscalizacion': return <PprSection10Fiscalizacion iperData={iperData} />;
      case 'registro': return <PprSection11Registro />;
      case 'enfoque-genero': return <PprSection12EnfoqueGenero />;
      default: return <PprSection1InfoGeneral obra={selectedObra} />;
    }
  };

  return (
    <div className="grid md:grid-cols-[280px_1fr] gap-8 items-start">
      <PprSidebar activeSection={activeSection} setActiveSection={setActiveSection} />
      <main className="space-y-8">
         <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div className="max-w-md space-y-2">
                <Label htmlFor="obra-select">Obra Seleccionada</Label>
                <Select value={selectedObraId} onValueChange={setSelectedObraId}>
                <SelectTrigger id="obra-select">
                    <SelectValue placeholder="Seleccione una obra para ver su PPR" />
                </SelectTrigger>
                <SelectContent>
                    {obras.map(obra => (
                    <SelectItem key={obra.id} value={obra.id}>{obra.nombreFaena}</SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
             <Button onClick={handleExportPdf} disabled={generandoPdf || !selectedObra}>
                {generandoPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                {generandoPdf ? "Generando PDF..." : "Exportar Programa en PDF"}
            </Button>
          </div>
          
          {loading ? (
             <Skeleton className="h-24 w-full" />
          ) : pprStatus ? (
             <PprStatusBanner status={pprStatus} />
          ) : null}

        {renderSection()}
      </main>
    </div>
  );
}
