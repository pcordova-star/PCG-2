// src/app/accept-invite/page.tsx
"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseAuth, firebaseDb } from '@/lib/firebaseClient';
import { ensureUserDocForAuthUser } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { UserInvitation } from '@/types/pcg';

function AcceptInvitePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'prompt_email' | 'signing_in' | 'error' | 'success'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    const handleSignIn = async () => {
      const invId = searchParams.get('invId');
      const href = window.location.href;

      if (!invId) {
        setError('El enlace de invitación es inválido o está incompleto (falta el ID de invitación).');
        setStatus('error');
        return;
      }
      
      if (!isSignInWithEmailLink(firebaseAuth, href)) {
        setError('El enlace de invitación es inválido o ha expirado.');
        setStatus('error');
        return;
      }

      let emailForSignIn = window.localStorage.getItem('emailForSignIn');
      if (!emailForSignIn) {
        setStatus('prompt_email');
        return;
      }
      
      await processSignIn(emailForSignIn, href, invId);
    };

    handleSignIn();
  }, [searchParams]);

  const processSignIn = async (userEmail: string, link: string, invitationId: string) => {
      setStatus('signing_in');
      try {
        // 1. Autenticar al usuario
        const userCredential = await signInWithEmailLink(firebaseAuth, userEmail, link);
        window.localStorage.removeItem('emailForSignIn');
        const user = userCredential.user;

        // 2. Obtener y validar la invitación
        const invRef = doc(firebaseDb, "invitacionesUsuarios", invitationId);
        const invSnap = await getDoc(invRef);

        if (!invSnap.exists() || invSnap.data().estado !== 'pendiente') {
          throw new Error("La invitación no es válida o ya ha sido utilizada.");
        }
        
        const invitation = { id: invSnap.id, ...invSnap.data() } as UserInvitation;
        if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
            throw new Error("El correo de la invitación no coincide con el correo de autenticación.");
        }

        // 3. Crear/actualizar el perfil del usuario con los datos de la invitación
        await ensureUserDocForAuthUser(user, invitation);

        // 4. Redirigir al dashboard
        setStatus('success');
        router.push('/dashboard');

      } catch (err: any) {
        console.error("Error al procesar la invitación:", err);
        setError(err.message || 'Ocurrió un error inesperado. Por favor, intenta de nuevo.');
        setStatus('error');
      }
  }

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Por favor, ingresa tu correo electrónico.");
      return;
    }
    const invId = searchParams.get('invId');
    processSignIn(email, window.location.href, invId!);
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
      case 'signing_in':
        return (
          <div className="flex flex-col items-center justify-center text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">{status === 'loading' ? "Verificando invitación..." : "Iniciando sesión y configurando tu cuenta..."}</p>
          </div>
        );
      case 'prompt_email':
        return (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">Para completar el proceso, por favor confirma tu correo electrónico.</p>
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <Button type="submit" className="w-full">Confirmar y Acceder</Button>
          </form>
        );
      case 'error':
        return (
          <div className="text-center">
            <p className="text-destructive font-medium">{error}</p>
            <Button asChild variant="link" className="mt-4">
              <a href="/login/usuario">Ir a la página de inicio de sesión</a>
            </Button>
          </div>
        );
      case 'success':
        return (
          <div className="flex flex-col items-center justify-center text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">¡Todo listo! Redirigiendo a tu panel...</p>
          </div>
        );
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Aceptando Invitación</CardTitle>
          <CardDescription className="text-center">
            Estás a un paso de unirte a tu equipo en PCG.
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
    )
}
