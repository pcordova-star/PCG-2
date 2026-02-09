import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PcgLogo } from '@/components/branding/PcgLogo';

export default function RegistroExitosoPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                     <div className="mx-auto w-fit mb-4">
                        <PcgLogo />
                    </div>
                    <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                    <CardTitle className="mt-4">Registro Exitoso</CardTitle>
                    <CardDescription>
                        Tu ingreso ha sido registrado correctamente en la plataforma PCG.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Ya puedes cerrar esta ventana y continuar con tu ingreso a la faena según las instrucciones del personal de la obra.
                    </p>
                </CardContent>
                <CardFooter>
                    <Button asChild className="w-full" variant="outline">
                        <Link href="/">Volver a la página principal</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
