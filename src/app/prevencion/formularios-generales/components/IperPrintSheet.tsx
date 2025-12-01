// src/app/prevencion/formularios-generales/components/IperPrintSheet.tsx
"use client";

import React from "react";
import { IPERRegistro } from "@/types/pcg";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";


type IperPrintSheetProps = {
  iper: IPERRegistro | null;
  obraNombre: string | undefined;
};

export const IperPrintSheet: React.FC<IperPrintSheetProps> = ({ iper, obraNombre }) => {
  if (!iper) return null;

  const fechaFormateada = iper.createdAt?.toDate ? iper.createdAt.toDate().toLocaleDateString('es-CL') : (iper.fecha ? new Date(iper.fecha + 'T00:00:00').toLocaleDateString('es-CL') : 'N/A');

  return (
    <div className="print-only">
      <div className="p-8 border rounded-lg bg-card text-card-foreground shadow-md">
        <header className="mb-8">
            <div className="flex justify-between items-start border-b pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-primary">PCG 2.0</h2>
                    <p className="text-sm text-muted-foreground">Constructora XYZ</p>
                </div>
                <div className="text-right text-sm">
                    <p><strong>Obra:</strong> {obraNombre || 'No especificada'}</p>
                    <p><strong>Fecha Registro:</strong> {fechaFormateada}</p>
                    <p><strong>ID Registro:</strong> <span className="font-mono text-xs">{iper.id}</span></p>
                    {iper.correlativo && <p><strong>Correlativo:</strong> IPER-{String(iper.correlativo).padStart(3, '0')}</p>}
                </div>
            </div>
            <h3 className="text-center text-xl font-bold mt-4">
                IDENTIFICACIÓN DE PELIGROS Y EVALUACIÓN DE RIESGOS (IPER)
            </h3>
        </header>

        <main className="space-y-6 text-sm">
          <section>
            <h4 className="font-bold text-base mb-2 border-b pb-1">1. Identificación del Peligro y Riesgo</h4>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              <div><strong>Tarea:</strong> {iper.tarea || '-'}</div>
              <div><strong>Zona / Sector:</strong> {iper.zona || '-'}</div>
              <div><strong>Categoría del Peligro:</strong> {iper.categoriaPeligro || '-'}</div>
              <div><strong>Peligro Identificado:</strong> {iper.peligro || '-'}</div>
              <div className="col-span-2"><strong>Riesgo Asociado:</strong> {iper.riesgo || '-'}</div>
            </div>
          </section>
          
          <Separator />

          <section>
            <h4 className="font-semibold text-base mb-2">2. Evaluación de Riesgo Inherente (con enfoque de género)</h4>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Evaluación Hombres</TableHead>
                        <TableHead>Evaluación Mujeres</TableHead>
                        <TableHead>Nivel de Riesgo (H/M)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell>{iper.probabilidad_hombre} (Prob) x {iper.consecuencia_hombre} (Cons)</TableCell>
                        <TableCell>{iper.probabilidad_mujer} (Prob) x {iper.consecuencia_mujer} (Cons)</TableCell>
                        <TableCell className="font-bold">{iper.nivel_riesgo_hombre} / {iper.nivel_riesgo_mujer}</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
          </section>

          <Separator />

          <section>
             <h4 className="font-semibold text-base mb-2">3. Medidas de Control Propuestas</h4>
             <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                <div><strong>Jerarquía del Control:</strong> {iper.jerarquiaControl || '-'}</div>
                <div className="col-span-2"><strong>Control Específico por Género:</strong> {iper.control_especifico_genero || "No se especifican."}</div>
                <div><strong>Responsable de Implementación:</strong> {iper.responsable || '-'}</div>
                <div><strong>Plazo de Implementación:</strong> {iper.plazo ? new Date(iper.plazo + 'T00:00:00').toLocaleDateString('es-CL') : 'No especificado'}</div>
             </div>
          </section>

          <Separator />
           
          <section>
            <h4 className="font-semibold text-base mb-2">4. Riesgo Residual y Seguimiento</h4>
             <div className="grid grid-cols-2 gap-x-8 gap-y-2">
               <div><strong>Nivel de Riesgo Residual:</strong> <span className="font-bold">{iper.nivel_riesgo_residual || '-'}</span> ({iper.probabilidad_residual} Prob x {iper.consecuencia_residual} Cons)</div>
               <div><strong>Estado del Control:</strong> <span className="font-bold">{iper.estadoControl || '-'}</span></div>
             </div>
          </section>
        </main>

        <footer className="mt-16 pt-8 border-t text-xs">
            <h4 className="font-semibold text-center mb-8">Firmas de Conformidad y Recepción</h4>
            <div className="grid grid-cols-3 gap-12">
                <div className="flex flex-col items-center">
                    <div className="w-full border-b mt-12 mb-2"></div>
                    <p className="font-semibold">Prevencionista de Riesgos</p>
                    <p>Nombre y Firma</p>
                </div>
                <div className="flex flex-col items-center">
                    <div className="w-full border-b mt-12 mb-2"></div>
                    <p className="font-semibold">Jefe de Obra / Supervisor</p>
                     <p>Nombre y Firma</p>
                </div>
                <div className="flex flex-col items-center">
                    <div className="w-full border-b mt-12 mb-2"></div>
                    <p className="font-semibold">Representante Trabajadores</p>
                     <p>Nombre y Firma</p>
                </div>
            </div>
        </footer>
      </div>
    </div>
  );
};
