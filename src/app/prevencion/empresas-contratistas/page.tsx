"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { firebaseDb } from "@/lib/firebaseClient";
import { collection, addDoc, Timestamp, getDocs, orderBy, query, where, doc, updateDoc, deleteDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { FileDown, PlusCircle, Edit, Trash2 } from "lucide-react";


// --- Tipos de Datos ---

type ObraPrevencion = {
  id: string;
  nombreFaena: string;
};

export type TipoEmpresaPrevencion =
  | "MANDANTE"
  | "CONTRATISTA_PRINCIPAL"
  | "SUBCONTRATISTA"
  | "SERVICIOS";

export type EstadoEvaluacionEmpresa =
  | "POR_EVALUAR"
  | "APROBADA"
  | "APROBADA_CON_OBSERVACIONES"
  | "RECHAZADA";

export type EmpresaContratista = {
  id: string;
  obraId: string;
  razonSocial: string;
  rut: string;
  tipoEmpresa: TipoEmpresaPrevencion;
  representanteLegal: string;
  contactoNombre: string;
  contactoTelefono: string;
  contactoEmail: string;

  contratoMarco: boolean;
  certificadoMutual: boolean;
  certificadoCotizaciones: boolean;
  padronTrabajadores: boolean;
  reglamentoInterno: boolean;

  matrizRiesgos: boolean;
  procedimientosTrabajoSeguro: boolean;
  programaTrabajo: boolean;
  planEmergenciaPropio: boolean;
  registroCapacitacionInterna: boolean;

  actaReunionInicial: boolean;
  frecuenciaReuniones: string;
  compromisosEspecificos: string;

  estadoEvaluacion: EstadoEvaluacionEmpresa;
  observacionesGenerales: string;

  fechaEvaluacion: string;
  evaluador: string;
  fechaCreacion: Timestamp;
};

const estadoOptions: { value: EstadoEvaluacionEmpresa | 'TODOS', label: string }[] = [
    { value: 'TODOS', label: 'Todos los estados' },
    { value: 'APROBADA', label: 'Aprobada' },
    { value: 'APROBADA_CON_OBSERVACIONES', label: 'Aprobada con Observaciones' },
    { value: 'RECHAZADA', label: 'Rechazada' },
    { value: 'POR_EVALUAR', label: 'Por Evaluar' },
];

function EstadoBadge({ estado }: { estado: EstadoEvaluacionEmpresa }) {
    const classNames: Record<EstadoEvaluacionEmpresa, string> = {
        'POR_EVALUAR': 'bg-gray-100 text-gray-800 border-gray-300',
        'APROBADA': 'bg-green-100 text-green-800 border-green-300',
        'APROBADA_CON_OBSERVACIONES': 'bg-yellow-100 text-yellow-800 border-yellow-300',
        'RECHAZADA': 'bg-red-100 text-red-800 border-red-300'
    };
    const labels: Record<EstadoEvaluacionEmpresa, string> = {
        'POR_EVALUAR': 'Por Evaluar',
        'APROBADA': 'Aprobada',
        'APROBADA_CON_OBSERVACIONES': 'Con Observaciones',
        'RECHAZADA': 'Rechazada'
    };
    return <Badge variant="outline" className={cn(classNames[estado] || 'bg-gray-100', 'font-semibold')}>{labels[estado]}</Badge>;
}

function countDocsOk(empresa: EmpresaContratista): number {
    const docs = [
        empresa.contratoMarco,
        empresa.certificadoMutual,
        empresa.certificadoCotizaciones,
        empresa.padronTrabajadores,
        empresa.reglamentoInterno,
        empresa.matrizRiesgos,
        empresa.procedimientosTrabajoSeguro,
        empresa.programaTrabajo,
        empresa.planEmergenciaPropio,
        empresa.registroCapacitacionInterna,
        empresa.actaReunionInicial
    ];
    return docs.filter(Boolean).length;
}


export default function EmpresasContratistasPage() {
  const router = useRouter();
  
  // --- Estados de UI ---
  const [obras, setObras] = useState<ObraPrevencion[]>([]);
  const [loadingObras, setLoadingObras] = useState(true);
  const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>("");

  const [empresas, setEmpresas] = useState<EmpresaContratista[]>([]);
  const [loading, setLoading] = useState(true);

  const [mostrarForm, setMostrarForm] = useState<boolean>(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [empresaSeleccionadaId, setEmpresaSeleccionadaId] = useState<string | null>(null);

  // --- Estados para filtros ---
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoEvaluacionEmpresa | 'TODOS'>('TODOS');
  
  // --- Estado del formulario ---
  const [formState, setFormState] = useState<Omit<EmpresaContratista, "id" | "obraId" | "fechaCreacion">>({
    razonSocial: "", rut: "", tipoEmpresa: "SUBCONTRATISTA", representanteLegal: "",
    contactoNombre: "", contactoTelefono: "", contactoEmail: "", contratoMarco: false,
    certificadoMutual: false, certificadoCotizaciones: false, padronTrabajadores: false,
    reglamentoInterno: false, matrizRiesgos: false, procedimientosTrabajoSeguro: false,
    programaTrabajo: false, planEmergenciaPropio: false, registroCapacitacionInterna: false,
    actaReunionInicial: false, frecuenciaReuniones: "", compromisosEspecificos: "",
    estadoEvaluacion: "POR_EVALUAR", observacionesGenerales: "",
    fechaEvaluacion: new Date().toISOString().slice(0, 10), evaluador: "",
  });

  const empresaSeleccionada = useMemo(() => 
    empresas.find((e) => e.id === empresaSeleccionadaId) ?? null,
    [empresas, empresaSeleccionadaId]
  );
  
  // Carga de Obras
  useEffect(() => {
    async function cargarObras() {
      setLoadingObras(true);
      try {
        const colRef = collection(firebaseDb, "obras");
        const snapshot = await getDocs(colRef);
        const data: ObraPrevencion[] = snapshot.docs.map(doc => ({
          id: doc.id,
          nombreFaena: doc.data().nombreFaena ?? "",
        }));
        setObras(data);
        if (data.length > 0 && !obraSeleccionadaId) {
          setObraSeleccionadaId(data[0].id);
        }
      } catch (error) {
        console.error("Error fetching obras: ", error);
        setErrorForm("No se pudieron cargar las obras disponibles.");
      } finally {
        setLoadingObras(false);
      }
    }
    cargarObras();
  }, []);
  
  // Carga de Empresas en tiempo real
  useEffect(() => {
    if (!obraSeleccionadaId) return;

    setLoading(true);
    const empresasRef = collection(firebaseDb, "empresasContratistas");
    const q = query(empresasRef, where("obraId", "==", obraSeleccionadaId), orderBy("fechaCreacion", "desc"));
    
    const unsubscribe = onSnapshot(q, (snap) => {
        const data: EmpresaContratista[] = snap.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<EmpresaContratista, "id">),
        }));
        setEmpresas(data);
        setLoading(false);
    }, (err) => {
        console.error("Error fetching companies:", err);
        setErrorForm("No se pudieron cargar las empresas.");
        setLoading(false);
    });

    return () => unsubscribe();
  }, [obraSeleccionadaId]);

  // Sincronizar formulario con empresa seleccionada
  useEffect(() => {
    if (empresaSeleccionada) {
        const { id, obraId, fechaCreacion, ...editableData } = empresaSeleccionada;
        setFormState(editableData);
    } else {
        resetForm();
    }
  }, [empresaSeleccionada]);

  // Empresas filtradas para la tabla
  const empresasFiltradas = useMemo(() => {
    return empresas.filter(emp => {
      const matchTexto = filtroTexto.trim() === '' ||
        emp.razonSocial.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        emp.rut.toLowerCase().includes(filtroTexto.toLowerCase());
      const matchEstado = filtroEstado === 'TODOS' || emp.estadoEvaluacion === filtroEstado;
      return matchTexto && matchEstado;
    });
  }, [empresas, filtroTexto, filtroEstado]);
  
  const resetForm = () => {
    setFormState({
      razonSocial: "", rut: "", tipoEmpresa: "SUBCONTRATISTA", representanteLegal: "",
      contactoNombre: "", contactoTelefono: "", contactoEmail: "", contratoMarco: false,
      certificadoMutual: false, certificadoCotizaciones: false, padronTrabajadores: false,
      reglamentoInterno: false, matrizRiesgos: false, procedimientosTrabajoSeguro: false,
      programaTrabajo: false, planEmergenciaPropio: false, registroCapacitacionInterna: false,
      actaReunionInicial: false, frecuenciaReuniones: "", compromisosEspecificos: "",
      estadoEvaluacion: "POR_EVALUAR", observacionesGenerales: "",
      fechaEvaluacion: new Date().toISOString().slice(0, 10), evaluador: "",
    })
  }

  const handleInputChange = (field: keyof typeof formState, value: any) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm(null);
    setSuccessMessage(null);

    if (!obraSeleccionadaId) {
      setErrorForm("Debes seleccionar una obra.");
      return;
    }
    if (!formState.razonSocial.trim() || !formState.rut.trim() || !formState.representanteLegal.trim()) {
      setErrorForm("Razón social, RUT y representante legal son obligatorios.");
      return;
    }

    try {
      if (empresaSeleccionadaId) {
        const docRef = doc(firebaseDb, "empresasContratistas", empresaSeleccionadaId);
        await updateDoc(docRef, { ...formState, updatedAt: serverTimestamp() });
        setSuccessMessage("Ficha actualizada con éxito.");
      } else {
        const empresasRef = collection(firebaseDb, "empresasContratistas");
        await addDoc(empresasRef, {
          ...formState,
          obraId: obraSeleccionadaId,
          fechaCreacion: Timestamp.now(),
        });
        setSuccessMessage("Empresa registrada con éxito.");
      }
      setMostrarForm(false);
      setEmpresaSeleccionadaId(null);

    } catch (err) {
      console.error("Error saving company:", err);
      setErrorForm("No se pudo guardar la ficha de la empresa. Inténtelo de nuevo.");
    }
  };

  const handleDelete = async (idToDelete: string) => {
    try {
      const docRef = doc(firebaseDb, "empresasContratistas", idToDelete);
      await deleteDoc(docRef);
      setSuccessMessage("Empresa eliminada correctamente.");
      if (empresaSeleccionadaId === idToDelete) {
        setEmpresaSeleccionadaId(null);
        setMostrarForm(false);
      }
    } catch(err) {
      console.error("Error deleting company:", err);
      setErrorForm("No se pudo eliminar la empresa. Inténtelo de nuevo.");
    }
  };

  const obraSeleccionadaInfo = obras.find(
    (o) => o.id === obraSeleccionadaId
  );

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">
          Empresas contratistas / subcontratistas – DS44
        </h2>
        <p className="text-sm text-muted-foreground">
          Registro y evaluación de empresas que ingresan a la obra, de acuerdo a las obligaciones de coordinación del DS44.
        </p>
      </header>
      
      {successMessage && <p className="text-sm font-medium text-green-600">{successMessage}</p>}
      {errorForm && <p className="text-sm font-medium text-destructive">{errorForm}</p>}

      <Card>
        <CardHeader>
            <CardTitle>Listado de Empresas Contratistas</CardTitle>
            <CardDescription>
                {obraSeleccionadaInfo ? `Mostrando empresas para la obra: ${obraSeleccionadaInfo.nombreFaena}` : "Seleccione una obra para ver las empresas."}
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1 space-y-1">
              <Label htmlFor="obra-select">Obra / faena</Label>
              <Select
                value={obraSeleccionadaId}
                onValueChange={(value) => {
                  setObraSeleccionadaId(value);
                  setEmpresaSeleccionadaId(null);
                }}
              >
                <SelectTrigger id="obra-select"><SelectValue placeholder={loadingObras ? "Cargando obras..." : "Seleccione una obra"} /></SelectTrigger>
                <SelectContent>
                  {loadingObras ? <SelectItem value="loading" disabled>Cargando...</SelectItem> : obras.map((obra) => <SelectItem key={obra.id} value={obra.id}>{obra.nombreFaena}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor="search-filter">Buscar por Nombre o RUT</Label>
              <Input id="search-filter" value={filtroTexto} onChange={e => setFiltroTexto(e.target.value)} placeholder="Escriba para buscar..."/>
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor="status-filter">Filtrar por Estado</Label>
              <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado(v as any)}>
                  <SelectTrigger id="status-filter"><SelectValue/></SelectTrigger>
                  <SelectContent>
                      {estadoOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
                <Button onClick={() => { setMostrarForm(true); setEmpresaSeleccionadaId(null); resetForm(); }}><PlusCircle className="mr-2 h-4 w-4" />Agregar Empresa</Button>
                <Button variant="outline" asChild>
                    <Link href={`/prevencion/empresas-contratistas/imprimir-listado?obraId=${obraSeleccionadaId}&estado=${filtroEstado}`} target="_blank">
                        <FileDown className="mr-2 h-4 w-4"/>Exportar Listado
                    </Link>
                </Button>
            </div>
          </div>

          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Razón Social / RUT</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Docs OK</TableHead>
                  <TableHead>Evaluador</TableHead>
                  <TableHead>Fecha Evaluación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={6} className="text-center h-24">Cargando...</TableCell></TableRow> 
                : empresasFiltradas.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center h-24">No hay empresas para los filtros seleccionados.</TableCell></TableRow>
                : empresasFiltradas.map(emp => (
                    <TableRow key={emp.id}>
                        <TableCell>
                            <div className="font-medium">{emp.razonSocial}</div>
                            <div className="text-xs text-muted-foreground">{emp.rut}</div>
                        </TableCell>
                        <TableCell><EstadoBadge estado={emp.estadoEvaluacion} /></TableCell>
                        <TableCell className="font-semibold">{countDocsOk(emp)} / 11</TableCell>
                        <TableCell>{emp.evaluador}</TableCell>
                        <TableCell>{emp.fechaEvaluacion}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/prevencion/empresas-contratistas/${emp.id}`}>
                                Ver Ficha
                              </Link>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { setEmpresaSeleccionadaId(emp.id); setMostrarForm(true); }}>
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Editar</span>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Está seguro de que desea eliminar esta empresa?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Se eliminará permanentemente la empresa "{emp.razonSocial}" y todos sus datos asociados.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(emp.id)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                    </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>


      {mostrarForm && (
        <Card>
          <form
            className="space-y-6"
            onSubmit={handleSubmit}
          >
            <CardHeader>
                <CardTitle>{empresaSeleccionadaId ? "Editar Ficha de Empresa" : "Formulario de Ingreso y Evaluación de Empresa"}</CardTitle>
                <CardDescription>Complete todos los campos para el registro y evaluación de la empresa según el DS44.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Identificación de la empresa</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                  <div className="space-y-1"><Label>Razón Social*</Label><Input value={formState.razonSocial} onChange={e => handleInputChange('razonSocial', e.target.value)}/></div>
                  <div className="space-y-1"><Label>RUT*</Label><Input value={formState.rut} onChange={e => handleInputChange('rut', e.target.value)}/></div>
                  <div className="space-y-1"><Label>Representante Legal*</Label><Input value={formState.representanteLegal} onChange={e => handleInputChange('representanteLegal', e.target.value)}/></div>
                  <div className="space-y-1"><Label>Tipo de Empresa</Label>
                      <Select value={formState.tipoEmpresa} onValueChange={v => handleInputChange('tipoEmpresa', v as TipoEmpresaPrevencion)}>
                          <SelectTrigger><SelectValue/></SelectTrigger>
                          <SelectContent>
                              <SelectItem value="SUBCONTRATISTA">Subcontratista</SelectItem>
                              <SelectItem value="CONTRATISTA_PRINCIPAL">Contratista Principal</SelectItem>
                              <SelectItem value="SERVICIOS">Servicios</SelectItem>
                              <SelectItem value="MANDANTE">Mandante</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-1"><Label>Contacto</Label><Input value={formState.contactoNombre} onChange={e => handleInputChange('contactoNombre', e.target.value)}/></div>
                  <div className="space-y-1"><Label>Teléfono</Label><Input value={formState.contactoTelefono} onChange={e => handleInputChange('contactoTelefono', e.target.value)}/></div>
                  <div className="space-y-1 col-span-full"><Label>Email</Label><Input type="email" value={formState.contactoEmail} onChange={e => handleInputChange('contactoEmail', e.target.value)}/></div>
                </div>
              </div>
                <Separator/>
                <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Documentación contractual / administrativa</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mt-2">
                  <Label className="flex items-center gap-2 font-normal"><Checkbox checked={formState.contratoMarco} onCheckedChange={c => handleInputChange('contratoMarco', !!c)} /><span>Contrato marco / orden de compra</span></Label>
                  <Label className="flex items-center gap-2 font-normal"><Checkbox checked={formState.certificadoMutual} onCheckedChange={c => handleInputChange('certificadoMutual', !!c)} /><span>Certificado de mutual</span></Label>
                  <Label className="flex items-center gap-2 font-normal"><Checkbox checked={formState.certificadoCotizaciones} onCheckedChange={c => handleInputChange('certificadoCotizaciones', !!c)} /><span>Certificado cotizaciones</span></Label>
                  <Label className="flex items-center gap-2 font-normal"><Checkbox checked={formState.padronTrabajadores} onCheckedChange={c => handleInputChange('padronTrabajadores', !!c)} /><span>Padrón de trabajadores</span></Label>
                  <Label className="flex items-center gap-2 font-normal"><Checkbox checked={formState.reglamentoInterno} onCheckedChange={c => handleInputChange('reglamentoInterno', !!c)} /><span>Reglamento interno</span></Label>
                </div>
              </div>
              <Separator/>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Documentos de prevención</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mt-2">
                  <Label className="flex items-center gap-2 font-normal"><Checkbox checked={formState.matrizRiesgos} onCheckedChange={c => handleInputChange('matrizRiesgos', !!c)} /><span>Matriz de riesgos / IPER</span></Label>
                  <Label className="flex items-center gap-2 font-normal"><Checkbox checked={formState.procedimientosTrabajoSeguro} onCheckedChange={c => handleInputChange('procedimientosTrabajoSeguro', !!c)} /><span>Procedimientos de trabajo seguro</span></Label>
                  <Label className="flex items-center gap-2 font-normal"><Checkbox checked={formState.programaTrabajo} onCheckedChange={c => handleInputChange('programaTrabajo', !!c)} /><span>Programa de trabajo</span></Label>
                  <Label className="flex items-center gap-2 font-normal"><Checkbox checked={formState.planEmergenciaPropio} onCheckedChange={c => handleInputChange('planEmergenciaPropio', !!c)} /><span>Plan de emergencia propio</span></Label>
                  <Label className="flex items-center gap-2 font-normal"><Checkbox checked={formState.registroCapacitacionInterna} onCheckedChange={c => handleInputChange('registroCapacitacionInterna', !!c)} /><span>Registro capacitación interna</span></Label>
                  <Label className="flex items-center gap-2 font-normal"><Checkbox checked={formState.actaReunionInicial} onCheckedChange={c => handleInputChange('actaReunionInicial', !!c)} /><span>Acta reunión inicial de coordinación</span></Label>
                </div>
              </div>
              <Separator/>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Resultado de evaluación</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="space-y-1"><Label>Estado de Evaluación</Label>
                        <Select value={formState.estadoEvaluacion} onValueChange={v => handleInputChange('estadoEvaluacion', v as EstadoEvaluacionEmpresa)}>
                          <SelectTrigger><SelectValue/></SelectTrigger>
                          <SelectContent>
                            {estadoOptions.filter(o => o.value !== 'TODOS').map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-1"><Label>Observaciones Generales</Label><Textarea value={formState.observacionesGenerales} onChange={e => handleInputChange('observacionesGenerales', e.target.value)}/></div>
                  <div className="space-y-1"><Label>Fecha Evaluación</Label><Input type="date" value={formState.fechaEvaluacion} onChange={e => handleInputChange('fechaEvaluacion', e.target.value)}/></div>
                  <div className="space-y-1"><Label>Evaluador</Label><Input value={formState.evaluador} onChange={e => handleInputChange('evaluador', e.target.value)}/></div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button type="submit" className="w-full sm:w-auto">
                  {empresaSeleccionadaId ? "Actualizar Ficha" : "Registrar Empresa"}
              </Button>
              {empresaSeleccionadaId && (
                  <AlertDialog>
                      <AlertDialogTrigger asChild>
                          <Button type="button" variant="destructive" className="w-full sm:w-auto">Eliminar Empresa</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>¿Seguro que deseas eliminar esta empresa?</AlertDialogTitle>
                              <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Se borrará permanentemente la ficha de "{formState.razonSocial}".
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(empresaSeleccionadaId)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>
              )}
               <Button type="button" variant="ghost" onClick={() => setMostrarForm(false)} className="w-full sm:w-auto">Cancelar</Button>
            </CardFooter>
          </form>
        </Card>
      )}

    </section>
  );
}
