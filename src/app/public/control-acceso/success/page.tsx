// src/app/public/control-acceso/success/page.tsx
'use client';

import { CheckCircle, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function SuccessPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto w-fit p-3 bg-green-100 rounded-full">
                        <CheckCircle className="h-12 w-12 text-green-600" />
                    </div>
                    <CardTitle className="mt-4">¡Registro Exitoso!</CardTitle>
                    <CardDescription>Tu acceso e inducción han sido registrados correctamente.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Ya puedes cerrar esta ventana y proceder con tu ingreso a la obra según las indicaciones del personal de portería.</p>
                    <Button asChild className="mt-6 w-full" variant="outline">
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver a la Página Principal
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
