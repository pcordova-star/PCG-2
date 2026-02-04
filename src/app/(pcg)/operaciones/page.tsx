// src/app/(pcg)/operaciones/page.tsx
import { redirect } from 'next/navigation';

// This page created a route conflict. It now redirects to the main dashboard.
export default function OperacionesRedirectPage() {
  redirect('/dashboard');
}
