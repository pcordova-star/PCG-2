// src/app/operaciones/page.tsx
import { redirect } from 'next/navigation';

// This page created a route conflict with /(pcg)/operaciones/page.tsx.
// It has been replaced with a permanent redirect to avoid build errors.
export default function OperacionesRedirectPage() {
  redirect('/dashboard');
}
