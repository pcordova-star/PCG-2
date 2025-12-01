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
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, FileText, Plus, PlusCircle, Siren } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


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
  
  const [iperFormValues, setIperFormValues] = useState<Partial<IPERRegistro>>(initialIperState);
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
    setIperSeleccionado(null);
    
    const qInvestigaciones = query(
      collection(firebaseDb, "investigacionesIncidentes"),
      where("obraId", "==", obraSeleccionadaId),
      orderBy("createdAt", "desc")
    );
    const unsubscribeInvestigaciones = onSnapshot(qInvestigaciones, (snapshot) => {
      const investigacionesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RegistroIncidente));
      setInvestigaciones(investigacionesList);
    }, (error) => {
      console.error("Error fetching investigaciones:", error);
      setLoading(false);
    });

    const iperCollectionRef = collection(firebaseDb, "obras", obraSeleccionadaId, "iper");
    const qIper = query(iperCollectionRef, orderBy("createdAt", "desc"));
    const unsubscribeIper = onSnapshot(qIper, (snapshot) => {
      const iperList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), correlativo: iperList?.length ? iperList.length - (snapshot.docs.indexOf(doc)) : 1 } as IPERRegistro));
      setIperRegistros(iperList);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching IPER records:", error);
        setLoading(false);
    });


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
        const iperValues = iperFormValues as IperFormValues;
        const nivel_riesgo_hombre = iperValues.probabilidadHombre * iperValues.consecuenciaHombre;
        const nivel_riesgo_mujer = iperValues.probabilidadMujer * iperValues.consecuenciaMujer;
        const nivel_riesgo_residual = iperValues.probabilidadResidual * iperValues.consecuenciaResidual;

        const iperDoc: Omit<IPERRegistro, 'id'> = {
            obraId: obraSeleccionadaId,
            tarea: iperValues.tarea,
            zona: iperValues.zona,
            peligro: iperValues.peligro === 'Otro' ? iperValues.peligroOtro || '' : iperValues.peligro,
            riesgo: iperValues.riesgo === 'Otro' ? iperValues.riesgoOtro || '' : iperValues.riesgo,
            categoriaPeligro: iperValues.categoriaPeligro,
            probabilidad_hombre: iperValues.probabilidadHombre,
            consecuencia_hombre: iperValues.consecuenciaHombre,
            nivel_riesgo_hombre,
            probabilidad_mujer: iperValues.probabilidadMujer,
            consecuencia_mujer: iperValues.consecuenciaMujer,
            nivel_riesgo_mujer,
            jerarquiaControl: iperValues.jerarquiaControl,
            control_especifico_genero: iperValues.controlEspecificoGenero === 'Otro' ? iperValues.controlEspecificoGeneroOtro || '' : iperValues.controlEspecificoGenero,
            responsable: iperValues.responsable,
            plazo: iperValues.plazo,
            estadoControl: iperValues.estadoControl,
            probabilidad_residual: iperValues.probabilidadResidual,
            consecuencia_residual: iperValues.consecuenciaResidual,
            nivel_riesgo_residual,
            createdAt: iperFormValues.createdAt || serverTimestamp(),
            medidasControlExistentes: '',
            medidasControlPropuestas: '',
            responsableImplementacion: '',
            plazoImplementacion: ''
        };
        
        if(iperFormValues.id) {
            // Actualizar
            const docRef = doc(firebaseDb, "obras", obraSeleccionadaId, "iper", iperFormValues.id);
            await updateDoc(docRef, { ...iperDoc, updatedAt: serverTimestamp() });
            toast({ title: 'Éxito', description: 'Registro IPER actualizado.' });
        } else {
            // Crear
            const iperCollectionRef = collection(firebaseDb, "obras", obraSeleccionadaId, "iper");
            await addDoc(iperCollectionRef, iperDoc);
            toast({ title: 'Éxito', description: 'Registro IPER guardado.' });
        }

        setIperFormValues(initialIperState);
        setIperSeleccionado(null);

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
      
      <Tabs defaultValue="iper" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="iper">IPER con Enfoque de Género</TabsTrigger>
            <TabsTrigger value="investigaciones-incidentes">Incidentes (Ishikawa / 5 Porqués)</TabsTrigger>
            <TabsTrigger value="investigaciones-accidentes">Accidentes (Árbol de Causas)</TabsTrigger>
        </TabsList>

        <TabsContent value="iper">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                 <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{iperFormValues.id ? "Editando IPER" : "Registrar Nuevo IPER con enfoque de género"}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleIperSubmit}>
                                <IperForm value={iperFormValues as IperFormValues} onChange={setIperFormValues} />
                                <div className="flex gap-4 mt-6">
                                    <Button type="submit" disabled={guardandoIper}>
                                        {guardandoIper ? 'Guardando IPER...' : (iperFormValues.id ? 'Actualizar Registro IPER' : 'Guardar Registro IPER')}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={() => {setIperFormValues(initialIperState); setIperSeleccionado(null)}}>
                                        Limpiar / Nuevo
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                          <CardTitle>Historial de IPER Registrados</CardTitle>
                          <CardDescription>Seleccione un registro para ver sus detalles y acciones.</CardDescription>
                      </CardHeader>
                      <CardContent>
                          {loading ? <p>Cargando...</p> : 
                           iperRegistros.length === 0 ? <p className="text-sm text-muted-foreground">No hay registros IPER para esta obra.</p> : (
                            <div className="border rounded-md">
                               <Table>
                                  <TableHeader><TableRow><TableHead>Tarea</TableHead><TableHead>Peligro</TableHead></TableRow></TableHeader>
                                  <TableBody>
                                      {iperRegistros.map(iper => (
                                          <TableRow key={iper.id} onClick={() => setIperSeleccionado(iper)} className={cn("cursor-pointer", iperSeleccionado?.id === iper.id && "bg-accent/20")}>
                                              <TableCell className="font-medium">{iper.tarea}</TableCell>
                                              <TableCell>{iper.peligro}</TableCell>
                                          </TableRow>
                                      ))}
                                  </TableBody>
                              </Table>
                            </div>
                           )}
                      </CardContent>
                    </Card>
                 </div>
                 <div className="sticky top-24">
                    {!iperSeleccionado ? (
                        <Card className="flex items-center justify-center h-96 border-dashed">
                            <p className="text-muted-foreground">Seleccione un IPER del listado para ver su detalle.</p>
                        </Card>
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle>Detalle de IPER: {iperSeleccionado.tarea}</CardTitle>
                                <CardDescription>Peligro: {iperSeleccionado.peligro}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><p className="font-semibold">Riesgo Inherente (H/M)</p><p><span className="font-bold text-blue-600">{iperSeleccionado.nivel_riesgo_hombre}</span> / <span className="font-bold text-pink-600">{iperSeleccionado.nivel_riesgo_mujer}</span></p></div>
                                    <div><p className="font-semibold">Riesgo Residual</p><p className="font-bold text-green-700">{iperSeleccionado.nivel_riesgo_residual}</p></div>
                                </div>
                                <div><p className="font-semibold">Control Específico Género</p><p className="text-muted-foreground">{iperSeleccionado.control_especifico_genero || "No especificado"}</p></div>
                                <div><p className="font-semibold">Responsable</p><p className="text-muted-foreground">{iperSeleccionado.responsable || "No asignado"}</p></div>
                                <div className="flex gap-2">
                                     <Button onClick={() => setIperFormValues(iperSeleccionado)}>
                                        <BookOpen className="mr-2 h-4 w-4"/>Editar IPER
                                    </Button>
                                    <Button variant="outline" asChild><Link href={`/prevencion/formularios-generales/iper/${iperSeleccionado.id}/imprimir`} target="_blank"><FileText className="mr-2 h-4 w-4" />Ver Ficha / Imprimir</Link></Button>
                                </div>
                                 <div className="pt-2">
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="secondary" className="w-full"><Siren className="mr-2 h-4 w-4"/>Generar Charla de Seguridad</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Función en Desarrollo</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Esta función generará automáticamente una nueva charla de seguridad asociada a este riesgo IPER. Aún está en desarrollo.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogAction>Entendido</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                 </div>
            </div>
        </TabsContent>

        <TabsContent value="investigaciones-incidentes">
            <InvestigacionIncidentesTab
                obraId={obraSeleccionadaId}
                investigaciones={investigaciones.filter(inv => inv.metodoAnalisis !== 'arbol_causas')}
                loading={loading}
                onUpdate={() => { /* Lógica para forzar recarga si es necesario */ }}
            />
        </TabsContent>
        <TabsContent value="investigaciones-accidentes">
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
