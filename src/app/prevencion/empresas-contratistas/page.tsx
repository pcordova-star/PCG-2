"use client";

import React, { useState } from "react";

// --- Tipos y datos simulados ---
type Obra = {
  id: string;
  nombreFaena: string;
};

type TipoEmpresa = "Mandante" | "Contratista" | "Subcontratista";

type Empresa = {
  id: string;
  nombre: string;
  rut: string;
  tipo: TipoEmpresa;
};

type EstadoCumplimientoEmpresa = "Por evaluar" | "Aprobada" | "Con observaciones";

type EvaluacionEmpresaObra = {
  id: string;
  obraId: string;
  empresaId: string;
  docContratoMarco: boolean;
  docMutualAlDia: boolean;
  docReglamentoEspecial: boolean;
  docProgramaTrabajo: boolean;
  docMatrizRiesgos: boolean;
  docCoordinacionActividades: boolean;
  estado: EstadoCumplimientoEmpresa;
  observaciones: string;
};

const OBRAS_SIMULADAS: Obra[] = [
  { id: "obra-1", nombreFaena: "Edificio Los Álamos" },
  { id: "obra-2", nombreFaena: "Condominio Cuatro Vientos" },
  { id: "obra-3", nombreFaena: "Mejoramiento Vial Ruta 5" },
];

const EMPRESAS_SIMULADAS: Empresa[] = [
  {
    id: "emp-1",
    nombre: "Constructora Principal S.A.",
    rut: "76.123.456-7",
    tipo: "Mandante",
  },
  {
    id: "emp-2",
    nombre: "Excavaciones del Sur Ltda.",
    rut: "77.234.567-8",
    tipo: "Subcontratista",
  },
  {
    id: "emp-3",
    nombre: "Montajes Estructurales Andinos SpA",
    rut: "78.345.678-9",
    tipo: "Subcontratista",
  },
  {
    id: "emp-4",
    nombre: "Instalaciones Eléctricas Norte",
    rut: "79.456.789-0",
    tipo: "Subcontratista",
  },
];

const EVALUACIONES_INICIALES: EvaluacionEmpresaObra[] = [
  {
    id: "eval-1",
    obraId: "obra-1",
    empresaId: "emp-2",
    docContratoMarco: true,
    docMutualAlDia: true,
    docReglamentoEspecial: false,
    docProgramaTrabajo: true,
    docMatrizRiesgos: false,
    docCoordinacionActividades: false,
    estado: "Con observaciones",
    observaciones:
      "Falta evidencia de reglamento especial firmado y matriz de riesgos actualizada.",
  },
  {
    id: "eval-2",
    obraId: "obra-1",
    empresaId: "emp-3",
    docContratoMarco: true,
    docMutualAlDia: true,
    docReglamentoEspecial: true,
    docProgramaTrabajo: true,
    docMatrizRiesgos: true,
    docCoordinacionActividades: true,
    estado: "Aprobada",
    observaciones: "Documentación completa al inicio de la faena.",
  },
];

const requisitos = [
    { id: 'docContratoMarco', label: 'Contrato / orden de compra y condiciones comerciales formalizadas.' },
    { id: 'docMutualAlDia', label: 'Afiliación a mutual, cotizaciones y certificados al día.' },
    { id: 'docReglamentoEspecial', label: 'Reglamento especial de faena entregado y aceptado.' },
    { id: 'docProgramaTrabajo', label: 'Programa de trabajo / cronograma entregado.' },
    { id: 'docMatrizRiesgos', label: 'Matriz de riesgos / IPER / procedimientos críticos.' },
    { id: 'docCoordinacionActividades', label: 'Registro de coordinación de actividades (reuniones, actas).' },
] as const;


export default function EmpresasContratistasPage() {
  const [obraSeleccionadaId, setObraSeleccionadaId] = useState<string>(
    OBRAS_SIMULADAS[0]?.id ?? ""
  );

  const empresasContratistas = EMPRESAS_SIMULADAS.filter(
    (e) => e.tipo === "Contratista" || e.tipo === "Subcontratista"
  );

  const [evaluaciones, setEvaluaciones] =
    useState<EvaluacionEmpresaObra[]>(EVALUACIONES_INICIALES);

  const [empresaSeleccionadaId, setEmpresaSeleccionadaId] = useState<string>(
    empresasContratistas[0]?.id ?? ""
  );

  const evaluacionesObra = evaluaciones.filter(
    (ev) => ev.obraId === obraSeleccionadaId
  );

  const evaluacionActual =
    evaluacionesObra.find((ev) => ev.empresaId === empresaSeleccionadaId) ??
    null;

  const totalEmpresasObra = new Set(evaluacionesObra.map(e => e.empresaId)).size;
  const aprobadasObra = evaluacionesObra.filter(
    (ev) => ev.estado === "Aprobada"
  ).length;
  const conObservacionesObra = evaluacionesObra.filter(
    (ev) => ev.estado === "Con observaciones"
  ).length;
  const porEvaluarObra = evaluacionesObra.filter(
    (ev) => ev.estado === "Por evaluar"
  ).length;
    
  function actualizarCampoEvaluacion<K extends keyof EvaluacionEmpresaObra>(
    campo: K,
    valor: EvaluacionEmpresaObra[K]
  ) {
    setEvaluaciones((prev) => {
      const existente = prev.find(
        (ev) =>
          ev.obraId === obraSeleccionadaId &&
          ev.empresaId === empresaSeleccionadaId
      );
  
      if (!existente) {
        const base: EvaluacionEmpresaObra = {
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
          obraId: obraSeleccionadaId,
          empresaId: empresaSeleccionadaId,
          docContratoMarco: false,
          docMutualAlDia: false,
          docReglamentoEspecial: false,
          docProgramaTrabajo: false,
          docMatrizRiesgos: false,
          docCoordinacionActividades: false,
          estado: "Por evaluar",
          observaciones: "",
        };
        return [
          ...prev,
          {
            ...base,
            [campo]: valor,
          },
        ];
      }
  
      return prev.map((ev) =>
        ev.obraId === obraSeleccionadaId && ev.empresaId === empresaSeleccionadaId
          ? { ...ev, [campo]: valor }
          : ev
      );
    });
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold">
          Empresas contratistas – DS44
        </h2>
        <p className="text-sm text-muted-foreground">
          Registro y evaluación del cumplimiento de requisitos DS44 de empresas
          contratistas y subcontratistas por obra. Esta vista está pensada para
          facilitar el trabajo del prevencionista.
        </p>
      </header>

      {/* Filtros: obra y empresa */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Obra / faena
          </label>
          <select
            value={obraSeleccionadaId}
            onChange={(e) => setObraSeleccionadaId(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          >
            {OBRAS_SIMULADAS.map((obra) => (
              <option key={obra.id} value={obra.id}>
                {obra.nombreFaena}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Empresa contratista / subcontratista
          </label>
          <select
            value={empresaSeleccionadaId}
            onChange={(e) => setEmpresaSeleccionadaId(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          >
            {empresasContratistas.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.nombre} ({emp.rut})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Resumen de la obra */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-1">
          <p className="text-xs font-semibold text-muted-foreground">
            Empresas evaluadas en esta obra
          </p>
          <p className="text-2xl font-bold">{totalEmpresasObra}</p>
          <p className="text-[11px] text-muted-foreground">
            Aprobadas: {aprobadasObra} · Con observaciones:{" "}
            {conObservacionesObra} · Por evaluar: {porEvaluarObra}
          </p>
        </div>

        <div className="rounded-xl border bg-muted p-4 text-xs text-muted-foreground">
          Indicadores simples de cumplimiento DS44 a nivel empresa. Más adelante
          se pueden conectar a reportes y exportaciones.
        </div>
        <div className="rounded-xl border bg-muted p-4 text-xs text-muted-foreground">
          Esta vista no reemplaza el detalle documental, pero ayuda al
          prevencionista a ver rápido qué empresas están completas y cuáles no.
        </div>
      </div>

      {/* Ficha de evaluación de la empresa seleccionada */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Izquierda: ficha y checklist */}
        <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-card-foreground">
            Ficha de empresa en la obra
          </h3>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Obra:{" "}
              <span className="font-medium text-foreground">
              {
                OBRAS_SIMULADAS.find((o) => o.id === obraSeleccionadaId)
                  ?.nombreFaena
              }
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              Empresa:{" "}
              <span className="font-medium text-foreground">
              {
                empresasContratistas.find((e) => e.id === empresaSeleccionadaId)
                  ?.nombre
              }{" "}
              (
              {
                empresasContratistas.find((e) => e.id === empresaSeleccionadaId)
                  ?.rut
              }
              )
              </span>
            </p>
          </div>

          {evaluacionActual && (
            <p className="text-xs text-muted-foreground">
              Estado actual:{" "}
              <span className="font-semibold">{evaluacionActual.estado}</span>
            </p>
          )}

            <form
              className="space-y-3 text-sm"
              onSubmit={(e) => {
                e.preventDefault();
              }}
            >
              {requisitos.map(req => (
                <label key={req.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={!!evaluacionActual?.[req.id as keyof typeof evaluacionActual]}
                        onChange={(e) =>
                        actualizarCampoEvaluacion(req.id as keyof EvaluacionEmpresaObra, e.target.checked)
                        }
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-xs text-foreground">{req.label}</span>
                </label>
              ))}

              <div className="pt-2 space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                    Estado de cumplimiento
                </label>
                <select
                    value={evaluacionActual?.estado ?? "Por evaluar"}
                    onChange={(e) =>
                        actualizarCampoEvaluacion(
                        "estado",
                        e.target.value as EstadoCumplimientoEmpresa
                        )
                    }
                    className="w-full rounded-lg border bg-background px-3 py-2 text-xs"
                >
                    <option value="Por evaluar">Por evaluar</option>
                    <option value="Aprobada">Aprobada</option>
                    <option value="Con observaciones">Con observaciones</option>
                </select>
              </div>

              <div className="pt-2 space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                    Observaciones generales de la empresa en esta obra
                </label>
                <textarea
                    value={evaluacionActual?.observaciones ?? ""}
                    onChange={(e) =>
                        actualizarCampoEvaluacion("observaciones", e.target.value)
                    }
                    rows={3}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-xs"
                    placeholder="Ej: Se solicita enviar matriz de riesgo específica para trabajos en altura."
                />
              </div>

            </form>
          
          {!evaluacionActual && (
            <p className="text-xs text-muted-foreground bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
              Esta empresa aún no tiene evaluación registrada para esta obra.
              Al marcar el primer requisito, se creará un registro nuevo.
            </p>
          )}

        </div>

        {/* Derecha: tabla/listado de empresas evaluadas en la obra */}
        <div className="space-y-2 rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-card-foreground">
            Empresas evaluadas en esta obra
          </h3>
          {evaluacionesObra.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Aún no hay empresas evaluadas para esta obra.
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left font-semibold text-muted-foreground">
                      Empresa
                    </th>
                    <th className="px-2 py-2 text-left font-semibold text-muted-foreground">
                      Estado
                    </th>
                    <th className="px-2 py-2 text-left font-semibold text-muted-foreground">
                      Cumplimiento
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {evaluacionesObra.map((ev) => {
                    const emp = empresasContratistas.find(
                      (e) => e.id === ev.empresaId
                    );
                    const pasos = [
                      ev.docContratoMarco,
                      ev.docMutualAlDia,
                      ev.docReglamentoEspecial,
                      ev.docProgramaTrabajo,
                      ev.docMatrizRiesgos,
                      ev.docCoordinacionActividades,
                    ];
                    const totalPasos = pasos.length;
                    const cumplidos = pasos.filter(Boolean).length;
                    return (
                      <tr key={ev.id} className="border-t">
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            className="text-left font-medium text-primary hover:underline"
                            onClick={() =>
                              setEmpresaSeleccionadaId(ev.empresaId)
                            }
                          >
                            {emp?.nombre ?? ev.empresaId}
                          </button>
                        </td>
                        <td className="px-2 py-2">{ev.estado}</td>
                        <td className="px-2 py-2 text-muted-foreground">
                          {cumplidos}/{totalPasos} requisitos
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
