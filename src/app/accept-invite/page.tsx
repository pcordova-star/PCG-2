// src/app/aceptar-invitacion/page.tsx
"use client";

import { useEffect, useState, Suspense, FormEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { firebaseDb, firebaseFunctions } from '@/lib/firebaseClient';
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


function AcceptInvitePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
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
        
        if (invData.estado !== 'pendiente') {
            try {
                // LLAMADA A LA CLOUD FUNCTION SEGURA
                const checkUserExists = httpsCallable(firebaseFunctions, 'checkUserExistsByEmail');
                const response = await checkUserExists({ email: email, invId: invId });
                const exists = (response.data as { exists: boolean }).exists;
                setUserExists(exists);
                
                if (!exists) {
                    setError(`La invitación ya fue ${invData.estado}, pero no se encontró una cuenta de usuario activa. Puedes solicitar una nueva invitación.`);
                }

            } catch (authError: any) {
                console.error("Error calling checkUserExistsByEmail function:", authError);
                // Si la función falla, asumimos lo peor y mostramos un error genérico
                setUserExists(false); 
                setError("No se pudo verificar el estado de la cuenta. Por favor, intenta más tarde o contacta a soporte.");
            }
            setStatus('prompt_password');
            return;
        }

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
        // 1. Opcional: marcar la invitación antigua como revocada
        const oldInvRef = doc(firebaseDb, "invitacionesUsuarios", invitation.id!);
        await updateDoc(oldInvRef, { estado: 'revocada' });
        
        // 2. Crear y enviar una nueva invitación
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
          setStatus('prompt_password'); // Volver al estado anterior en caso de error
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
      // Esta función ahora solo debería ser alcanzable si la invitación es 'pendiente'.
      const invitationRef = doc(firebaseDb, "invitacionesUsuarios", invitation.id!);
      await updateDoc(invitationRef, { estado: "aceptada" });
      
      // La creación real del usuario se delega al proceso de createCompanyUser
      // y la aceptación de la invitación es un paso de confirmación.
      // El usuario debería haber sido pre-creado.
      
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
                </div>
            );
        }

        // Si la invitación NO está pendiente
        if (invitation.estado !== 'pendiente') {
            if (userExists) {
                 return (
                    <div className="text-center space-y-4">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                        <p className="font-semibold">Esta invitación ya fue utilizada y tu cuenta está activa.</p>
                        <p className="text-muted-foreground">Por favor, inicia sesión con tus credenciales.</p>
                        <Button asChild className="w-full">
                            <Link href="/login/usuario">Ir a Iniciar Sesión</Link>
                        </Button>
                    </div>
                );
            } else {
                 return (
                    <div className="text-center space-y-4">
                        <ShieldX className="h-12 w-12 text-destructive mx-auto" />
                        <p className="font-semibold">{error || `Esta invitación ya fue ${invitation.estado}.`}</p>
                        <p className="text-muted-foreground">No se encontró una cuenta de usuario activa. Es posible que la invitación haya expirado o haya sido cancelada.</p>
                        <Button onClick={handleResendInvitation} className="w-full">
                            <Mail className="mr-2 h-4 w-4" />
                            Reenviar una nueva invitación
                        </Button>
                    </div>
                 );
            }
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
            <p className="font-semibold">¡Operación exitosa!</p>
            <p className="text-muted-foreground">Ahora serás redirigido a la página de login para que puedas ingresar.</p>
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
