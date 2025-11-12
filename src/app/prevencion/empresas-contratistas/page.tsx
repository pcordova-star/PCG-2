"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { firebaseDb } from "@/lib/firebaseClient";
import { collection, addDoc, Timestamp, getDocs, orderBy, query } from "firebase/firestore";

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

const OBRAS_PREVENCION: ObraPrevencion[] = [
  { id: "obra-1", nombreFaena: "Edificio Los Álamos" },
  { id: "obra-2", nombreFaena: "Condominio Cuatro Vientos" },
  { id: "obra-3", nombreFaena: "Mejoramiento Vial Ruta 5" },
];

function getNombreObraPrevencionById(obraId: string): string {
  const obra = OBRAS_PREVENCION.find((o) => o.id === obraId);
  return obra ? obra.nombreFaena : "Obra sin nombre";
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
  const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>(
    OBRAS_PREVENCION[0]?.id ?? ""
  );

  const [empresas, setEmpresas] = useState<EmpresaContratista[]>([]);
  const [loading, setLoading] = useState(true);

  const [mostrarFormNueva, setMostrarFormNueva] = useState<boolean>(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [empresaSeleccionadaId, setEmpresaSeleccionadaId] = useState<string | null>(null);

  const empresaSeleccionada = empresas.find((e) => e.id === empresaSeleccionadaId) ?? null;

  const [formState, setFormState] = useState({
    razonSocial: "",
    rut: "",
    tipoEmpresa: "SUBCONTRATISTA" as TipoEmpresaPrevencion,
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
    estadoEvaluacion: "POR_EVALUAR" as EstadoEvaluacionEmpresa,
    observacionesGenerales: "",
    fechaEvaluacion: new Date().toISOString().slice(0, 10),
    evaluador: "",
  });
  
  useEffect(() => {
    const fetchEmpresas = async () => {
      setLoading(true);
      try {
        const empresasRef = collection(firebaseDb, "empresasContratistas");
        const q = query(empresasRef, orderBy("fechaCreacion", "desc"));
        const snap = await getDocs(q);
        const data: EmpresaContratista[] = snap.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<EmpresaContratista, "id">),
        }));
        setEmpresas(data);
      } catch (err) {
        console.error("Error fetching companies:", err);
        setErrorForm("No se pudieron cargar las empresas.");
      } finally {
        setLoading(false);
      }
    };

    fetchEmpresas();
  }, []);
  
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
      const empresasRef = collection(firebaseDb, "empresasContratistas");
      const docRef = await addDoc(empresasRef, {
        ...formState,
        obraId: obraSeleccionadaId,
        fechaCreacion: Timestamp.now(),
      });

      const newEmpresa: EmpresaContratista = {
        id: docRef.id,
        obraId: obraSeleccionadaId,
        ...formState,
        fechaCreacion: Timestamp.now(),
      };
      
      setEmpresas(prev => [newEmpresa, ...prev]);
      setSuccessMessage("Empresa registrada con éxito.");
      resetForm();
      setMostrarFormNueva(false);

    } catch (err) {
      console.error("Error creating company:", err);
      setErrorForm("No se pudo registrar la empresa. Inténtelo de nuevo.");
    }
  };


  const empresasDeObra = empresas.filter(
    (e) => e.obraId === obraSeleccionadaId
  );

  const obraSeleccionada = OBRAS_PREVENCION.find(
    (o) => o.id === obraSeleccionadaId
  );

  const CheckItem = ({ label, checked }: { label: string, checked: boolean }) => (
    <p className="flex items-center justify-between py-1.5 border-b border-muted">
      <span>{label}</span>
      <span className={`font-semibold ${checked ? 'text-green-600' : 'text-amber-600'}`}>
        {checked ? "Cumple" : "Pendiente"}
      </span>
    </p>
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
              <SelectValue placeholder="Seleccione una obra" />
            </SelectTrigger>
            <SelectContent>
              {OBRAS_PREVENCION.map((obra) => (
                <SelectItem key={obra.id} value={obra.id}>
                  {obra.nombreFaena}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          onClick={() => {
            setErrorForm(null);
            setEmpresaSeleccionadaId(null);
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
          {mostrarFormNueva ? (
            <form
              className="space-y-6 rounded-xl border bg-card p-4 shadow-sm text-xs print:hidden"
              onSubmit={handleSubmit}
            >
              <h3 className="text-sm font-semibold text-card-foreground">
                Formulario de Ingreso y Evaluación de Empresa
              </h3>
              {errorForm && (
                <p className="text-[11px] text-destructive">{errorForm}</p>
              )}
                
              {/* Campos del formulario */}
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Identificación de la empresa</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                    <div className="space-y-1"><Label>Razón Social*</Label><Input value={formState.razonSocial} onChange={e => setFormState(s => ({...s, razonSocial: e.target.value}))}/></div>
                    <div className="space-y-1"><Label>RUT*</Label><Input value={formState.rut} onChange={e => setFormState(s => ({...s, rut: e.target.value}))}/></div>
                    <div className="space-y-1"><Label>Representante Legal*</Label><Input value={formState.representanteLegal} onChange={e => setFormState(s => ({...s, representanteLegal: e.target.value}))}/></div>
                    <div className="space-y-1"><Label>Tipo de Empresa</Label>
                        <Select value={formState.tipoEmpresa} onValueChange={v => setFormState(s => ({...s, tipoEmpresa: v as TipoEmpresaPrevencion}))}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="SUBCONTRATISTA">Subcontratista</SelectItem>
                                <SelectItem value="CONTRATISTA_PRINCIPAL">Contratista Principal</SelectItem>
                                <SelectItem value="SERVICIOS">Servicios</SelectItem>
                                <SelectItem value="MANDANTE">Mandante</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1"><Label>Contacto</Label><Input value={formState.contactoNombre} onChange={e => setFormState(s => ({...s, contactoNombre: e.target.value}))}/></div>
                    <div className="space-y-1"><Label>Teléfono</Label><Input value={formState.contactoTelefono} onChange={e => setFormState(s => ({...s, contactoTelefono: e.target.value}))}/></div>
                    <div className="space-y-1 col-span-full"><Label>Email</Label><Input type="email" value={formState.contactoEmail} onChange={e => setFormState(s => ({...s, contactoEmail: e.target.value}))}/></div>
                  </div>
                </div>
                 <Separator/>
                 <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Documentación contractual / administrativa</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mt-2">
                    <Label className="flex items-center gap-2 font-normal"><Checkbox checked={formState.contratoMarco} onCheckedChange={c => setFormState(s => ({...s, contratoMarco: !!c}))} /><span>Contrato marco / orden de compra</span></Label>
                    <Label className="flex items-center gap-2 font-normal"><Checkbox checked={formState.certificadoMutual} onCheckedChange={c => setFormState(s => ({...s, certificadoMutual: !!c}))} /><span>Certificado de mutual</span></Label>
                    <Label className="flex items-center gap-2 font-normal"><Checkbox checked={formState.certificadoCotizaciones} onCheckedChange={c => setFormState(s => ({...s, certificadoCotizaciones: !!c}))} /><span>Certificado cotizaciones</span></Label>
                    <Label className="flex items-center gap-2 font-normal"><Checkbox checked={formState.padronTrabajadores} onCheckedChange={c => setFormState(s => ({...s, padronTrabajadores: !!c}))} /><span>Padrón de trabajadores</span></Label>
                    <Label className="flex items-center gap-2 font-normal"><Checkbox checked={formState.reglamentoInterno} onCheckedChange={c => setFormState(s => ({...s, reglamentoInterno: !!c}))} /><span>Reglamento interno</span></Label>
                  </div>
                </div>
                <Separator/>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Documentos de prevención</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mt-2">
                    <Label className="flex items-center gap-2 font-normal"><Checkbox checked={formState.matrizRiesgos} onCheckedChange={c => setFormState(s => ({...s, matrizRiesgos: !!c}))} /><span>Matriz de riesgos / IPER</span></Label>
                    <Label className="flex items-center gap-2 font-normal"><Checkbox checked={formState.procedimientosTrabajoSeguro} onCheckedChange={c => setFormState(s => ({...s, procedimientosTrabajoSeguro: !!c}))} /><span>Procedimientos de trabajo seguro</span></Label>
                    <Label className="flex items-center gap-2 font-normal"><Checkbox checked={formState.programaTrabajo} onCheckedChange={c => setFormState(s => ({...s, programaTrabajo: !!c}))} /><span>Programa de trabajo</span></Label>
                    <Label className="flex items-center gap-2 font-normal"><Checkbox checked={formState.planEmergenciaPropio} onCheckedChange={c => setFormState(s => ({...s, planEmergenciaPropio: !!c}))} /><span>Plan de emergencia propio</span></Label>
                    <Label className="flex items-center gap-2 font-normal"><Checkbox checked={formState.registroCapacitacionInterna} onCheckedChange={c => setFormState(s => ({...s, registroCapacitacionInterna: !!c}))} /><span>Registro capacitación interna</span></Label>
                  </div>
                </div>
                <Separator/>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Resultado de evaluación</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="space-y-1"><Label>Estado de Evaluación</Label>
                         <Select value={formState.estadoEvaluacion} onValueChange={v => setFormState(s => ({...s, estadoEvaluacion: v as EstadoEvaluacionEmpresa}))}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="POR_EVALUAR">Por evaluar</SelectItem>
                                <SelectItem value="APROBADA">Aprobada</SelectItem>
                                <SelectItem value="APROBADA_CON_OBSERVACIONES">Aprobada con observaciones</SelectItem>
                                <SelectItem value="RECHAZADA">Rechazada / no autorizada</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1"><Label>Observaciones Generales</Label><Textarea value={formState.observacionesGenerales} onChange={e => setFormState(s => ({...s, observacionesGenerales: e.target.value}))}/></div>
                    <div className="space-y-1"><Label>Fecha Evaluación</Label><Input type="date" value={formState.fechaEvaluacion} onChange={e => setFormState(s => ({...s, fechaEvaluacion: e.target.value}))}/></div>
                    <div className="space-y-1"><Label>Evaluador</Label><Input value={formState.evaluador} onChange={e => setFormState(s => ({...s, evaluador: e.target.value}))}/></div>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full sm:w-auto">Registrar Empresa</Button>
            </form>
          ) : empresaSeleccionada ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 print:hidden">
                <h3 className="text-sm font-semibold text-card-foreground">
                  Ficha de empresa en la obra
                </h3>
                <Button
                  type="button"
                  onClick={() => window.print()}
                  variant="outline"
                  size="sm"
                >
                  Imprimir / Guardar PDF
                </Button>
              </div>
              <div id="printable-empresa" className="space-y-3 rounded-xl border bg-card p-4 shadow-sm text-xs print:rounded-none print:shadow-none print:border-0 print:p-0">
                <EncabezadoDocumentoEmpresa
                  config={getEmpresaDocConfig("EVAL_EMPRESA_CONTRATISTA")}
                  nombreObra={getNombreObraPrevencionById(empresaSeleccionada.obraId)}
                />
                <header className="space-y-1 pb-2 border-b">
                  <h3 className="text-sm font-semibold text-primary">
                    Ficha de empresa en la obra
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Razón social: {empresaSeleccionada.razonSocial} · RUT: {empresaSeleccionada.rut}
                  </p>
                  {obraSeleccionada && (
                    <p className="text-[11px] text-muted-foreground">
                      Obra: {obraSeleccionada.nombreFaena}
                    </p>
                  )}
                </header>

                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Identificación de la empresa</p>
                    <div className="mt-2 text-card-foreground space-y-1">
                        <p><strong>Tipo:</strong> {empresaSeleccionada.tipoEmpresa}</p>
                        <p><strong>Rep. Legal:</strong> {empresaSeleccionada.representanteLegal}</p>
                        <p><strong>Contacto:</strong> {empresaSeleccionada.contactoNombre}</p>
                        <p><strong>Teléfono:</strong> {empresaSeleccionada.contactoTelefono}</p>
                        <p><strong>Email:</strong> {empresaSeleccionada.contactoEmail}</p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Documentación contractual / administrativa</p>
                    <div className="mt-2 text-card-foreground">
                        <CheckItem label="Contrato marco / orden de compra" checked={empresaSeleccionada.contratoMarco} />
                        <CheckItem label="Certificado de mutual" checked={empresaSeleccionada.certificadoMutual} />
                        <CheckItem label="Certificado cotizaciones" checked={empresaSeleccionada.certificadoCotizaciones} />
                        <CheckItem label="Padrón de trabajadores" checked={empresaSeleccionada.padronTrabajadores} />
                        <CheckItem label="Reglamento interno" checked={empresaSeleccionada.reglamentoInterno} />
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Documentos de prevención</p>
                    <div className="mt-2 text-card-foreground">
                        <CheckItem label="Matriz de riesgos / IPER" checked={empresaSeleccionada.matrizRiesgos} />
                        <CheckItem label="Procedimientos de trabajo seguro" checked={empresaSeleccionada.procedimientosTrabajoSeguro} />
                        <CheckItem label="Programa de trabajo" checked={empresaSeleccionada.programaTrabajo} />
                        <CheckItem label="Plan de emergencia propio" checked={empresaSeleccionada.planEmergenciaPropio} />
                        <CheckItem label="Registro capacitación interna" checked={empresaSeleccionada.registroCapacitacionInterna} />
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Coordinación DS44</p>
                    <div className="mt-2 text-card-foreground space-y-1">
                          <CheckItem label="Acta reunión inicial" checked={empresaSeleccionada.actaReunionInicial} />
                          <p><strong>Frecuencia reuniones:</strong> {empresaSeleccionada.frecuenciaReuniones}</p>
                          <p><strong>Compromisos:</strong> {empresaSeleccionada.compromisosEspecificos}</p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Resultado de evaluación</p>
                    <div className="mt-2 text-card-foreground space-y-1">
                          <p><strong>Estado:</strong> {
                              {
                                  "POR_EVALUAR": "Por evaluar",
                                  "APROBADA": "Aprobada",
                                  "APROBADA_CON_OBSERVACIONES": "Aprobada con observaciones",
                                  "RECHAZADA": "Rechazada / no autorizada"
                              }[empresaSeleccionada.estadoEvaluacion]
                          }</p>
                          <p><strong>Observaciones:</strong> {empresaSeleccionada.observacionesGenerales}</p>
                          <p><strong>Fecha evaluación:</strong> {empresaSeleccionada.fechaEvaluacion}</p>
                          <p><strong>Evaluador:</strong> {empresaSeleccionada.evaluador}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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

    