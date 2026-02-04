// src/app/(pcg)/blog/errores-estados-de-pago-construccion/page.tsx
import { redirect } from 'next/navigation';

// This page is a duplicate of a public blog post and should not be inside the (pcg) app group.
// It is now a permanent redirect to the correct public URL.
export default function RedirectPage() {
    redirect('/blog/errores-estados-de-pago-construccion');
}
