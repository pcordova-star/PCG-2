"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

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

type EmpresaContratistaObra = {
  id: string;
  obraId: string;
  razonSocial: string;
  rut: string;
  tipoEmpresa: TipoEmpresaPrevencion;
  representanteLegal: string;
  contactoNombre: string;
  contactoTelefono: string;
  contactoEmail: string;

  // Documentación contractual / administrativa
  contratoMarco: boolean;
  certificadoMutual: boolean;
  certificadoCotizaciones: boolean;
  padronTrabajadores: boolean;
  reglamentoInterno: boolean;

  // Documentos de prevención
  matrizRiesgos: boolean;
  procedimientosTrabajoSeguro: boolean;
  programaTrabajo: boolean;
  planEmergenciaPropio: boolean;
  registroCapacitacionInterna: boolean;

  // Coordinación DS44
  actaReunionInicial: boolean;
  frecuenciaReuniones: string; // texto libre, ej: "semanal", "quincenal"
  compromisosEspecificos: string;

  estadoEvaluacion: EstadoEvaluacionEmpresa;
  observacionesGenerales: string;

  fechaEvaluacion: string; // YYYY-MM-DD
  evaluador: string;
};

type TipoDocumentoEmpresaPrevencion = "EVAL_EMPRESA_CONTRATISTA";

type DocumentoEmpresaConfigLocal = {
  tipoDocumento: TipoDocumentoEmpresaPrevencion;
  codigo: string;
  titulo: string;
  version: string;
  fechaEmision: string; // YYYY-MM-DD
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

const EMPRESAS_INICIALES: EmpresaContratistaObra[] = [];

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

  const [empresas, setEmpresas] = useState<EmpresaContratistaObra[]>(
    EMPRESAS_INICIALES
  );

  const [mostrarFormNueva, setMostrarFormNueva] = useState<boolean>(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const [empresaSeleccionadaId, setEmpresaSeleccionadaId] = useState<string | null>(null);

  const empresaSeleccionada = empresas.find((e) => e.id === empresaSeleccionadaId) ?? null;


  const [formEmpresa, setFormEmpresa] = useState<{
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
  }>({
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
          a las obligaciones de coordinación del DS44. Todos los datos son
          simulados (MVP).
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Columna izquierda: listado de empresas */}
        <div className="space-y-2 lg:col-span-1 print:hidden">
          <h3 className="text-sm font-semibold text-card-foreground">
            Empresas registradas en la obra
          </h3>
          {empresasDeObra.length === 0 ? (
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
              onSubmit={(e) => {
                e.preventDefault();
                setErrorForm(null);
                if (!obraSeleccionadaId) {
                  setErrorForm("Debes seleccionar una obra.");
                  return;
                }
                if (!formEmpresa.razonSocial.trim()) {
                  setErrorForm("Debes indicar la razón social de la empresa.");
                  return;
                }
                if (!formEmpresa.rut.trim()) {
                  setErrorForm("Debes indicar el RUT de la empresa.");
                  return;
                }
                if (!formEmpresa.contactoEmail.trim()) {
                  setErrorForm("Debes indicar un correo de contacto.");
                  return;
                }
                if (!formEmpresa.evaluador.trim()) {
                  setErrorForm("Debes indicar quién evalúa la empresa.");
                  return;
                }

                const nuevaEmpresa: EmpresaContratistaObra = {
                  id:
                    typeof crypto !== "undefined" && crypto.randomUUID
                      ? crypto.randomUUID()
                      : Date.now().toString(),
                  obraId: obraSeleccionadaId,
                  ...formEmpresa,
                };

                setEmpresas((prev) => [nuevaEmpresa, ...prev]);

                setFormEmpresa((prev) => ({
                    ...prev,
                    razonSocial: "",
                    rut: "",
                    representanteLegal: "",
                    contactoNombre: "",
                    contactoTelefono: "",
                    contactoEmail: "",
                    compromisosEspecificos: "",
                    observacionesGenerales: "",
                    evaluador: "",
                    contratoMarco: false, certificadoMutual: false, certificadoCotizaciones: false, padronTrabajadores: false, reglamentoInterno: false,
                    matrizRiesgos: false, procedimientosTrabajoSeguro: false, programaTrabajo: false, planEmergenciaPropio: false, registroCapacitacionInterna: false,
                    actaReunionInicial: false
                }));
                setMostrarFormNueva(false);
              }}
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
                    {/* fields */}
                  </div>
                </div>
                 <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Documentación contractual / administrativa</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mt-2">
                    {/* checkboxes */}
                  </div>
                </div>
                {/* otros bloques */}
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