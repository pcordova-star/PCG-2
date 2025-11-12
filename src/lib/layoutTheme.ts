// src/lib/layoutTheme.ts
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

// Definimos la fuente una sola vez para que la clase generada sea consistente.
export const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

// Centralizamos las clases del <body> para asegurar que SSR y CSR rendericen lo mismo.
// Esto previene errores de "hydration mismatch".
export const BODY_CLASSES = cn(
  "font-body antialiased bg-muted/40",
  inter.variable
);
