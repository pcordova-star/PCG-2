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

export default function ClienteLoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
      if (!loading && user) {
          router.replace('/cliente');
      }
  }, [user, loading, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      // La redirección se maneja con el useEffect
    } catch (err) {
      console.error(err);
      setError("Error al iniciar sesión. Revisa tus credenciales.");
    }
  }

  if (loading || user) {
    return <p className="text-center p-8">Cargando...</p>;
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
                    {error && <p className="text-sm font-medium text-destructive text-center">{error}</p>}

                    <div className="space-y-2">
                        <Label htmlFor="email">Correo electrónico</Label>
                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Contraseña</Label>
                        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>

                    <Button type="submit" className="w-full">
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
