
"use client";

import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { inter } from "@/lib/layoutTheme";
import LayoutLogic from "./layout-logic";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={cn("font-body antialiased", inter.variable)}>
        <AuthProvider>
          <SidebarProvider>
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-screen">
                  Cargando...
                </div>
              }
            >
              <LayoutLogic>{children}</LayoutLogic>
            </Suspense>
          </SidebarProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
