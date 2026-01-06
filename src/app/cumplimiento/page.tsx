
// src/app/cumplimiento/page.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function CumplimientoPage() {
  const { role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (role === 'admin_empresa' || role === 'superadmin') {
        router.replace('/cumplimiento/admin');
      } else if (role === 'contratista') {
        router.replace('/cumplimiento/contratista/dashboard');
      } else {
        // Si otro rol llega aquí, lo mandamos a su dashboard
        router.replace('/dashboard');
      }
    }
  }, [role, loading, router]);

  return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-8 w-8 animate-spin" />
      <p className="ml-4">Cargando Módulo de Cumplimiento...</p>
    </div>
  );
}
