// src/app/accept-invite/page.tsx
"use client";

import { useEffect, useState, Suspense, FormEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { firebaseDb, firebaseAuth, firebaseFunctions } from '@/lib/firebaseClient';
import { Loader2, CheckCircle, ShieldX, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { UserInvitation } from '@/types/pcg';
import { PcgLogo } from '@/components/branding/PcgLogo';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { httpsCallable } from 'firebase/functions';
import { invitarUsuario } from '@/lib/invitaciones/invitarUsuario';
import { useToast } from '@/hooks/use-toast';
import { updatePassword } from 'firebase/auth';


function AcceptInvitePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, login } = useAuth();
  const { toast } = useToast();

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
        setInvitation(invData);

        if (invData.email.toLowerCase().trim() !== email.toLowerCase().trim()) {
          throw new Error("El correo de la invitación no coincide con el de este enlace.");
        }
        
        // La invitación ya fue usada
        if (invData.estado !== 'pendiente') {
            setError(`Esta invitación ya fue ${invData.estado}. Si no tienes acceso, solicita una nueva.`);
            setStatus('error');
            return;
        }

        // Invitación pendiente, verificar si la cuenta de auth ya existe
        const checkUserExists = httpsCallable(firebaseFunctions, 'checkUserExistsByEmail');
        const response = await checkUserExists({ email: email, invId: invId });
        const exists = (response.data as { exists: boolean }).exists;
        setUserExists(exists);
        
        // Flujo normal: la invitación está pendiente
        setStatus('prompt_password');

      } catch (err: any) {
        console.error("Error al validar la invitación:", err);
        setError(err.message || 'Ocurrió un error inesperado.');
        setStatus('error');
      }
    };

    validateInvitation();
  }, [invId, email, user, router]);

  const handleResendInvitation = async () => {
      if (!invitation) return;
      
      setStatus('creating');
      setError(null);
      
      try {
        const oldInvRef = doc(firebaseDb, "invitacionesUsuarios", invitation.id!);
        await updateDoc(oldInvRef, { estado: 'revocada' });
        
        await invitarUsuario({
            email: invitation.email,
            empresaId: invitation.empresaId,
            empresaNombre: invitation.empresaNombre,
            roleDeseado: invitation.roleDeseado,
            creadoPorUid: "sistema_reenvio",
        });
        
        toast({
            title: "Nueva Invitación Enviada",
            description: `Revisa tu correo electrónico (${invitation.email}) para encontrar el nuevo enlace de activación.`,
        });

        setStatus('success'); // Reutilizamos la pantalla de éxito
        
      } catch (err: any) {
          console.error("Error al reenviar invitación:", err);
          setError(err.message || 'No se pudo reenviar la invitación.');
          setStatus('prompt_password');
      }
  };


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
        // Iniciar sesión con una contraseña temporal o credencial ficticia para obtener el objeto User
        // Esto es un paso intermedio para poder usar updatePassword
        const tempPass = `temp_pass_${Date.now()}`;
        try {
            await login(email, tempPass);
        } catch(loginError: any) {
            // Se espera que falle, pero nos da el control del usuario actual
            if(loginError.code !== 'auth/invalid-credential' && loginError.code !== 'auth/wrong-password'){
                 throw new Error("No se pudo tomar control de la cuenta para actualizarla.");
            }
        }
        
        const currentUser = firebaseAuth.currentUser;
        if(!currentUser || currentUser.email !== email) {
             throw new Error("No se pudo verificar el usuario para actualizar la contraseña.");
        }

      // Actualizar la contraseña del usuario
      await updatePassword(currentUser, password);
      
      // Marcar la invitación como aceptada
      const invitationRef = doc(firebaseDb, "invitacionesUsuarios", invitation.id!);
      await updateDoc(invitationRef, { estado: "aceptada" });
      
      setStatus('success');
      
      setTimeout(() => {
        router.push(`/login/usuario?email=${encodeURIComponent(email)}`);
      }, 3000);

    } catch (err: any) {
        console.error("Error aceptando la invitación:", err);
        setError(err.message || 'Ocurrió un error al procesar la invitación. Por favor, intenta de nuevo.');
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
                </div>
            );
        }
        
        // Flujo normal para invitaciones pendientes
        return (
          <form onSubmit={handleCreateAccount} className="space-y-4">
             <div className="text-center">
                <p className="text-sm text-muted-foreground">Has sido invitado a unirte a</p>
                <p className="font-bold text-lg">{invitation.empresaNombre}</p>
                <p className="text-sm text-muted-foreground">con el rol de <span className="font-semibold">{invitation.roleDeseado}</span>.</p>
            </div>
             
            <>
                <p className="text-sm text-center font-semibold pt-4">Define una contraseña para tu cuenta:</p>
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

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}

            <Button type="submit" className="w-full">
                Confirmar invitación y crear cuenta
            </Button>
          </form>
        );
       case 'creating':
        return (
          <div className="flex flex-col items-center justify-center text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Procesando...</p>
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
      case 'success':
        return (
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <p className="font-semibold">¡Cuenta activada!</p>
            <p className="text-muted-foreground">Tu contraseña ha sido actualizada. Serás redirigido para que puedas iniciar sesión.</p>
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
