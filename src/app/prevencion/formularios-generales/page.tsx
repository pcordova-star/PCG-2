// src/app/prevencion/formularios-generales/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { InvestigacionIncidentesTab } from './components/InvestigacionIncidentesTab';
import { InvestigacionAccidentesTab } from './components/InvestigacionAccidentesTab';
import { Obra, RegistroIncidente, IPERRegistro } from '@/types/pcg';
import { IperForm, IperFormValues } from './components/IperGeneroRow';
import { IperPrintSheet } from './components/IperPrintSheet';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

// --- Estado inicial para el formulario IPER ---
const initialIperState: IperFormValues = {
  tarea: "", zona: "", peligro: "", riesgo: "", categoriaPeligro: "Mecánico",
  probabilidadHombre: 1, consecuenciaHombre: 1, probabilidadMujer: 1, consecuenciaMujer: 1,
  jerarquiaControl: "Control Administrativo", controlEspecificoGenero: "",
  responsable: "", plazo: "", estadoControl: "PENDIENTE",
  probabilidadResidual: 1, consecuenciaResidual: 1,
};


export default function FormulariosGeneralesPrevencionPage() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>("");
  const [investigaciones, setInvestigaciones] = useState<RegistroIncidente[]>([]);
  const [iperRegistros, setIperRegistros] = useState<IPERRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { companyId, role } = useAuth();
  const { toast } = useToast();
  
  // Estado para el formulario IPER
  const [iperFormValues, setIperFormValues] = useState<IperFormValues>(initialIperState);
  const [guardandoIper, setGuardandoIper] = useState(false);
  const [iperSeleccionado, setIperSeleccionado] = useState<IPERRegistro | null>(null);


  useEffect(() => {
    if (!companyId && role !== 'superadmin') return;

    let obrasQuery;
    if (role === 'superadmin') {
      obrasQuery = query(collection(firebaseDb, "obras"), orderBy("nombreFaena"));
    } else {
      obrasQuery = query(collection(firebaseDb, "obras"), where("empresaId", "==", companyId), orderBy("nombreFaena"));
    }

    const unsubscribeObras = onSnapshot(obrasQuery, (snapshot) => {
      const obrasList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra));
      setObras(obrasList);
      if (obrasList.length > 0 && !obraSeleccionadaId) {
        setObraSeleccionadaId(obrasList[0].id);
      }
    }, (error) => console.error("Error fetching obras:", error));

    return () => unsubscribeObras();
  }, [companyId, role]);

  useEffect(() => {
    if (!obraSeleccionadaId) {
      setInvestigaciones([]);
      setIperRegistros([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Suscripción para Investigaciones
    const qInvestigaciones = query(
      collection(firebaseDb, "investigacionesIncidentes"),
      where("obraId", "==", obraSeleccionadaId),
      orderBy("createdAt", "desc")
    );
    const unsubscribeInvestigaciones = onSnapshot(qInvestigaciones, (snapshot) => {
      const investigacionesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RegistroIncidente));
      setInvestigaciones(investigacionesList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching investigaciones:", error);
      setLoading(false);
    });

    // Suscripción para IPER
    const iperCollectionRef = collection(firebaseDb, "obras", obraSeleccionadaId, "iper");
    const qIper = query(iperCollectionRef, orderBy("createdAt", "desc"));
    const unsubscribeIper = onSnapshot(qIper, (snapshot) => {
      const iperList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IPERRegistro));
      setIperRegistros(iperList);
    }, (error) => console.error("Error fetching IPER records:", error));


    return () => {
      unsubscribeInvestigaciones();
      unsubscribeIper();
    };
  }, [obraSeleccionadaId]);
  
  const handleIperSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!obraSeleccionadaId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Debe seleccionar una obra.' });
        return;
    }
    setGuardandoIper(true);
    try {
        const nivel_riesgo_hombre = iperFormValues.probabilidadHombre * iperFormValues.consecuenciaHombre;
        const nivel_riesgo_mujer = iperFormValues.probabilidadMujer * iperFormValues.consecuenciaMujer;
        const nivel_riesgo_residual = iperFormValues.probabilidadResidual * iperFormValues.consecuenciaResidual;

        const iperDoc: Omit<IPERRegistro, 'id'> = {
            obraId: obraSeleccionadaId,
            tarea: iperFormValues.tarea,
            zona: iperFormValues.zona,
            peligro: iperFormValues.peligro === 'Otro' ? iperFormValues.peligroOtro || '' : iperFormValues.peligro,
            riesgo: iperFormValues.riesgo === 'Otro' ? iperFormValues.riesgoOtro || '' : iperFormValues.riesgo,
            categoriaPeligro: iperFormValues.categoriaPeligro,
            probabilidad_hombre: iperFormValues.probabilidadHombre,
            consecuencia_hombre: iperFormValues.consecuenciaHombre,
            nivel_riesgo_hombre,
            probabilidad_mujer: iperFormValues.probabilidadMujer,
            consecuencia_mujer: iperFormValues.consecuenciaMujer,
            nivel_riesgo_mujer,
            jerarquiaControl: iperFormValues.jerarquiaControl,
            control_especifico_genero: iperFormValues.controlEspecificoGenero === 'Otro' ? iperFormValues.controlEspecificoGeneroOtro || '' : iperFormValues.controlEspecificoGenero,
            responsable: iperFormValues.responsable,
            plazo: iperFormValues.plazo,
            estadoControl: iperFormValues.estadoControl,
            probabilidad_residual: iperFormValues.probabilidadResidual,
            consecuencia_residual: iperFormValues.consecuenciaResidual,
            nivel_riesgo_residual,
            createdAt: serverTimestamp(),
            medidasControlExistentes: '',
            medidasControlPropuestas: '',
            responsableImplementacion: '',
            plazoImplementacion: ''
        };
        const iperCollectionRef = collection(firebaseDb, "obras", obraSeleccionadaId, "iper");
        await addDoc(iperCollectionRef, iperDoc);

        toast({ title: 'Éxito', description: 'Registro IPER guardado correctamente.' });
        setIperFormValues(initialIperState);

    } catch (error) {
        console.error("Error guardando IPER:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el registro IPER.' });
    } finally {
        setGuardandoIper(false);
    }
  }


  return (
    <section className="space-y-6">
      <header className="flex items-center gap-4 no-print">
        <Button variant="outline" size="icon" onClick={() => router.push('/prevencion')}>
          <ArrowLeft />
        </Button>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Formularios Generales de Prevención
          </h1>
          <p className="text-lg text-muted-foreground">
            Herramientas para registrar y analizar eventos, desde casi accidentes hasta accidentes graves, e identificar peligros.
          </p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Selección de Obra</CardTitle>
          <CardDescription>
            Seleccione la obra para ver y registrar formularios.
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
      
      <Card>
          <CardHeader>
              <CardTitle>Investigación de Incidentes y Accidentes</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="incidentes">
                <TabsList>
                <TabsTrigger value="incidentes">Incidentes / Casi Accidentes (Ishikawa)</TabsTrigger>
                <TabsTrigger value="accidentes">Accidentes (Árbol de Causas)</TabsTrigger>
                </TabsList>
                <TabsContent value="incidentes" className="pt-4">
                <InvestigacionIncidentesTab
                    obraId={obraSeleccionadaId}
                    investigaciones={investigaciones.filter(inv => inv.metodoAnalisis !== 'arbol_causas')}
                    loading={loading}
                    onUpdate={() => { /* Lógica para forzar recarga si es necesario */ }}
                />
                </TabsContent>
                <TabsContent value="accidentes" className="pt-4">
                <InvestigacionAccidentesTab
                    obraId={obraSeleccionadaId}
                    investigaciones={investigaciones.filter(inv => inv.metodoAnalisis === 'arbol_causas')}
                    loading={loading}
                    onUpdate={() => { /* Lógica para forzar recarga si es necesario */ }}
                />
                </TabsContent>
            </Tabs>
          </CardContent>
      </Card>

      <Card>
          <CardHeader>
              <CardTitle>Identificación de Peligros y Evaluación de Riesgos (IPER) con enfoque de género</CardTitle>
              <CardDescription>Use este formulario para registrar y evaluar los riesgos de las tareas en la obra.</CardDescription>
          </CardHeader>
          <CardContent>
              <form onSubmit={handleIperSubmit}>
                  <IperForm value={iperFormValues} onChange={setIperFormValues} />
                  <div className="flex gap-4 mt-6">
                      <Button type="submit" disabled={guardandoIper}>
                          {guardandoIper ? 'Guardando IPER...' : 'Guardar Registro IPER'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setIperFormValues(initialIperState)}>
                          Limpiar Formulario
                      </Button>
                  </div>
              </form>
          </CardContent>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle>Historial de IPER Registrados</CardTitle>
          <CardDescription>
            Listado de todos los análisis de riesgo guardados para la obra seleccionada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Cargando historial IPER...</p>
          ) : iperRegistros.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay registros IPER para esta obra.</p>
          ) : (
            <div className="space-y-2">
              {iperRegistros.map(iper => (
                <div key={iper.id} className="border p-3 rounded-md text-sm flex justify-between items-center">
                    <div>
                        <p className="font-semibold">{iper.tarea}</p>
                        <p className="text-xs text-muted-foreground">Peligro: {iper.peligro}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline">Riesgo H: {iper.nivel_riesgo_hombre}</Badge>
                        <Badge variant="outline">Riesgo M: {iper.nivel_riesgo_mujer}</Badge>
                        <Button asChild variant="secondary" size="sm">
                            <Link href={`/prevencion/formularios-generales/iper/${iper.id}/imprimir`} target="_blank">
                                <FileText className="mr-2 h-4 w-4" /> Ver Ficha
                            </Link>
                        </Button>
                    </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <IperPrintSheet iper={iperSeleccionado} obraNombre={obras.find(o => o.id === iperSeleccionado?.obraId)?.nombreFaena} />

    </section>
  );
}
