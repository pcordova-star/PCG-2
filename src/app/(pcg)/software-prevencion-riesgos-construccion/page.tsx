// src/app/(pcg)/software-prevencion-riesgos-construccion/page.tsx
import { redirect } from 'next/navigation';

// This page is a duplicate of a public SEO page and should not be inside the (pcg) app group.
// It is now a permanent redirect to the correct public URL.
export default function RedirectPage() {
    redirect('/software-prevencion-riesgos-construccion');
}
