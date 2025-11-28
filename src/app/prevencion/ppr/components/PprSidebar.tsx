// src/app/prevencion/ppr/components/PprSidebar.tsx
"use client";

import { cn } from "@/lib/utils";
import { PprSectionId } from "../page";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Building, CheckSquare, FileText, Flag, FolderKanban, HeartHandshake, Shield, Siren, UserCheck, Users } from "lucide-react";
import { useRouter } from "next/navigation";

interface PprSidebarProps {
  activeSection: PprSectionId;
  setActiveSection: (section: PprSectionId) => void;
}

const sections: { id: PprSectionId; label: string; icon: React.ElementType }[] = [
  { id: 'info-general', label: 'Información General', icon: Building },
  { id: 'objetivo', label: 'Objetivo del Programa', icon: Flag },
  { id: 'organizacion', label: 'Organización Interna', icon: Users },
  { id: 'iper', label: 'Identificación de Peligros (IPER)', icon: Shield },
  { id: 'medidas-control', label: 'Medidas de Control', icon: CheckSquare },
  { id: 'charlas', label: 'Charlas y Capacitación', icon: UserCheck },
  { id: 'capacitacion-ds44', label: 'Plan de Capacitación DS 44', icon: BookOpen },
  { id: 'procedimientos', label: 'Procedimientos de Trabajo Seguro', icon: FileText },
  { id: 'protocolos-emergencia', label: 'Protocolos de Emergencia', icon: Siren },
  { id: 'fiscalizacion', label: 'Plan de Fiscalización Interna', icon: FolderKanban },
  { id: 'registro', label: 'Registro y Seguimiento', icon: FileText },
  { id: 'enfoque-genero', label: 'Enfoque de Género (DS 44)', icon: HeartHandshake },
];

export function PprSidebar({ activeSection, setActiveSection }: PprSidebarProps) {
  const router = useRouter();

  return (
    <aside className="hidden md:block sticky top-24">
      <div className="flex flex-col gap-2">
         <Button variant="outline" size="sm" className="mb-4" onClick={() => router.push('/prevencion')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Prevención
        </Button>
        <h3 className="text-sm font-semibold text-muted-foreground px-4">Secciones del PPR</h3>
        {sections.map((section) => (
          <Button
            key={section.id}
            variant="ghost"
            onClick={() => setActiveSection(section.id)}
            className={cn(
              "justify-start gap-2",
              activeSection === section.id && "bg-accent text-accent-foreground"
            )}
          >
            <section.icon className="h-4 w-4" />
            <span>{section.label}</span>
          </Button>
        ))}
      </div>
    </aside>
  );
}
