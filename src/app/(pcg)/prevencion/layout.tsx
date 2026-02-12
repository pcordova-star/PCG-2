// src/app/(pcg)/prevencion/layout.tsx
import React from 'react';

/**
 * Este layout es esencial para permitir que las sub-rutas de Prevención 
 * (como /panel, /ppr, etc.) se rendericen correctamente.
 * Actúa como un simple "contenedor" que pasa los hijos (children) hacia adelante.
 */
export default function PrevencionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
