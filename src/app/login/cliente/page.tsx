// src/app/login/cliente/page.tsx
"use client";

import { FormEvent, useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from 'next/link';
import TermsAcceptance from "@/components/auth/TermsAcceptance";
import { Loader2 } from "lucide-react";

export default function ClienteLoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
      if (!loading && user) {
          router.replace('/cliente');
      }
  }, [user, loading, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!acceptedTerms) {
      setError("Debes aceptar los Términos y Condiciones para continuar.");
      return;
    }
    setIsLoggingIn(true);
    try {
      await login(email, password);
      // La redirección se maneja con el useEffect
    } catch (err) {
      console.error(err);
      setError("Error al iniciar sesión. Revisa tus credenciales.");
    } finally {
        setIsLoggingIn(false);
    }
  }

  if (loading || user) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p>Cargando portal del cliente...</p>
        </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
        <Card className="w-full max-w-md mx-4">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl">Portal de Clientes</CardTitle>
                <CardDescription>
                    Ingrese con las credenciales proporcionadas para ver el avance de sus obras.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form
                    onSubmit={handleSubmit}
                    className="space-y-4"
                >
                    <div className="space-y-2">
                        <Label htmlFor="email">Correo electrónico</Label>
                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Contraseña</Label>
                        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>

                    <TermsAcceptance acceptedTerms={acceptedTerms} onAcceptedTermsChange={setAcceptedTerms} />

                    {error && <p className="text-sm font-medium text-destructive text-center pt-2">{error}</p>}

                    <Button type="submit" className="w-full" disabled={isLoggingIn || !acceptedTerms}>
                        {isLoggingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Ingresar al Portal
                    </Button>
                </form>
            </CardContent>
             <CardContent className="text-center text-sm">
                <Link href="/" className="text-muted-foreground hover:text-primary">
                    &larr; Volver a la selección de acceso
                </Link>
             </CardContent>
        </Card>
    </div>
  );
}
