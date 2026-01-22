// src/app/layout.tsx
import "./globals.css";
import { cn } from "@/lib/utils";
import { inter } from "@/lib/layoutTheme";
import { AuthProvider } from "@/context/AuthContext";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";

export const metadata = {
  title: "PCG Plataforma",
  description: "Gestión de Obras y Prevención"
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
