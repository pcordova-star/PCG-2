"use client";

import { PprSectionContainer } from "../PprSectionContainer";
import { Obra } from "@/types/pcg";

type Props = {
  obra: Obra | null;
};

export function PprSection3Organizacion({ obra }: Props) {
  return (
    <PprSectionContainer
      title="Organización Interna de la Seguridad"
      description="Estructura de roles, responsabilidades y líneas de mando en materias de prevención de riesgos para la obra."
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Esta sección describe cómo se organiza la seguridad en la obra, quién
          toma decisiones, quién supervisa y quién ejecuta las acciones de
          prevención de riesgos.
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="border rounded-xl p-3 bg-white">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Mandante
            </h3>
            <p className="text-sm font-medium text-gray-800">
              {obra?.mandanteRazonSocial ?? "Mandante principal de la obra"}
            </p>
          </div>

          <div className="border rounded-xl p-3 bg-white">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Empresa Contratista
            </h3>
            <p className="text-sm font-medium text-gray-800">
              {obra?.empresa?.nombre ?? "Empresa contratista principal"}
            </p>
          </div>

          <div className="border rounded-xl p-3 bg-white md:col-span-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Prevencionista Responsable
            </h3>
            <p className="text-sm font-medium text-gray-800">
              {obra?.prevencionistaNombre ??
                "Nombre del profesional responsable del Programa de Prevención de Riesgos en la obra."}
            </p>
            <p className="mt-1.5 text-xs text-gray-500">
              Encargado de coordinar la implementación del Programa de
              Prevención de Riesgos, la IPER, las charlas de seguridad y la
              supervisión de las medidas de control.
            </p>
          </div>
        </div>

        <div className="border rounded-xl p-3 bg-white">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Líneas de mando y reporte
          </h3>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            <li>Administración de obra responsable de la gestión global.</li>
            <li>
              Prevencionista reporta directamente a la administración de obra y
              a la gerencia de prevención de la empresa.
            </li>
            <li>
              Jefes de área y supervisores son responsables de implementar y
              hacer cumplir las medidas de control en sus equipos.
            </li>
            <li>
              Trabajadores y trabajadoras tienen el deber de cumplir las
              instrucciones de seguridad y reportar condiciones inseguras.
            </li>
          </ul>
        </div>
      </div>
    </PprSectionContainer>
  );
}
