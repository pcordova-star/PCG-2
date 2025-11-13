// src/app/page.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, User, Building } from 'lucide-react';

export default function WelcomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted/20 p-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-primary">Bienvenido a PCG 2.0</h1>
        <p className="text-lg text-muted-foreground mt-2">Plataforma de Control y Gestión de Obras</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Card para Usuarios Internos */}
        <Card className="transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                <Building className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl">Acceso Empresa / Obras</CardTitle>
            <CardDescription>
              Para administradores, jefes de obra, prevencionistas y personal interno.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full text-lg py-6">
              <Link href="/login/usuario">
                Ingresar al sistema
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Card para Clientes */}
        <Card className="transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <CardHeader className="text-center">
             <div className="mx-auto bg-accent/10 p-4 rounded-full w-fit mb-4">
                <User className="h-10 w-10 text-accent" />
            </div>
            <CardTitle className="text-2xl">Acceso Clientes</CardTitle>
            <CardDescription>
              Para mandantes e inmobiliarias que deseen ver el avance de sus obras.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full text-lg py-6" variant="secondary">
              <Link href="/login/cliente">
                Ingresar al portal de clientes
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
       <footer className="mt-16 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} PCG 2.0. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
