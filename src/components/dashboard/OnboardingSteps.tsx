// src/components/dashboard/OnboardingSteps.tsx
"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const ONBOARDING_KEY = "pcgOnboardingCompleted";

export function OnboardingSteps() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Solo mostrar en el lado del cliente
    const completed = localStorage.getItem(ONBOARDING_KEY) === "true";
    if (!completed) {
      setVisible(true);
    }
  }, []);

  if (!visible) {
    return null;
  }

  const handleClose = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setVisible(false);
  };

  return (
    <div className="rounded-xl border bg-card shadow-sm p-4 md:p-6 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Flujo de Trabajo Recomendado en PCG</h2>
        <Button
          onClick={handleClose}
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
        >
          <X className="h-4 w-4 mr-2"/>
          No volver a mostrar
        </Button>
      </div>
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 md:gap-6">
        <StepItem step="1" title="Crear Obra" description="Registra la obra y sus datos maestros para empezar." />
        <Arrow />
        <StepItem step="2" title="Itemizado" description="Crea o importa el presupuesto de costos del proyecto." />
        <Arrow />
        <StepItem step="3" title="Programación" description="Define las actividades, plazos y ruta crítica en un Gantt." />
        <Arrow />
        <StepItem step="4" title="Avances y Pagos" description="Registra el progreso diario y genera los Estados de Pago." />
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
