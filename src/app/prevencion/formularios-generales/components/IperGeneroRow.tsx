// src/app/prevencion/formularios-generales/components/IperGeneroRow.tsx
"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type IperFormValues = {
  tarea: string;
  zona: string;
  peligro: string;
  riesgo: string;
  categoriaPeligro: string;
  probabilidadHombre: number;
  consecuenciaHombre: number;
  probabilidadMujer: number;
  consecuenciaMujer: number;
  jerarquiaControl: string;
  controlEspecificoGenero: string;
  responsable: string;
  plazo: string;
  estadoControl: string;
  probabilidadResidual: number;
  consecuenciaResidual: number;
  // Campos para "Otro"
  peligroOtro?: string;
  riesgoOtro?: string;
  controlEspecificoGeneroOtro?: string;
};

type Props = {
  value: IperFormValues;
  onChange: (value: IperFormValues) => void;
};

// --- Opciones predefinidas ---
const peligrosComunes = [ "Caída de altura", "Riesgo eléctrico", "Sobreesfuerzo", "Exposición a ruido", "Atrapamiento", "Proyección de partículas", "Contacto con energía eléctrica (directo/indirecto)", "Arco eléctrico durante maniobra de interruptor", "Contacto con partes y piezas energizadas", "Otro", ];
const riesgosComunes = [ "Lesiones graves/fatales", "Electrocución, shock eléctrico, quemaduras por arco.", "Electrocución", "Quemaduras severas por arco eléctrico", "Lesiones musculoesqueléticas", "Hipoacusia", "Amputación/fracturas", "Lesiones oculares", "Otro", ];
const controlesGeneroComunes = [ "Ajustar peso máximo para trabajadoras", "EPP en tallaje diferenciado", "Adecuar tareas en embarazo/lactancia", "Capacitación con enfoque de género", "Procedimiento de trabajo seguro (PTS) para comisionamiento, uso de EPP dieléctrico y ropa ignífuga. Despeje y señalización del área.", "Uso de traje ignífugo (Arc Flash), careta facial, guantes dieléctricos. Maniobra realizada por personal autorizado y con 2do verificador.", "Procedimiento de trabajo en caliente, bloqueo LOTO si aplica parcialmente, delimitación de 'zona prohibida'.", "Otro", ];
const categoriasPeligro = ["Mecánico", "Químico", "Físico", "Biológico", "Ergonómico", "Psicosocial", "Energía eléctrica", "Otro"];
const jerarquiasControl = ["Eliminación", "Sustitución", "Control de Ingeniería", "Control Administrativo", "EPP"];
const estadosControl = ["PENDIENTE", "EN_EJECUCION", "IMPLEMENTADO", "RECHAZADO"];

export const IperForm: React.FC<Props> = ({ value, onChange }) => {
  const {
    tarea, zona, peligro, riesgo, categoriaPeligro,
    probabilidadHombre, consecuenciaHombre, probabilidadMujer, consecuenciaMujer,
    jerarquiaControl, controlEspecificoGenero, responsable, plazo, estadoControl,
    probabilidadResidual, consecuenciaResidual,
    peligroOtro, riesgoOtro, controlEspecificoGeneroOtro,
  } = value;

  const nivelRiesgoHombre = (probabilidadHombre || 0) * (consecuenciaHombre || 0);
  const nivelRiesgoMujer = (probabilidadMujer || 0) * (consecuenciaMujer || 0);
  const nivelRiesgoResidual = (probabilidadResidual || 0) * (consecuenciaResidual || 0);

  const handleFieldChange = (field: keyof IperFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | string) => {
    const newValue = typeof e === "string" ? e : e.target.value;
    const isNumber = [
      "probabilidadHombre", "consecuenciaHombre", "probabilidadMujer", "consecuenciaMujer",
      "probabilidadResidual", "consecuenciaResidual"
    ].includes(field);
    
    onChange({ ...value, [field]: isNumber ? Number(newValue || 0) : newValue });
  };

  return (
    <div className="space-y-6">
      {/* SECCIÓN 1: IDENTIFICACIÓN */}
      <div className="p-4 border rounded-lg bg-slate-50">
        <h4 className="font-semibold text-md mb-3 text-slate-700">1. Identificación del Peligro y Riesgo</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1"><Label>Tarea*</Label><Input value={tarea} onChange={handleFieldChange("tarea")} /></div>
          <div className="space-y-1"><Label>Zona / Sector donde se presenta*</Label><Input value={zona} onChange={handleFieldChange("zona")} placeholder="Ej: Sala de bombas, Bodega..." /></div>
          <div className="space-y-1"><Label>Categoría del Peligro</Label>
            <Select value={categoriaPeligro} onValueChange={(v) => handleFieldChange("categoriaPeligro")(v)}><SelectTrigger><SelectValue placeholder="Seleccione..."/></SelectTrigger>
              <SelectContent>{categoriasPeligro.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Peligro Identificado*</Label>
            <Select value={peligro} onValueChange={(v) => handleFieldChange("peligro")(v)}><SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
              <SelectContent>{peligrosComunes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
            {peligro === "Otro" && <Input className="mt-1" placeholder="Especifique otro peligro" value={peligroOtro} onChange={handleFieldChange("peligroOtro")} />}
          </div>
          <div className="space-y-1 md:col-span-2"><Label>Riesgo Asociado*</Label>
            <Select value={riesgo} onValueChange={(v) => handleFieldChange("riesgo")(v)}><SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
              <SelectContent>{riesgosComunes.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
            {riesgo === "Otro" && <Input className="mt-1" placeholder="Especifique otro riesgo" value={riesgoOtro} onChange={handleFieldChange("riesgoOtro")} />}
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: EVALUACIÓN DE RIESGO INHERENTE */}
      <div className="p-4 border rounded-lg">
        <h4 className="font-semibold text-md mb-3">2. Evaluación de Riesgo Inherente (con enfoque de género)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg p-3 bg-blue-50 border border-blue-200">
            <p className="text-sm font-semibold mb-2 text-blue-800">Evaluación para Hombres</p>
            <div className="grid grid-cols-3 gap-2 items-end">
              <div><Label className="text-xs">Prob.</Label><Input type="number" min={1} max={5} value={probabilidadHombre || ""} onChange={handleFieldChange("probabilidadHombre")} /></div>
              <div><Label className="text-xs">Cons.</Label><Input type="number" min={1} max={5} value={consecuenciaHombre || ""} onChange={handleFieldChange("consecuenciaHombre")} /></div>
              <div><span className="text-xs">Nivel</span><div className="font-bold">{nivelRiesgoHombre}</div></div>
            </div>
          </div>
          <div className="rounded-lg p-3 bg-pink-50 border border-pink-200">
            <p className="text-sm font-semibold mb-2 text-pink-800">Evaluación para Mujeres</p>
            <div className="grid grid-cols-3 gap-2 items-end">
              <div><Label className="text-xs">Prob.</Label><Input type="number" min={1} max={5} value={probabilidadMujer || ""} onChange={handleFieldChange("probabilidadMujer")} /></div>
              <div><Label className="text-xs">Cons.</Label><Input type="number" min={1} max={5} value={consecuenciaMujer || ""} onChange={handleFieldChange("consecuenciaMujer")} /></div>
              <div><span className="text-xs">Nivel</span><div className="font-bold">{nivelRiesgoMujer}</div></div>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 3: MEDIDAS DE CONTROL */}
       <div className="p-4 border rounded-lg">
        <h4 className="font-semibold text-md mb-3">3. Medidas de Control</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="space-y-1"><Label>Jerarquía del Control Aplicado</Label>
              <Select value={jerarquiaControl} onValueChange={(v) => handleFieldChange("jerarquiaControl")(v)}><SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                <SelectContent>{jerarquiasControl.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
              </Select>
          </div>
          <div className="space-y-1 md:col-span-2"><Label>Control específico según género (DS 44)</Label>
            <Select value={controlEspecificoGenero} onValueChange={(v) => handleFieldChange("controlEspecificoGenero")(v)}><SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
              <SelectContent>{controlesGeneroComunes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            {controlEspecificoGenero === "Otro" && <Textarea className="mt-1" placeholder="Especifique..." value={controlEspecificoGeneroOtro} onChange={handleFieldChange("controlEspecificoGeneroOtro")} />}
          </div>
          <div className="space-y-1"><Label>Responsable designado</Label><Input value={responsable} onChange={handleFieldChange("responsable")} /></div>
          <div className="space-y-1"><Label>Fecha límite de implementación</Label><Input type="date" value={plazo} onChange={handleFieldChange("plazo")} /></div>
        </div>
      </div>

       {/* SECCIÓN 4: RIESGO RESIDUAL Y SEGUIMIENTO */}
       <div className="p-4 border rounded-lg bg-slate-50">
        <h4 className="font-semibold text-md mb-3 text-slate-700">4. Riesgo Residual y Seguimiento</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="rounded-lg p-3 bg-gray-100 border">
              <p className="text-sm font-semibold mb-2 text-gray-800">Evaluación del Riesgo Residual</p>
              <div className="grid grid-cols-3 gap-2 items-end">
                <div><Label className="text-xs">Prob. Residual</Label><Input type="number" min={1} max={5} value={probabilidadResidual || ""} onChange={handleFieldChange("probabilidadResidual")} /></div>
                <div><Label className="text-xs">Cons. Residual</Label><Input type="number" min={1} max={5} value={consecuenciaResidual || ""} onChange={handleFieldChange("consecuenciaResidual")} /></div>
                <div><span className="text-xs">Nivel Residual</span><div className="font-bold">{nivelRiesgoResidual}</div></div>
              </div>
          </div>
          <div className="space-y-1"><Label>Estado del Control</Label>
              <Select value={estadoControl} onValueChange={(v) => handleFieldChange("estadoControl")(v)}><SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                <SelectContent>{estadosControl.map(e => <SelectItem key={e} value={e}>{e.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
          </div>
        </div>
      </div>
    </div>
  );
};
