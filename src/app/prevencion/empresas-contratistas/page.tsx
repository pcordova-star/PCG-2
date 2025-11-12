"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { firebaseDb } from "@/lib/firebaseClient";
import { collection, addDoc, Timestamp, getDocs, orderBy, query, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

type ObraPrevencion = {
  id: string;
  nombreFaena: string;
};

type TipoEmpresaPrevencion =
  | "MANDANTE"
  | "CONTRATISTA_PRINCIPAL"
  | "SUBCONTRATISTA"
  | "SERVICIOS";

type EstadoEvaluacionEmpresa =
  | "POR_EVALUAR"
  | "APROBADA"
  | "APROBADA_CON_OBSERVACIONES"
  | "RECHAZADA";

type EmpresaContratista = {
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

type TipoDocumentoEmpresaPrevencion = "EVAL_EMPRESA_CONTRATISTA";

type DocumentoEmpresaConfigLocal = {
  tipoDocumento: TipoDocumentoEmpresaPrevencion;
  codigo: string;
  titulo: string;
  version: string;
  fechaEmision: string;
  elaboradoPor: string;
  revisadoPor?: string;
  aprobadoPor?: string;
};

const DOC_EMPRESA_CONFIGS: DocumentoEmpresaConfigLocal[] = [
  {
    tipoDocumento: "EVAL_EMPRESA_CONTRATISTA",
    codigo: "PCG-PRV-EMP-001",
    titulo: "Evaluación de Empresa Contratista / Subcontratista por Obra",
    version: "V1.0",
    fechaEmision: "2025-01-01",
    elaboradoPor: "Prevención de Riesgos",
    revisadoPor: "Jefe de Prevención",
    aprobadoPor: "Gerente de Operaciones",
  },
];

function getEmpresaDocConfig(
  tipo: TipoDocumentoEmpresaPrevencion
): DocumentoEmpresaConfigLocal {
  const found = DOC_EMPRESA_CONFIGS.find((c) => c.tipoDocumento === tipo);
  if (!found) {
    return {
      tipoDocumento: tipo,
      codigo: "PCG-PRV-XXX-000",
      titulo: "Documento de Evaluación de Empresa",
      version: "V1.0",
      fechaEmision: "2025-01-01",
      elaboradoPor: "Prevención de Riesgos",
      revisadoPor: "",
      aprobadoPor: "",
    };
  }
  return found;
}

type EncabezadoEmpresaProps = {
  config: DocumentoEmpresaConfigLocal;
  nombreObra: string;
};

function EncabezadoDocumentoEmpresa({
  config,
  nombreObra,
}: EncabezadoEmpresaProps) {
  return (
    <header className="mb-4 rounded-xl border bg-card p-4 shadow-sm text-xs print:shadow-none print:rounded-none">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground">
            [Nombre de la Empresa Mandante]
          </p>
          <h1 className="text-sm font-bold text-card-foreground">
            {config.titulo}
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Obra: {nombreObra}
          </p>
        </div>
        <div className="text-[11px] text-right text-muted-foreground space-y-0.5">
          <p>
            <span className="font-semibold">Código:</span> {config.codigo}
          </p>
          <p>
            <span className="font-semibold">Versión:</span> {config.version}
          </p>
          <p>
            <span className="font-semibold">Emisión:</span> {config.fechaEmision}
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <div>
          <p className="font-semibold text-[11px] text-muted-foreground">
            Elaborado por
          </p>
          <p className="text-[11px] text-muted-foreground">
            {config.elaboradoPor}
          </p>
        </div>
        <div>
          <p className="font-semibold text-[11px] text-muted-foreground">
            Revisado por
          </p>
          <p className="text-[11px] text-muted-foreground">
            {config.revisadoPor || "-"}
          </p>
        </div>
        <div>
          <p className="font-semibold text-[11px] text-muted-foreground">
            Aprobado por
          </p>
          <p className="text-[11px] text-muted-foreground">
            {config.aprobadoPor || "-"}
          </p>
        </div>
      </div>
    </header>
  );
}

export default function EmpresasContratistasPage() {
  const [obras, setObras] = useState<ObraPrevencion[]>([]);
  const [loadingObras, setLoadingObras] = useState(true);
  const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>("");

  const [empresas, setEmpresas] = useState<EmpresaContratista[]>([]);
  const [loading, setLoading] = useState(true);

  const [mostrarFormNueva, setMostrarFormNueva] = useState<boolean>(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [empresaSeleccionadaId, setEmpresaSeleccionadaId] = useState<string | null>(null);

  const [formState, setFormState] = useState<Omit<EmpresaContratista, "id" | "obraId" | "fechaCreacion">>({
    razonSocial: "",
    rut: "",
    tipoEmpresa: "SUBCONTRATISTA",
    representanteLegal: "",
    contactoNombre: "",
    contactoTelefono: "",
    contactoEmail: "",
    contratoMarco: false,
    certificadoMutual: false,
    certificadoCotizaciones: false,
    padronTrabajadores: false,
    reglamentoInterno: false,
    matrizRiesgos: false,
    procedimientosTrabajoSeguro: false,
    programaTrabajo: false,
    planEmergenciaPropio: false,
    registroCapacitacionInterna: false,
    actaReunionInicial: false,
    frecuenciaReuniones: "",
    compromisosEspecificos: "",
    estadoEvaluacion: "POR_EVALUAR",
    observacionesGenerales: "",
    fechaEvaluacion: new Date().toISOString().slice(0, 10),
    evaluador: "",
  });

  const empresaSeleccionada = useMemo(() => 
    empresas.find((e) => e.id === empresaSeleccionadaId) ?? null,
    [empresas, empresaSeleccionadaId]
  );
  
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

  useEffect(() => {
    if (empresaSeleccionada) {
        const { id, obraId, fechaCreacion, ...editableData } = empresaSeleccionada;
        setFormState(editableData);
    } else {
        resetForm();
    }
  }, [empresaSeleccionada]);
  
  const resetForm = () => {
    setFormState({
        razonSocial: "",
        rut: "",
        tipoEmpresa: "SUBCONTRATISTA",
        representanteLegal: "",
        contactoNombre: "",
        contactoTelefono: "",
        contactoEmail: "",
        contratoMarco: false,
        certificadoMutual: false,
        certificadoCotizaciones: false,
        padronTrabajadores: false,
        reglamentoInterno: false,
        matrizRiesgos: false,
        procedimientosTrabajoSeguro: false,
        programaTrabajo: false,
        planEmergenciaPropio: false,
        registroCapacitacionInterna: false,
        actaReunionInicial: false,
        frecuenciaReuniones: "",
        compromisosEspecificos: "",
        estadoEvaluacion: "POR_EVALUAR",
        observacionesGenerales: "",
        fechaEvaluacion: new Date().toISOString().slice(0, 10),
        evaluador: "",
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
        // Actualizar
        const docRef = doc(firebaseDb, "empresasContratistas", empresaSeleccionadaId);
        await updateDoc(docRef, { ...formState, updatedAt: serverTimestamp() });
        setSuccessMessage("Ficha actualizada con éxito.");
      } else {
        // Crear nuevo
        const empresasRef = collection(firebaseDb, "empresasContratistas");
        const docRef = await addDoc(empresasRef, {
          ...formState,
          obraId: obraSeleccionadaId,
          fechaCreacion: Timestamp.now(),
        });
        setSuccessMessage("Empresa registrada con éxito.");
        setEmpresaSeleccionadaId(docRef.id);
      }
      setMostrarFormNueva(false);

    } catch (err) {
      console.error("Error saving company:", err);
      setErrorForm("No se pudo guardar la ficha de la empresa. Inténtelo de nuevo.");
    }
  };

  const handleDelete = async () => {
    if (!empresaSeleccionadaId) return;

    try {
      const docRef = doc(firebaseDb, "empresasContratistas", empresaSeleccionadaId);
      await deleteDoc(docRef);
      setSuccessMessage("Empresa eliminada correctamente.");
      setEmpresaSeleccionadaId(null);
    } catch(err) {
      console.error("Error deleting company:", err);
      setErrorForm("No se pudo eliminar la empresa. Inténtelo de nuevo.");
    }
  };

  const empresasDeObra = empresas;

  const obraSeleccionadaInfo = obras.find(
    (o) => o.id === obraSeleccionadaId
  );

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">
          Empresas contratistas / subcontratistas – DS44
        </h2>
        <p className="text-sm text-muted-foreground">
          Registro y evaluación de empresas que ingresan a la obra, de acuerdo
          a las obligaciones de coordinación del DS44.
        </p>
      </header>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between print:hidden">
        <div className="space-y-1">
          <Label htmlFor="obra-select">Obra / faena</Label>
          <Select
            value={obraSeleccionadaId}
            onValueChange={(value) => {
              setObraSeleccionadaId(value);
              setEmpresaSeleccionadaId(null);
            }}
          >
            <SelectTrigger id="obra-select" className="w-full md:w-auto">
              <SelectValue placeholder={loadingObras ? "Cargando obras..." : "Seleccione una obra"} />
            </SelectTrigger>
            <SelectContent>
              {loadingObras ? (
                 <SelectItem value="loading" disabled>Cargando...</SelectItem>
              ) : (
                obras.map((obra) => (
                  <SelectItem key={obra.id} value={obra.id}>
                    {obra.nombreFaena}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          onClick={() => {
            setErrorForm(null);
            setEmpresaSeleccionadaId(null);
            resetForm();
            setMostrarFormNueva((prev) => !prev);
          }}
          variant="outline"
        >
          {mostrarFormNueva ? "Cerrar formulario" : "Ingresar nueva empresa"}
        </Button>
      </div>

      {successMessage && <p className="text-sm font-medium text-green-600">{successMessage}</p>}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Columna izquierda: listado de empresas */}
        <div className="space-y-2 lg:col-span-1 print:hidden">
          <h3 className="text-sm font-semibold text-card-foreground">
            Empresas registradas en la obra
          </h3>
          {loading ? (<p className="text-xs text-muted-foreground pt-4 text-center">Cargando empresas...</p>) : 
          empresasDeObra.length === 0 ? (
            <p className="text-xs text-muted-foreground pt-4 text-center">
              No hay empresas registradas aún para esta obra.
            </p>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {empresasDeObra.map((emp) => (
                <article
                  key={emp.id}
                  onClick={() => {
                    setMostrarFormNueva(false);
                    setEmpresaSeleccionadaId(emp.id);
                  }}
                  className={`rounded-lg border bg-card p-3 shadow-sm text-xs space-y-1 cursor-pointer transition ${emp.id === empresaSeleccionadaId
                    ? "border-primary ring-2 ring-primary/40"
                    : "border-border hover:border-primary/50"
                    }`}
                >
                  <p className="font-semibold text-primary">
                    {emp.razonSocial} ({emp.rut})
                  </p>
                  <p className="text-muted-foreground">
                    Tipo:{" "}
                    {emp.tipoEmpresa === "MANDANTE"
                      ? "Mandante"
                      : emp.tipoEmpresa === "CONTRATISTA_PRINCIPAL"
                        ? "Contratista principal"
                        : emp.tipoEmpresa === "SUBCONTRATISTA"
                          ? "Subcontratista"
                          : "Servicios"}
                  </p>
                  <p className="text-muted-foreground">
                    Contacto: {emp.contactoNombre}
                  </p>
                  <p className="text-muted-foreground">
                    Estado:{" "}
                    <span className="font-medium text-card-foreground">
                    {emp.estadoEvaluacion === "POR_EVALUAR"
                      ? "Por evaluar"
                      : emp.estadoEvaluacion === "APROBADA"
                        ? "Aprobada"
                        : emp.estadoEvaluacion === "APROBADA_CON_OBSERVACIONES"
                          ? "Aprobada con observaciones"
                          : "Rechazada / no autorizada"}
                    </span>
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Columna derecha: formulario o ficha */}
        <div className="space-y-2 lg:col-span-2">
          {(mostrarFormNueva || empresaSeleccionadaId) ? (
            <form
              id="printable-empresa"
              className="space-y-6 rounded-xl border bg-card p-4 shadow-sm text-xs print:rounded-none print:shadow-none print:border-0 print:p-0"
              onSubmit={handleSubmit}
            >
              <div className="flex justify-between items-center">
                 <h3 className="text-sm font-semibold text-card-foreground">
                    {empresaSeleccionadaId ? "Ficha de Empresa" : "Formulario de Ingreso y Evaluación de Empresa"}
                </h3>
                 {empresaSeleccionadaId && <Button type="button" onClick={() => window.print()} variant="outline" size="sm" className="print:hidden">Imprimir / Guardar PDF</Button>}
              </div>

              {errorForm && (
                <p className="text-[11px] text-destructive">{errorForm}</p>
              )}
                
              {obraSeleccionadaInfo && <EncabezadoDocumentoEmpresa config={getEmpresaDocConfig("EVAL_EMPRESA_CONTRATISTA")} nombreObra={obraSeleccionadaInfo.nombreFaena} />}

              {/* Campos del formulario */}
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Identificación de la empresa</p>
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
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Documentación contractual / administrativa</p>
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
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Documentos de prevención</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mt-2">
                    <Label className="flex items-center gap-2 font-normal"><Checkbox checked={formState.matrizRiesgos} onCheckedChange={c => handleInputChange('matrizRiesgos', !!c)} /><span>Matriz de riesgos / IPER</span></Label>
                    <Label className="flex items-center gap-2 font-normal"><Checkbox checked={formState.procedimientosTrabajoSeguro} onCheckedChange={c => handleInputChange('procedimientosTrabajoSeguro', !!c)} /><span>Procedimientos de trabajo seguro</span></Label>
                    <Label className="flex items-center gap-2 font-normal"><Checkbox checked={formState.programaTrabajo} onCheckedChange={c => handleInputChange('programaTrabajo', !!c)} /><span>Programa de trabajo</span></Label>
                    <Label className="flex items-center gap-2 font-normal"><Checkbox checked={formState.planEmergenciaPropio} onCheckedChange={c => handleInputChange('planEmergenciaPropio', !!c)} /><span>Plan de emergencia propio</span></Label>
                    <Label className="flex items-center gap-2 font-normal"><Checkbox checked={formState.registroCapacitacionInterna} onCheckedChange={c => handleInputChange('registroCapacitacionInterna', !!c)} /><span>Registro capacitación interna</span></Label>
                  </div>
                </div>
                <Separator/>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Resultado de evaluación</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="space-y-1"><Label>Estado de Evaluación</Label>
                         <Select value={formState.estadoEvaluacion} onValueChange={v => handleInputChange('estadoEvaluacion', v as EstadoEvaluacionEmpresa)}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="POR_EVALUAR">Por evaluar</SelectItem>
                                <SelectItem value="APROBADA">Aprobada</SelectItem>
                                <SelectItem value="APROBADA_CON_OBSERVACIONES">Aprobada con observaciones</SelectItem>
                                <SelectItem value="RECHAZADA">Rechazada / no autorizada</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1"><Label>Observaciones Generales</Label><Textarea value={formState.observacionesGenerales} onChange={e => handleInputChange('observacionesGenerales', e.target.value)}/></div>
                    <div className="space-y-1"><Label>Fecha Evaluación</Label><Input type="date" value={formState.fechaEvaluacion} onChange={e => handleInputChange('fechaEvaluacion', e.target.value)}/></div>
                    <div className="space-y-1"><Label>Evaluador</Label><Input value={formState.evaluador} onChange={e => handleInputChange('evaluador', e.target.value)}/></div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-4 print:hidden">
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
                                <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-center h-full rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 text-center p-8">
              <p className="text-sm text-muted-foreground">
                Selecciona una empresa del listado de la izquierda o haz clic en
                "Ingresar nueva empresa" para registrar una nueva.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
