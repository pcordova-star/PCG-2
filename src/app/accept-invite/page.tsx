// src/app/aceptar-invitacion/page.tsx
"use client";

import { useEffect, useState, Suspense, FormEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { firebaseAuth, firebaseDb } from '@/lib/firebaseClient';
import { Loader2, CheckCircle, ShieldX } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { UserInvitation } from '@/types/pcg';
import { PcgLogo } from '@/components/branding/PcgLogo';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { HttpsError } from 'firebase/functions';


function AcceptInvitePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, login } = useAuth();

  const [status, setStatus] = useState<'loading' | 'prompt_password' | 'creating' | 'error' | 'success'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<UserInvitation | null>(null);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [userExists, setUserExists] = useState(false);


  const invId = searchParams.get('invId');
  const email = searchParams.get('email');

  useEffect(() => {
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

        if (invData.email.toLowerCase() !== email.toLowerCase()) {
          throw new Error("El correo de la invitación no coincide con el de este enlace.");
        }
        
        // Simular un login para ver si el usuario ya existe
        try {
            await login(email, 'invalid-password-check');
        } catch (authError: any) {
            if (authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-credential') {
                // Esto es bueno, significa que el usuario existe.
                setUserExists(true);
                setInvitation(invData);
                setStatus('prompt_password');
                return;
            } else if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-email') {
                 // El usuario no existe, flujo normal
                 setUserExists(false);
            } else {
                // Otro error de autenticación, podría ser un problema real
                throw authError;
            }
        }


        if (invData.estado !== 'pendiente') {
          setUserExists(true); // Si ya fue aceptada, el usuario debería existir
          throw new Error(`Esta invitación ya fue ${invData.estado}.`);
        }

        setInvitation(invData);
        setStatus('prompt_password');

      } catch (err: any) {
        console.error("Error al validar la invitación:", err);
        setError(err.message || 'Ocurrió un error inesperado.');
        if (err.message.includes('invitación ya fue')) {
            setUserExists(true);
            setStatus('prompt_password');
        } else {
            setStatus('error');
        }
      }
    };

    validateInvitation();
  }, [invId, email, user, router, login]);

  const handleCreateAccount = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (userExists) {
        setError("Ya tienes una cuenta. Por favor, inicia sesión.");
        return;
    }

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
      const userDocRef = doc(firebaseDb, "users");
      const newUserProfile = {
        email: email.toLowerCase(),
        empresaId: invitation.empresaId,
        role: invitation.roleDeseado,
        nombre: email.split('@')[0],
        createdAt: serverTimestamp(),
        activo: true,
      };
      
      const invitationRef = doc(firebaseDb, "invitacionesUsuarios", invitation.id!);

      const batch = writeBatch(firebaseDb);
      batch.update(invitationRef, { estado: "aceptada" });
      await batch.commit();

      // Forzamos el cambio de contraseña al primer login
      // La lógica en AuthContext se encargará de esto.
      
      setStatus('success');
      
      setTimeout(() => {
        router.push(`/login/usuario?email=${encodeURIComponent(email)}`);
      }, 3000);

    } catch (err: any) {
        console.error("Error aceptando la invitación:", err);
        setError(err.message || 'Ocurrió un error al procesar la invitación.');
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
        if (!invitation) {
            return (
                <div className="text-center space-y-4">
                    <ShieldX className="h-12 w-12 text-destructive mx-auto" />
                    <p className="text-destructive font-medium">{error || "No se pudo cargar la información de la invitación."}</p>
                    <p className="text-sm">Si ya tienes una cuenta, puedes <Link href="/login/usuario" className="underline font-bold text-primary">iniciar sesión directamente</Link>.</p>
                </div>
            );
        }
        return (
          <form onSubmit={handleCreateAccount} className="space-y-4">
             <div className="text-center">
                <p className="text-sm text-muted-foreground">Has sido invitado a unirte a</p>
                <p className="font-bold text-lg">{invitation.empresaNombre}</p>
                <p className="text-sm text-muted-foreground">con el rol de <span className="font-semibold">{invitation.roleDeseado}</span>.</p>
            </div>
             
            {userExists ? (
                <div className="text-center text-destructive font-medium p-3 bg-destructive/10 rounded-md">
                   Ya existe una cuenta con este correo. Por favor,{' '}
                    <Link href="/login/usuario" className="underline font-bold">
                        inicia sesión aquí
                    </Link>.
                </div>
            ) : (
                <>
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
                </>
            )}

            {error && !userExists && <p className="text-sm font-medium text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={userExists}>
                {userExists ? "Cuenta ya existente" : "Confirmar invitación y crear cuenta"}
            </Button>
          </form>
        );
       case 'creating':
        return (
          <div className="flex flex-col items-center justify-center text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Procesando invitación...</p>
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
            <p className="font-semibold">¡Invitación aceptada!</p>
            <p className="text-muted-foreground">Ahora serás redirigido a la página de login para que ingreses con tu correo y la contraseña que creaste.</p>
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
                 <PcgLogo />
             </div>
          <CardTitle className="text-2xl">Aceptar Invitación a PCG</CardTitle>
          <CardDescription>
            Estás a un paso de unirte a tu equipo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
         <CardFooter className="text-center text-sm pt-4">
            <p className="text-muted-foreground w-full">
                ¿Problemas?{' '}
                <Link href="/login/usuario" className="text-primary hover:underline font-semibold">
                    Inicia sesión directamente aquí
                </Link>
            </p>
        </CardFooter>
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
