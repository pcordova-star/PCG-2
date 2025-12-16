// src/app/operaciones/presupuestos/itemizados/importar/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Wand2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ImportarItemizadoPlaceholderPage() {
  const router = useRouter();

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
        <header className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
            <h1 className="text-3xl font-bold tracking-tight">Importar Itemizado</h1>
            <p className="text-muted-foreground">Importación automática de itemizados desde PDF.</p>
            </div>
        </header>

        <Card className="bg-amber-50 border-amber-200">
            <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-3 bg-amber-100 rounded-full">
                    <Wand2 className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                    <CardTitle className="text-amber-900">Importación automática en evaluación</CardTitle>
                    <CardDescription className="text-amber-700">
                        La importación de itemizados con IA está deshabilitada temporalmente para realizar mejoras en el servicio.
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    Mientras tanto, puedes seguir utilizando la creación manual de itemizados para gestionar tus presupuestos de obra. Agradecemos tu comprensión.
                </p>
            </CardContent>
            <CardFooter>
                 <Button asChild>
                    <Link href="/operaciones/presupuestos">
                        Volver a Itemizados
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    </div>
  );
}
