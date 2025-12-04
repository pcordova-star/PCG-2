"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

// Esta página actuará como un enrutador inteligente.
// Redirigirá al listado de RDI de la obra más reciente del usuario.
export default function RdiRedirectPage() {
  const router = useRouter();
  const { user, companyId, role, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
        router.replace('/login/usuario');
        return;
    }

    const findAndRedirect = async () => {
        let q;
        const obrasRef = collection(firebaseDb, "obras");
        
        // Determinar qué obras buscar
        if (role === 'superadmin') {
            q = query(obrasRef, orderBy("creadoEn", "desc"), limit(1));
        } else if (companyId) {
            q = query(obrasRef, where("empresaId", "==", companyId), orderBy("creadoEn", "desc"), limit(1));
        } else {
            // Si no es superadmin y no tiene companyId, no hay nada que mostrar.
            router.replace('/obras'); // O a un dashboard sin obras
            return;
        }

        try {
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                const obraMasReciente = snapshot.docs[0];
                router.replace(`/obras/${obraMasReciente.id}/rdi`);
            } else {
                // No hay obras, redirigir a la página principal de obras para que pueda crear una.
                router.replace('/obras');
            }
        } catch (error) {
            console.error("Error al buscar la obra más reciente:", error);
            // Si falla, lo enviamos a la lista de obras como fallback.
            router.replace('/obras');
        }
    };

    findAndRedirect();
  }, [user, companyId, role, authLoading, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Buscando requerimientos...</p>
    </div>
  );
}
