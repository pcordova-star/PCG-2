// src/app/layout.tsx
import "./globals.css";
import { cn } from "@/lib/utils";
import { inter } from "@/lib/layoutTheme";
import { AuthProvider } from "@/context/AuthContext";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";

export const metadata = {
  title: "PCG | Software de Gestión de Obras para Constructoras en Chile",
  description: "Centraliza operaciones, prevención de riesgos (DS44) y control de subcontratistas. Potenciado con IA para optimizar costos y plazos en tus proyectos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={cn("font-body antialiased", inter.variable)}>
        <AuthProvider>
          <Suspense fallback={<div>Cargando…</div>}>
            {children}
          </Suspense>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
