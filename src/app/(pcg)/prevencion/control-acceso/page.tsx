// src/app/(pcg)/prevencion/control-acceso/page.tsx
import { redirect } from 'next/navigation';

// This page is obsolete and now permanently redirects to the correct module location.
export default function ControlAccesoRedirectPage() {
  redirect('/control-acceso');
}
