"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from 'next/link';
import { Loader2, CheckCircle } from "lucide-react";
import { PcgLogo } from "@/components/branding/PcgLogo";

export default function RecuperarPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSent(false);

    if (!email) {
      setError("Por favor, ingresa tu correo electrónico.");
      return;
    }

    setIsSending(true);
    try {
      await resetPassword(email);
      setIsSent(true); // Always show success for security reasons
    } catch (err: any) {
      // The context function will handle logging, but we always show success to the user.
      setIsSent(true);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <Card className="w-full max-w-sm mx-4">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto">
            <PcgLogo />
          </div>
          <CardTitle>Recuperar Contraseña</CardTitle>
          <CardDescription>
            Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSent ? (
            <div className="text-center space-y-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
              <p className="font-semibold">Correo enviado</p>
              <p className="text-sm text-muted-foreground">
                Si existe una cuenta asociada a <strong>{email}</strong>, recibirás un correo con instrucciones en los próximos minutos.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              {error && <p className="text-sm font-medium text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isSending}>
                {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSending ? "Enviando..." : "Enviar Correo de Recuperación"}
              </Button>
            </form>
          )}
        </CardContent>
        <CardContent className="text-center text-sm">
          <Link href="/login/usuario" className="text-muted-foreground hover:text-primary">
            &larr; Volver a Iniciar Sesión
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
