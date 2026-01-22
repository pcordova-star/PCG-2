// src/app/layout.tsx
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { inter } from "@/lib/layoutTheme";
import { Toaster } from "@/components/ui/toaster";
import ClientLayoutShell from "./layoutClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={cn("font-body antialiased", inter.variable)}>
        <AuthProvider>
          <Suspense fallback={<div>Cargando...</div>}>
            <ClientLayoutShell>{children}</ClientLayoutShell>
          </Suspense>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
