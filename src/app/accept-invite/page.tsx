// src/app/aceptar-invitacion/page.tsx
"use client";

import { useEffect, useState, Suspense, FormEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { firebaseAuth, firebaseDb } from '@/lib/firebaseClient';
import { Loader2, CheckCircle, ShieldX } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { UserInvitation } from '@/types/pcg';
import { PcgLogo } from '@/components/branding/PcgLogo';

function AcceptInvitePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<'loading' | 'prompt_password' | 'creating' | 'error' | 'success'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<UserInvitation | null>(null);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const invId = searchParams.get('invId');
  const email = searchParams.get('email');

  useEffect(() => {
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
          throw new Error("Esta invitación no existe.");
        }

        const invData = { id: invSnap.id, ...invSnap.data() } as UserInvitation;

        if (invData.email.toLowerCase() !== email.toLowerCase()) {
          throw new Error("El correo de la invitación no coincide con el de este enlace.");
        }

        if (invData.estado !== 'pendiente') {
          throw new Error(`Esta invitación ya fue ${invData.estado}.`);
        }

        setInvitation(invData);
        setStatus('prompt_password');

      } catch (err: any) {
        console.error("Error al validar la invitación:", err);
        setError(err.message || 'Ocurrió un error inesperado. Por favor, contacta al administrador.');
        setStatus('error');
      }
    };

    validateInvitation();
  }, [invId, email]);

  const handleCreateAccount = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (!invitation || !email) return;

    setStatus('creating');

    try {
      // 1. Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      const user = userCredential.user;

      // 2. Preparar el documento del usuario en Firestore
      const userDocRef = doc(firebaseDb, "users", user.uid);
      const newUserProfile = {
        email: email.toLowerCase(),
        empresaId: invitation.empresaId,
        empresaNombre: invitation.empresaNombre,
        role: invitation.roleDeseado,
        createdAt: new Date(),
        nombre: user.displayName || email.split('@')[0],
      };
      
      // 3. Marcar la invitación como aceptada
      const invitationRef = doc(firebaseDb, "invitacionesUsuarios", invitation.id!);

      // 4. Usar un batch para asegurar atomicidad
      const batch = writeBatch(firebaseDb);
      batch.set(userDocRef, newUserProfile);
      batch.update(invitationRef, { estado: "aceptada" });
      await batch.commit();

      setStatus('success');
      // Redirige al usuario al dashboard después de 2 segundos
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (err: any) {
      console.error("Error creando la cuenta:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError("Ya existe una cuenta con este correo. Por favor, inicia sesión normalmente.");
      } else {
        setError(err.message || 'Ocurrió un error al crear la cuenta.');
      }
      setStatus('prompt_password');
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Verificando invitación...</p>
          </div>
        );
      case 'prompt_password':
        if (!invitation) return null;
        return (
          <form onSubmit={handleCreateAccount} className="space-y-4">
             <div className="text-center">
                <p className="text-sm text-muted-foreground">Has sido invitado a unirte a</p>
                <p className="font-bold text-lg">{invitation.empresaNombre}</p>
                <p className="text-sm text-muted-foreground">con el rol de <span className="font-semibold">{invitation.roleDeseado}</span>.</p>
             </div>
             <p className="text-sm text-center font-semibold pt-4">Crea una contraseña para tu cuenta:</p>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña (mín. 6 caracteres)</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="passwordConfirm">Confirmar Contraseña</Label>
              <Input
                id="passwordConfirm"
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <Button type="submit" className="w-full">Crear cuenta y entrar</Button>
          </form>
        );
       case 'creating':
        return (
          <div className="flex flex-col items-center justify-center text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Creando tu cuenta y configurando tu acceso...</p>
          </div>
        );
      case 'error':
        return (
          <div className="text-center space-y-4">
            <ShieldX className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-destructive font-medium">{error}</p>
            <Button asChild variant="link">
              <a href="/login/usuario">Ir a la página de inicio de sesión</a>
            </Button>
          </div>
        );
      case 'success':
        return (
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <p className="font-semibold">¡Cuenta creada con éxito!</p>
            <p className="text-muted-foreground">Redirigiendo a tu panel...</p>
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        );
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center space-y-4">
             <div className="mx-auto">
                 <PcgLogo size={50}/>
             </div>
          <CardTitle className="text-2xl">Aceptar Invitación a PCG</CardTitle>
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
