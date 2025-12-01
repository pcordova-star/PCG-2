
// src/app/prevencion/formularios-generales/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
  deleteDoc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { firebaseDb, firebaseStorage } from "../../../lib/firebaseClient";
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, FileText, Plus, PlusCircle, Siren, Trash2, Edit, Zap, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { InvestigacionIncidentesTab } from './components/InvestigacionIncidentesTab';
import { InvestigacionAccidentesTab } from './components/InvestigacionAccidentesTab';
import { Obra, RegistroIncidente, IPERRegistro, Charla, FirmaAsistente, CharlaEstado } from '@/types/pcg';
import { IperForm, IperFormValues } from './components/IperGeneroRow';
import { useToast } from '@/hooks/use-toast';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { generarIperPdf } from '@/lib/pdf/generarIperPdf';
import { CharlaPdfButton } from '../charlas/components/CharlaPdfButton';
import SignaturePad from '../hallazgos/components/SignaturePad';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Textarea } from '@/components/ui/textarea';
import { IperPlantilla, IPER_PLANTILLAS_ELECTRICAS } from '@/lib/iperPlantillasElectricas';
import { Separator } from '@/components/ui/separator';


// --- Estado inicial para el formulario IPER ---
const initialIperState: Omit<IPERRegistro, 'id' | 'createdAt' | 'correlativo'> = {
  obraId: "",
  tarea: "", zona: "", peligro: "", riesgo: "", categoriaPeligro: "Mecánico",
  probabilidad_hombre: 1, consecuencia_hombre: 1, nivel_riesgo_hombre: 1,
  probabilidad_mujer: 1, consecuencia_mujer: 1, nivel_riesgo_mujer: 1,
  jerarquiaControl: "Control Administrativo", control_especifico_genero: "",
  responsable: "", plazo: "", estadoControl: "PENDIENTE",
  probabilidad_residual: 1, consecuencia_residual: 1, nivel_riesgo_residual: 1,
  medidasControlExistentes: "",
  medidasControlPropuestas: "",
  responsableImplementacion: "",
  plazoImplementacion: "",
  firmaPrevencionistaUrl: undefined,
  firmaPrevencionistaNombre: undefined,
  firmaPrevencionistaRut: undefined,
  firmaPrevencionistaCargo: undefined,
  firmaPrevencionistaFecha: undefined,
  firmaPrevencionistaUserId: undefined,
};

const initialCharlaState: Omit<Charla, 'id'> = {
    obraId: "",
    obraNombre: "",
    iperId: "",
    titulo: "",
    tipo: "charla_iper",
    fechaCreacion: serverTimestamp() as any,
    creadaPorUid: "",
    generadaAutomaticamente: false,
    tarea: "",
    zonaSector: "",
    peligro: "",
    riesgo: "",
    probHombres: 0,
    consHombres: 0,
    nivelHombres: 0,
    probMujeres: 0,
    consMujeres: 0,
    nivelMujeres: 0,
    controlGenero: "",
    estado: 'borrador',
    contenido: "",
};


export default function FormulariosGeneralesPrevencionPage() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>("");
  const [investigaciones, setInvestigaciones] = useState<RegistroIncidente[]>([]);
  const [iperRegistros, setIperRegistros] = useState<IPERRegistro[]>([]);
  const [charlas, setCharlas] = useState<Charla[]>([]); // Nuevo estado para charlas
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user, companyId, role } = useAuth();
  const { toast } = useToast();
  
  const [iperFormValues, setIperFormValues] = useState<Partial<IPERRegistro>>(initialIperState);
  const [guardandoIper, setGuardandoIper] = useState(false);
  const [iperSeleccionado, setIperSeleccionado] = useState<IPERRegistro | null>(null);

  // Estados para filtros de IPER
  const [filtroIperTexto, setFiltroIperTexto] = useState('');
  const [filtroIperEstado, setFiltroIperEstado] = useState('todos');

  // Nuevos estados para controlar el tab activo y la charla seleccionada
  const [activeTab, setActiveTab] = useState<'iper' | 'incidentes' | 'accidentes' | 'charlas'>('iper');
  const [selectedCharlaId, setSelectedCharlaId] = useState<string | null>(null);
  
  // Estados para el formulario de charla
  const [charlaForm, setCharlaForm] = useState<Partial<Charla>>(initialCharlaState);
  const [guardandoCharla, setGuardandoCharla] = useState(false);
  
  // Estados para la gestión de asistentes
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [asistenteParaFirmar, setAsistenteParaFirmar] = useState<FirmaAsistente | null>(null);
  const [nuevoAsistenteNombre, setNuevoAsistenteNombre] = useState('');
  const [nuevoAsistenteRut, setNuevoAsistenteRut] = useState('');

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Estado para edición de asistentes
  const [editingAsistenteIndex, setEditingAsistenteIndex] = useState<number | null>(null);
  const [editingAsistenteData, setEditingAsistenteData] = useState<FirmaAsistente | null>(null);
  
  // Estados para la firma del prevencionista en IPER
  const [isIperSignatureModalOpen, setIsIperSignatureModalOpen] = useState(false);
  const [iperSignatureDataUrl, setIperSignatureDataUrl] = useState<string | null>(null);


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
      setCharlas([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setIperSeleccionado(null);
    setSelectedCharlaId(null);
    
    const unsubscribes: (() => void)[] = [];

    const qInvestigaciones = query(
      collection(firebaseDb, "investigacionesIncidentes"),
      where("obraId", "==", obraSeleccionadaId),
      orderBy("createdAt", "desc")
    );
    unsubscribes.push(onSnapshot(qInvestigaciones, (snapshot) => {
      const investigacionesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RegistroIncidente));
      setInvestigaciones(investigacionesList);
    }));

    const iperCollectionRef = collection(firebaseDb, "obras", obraSeleccionadaId, "iper");
    const qIper = query(iperCollectionRef, orderBy("createdAt", "desc"));
    unsubscribes.push(onSnapshot(qIper, (snapshot) => {
      const iperList = snapshot.docs.map((doc, index) => ({ id: doc.id, ...doc.data(), correlativo: snapshot.docs.length - index } as IPERRegistro));
      setIperRegistros(iperList);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching IPER:", error);
        setLoading(false);
    }));
    
    const qCharlas = query(collection(firebaseDb, "charlas"), where("obraId", "==", obraSeleccionadaId), orderBy("fechaCreacion", "desc"));
    unsubscribes.push(onSnapshot(qCharlas, (snapshot) => {
        const charlaList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Charla));
        setCharlas(charlaList);
    }));


    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [obraSeleccionadaId]);

  const iperFiltrados = useMemo(() => {
    return iperRegistros.filter(iper => {
        const matchTexto = filtroIperTexto.trim() === '' || 
                            iper.tarea.toLowerCase().includes(filtroIperTexto.toLowerCase()) ||
                            iper.peligro.toLowerCase().includes(filtroIperTexto.toLowerCase());
        const matchEstado = filtroIperEstado === 'todos' || iper.estadoControl === filtroIperEstado;
        return matchTexto && matchEstado;
    });
  }, [iperRegistros, filtroIperTexto, filtroIperEstado]);
  
 const handleIperSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obraSeleccionadaId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Debe seleccionar una obra.' });
      return;
    }
    setGuardandoIper(true);
    try {
      const iperValues = iperFormValues as IperFormValues;
      const nivel_riesgo_hombre = (iperValues.probabilidadHombre || 1) * (iperValues.consecuenciaHombre || 1);
      const nivel_riesgo_mujer = (iperValues.probabilidadMujer || 1) * (iperValues.consecuenciaMujer || 1);
      const nivel_riesgo_residual = (iperValues.probabilidadResidual || 1) * (iperValues.consecuenciaResidual || 1);

      const iperDoc: Omit<IPERRegistro, 'id'> = {
        obraId: obraSeleccionadaId,
        tarea: iperValues.tarea,
        zona: iperValues.zona,
        peligro: iperValues.peligro === 'Otro' ? iperValues.peligroOtro || '' : iperValues.peligro,
        riesgo: iperValues.riesgo === 'Otro' ? iperValues.riesgoOtro || '' : iperValues.riesgo,
        categoriaPeligro: iperValues.categoriaPeligro,
        probabilidad_hombre: iperValues.probabilidadHombre || 1,
        consecuencia_hombre: iperValues.consecuenciaHombre || 1,
        nivel_riesgo_hombre,
        probabilidad_mujer: iperValues.probabilidadMujer || 1,
        consecuencia_mujer: iperValues.consecuenciaMujer || 1,
        nivel_riesgo_mujer,
        jerarquiaControl: iperValues.jerarquiaControl,
        control_especifico_genero: iperValues.controlEspecificoGenero === 'Otro' ? iperValues.controlEspecificoGeneroOtro || '' : iperValues.controlEspecificoGenero || '',
        responsable: iperValues.responsable || '',
        plazo: iperValues.plazo || '',
        estadoControl: iperValues.estadoControl,
        probabilidad_residual: iperValues.probabilidadResidual || 1,
        consecuencia_residual: iperValues.consecuenciaResidual || 1,
        nivel_riesgo_residual,
        createdAt: iperFormValues.createdAt || serverTimestamp(),
        medidasControlExistentes: '',
        medidasControlPropuestas: '',
        responsableImplementacion: '',
        plazoImplementacion: ''
      };

      let docId = iperFormValues.id;

      if (docId) {
        // Actualizar
        const docRef = doc(firebaseDb, "obras", obraSeleccionadaId, "iper", docId);
        await updateDoc(docRef, { ...iperDoc, updatedAt: serverTimestamp() });
        toast({ title: 'Éxito', description: 'Registro IPER actualizado.' });
      } else {
        // Crear
        const iperCollectionRef = collection(firebaseDb, "obras", obraSeleccionadaId, "iper");
        const newDocRef = await addDoc(iperCollectionRef, iperDoc);
        docId = newDocRef.id;
        toast({ title: 'Éxito', description: 'Registro IPER guardado.' });
      }
      
      // Guardar firma si existe
      if (iperSignatureDataUrl) {
          const blob = await (await fetch(iperSignatureDataUrl)).blob();
          const signatureRef = ref(firebaseStorage, `iper/${docId}/firmaPrevencionista.png`);
          await uploadBytes(signatureRef, blob, { contentType: 'image/png' });
          const downloadURL = await getDownloadURL(signatureRef);
          
          const docRef = doc(firebaseDb, "obras", obraSeleccionadaId, "iper", docId);
          await updateDoc(docRef, {
              firmaPrevencionistaUrl: downloadURL,
              firmaPrevencionistaNombre: iperFormValues.firmaPrevencionistaNombre,
              firmaPrevencionistaRut: iperFormValues.firmaPrevencionistaRut,
              firmaPrevencionistaCargo: iperFormValues.firmaPrevencionistaCargo,
              firmaPrevencionistaFecha: new Date().toISOString(),
              firmaPrevencionistaUserId: user?.uid
          });
      }

      setIperFormValues(initialIperState);
      setIperSeleccionado(null);
      setIperSignatureDataUrl(null);

    } catch (error) {
      console.error("Error guardando IPER:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el registro IPER.' });
    } finally {
      setGuardandoIper(false);
    }
  };

  const handleDeleteIper = async (iperId: string) => {
    if(!obraSeleccionadaId || !iperId) return;

    try {
        const docRef = doc(firebaseDb, "obras", obraSeleccionadaId, "iper", iperId);
        await deleteDoc(docRef);
        toast({title: 'Éxito', description: 'Registro IPER eliminado correctamente.'});
        setIperSeleccionado(null); // Limpiar la vista de detalle
    } catch (error) {
        console.error("Error eliminando IPER:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el registro IPER.' });
    }
  }
  
  const handleExportIperPdf = () => {
    if (!iperSeleccionado) return;
    const obra = obras.find(o => o.id === obraSeleccionadaId);
    if (!obra) {
        toast({variant: "destructive", title: "Error", description: "No se encontró la obra para generar el PDF."});
        return;
    }
    generarIperPdf(iperSeleccionado, obra);
  }

  const handleGenerarCharla = async () => {
    if (!iperSeleccionado || !user) return;

    const obra = obras.find(o => o.id === obraSeleccionadaId);
    if (!obra) return;
    
    try {
        const nuevaCharla: Omit<Charla, 'id'> = {
            obraId: obraSeleccionadaId,
            obraNombre: obra.nombreFaena,
            iperId: iperSeleccionado.id,
            iperIdRelacionado: iperSeleccionado.id,
            titulo: `Charla de seguridad: ${iperSeleccionado.tarea}`,
            tipo: "charla_iper",
            fechaCreacion: serverTimestamp() as any,
            creadaPorUid: user.uid,
            generadaAutomaticamente: true,
            tarea: iperSeleccionado.tarea,
            zonaSector: iperSeleccionado.zona,
            peligro: iperSeleccionado.peligro,
            riesgo: iperSeleccionado.riesgo,
            probHombres: iperSeleccionado.probabilidad_hombre,
            consHombres: iperSeleccionado.consecuencia_hombre,
            nivelHombres: iperSeleccionado.nivel_riesgo_hombre,
            probMujeres: iperSeleccionado.probabilidad_mujer,
            consMujeres: iperSeleccionado.consecuencia_mujer,
            nivelMujeres: iperSeleccionado.nivel_riesgo_mujer,
            controlGenero: iperSeleccionado.control_especifico_genero,
            estado: 'borrador',
            contenido: `Esta charla se enfoca en el riesgo de "${iperSeleccionado.riesgo}" durante la tarea de "${iperSeleccionado.tarea}". Se deben aplicar las siguientes medidas de control: ${iperSeleccionado.medidasControlPropuestas || iperSeleccionado.control_especifico_genero}. El nivel de riesgo inherente es ${Math.max(iperSeleccionado.nivel_riesgo_hombre, iperSeleccionado.nivel_riesgo_mujer)}.`,
        };
        
        const docRef = await addDoc(collection(firebaseDb, "charlas"), nuevaCharla);
        
        toast({
            title: "Charla Generada",
            description: "Se ha creado una nueva charla en borrador.",
        });
        
        setActiveTab('charlas');
        setSelectedCharlaId(docRef.id);

    } catch(err) {
        console.error("Error generando charla desde IPER:", err);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar la charla.' });
    }
  };
  
  const charlaSeleccionada = useMemo(() => charlas.find(c => c.id === selectedCharlaId), [charlas, selectedCharlaId]);

  useEffect(() => {
      if (charlaSeleccionada) {
          setCharlaForm(charlaSeleccionada);
      } else {
          setCharlaForm(initialCharlaState);
      }
  }, [charlaSeleccionada]);

  const handleGuardarCharla = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obraSeleccionadaId || !charlaForm.titulo) {
      toast({ variant: 'destructive', title: 'Error', description: 'La obra y el título son obligatorios.' });
      return;
    }
    setGuardandoCharla(true);
    try {
      if (charlaForm.id) {
        const docRef = doc(firebaseDb, "charlas", charlaForm.id);
        await updateDoc(docRef, { ...charlaForm, fechaRealizacion: charlaForm.fechaRealizacion ? new Date(charlaForm.fechaRealizacion as any) : null });
      } else {
        const docRef = await addDoc(collection(firebaseDb, "charlas"), {
          ...charlaForm,
          obraId: obraSeleccionadaId,
          fechaCreacion: serverTimestamp(),
          fechaRealizacion: charlaForm.fechaRealizacion ? new Date(charlaForm.fechaRealizacion as any) : null
        });
        setSelectedCharlaId(docRef.id);
      }
      toast({ title: 'Éxito', description: 'Charla guardada correctamente.' });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la charla.' });
    } finally {
      setGuardandoCharla(false);
    }
  };
  
  const formatRut = (rut: string): string => {
    if (!rut) return "";
    let cleanRut = rut.replace(/[^0-9kK]/g, '');
    if (cleanRut.length === 0) return '';
    
    let cuerpo = cleanRut.slice(0, -1);
    let dv = cleanRut.slice(-1).toUpperCase();
    
    if (cuerpo.length === 0) return dv;

    cuerpo = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${cuerpo}-${dv}`;
  };

  const handleAgregarAsistente = async () => {
    if (!selectedCharlaId || !nuevoAsistenteNombre.trim() || !nuevoAsistenteRut.trim()) {
        toast({ variant: 'destructive', title: 'Error', description: 'Nombre y RUT son obligatorios.' });
        return;
    }
    const nuevoAsistente: FirmaAsistente = { nombre: nuevoAsistenteNombre, rut: formatRut(nuevoAsistenteRut) };
    const charlaRef = doc(firebaseDb, "charlas", selectedCharlaId);
    const asistentesActuales = charlaSeleccionada?.asistentes || [];
    await updateDoc(charlaRef, { asistentes: [...asistentesActuales, nuevoAsistente] });
    setNuevoAsistenteNombre('');
    setNuevoAsistenteRut('');
  };

  const handleUpdateAsistente = async () => {
    if (!selectedCharlaId || !editingAsistenteData || editingAsistenteIndex === null) return;
    
    const asistentesActualizados = [...(charlaSeleccionada?.asistentes || [])];
    asistentesActualizados[editingAsistenteIndex] = {
        ...asistentesActualizados[editingAsistenteIndex],
        nombre: editingAsistenteData.nombre,
        rut: formatRut(editingAsistenteData.rut)
    };

    const charlaRef = doc(firebaseDb, "charlas", selectedCharlaId);
    await updateDoc(charlaRef, { asistentes: asistentesActualizados });

    setEditingAsistenteIndex(null);
    setEditingAsistenteData(null);
    toast({ title: 'Asistente actualizado' });
  };
  
  const handleRemoveAsistente = async (indexToRemove: number) => {
    if (!selectedCharlaId) return;
    const asistentesActualizados = (charlaSeleccionada?.asistentes || []).filter((_, index) => index !== indexToRemove);
    const charlaRef = doc(firebaseDb, "charlas", selectedCharlaId);
    await updateDoc(charlaRef, { asistentes: asistentesActualizados });
    toast({ title: 'Asistente eliminado' });
  };
  
  const handleGuardarFirma = async (firmaUrl: string | null) => {
    if (!firmaUrl || !asistenteParaFirmar || !selectedCharlaId) return;

    try {
        const blob = await (await fetch(firmaUrl)).blob();
        const storageRef = ref(firebaseStorage, `charlas/${selectedCharlaId}/firmas/${asistenteParaFirmar.nombre.replace(/ /g, '_')}.png`);
        await uploadBytes(storageRef, blob, { contentType: 'image/png' });
        const downloadURL = await getDownloadURL(storageRef);

        const charlaRef = doc(firebaseDb, "charlas", selectedCharlaId);
        const asistentesActualizados = (charlaSeleccionada?.asistentes || []).map(a => 
            a.nombre === asistenteParaFirmar.nombre 
                ? { ...a, firmaUrl: downloadURL, firmadoEn: new Date().toISOString(), firmadoPorUsuarioId: user?.uid } 
                : a
        );
        await updateDoc(charlaRef, { asistentes: asistentesActualizados });

        toast({ title: 'Firma guardada' });
        setIsSignatureModalOpen(false);
    } catch (error) {
        console.error("Error guardando firma:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la firma.' });
    }
  };

  const handleDeleteCharla = async (charlaId: string) => {
    if (!charlaId) return;
    try {
      await deleteDoc(doc(firebaseDb, "charlas", charlaId));
      toast({ title: "Charla eliminada" });
      if(selectedCharlaId === charlaId) {
        setSelectedCharlaId(null);
      }
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar la charla." });
    }
  };

  const handleApplyTemplate = (plantilla: IperPlantilla) => {
    setIperFormValues(prev => ({
        ...prev,
        ...plantilla.valores,
        id: undefined, // Asegurarse de que no se pise el ID si se estaba editando
        createdAt: undefined,
    }));
    setIsTemplateModalOpen(false);
    toast({ title: 'Plantilla aplicada', description: `Se han cargado los valores de "${plantilla.nombre}".` });
  };


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
      
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="iper">IPER con Enfoque de Género</TabsTrigger>
            <TabsTrigger value="incidentes">Incidentes (Ishikawa / 5 Porqués)</TabsTrigger>
            <TabsTrigger value="accidentes">Accidentes (Árbol de Causas)</TabsTrigger>
            <TabsTrigger value="charlas">Charlas de Seguridad</TabsTrigger>
        </TabsList>

        <TabsContent value="iper">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                 <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{iperFormValues.id ? "Editando IPER" : "Registrar Nuevo IPER con enfoque de género"}</CardTitle>
                            <CardDescription>
                                Identifique peligros, evalúe riesgos y proponga controles.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleIperSubmit}>
                                <div className="mb-4">
                                     <Button type="button" variant="outline" onClick={() => setIsTemplateModalOpen(true)}>
                                        <Zap className="mr-2 h-4 w-4 text-yellow-500"/>
                                        Usar IPER Eléctrico Prediseñado
                                    </Button>
                                </div>
                                <IperForm value={iperFormValues as IperFormValues} onChange={(v) => setIperFormValues(prev => ({...prev, ...v}))} />
                                
                                <Separator className="my-6"/>
                                
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-md">Firma del Prevencionista / Responsable</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1"><Label>Nombre</Label><Input value={iperFormValues.firmaPrevencionistaNombre || ''} onChange={e => setIperFormValues(p => ({...p, firmaPrevencionistaNombre: e.target.value}))} /></div>
                                        <div className="space-y-1"><Label>RUT</Label><Input value={iperFormValues.firmaPrevencionistaRut || ''} onChange={e => setIperFormValues(p => ({...p, firmaPrevencionistaRut: e.target.value}))} /></div>
                                    </div>
                                    <div className="space-y-1"><Label>Cargo</Label><Input value={iperFormValues.firmaPrevencionistaCargo || ''} onChange={e => setIperFormValues(p => ({...p, firmaPrevencionistaCargo: e.target.value}))} /></div>
                                    
                                    {iperFormValues.firmaPrevencionistaUrl ? (
                                        <div className="text-center p-2 border rounded-md bg-green-50">
                                            <p className="text-sm font-medium text-green-700">Firma guardada.</p>
                                            <img src={iperFormValues.firmaPrevencionistaUrl} alt="Firma" className="mx-auto h-16"/>
                                        </div>
                                    ) : (
                                        <Button type="button" variant="secondary" className="w-full" onClick={() => setIsIperSignatureModalOpen(true)}>Abrir panel para firmar</Button>
                                    )}
                                </div>

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
                          <div className="flex flex-col sm:flex-row gap-2 mb-4">
                            <Input placeholder="Buscar por tarea o peligro..." value={filtroIperTexto} onChange={e => setFiltroIperTexto(e.target.value)} />
                            <Select value={filtroIperEstado} onValueChange={setFiltroIperEstado}>
                                <SelectTrigger className="w-full sm:w-[200px]"><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos los estados</SelectItem>
                                    <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                                    <SelectItem value="EN_EJECUCION">En Ejecución</SelectItem>
                                    <SelectItem value="IMPLEMENTADO">Implementado</SelectItem>
                                    <SelectItem value="RECHAZADO">Rechazado</SelectItem>
                                </SelectContent>
                            </Select>
                          </div>
                          {loading ? <p>Cargando...</p> : 
                           iperFiltrados.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No hay registros IPER que coincidan con los filtros.</p> : (
                            <div className="border rounded-md max-h-96 overflow-y-auto">
                               <Table>
                                  <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Tarea</TableHead>
                                        <TableHead>Riesgo</TableHead>
                                        <TableHead>Estado</TableHead>
                                    </TableRow>
                                </TableHeader>
                                  <TableBody>
                                      {iperFiltrados.map(iper => (
                                          <TableRow key={iper.id} onClick={() => setIperSeleccionado(iper)} className={cn("cursor-pointer", iperSeleccionado?.id === iper.id && "bg-accent/20")}>
                                              <TableCell className="text-xs">{iper.createdAt?.toDate().toLocaleDateString('es-CL')}</TableCell>
                                              <TableCell className="font-medium text-xs">{iper.tarea}</TableCell>
                                              <TableCell className="text-xs">{Math.max(iper.nivel_riesgo_hombre, iper.nivel_riesgo_mujer)}</TableCell>
                                              <TableCell className="text-xs">{iper.estadoControl.replace("_", " ")}</TableCell>
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
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle>Detalle de IPER: {iperSeleccionado.tarea}</CardTitle>
                                        <CardDescription>Peligro: {iperSeleccionado.peligro}</CardDescription>
                                    </div>
                                     <Badge variant="outline">IPER-{String(iperSeleccionado.correlativo).padStart(3, '0')}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><p className="font-semibold">Riesgo Inherente (H/M)</p><p><span className="font-bold text-blue-600">{iperSeleccionado.nivel_riesgo_hombre}</span> / <span className="font-bold text-pink-600">{iperSeleccionado.nivel_riesgo_mujer}</span></p></div>
                                    <div><p className="font-semibold">Riesgo Residual</p><p className="font-bold text-green-700">{iperSeleccionado.nivel_riesgo_residual}</p></div>
                                    <div><p className="font-semibold">Fecha de Creación</p><p className="text-muted-foreground">{iperSeleccionado.createdAt?.toDate().toLocaleDateString('es-CL')}</p></div>
                                    <div><p className="font-semibold">Estado del Control</p><p className="font-bold">{iperSeleccionado.estadoControl}</p></div>
                                </div>
                                <div><p className="font-semibold">Control Específico Género</p><p className="text-muted-foreground">{iperSeleccionado.control_especifico_genero || "No especificado"}</p></div>
                                <div><p className="font-semibold">Responsable</p><p className="text-muted-foreground">{iperSeleccionado.responsable || "No asignado"}</p></div>
                                <div className="flex gap-2 items-center">
                                     <Button onClick={() => setIperFormValues(iperSeleccionado)}>
                                        <BookOpen className="mr-2 h-4 w-4"/>Editar IPER
                                    </Button>
                                    <Button variant="outline" onClick={handleExportIperPdf}><FileText className="mr-2 h-4 w-4" />Descargar Ficha PDF</Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>¿Eliminar este registro IPER?</AlertDialogTitle>
                                                <AlertDialogDescription>Esta acción no se puede deshacer y eliminará permanentemente el registro de la tarea '{iperSeleccionado.tarea}'.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteIper(iperSeleccionado.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                                 <div className="pt-2">
                                    <Button onClick={handleGenerarCharla} variant="secondary" className="w-full">
                                      <Siren className="mr-2 h-4 w-4"/>
                                      Generar Charla de Seguridad desde IPER
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                 </div>
            </div>
        </TabsContent>

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
        <TabsContent value="charlas">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
               <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{selectedCharlaId ? "Editar Charla" : "Registrar Nueva Charla"}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleGuardarCharla} className="space-y-4">
                                <Input value={charlaForm.titulo || ''} onChange={e => setCharlaForm(p => ({...p, titulo: e.target.value}))} placeholder="Título de la charla" />
                                <Textarea value={charlaForm.contenido || ''} onChange={e => setCharlaForm(p => ({...p, contenido: e.target.value}))} placeholder="Contenido o temas a tratar..." />
                                <div className="flex gap-4">
                                  <div className='flex-1'><Label>Fecha Realización</Label><Input type="date" value={charlaForm.fechaRealizacion ? new Date(charlaForm.fechaRealizacion as any).toISOString().slice(0,10) : ''} onChange={e => setCharlaForm(p => ({...p, fechaRealizacion: e.target.value as any}))} /></div>
                                  <div className='flex-1'><Label>Estado</Label>
                                    <Select value={charlaForm.estado} onValueChange={(v) => setCharlaForm(p => ({...p, estado: v as CharlaEstado}))}><SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent><SelectItem value="borrador">Borrador</SelectItem><SelectItem value="realizada">Realizada</SelectItem></SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <Button type="submit" disabled={guardandoCharla}>{guardandoCharla ? "Guardando..." : "Guardar Charla"}</Button>
                            </form>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Listado de Charlas</CardTitle></CardHeader>
                        <CardContent>
                            {charlas.map(charla => (
                                <div key={charla.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted/50">
                                    <div onClick={() => setSelectedCharlaId(charla.id)} className={cn("flex-1 cursor-pointer", selectedCharlaId === charla.id && 'font-bold')}>
                                        <p className="font-medium">{charla.titulo}</p>
                                        {charla.fechaCreacion && <p className="text-xs text-muted-foreground">{charla.fechaCreacion.toDate().toLocaleDateString()}</p>}
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={(e) => e.stopPropagation()}><Trash2 className="h-4 w-4"/></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>¿Eliminar esta charla?</AlertDialogTitle>
                                                <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteCharla(charla.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
               </div>
               <div className="sticky top-24">
                  {charlaSeleccionada ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>{charlaSeleccionada.titulo}</CardTitle>
                            <CardDescription>ID: {charlaSeleccionada.id}</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <h4 className="font-semibold mb-2">Asistentes</h4>
                           <div className="space-y-2 mb-4">
                                {(charlaSeleccionada.asistentes || []).map((asistente, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm p-2 rounded-md bg-muted/50">
                                        {editingAsistenteIndex === i ? (
                                            <div className="flex gap-2 items-center flex-1">
                                                <Input value={editingAsistenteData?.nombre || ''} onChange={e => setEditingAsistenteData(p => ({...p!, nombre: e.target.value}))} className="h-8"/>
                                                <Input value={editingAsistenteData?.rut || ''} onChange={e => setEditingAsistenteData(p => ({...p!, rut: formatRut(e.target.value)}))} className="h-8 w-28"/>
                                                <Button size="sm" onClick={handleUpdateAsistente}>Guardar</Button>
                                                <Button size="sm" variant="ghost" onClick={() => setEditingAsistenteIndex(null)}>Cancelar</Button>
                                            </div>
                                        ) : (
                                            <>
                                                <div>
                                                    <p className="font-medium">{asistente.nombre}</p>
                                                    <p className="text-xs text-muted-foreground">{asistente.rut}</p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {asistente.firmaUrl ? <Badge>Firmado</Badge> : <Button size="sm" variant="outline" onClick={() => { setAsistenteParaFirmar(asistente); setIsSignatureModalOpen(true);}}>Firmar</Button>}
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {setEditingAsistenteIndex(i); setEditingAsistenteData(asistente);}}><Edit className="h-4 w-4"/></Button>
                                                     <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-destructive h-8 w-8"><Trash2 className="h-4 w-4"/></Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>¿Eliminar Asistente?</AlertDialogTitle>
                                                                <AlertDialogDescription>Se eliminará a {asistente.nombre} de la lista.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleRemoveAsistente(i)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                           </div>
                           <div className="flex gap-2">
                            <Input value={nuevoAsistenteNombre} onChange={e => setNuevoAsistenteNombre(e.target.value)} placeholder="Nombre del asistente"/>
                            <Input value={nuevoAsistenteRut} onChange={e => setNuevoAsistenteRut(e.target.value)} placeholder="RUT del asistente"/>
                            <Button onClick={handleAgregarAsistente}><Plus size={16}/> Agregar</Button>
                           </div>
                        </CardContent>
                        <CardFooter>
                            <CharlaPdfButton charla={charlaSeleccionada} obra={obras.find(o => o.id === obraSeleccionadaId)} />
                        </CardFooter>
                    </Card>
                  ) : (
                    <Card className="flex items-center justify-center h-96 border-dashed">
                        <p className="text-muted-foreground">Seleccione una charla para ver sus detalles.</p>
                    </Card>
                  )}
               </div>
           </div>
        </TabsContent>
      </Tabs>
      
      <AlertDialog open={isSignatureModalOpen} onOpenChange={setIsSignatureModalOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Firmar Asistencia: {asistenteParaFirmar?.nombre}</AlertDialogTitle>
            </AlertDialogHeader>
            <SignaturePad onChange={handleGuardarFirma} onClear={() => {}} />
        </AlertDialogContent>
      </AlertDialog>

       <Dialog open={isIperSignatureModalOpen} onOpenChange={setIsIperSignatureModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Firmar como Prevencionista Responsable</DialogTitle>
                </DialogHeader>
                <SignaturePad
                    onChange={(dataUrl) => setIperSignatureDataUrl(dataUrl)}
                    onClear={() => setIperSignatureDataUrl(null)}
                />
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsIperSignatureModalOpen(false)}>Cancelar</Button>
                    <Button onClick={() => setIsIperSignatureModalOpen(false)}>Confirmar Firma</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
          <DialogContent className="max-w-2xl bg-slate-50">
              <DialogHeader>
                  <DialogTitle className="text-xl font-semibold">Seleccionar Plantilla IPER para Trabajos Eléctricos</DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                      Elija una plantilla para pre-rellenar el formulario con datos estandarizados. Podrá ajustarlos antes de guardar.
                  </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto">
                  {IPER_PLANTILLAS_ELECTRICAS.map(plantilla => (
                      <div 
                          key={plantilla.id} 
                          className="border-l-4 border-blue-500 rounded-r-lg bg-white p-4 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-150 cursor-pointer flex justify-between items-center gap-4"
                          onClick={() => handleApplyTemplate(plantilla)}
                      >
                          <div className="flex items-start gap-4">
                              <div className="p-2 bg-blue-100 rounded-full mt-1">
                                  <Zap className="h-5 w-5 text-blue-600"/>
                              </div>
                              <div>
                                  <h4 className="font-semibold text-base">{plantilla.nombre}</h4>
                                  <p className="text-xs text-muted-foreground mt-1">{plantilla.descripcion}</p>
                              </div>
                          </div>
                          <Button 
                              className="px-5 py-2 text-sm font-semibold flex-shrink-0"
                              onClick={(e) => { e.stopPropagation(); handleApplyTemplate(plantilla); }}
                          >
                              Aplicar
                          </Button>
                      </div>
                  ))}
              </div>
          </DialogContent>
        </Dialog>
    </section>
  );
}
