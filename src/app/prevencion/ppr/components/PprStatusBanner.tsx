// src/app/prevencion/ppr/components/PprStatusBanner.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PprStatus } from "../pprStatus";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface PprStatusBannerProps {
  status: PprStatus;
}

const statusConfig = {
  verde: {
    color: "bg-green-100 border-green-300 text-green-800",
    icon: CheckCircle,
    title: "PPR al Día",
  },
  amarillo: {
    color: "bg-yellow-100 border-yellow-300 text-yellow-800",
    icon: Clock,
    title: "PPR con Observaciones",
  },
  rojo: {
    color: "bg-red-100 border-red-300 text-red-800",
    icon: AlertTriangle,
    title: "PPR Desactualizado o Incompleto",
  },
};

export function PprStatusBanner({ status }: PprStatusBannerProps) {
  const config = statusConfig[status.nivel];
  const Icon = config.icon;

  return (
    <Card className={cn("border-l-4", config.color)}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Icon className="h-6 w-6" />
          <CardTitle className="text-lg">{status.titulo}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1 text-sm list-disc pl-5">
          {status.mensajes.map((mensaje, index) => (
            <li key={index}>{mensaje}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
