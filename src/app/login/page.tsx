"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


export default function LoginPage() {
  const { login, user, logout, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      console.error(err);
      setError("Error al iniciar sesión. Revisa tu correo y contraseña.");
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">
        Cargando sesión...
      </p>
    );
  }

  if (user) {
    return (
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">
          Sesión iniciada
        </h2>
        <p className="text-sm text-muted-foreground">
          Estás conectado como{" "}
          <span className="font-mono">{user.email}</span>.
        </p>
        <Button
          onClick={() => logout()}
        >
          Cerrar sesión
        </Button>
      </section>
    );
  }

  return (
    <Card className="max-w-sm">
        <CardHeader>
            <CardTitle>Login PCG 2.0</CardTitle>
            <CardDescription>
                Ingresa con tu correo y contraseña configurados en Firebase Auth.
            </CardDescription>
        </CardHeader>
        <CardContent>
             <form
                onSubmit={handleSubmit}
                className="space-y-4"
            >
                {error && <p className="text-sm font-medium text-destructive">{error}</p>}

                <div className="space-y-2">
                <Label htmlFor="email">
                    Correo electrónico
                </Label>
                <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                </div>

                <div className="space-y-2">
                <Label htmlFor="password">
                    Contraseña
                </Label>
                <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                </div>

                <Button
                type="submit"
                className="w-full"
                >
                Iniciar sesión
                </Button>
            </form>
        </CardContent>
    </Card>
  );
}
