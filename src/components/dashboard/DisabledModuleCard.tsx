
"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { firebaseFunctions } from "@/lib/firebaseClient";
import { useAuth } from "@/context/AuthContext";


interface DisabledModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  moduleId: string; // ej: 'feature_compliance_module_enabled'
}

export function DisabledModuleCard({ title, description, icon: Icon, moduleId }: DisabledModuleCardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequest = async () => {
    if (!user) {
        toast({ variant: "destructive", title: "Error", description: "Debes iniciar sesión para solicitar un módulo." });
        return;
    }
    
    setIsRequesting(true);
    try {
        const requestModuleActivationFn = httpsCallable(firebaseFunctions, 'requestModuleActivation');
        await requestModuleActivationFn({ moduleId: moduleId, moduleTitle: title });
        
        toast({
          title: "Solicitud Enviada",
          description: "Hemos notificado al administrador. Nos pondremos en contacto contigo a la brevedad.",
        });
    } catch (error: any) {
        console.error("Error al solicitar activación:", error);
        toast({
            variant: "destructive",
            title: "Error al enviar solicitud",
            description: error.message || "No se pudo procesar tu solicitud. Inténtalo más tarde.",
        });
    } finally {
        setIsRequesting(false);
    }
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
            <Button className="w-full" variant="outline" onClick={handleRequest} disabled={isRequesting}>
                {isRequesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4" />}
                {isRequesting ? "Enviando Solicitud..." : "Solicitar Habilitación"}
            </Button>
        </CardFooter>
    </Card>
  );
}
