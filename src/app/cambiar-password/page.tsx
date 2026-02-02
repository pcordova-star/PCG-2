// src/app/cambiar-password/page.tsx
"use client";

import { FormEvent, useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { PcgLogo } from "@/components/branding/PcgLogo";
import { updatePassword } from "firebase/auth";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { firebaseDb, firebaseAuth } from "@/lib/firebaseClient";
import { useToast } from "@/hooks/use-toast";

export default function CambiarPasswordPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isChanging, setIsChanging] = useState(false);
  
  // Redirige si el usuario no necesita cambiar la contraseña o no está logueado
  useEffect(() => {
    if (!loading && !user) {
        router.replace('/login/usuario');
    }
  }, [user, loading, router]);


  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    
    if (newPassword.length < 6) {
        setError("La nueva contraseña debe tener al menos 6 caracteres.");
        return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (!user) {
        setError("No se ha encontrado un usuario autenticado.");
        return;
    }

    setIsChanging(true);
    try {
      // 1. Cambiar la contraseña en Firebase Auth
      await updatePassword(user, newPassword);

      // 2. Actualizar el flag en Firestore
      const userDocRef = doc(firebaseDb, "users", user.uid);
      await updateDoc(userDocRef, {
        mustChangePassword: false,
        updatedAt: serverTimestamp(),
      });
      
      toast({
          title: "Contraseña actualizada",
          description: "Tu nueva contraseña ha sido guardada. Serás redirigido a tu panel.",
      });

      // NO es necesario redirigir manualmente. 
      // El onSnapshot en AuthContext detectará el cambio y redirigirá automáticamente.
      // router.push('/dashboard');

    } catch (err: any) {
      console.error("Error al cambiar la contraseña:", err);
      let friendlyError = "No se pudo cambiar la contraseña. Intenta cerrar sesión y volver a ingresar.";
      if (err.code === 'auth/requires-recent-login') {
          friendlyError = "Por seguridad, debes volver a iniciar sesión para cambiar tu contraseña."
      }
      setError(friendlyError);
      toast({ variant: 'destructive', title: 'Error', description: friendlyError });
    } finally {
        setIsChanging(false);
    }
  }
  
  if (loading || !user) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p>Cargando...</p>
        </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
        <Card className="w-full max-w-sm mx-4">
            <CardHeader className="text-center space-y-4">
                <div className="mx-auto">
                    <PcgLogo />
                </div>
                <CardTitle>Cambio de Contraseña Obligatorio</CardTitle>
                <CardDescription>
                    Por seguridad, debes establecer una nueva contraseña para tu primer ingreso.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form
                    onSubmit={handleSubmit}
                    className="space-y-4"
                >
                    <div className="space-y-2">
                        <Label htmlFor="newPassword">Nueva Contraseña</Label>
                        <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                        <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                    </div>
                    
                    {error && <p className="text-sm font-medium text-destructive text-center pt-2">{error}</p>}

                    <Button type="submit" className="w-full" disabled={isChanging}>
                        {isChanging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isChanging ? "Guardando..." : "Establecer Nueva Contraseña"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    </div>
  );
}
