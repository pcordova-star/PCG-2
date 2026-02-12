// src/app/(pcg)/blog/errores-estados-de-pago-construccion/page.tsx
import { redirect } from 'next/navigation';

// This page was causing a circular redirect.
// It now correctly redirects to the public blog URL.
export default function RedirectPage() {
    redirect('/blog/errores-estados-de-pago-construccion');
}
