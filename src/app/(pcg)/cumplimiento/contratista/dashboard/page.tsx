// src/app/(pcg)/cumplimiento/contratista/dashboard/page.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function ContratistaDashboardPage() {
    const router = useRouter();
    
    // Redirige a la página principal del contratista para evitar duplicados.
    useEffect(() => {
        router.replace('/cumplimiento/contratista');
    }, [router]);

    return (
        <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="ml-2">Redirigiendo al portal del contratista...</p>
        </div>
    );
}
