// src/app/(pcg)/prevencion/hallazgos/page.tsx
import { redirect } from 'next/navigation';

/**
 * Esta página actúa como una redirección para el enlace "Hallazgos en Terreno".
 * Dado que el contenido de los hallazgos ahora se consolida en el panel del prevencionista,
 * esta redirección evita un error 404 y dirige al usuario a la vista más relevante.
 */
export default function HallazgosRedirectPage() {
  redirect('/prevencion/panel');
}
