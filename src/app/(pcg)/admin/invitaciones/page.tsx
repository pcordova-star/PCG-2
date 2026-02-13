// src/app/(pcg)/admin/invitaciones/page.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// This page is obsolete and now redirects to the unified user/invitation management screen.
export default function AdminInvitacionesRedirectPage() {
    const router = useRouter();
    
    useEffect(() => {
        router.replace('/admin/usuarios');
    }, [router]);

    return (
        <div className="flex justify-center items-center h-full p-8">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <p>Redirigiendo al nuevo panel de usuarios...</p>
        </div>
    );
}
