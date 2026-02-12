// src/app/(pcg)/control-subcontratistas-ds44/page.tsx
import { redirect } from 'next/navigation';

// This page was causing a circular redirect. 
// It now correctly redirects to the root-level SEO page.
export default function RedirectPage() {
    redirect('/software-prevencion-riesgos-construccion');
}
