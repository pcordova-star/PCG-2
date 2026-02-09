// src/app/public/control-acceso/success/page.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

export default function SuccessPage() {
    return (
        <main className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto bg-green-100 p-3 rounded-full w-fit">
                        <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                    <CardTitle className="mt-4">¡Registro Exitoso!</CardTitle>
                    <CardDescription>
                        Tu ingreso a la obra ha sido registrado correctamente.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Gracias por completar el formulario. Ya puedes notificar a tu contacto en la obra.
                    </p>
                </CardContent>
                <CardFooter>
                     <Button asChild className="w-full" variant="outline">
                        <Link href="https://pcgoperacion.com">Cerrar</Link>
                    </Button>
                </CardFooter>
            </Card>
        </main>
    );
}
