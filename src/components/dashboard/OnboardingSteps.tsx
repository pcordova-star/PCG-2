"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const ONBOARDING_KEY = "pcgOnboardingCompleted";

export function OnboardingSteps() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY) === "true";
    if (!completed) setVisible(true);
  }, []);

  if (!visible) return null;

  const handleClose = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setVisible(false);
  };

  return (
    <div className="rounded-xl border bg-white shadow-sm p-4 md:p-6 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Flujo de trabajo PCG</h2>
        <button
          onClick={handleClose}
          className="text-xs text-muted-foreground hover:underline flex items-center gap-1"
        >
          <X className="h-3 w-3"/>
          No volver a mostrar
        </button>
      </div>
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 md:gap-6">
        {/* Paso 1 */}
        <StepItem step="1" title="Crear obra" description="Registra la obra con sus datos básicos." />
        <Arrow />
        {/* Paso 2 */}
        <StepItem step="2" title="Cargar presupuesto" description="Carga partidas, costos y recursos." />
        <Arrow />
        {/* Paso 3 */}
        <StepItem step="3" title="Programar obra" description="Define plazos y secuencia de actividades." />
        <Arrow />
        {/* Paso 4 */}
        <StepItem step="4" title="Calidad y Prevención" description="Controla inspecciones, IPER e incidentes." />
      </div>
    </div>
  );
}

function StepItem(props: { step: string; title: string; description: string }) {
  return (
    <div className="flex-1 rounded-lg border bg-slate-50 px-3 py-3 md:px-4 md:py-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {props.step}
        </span>
        <h3 className="font-semibold text-sm md:text-base">{props.title}</h3>
      </div>
      <p className="text-xs md:text-sm text-muted-foreground">
        {props.description}
      </p>
    </div>
  );
}

function Arrow() {
  return (
    <div className="hidden md:flex items-center justify-center text-slate-400">
      <span className="text-xl">➜</span>
    </div>
  );
}
