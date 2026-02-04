// src/app/(pcg)/blog/checklist-ds44-documentos-subcontratistas/page.tsx
import { redirect } from 'next/navigation';

// This page is a duplicate of a public blog post and should not be inside the (pcg) app group.
// It is now a permanent redirect to the correct public URL.
export default function RedirectPage() {
    redirect('/blog/checklist-ds44-documentos-subcontratistas');
}
