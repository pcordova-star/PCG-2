// src/app/operaciones/estados-de-pago/page.tsx
import { redirect } from 'next/navigation';

// This page was created accidentally and conflicts with the main app page.
// It has been replaced with a permanent redirect to resolve the build error.
export default function EstadosDePagoRedirectPage() {
  redirect('/(pcg)/operaciones/estados-de-pago');
}
