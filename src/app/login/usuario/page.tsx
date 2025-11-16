// src/app/login/usuario/page.tsx
"use client";

import { FormEvent, useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from 'next/link';
import { Loader2 } from "lucide-react";
import TermsAcceptance from "@/components/auth/TermsAcceptance";
import { PcgLogo } from "@/components/branding/PcgLogo";

const TERMS_ACCEPTANCE_KEY = "pcg_terms_accepted";

export default function UsuarioLoginPage() {
  const { login, user, loading, role } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    // Comprobar si los términos ya fueron aceptados en este navegador
    if (localStorage.getItem(TERMS_ACCEPTANCE_KEY) === "true") {
      setAcceptedTerms(true);
    }
  }, []);

  useEffect(() => {
    if (!loading && user && role !== 'none') {
        if(role === 'superadmin'){
            router.replace('/admin/empresas');
        } else {
            router.replace('/dashboard');
        }
    }
  }, [user, loading, role, router]);


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
      // Guardar la aceptación de términos en localStorage después de un login exitoso
      localStorage.setItem(TERMS_ACCEPTANCE_KEY, "true");
      // La redirección se maneja con el useEffect
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') {
        setError("Credenciales inválidas. Por favor, revisa tu correo y contraseña.");
      } else {
        setError("Error al iniciar sesión. Intenta nuevamente más tarde.");
      }
    } finally {
        setIsLoggingIn(false);
    }
  }

  const handleTermsChange = (accepted: boolean) => {
    setAcceptedTerms(accepted);
    if (accepted) {
      localStorage.setItem(TERMS_ACCEPTANCE_KEY, "true");
    } else {
      // Si el usuario desmarca la casilla, eliminamos la clave.
      // Esto es útil si necesitan re-aceptar en el futuro por un cambio de términos.
      localStorage.removeItem(TERMS_ACCEPTANCE_KEY);
    }
  };


  if (loading || user) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p>Cargando sesión y verificando permisos...</p>
        </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
        <Card className="w-full max-w-sm mx-4">
            <CardHeader className="text-center space-y-4">
                <div className="mx-auto">
                    <PcgLogo size={50}/>
                </div>
                <CardTitle>Acceso a Plataforma</CardTitle>
                <CardDescription>
                    Ingresa con tu correo y contraseña de la empresa.
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

                    <TermsAcceptance acceptedTerms={acceptedTerms} onAcceptedTermsChange={handleTermsChange} />

                    {error && <p className="text-sm font-medium text-destructive text-center pt-2">{error}</p>}

                    <Button type="submit" className="w-full" disabled={isLoggingIn || !acceptedTerms}>
                        {isLoggingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isLoggingIn ? "Iniciando..." : "Iniciar Sesión"}
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
