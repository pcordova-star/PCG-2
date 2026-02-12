// src/app/(pcg)/blog/checklist-ds44-documentos-subcontratistas/page.tsx
import { redirect } from 'next/navigation';

// This page was causing a circular redirect.
// It now correctly redirects to the public blog URL.
export default function RedirectPage() {
    redirect('/blog/checklist-ds44-documentos-subcontratistas');
}
