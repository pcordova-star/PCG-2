"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DisabledModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export function DisabledModuleCard({ title, description, icon: Icon }: DisabledModuleCardProps) {
  const { toast } = useToast();

  const handleRequest = () => {
    toast({
      title: "Módulo Adicional",
      description: `Para habilitar el módulo "${title}", por favor contacta a soporte.`,
    });
    // Opcionalmente, podría abrir un mailto:
    // window.location.href = `mailto:soporte@pcg.cl?subject=Solicitud de habilitación: ${title}`;
  };

  return (
    <Card className="rounded-xl border-dashed border-2 bg-slate-100 shadow-none flex flex-col relative overflow-hidden">
        <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
            Módulo Adicional
        </div>
      <CardHeader className="text-center pt-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-200">
          <Icon className="h-8 w-8 text-slate-500" />
        </div>
        <CardTitle className="mt-4 text-xl font-semibold text-slate-700">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <CardDescription className="text-center">{description}</CardDescription>
      </CardContent>
       <CardFooter>
            <Button className="w-full" variant="outline" onClick={handleRequest}>
                <Sparkles className="mr-2 h-4 w-4" />
                Solicitar Habilitación
            </Button>
        </CardFooter>
    </Card>
  );
}
