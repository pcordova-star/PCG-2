
// src/app/accept-invite/page.tsx
"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Loader2, ShieldX } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserInvitation } from '@/types/pcg';
import { PcgLogo } from '@/components/branding/PcgLogo';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

function AcceptInvitePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const [status, setStatus] = useState<'loading' | 'valid' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<UserInvitation | null>(null);

  const invId = searchParams.get('invId');
  const email = searchParams.get('email');

  useEffect(() => {
    // Si el usuario ya está logueado, lo redirigimos al dashboard.
    if (user) {
        router.replace('/dashboard');
        return;
    }

    const validateInvitation = async () => {
      if (!invId || !email) {
        setError('Enlace de invitación inválido o incompleto.');
        setStatus('error');
        return;
      }

      try {
        const invRef = doc(firebaseDb, "invitacionesUsuarios", invId);
        const invSnap = await getDoc(invRef);

        if (!invSnap.exists()) {
          throw new Error("Esta invitación no existe o ha expirado.");
        }

        const invData = { id: invSnap.id, ...invSnap.data() } as UserInvitation;

        if (invData.email.toLowerCase().trim() !== email.toLowerCase().trim()) {
          throw new Error("El correo de la invitación no coincide con el de este enlace.");
        }
        
        // Ya no se cambia el estado aquí, solo se muestra la información.
        // Se puede añadir lógica para mostrar mensajes diferentes si el estado no es 'pendiente'.
        if (invData.estado === 'activado') {
            setError(`Esta invitación ya fue activada. Si tienes problemas para acceder, contacta al administrador o intenta iniciar sesión directamente.`);
            setStatus('error');
            return;
        }
        
        setInvitation(invData);
        setStatus('valid');

      } catch (err: any) {
        console.error("Error al validar la invitación:", err);
        setError(err.message || 'Ocurrió un error inesperado.');
        setStatus('error');
      }
    };

    validateInvitation();
  }, [invId, email, user, router]);


  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Verificando invitación...</p>
          </div>
        );
      case 'valid':
        if (!invitation) return null;
        return (
          <div className="space-y-6 text-center">
             <div className="text-center">
                <p className="text-sm text-muted-foreground">Has sido invitado a unirte a</p>
                <p className="font-bold text-lg">{invitation.empresaNombre}</p>
                <p className="text-sm text-muted-foreground">con el rol de <span className="font-semibold">{invitation.roleDeseado}</span>.</p>
            </div>
            
            <p className="text-sm p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-800">
                Para activar tu cuenta, <strong>revisa el correo con tu contraseña temporal</strong>. Luego, inicia sesión. Por seguridad, el sistema te pedirá cambiar tu contraseña en tu primer acceso.
            </p>
            
             <Button asChild className="w-full">
               <Link href="/login/usuario">Ir a Iniciar Sesión</Link>
            </Button>
          </div>
        );
      case 'error':
        return (
          <div className="text-center space-y-4">
            <ShieldX className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-destructive font-medium">{error}</p>
            <Button asChild variant="link">
              <Link href="/login/usuario">Ir a la página de inicio de sesión</Link>
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center space-y-4">
             <div className="mx-auto">
                 <PcgLogo />
             </div>
          <CardTitle className="text-2xl">Activar tu cuenta en PCG</CardTitle>
          <CardDescription>
            Estás a un paso de unirte a tu equipo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AcceptInvitePage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Cargando...</div>}>
            <AcceptInvitePageInner />
        </Suspense>
    );
}
