// src/app/(pcg)/software-estados-de-pago-construccion/page.tsx
import { redirect } from 'next/navigation';

// This page was causing a circular redirect. 
// It now correctly redirects to the root-level SEO page.
export default function RedirectPage() {
    redirect('/software-estados-de-pago-construccion');
}
