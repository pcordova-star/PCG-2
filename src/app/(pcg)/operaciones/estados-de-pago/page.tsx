// src/app/(pcg)/operaciones/estados-de-pago/page.tsx
import { redirect } from 'next/navigation';

// This page was creating a route conflict. It is now a permanent redirect.
export default function EstadosDePagoRedirectPage() {
  redirect('/operaciones/programacion');
}
