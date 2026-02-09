// src/app/public/induccion/success/page.tsx
"use client";

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import { PcgLogo } from '@/components/branding/PcgLogo';

function SuccessContent() {
  const searchParams = useSearchParams();
  const obraNombre = searchParams.get('obra');

  return (
    <Card className="w-full max-w-lg mx-4">
      <CardHeader className="text-center">
         <div className="mx-auto w-fit mb-4">
            <PcgLogo />
         </div>
        <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <CheckCircle className="h-8 w-8 text-green-500"/>
            Registro Exitoso
        </CardTitle>
        <CardDescription>
          Tu ingreso a la obra <strong>{obraNombre || ''}</strong> ha sido registrado correctamente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center text-muted-foreground text-sm space-y-2">
            <p>Gracias por completar la inducción de acceso.</p>
            <p>Ya puedes cerrar esta ventana y presentarte en la portería de la obra.</p>
        </div>
      </CardContent>
    </Card>
  );
}


export default function SuccessPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
            <Suspense fallback={<div>Cargando...</div>}>
                <SuccessContent />
            </Suspense>
        </div>
    );
}
