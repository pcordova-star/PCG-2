
"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, BookCheck, ClipboardList, Siren } from 'lucide-react';
import { Button } from '@/components/ui/button';

const formularios = [
    {
        title: "IPER",
        description: "Identificación de Peligros y Evaluación de Riesgos. La base de la gestión preventiva.",
        href: "/prevencion/formularios-generales/iper",
        icon: BookCheck,
    },
    {
        title: "Investigación de Incidentes",
        description: "Registra y analiza accidentes, cuasi-accidentes y otros sucesos para determinar sus causas.",
        href: "/prevencion/formularios-generales/incidentes",
        icon: Siren,
    },
    {
        title: "Plan de Acción",
        description: "Define y haz seguimiento a las medidas correctivas derivadas de hallazgos e investigaciones.",
        href: "/prevencion/formularios-generales/planes-accion",
        icon: ClipboardList,
    }
];

export default function FormulariosGeneralesPage() {
    return (
        <div className="space-y-6">
            <header className="flex items-center gap-4">
                 <Button asChild variant="outline" size="sm">
                    <Link href="/prevencion"><ArrowLeft className="mr-2 h-4 w-4" />Volver a Prevención</Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Formularios Generales de Prevención</h1>
                    <p className="text-muted-foreground">Accede a los formularios clave para la gestión de seguridad y salud ocupacional.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {formularios.map((form) => (
                    <Link href={form.href} key={form.title} className="block hover:-translate-y-1 transition-transform">
                        <Card className="h-full">
                            <CardHeader>
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-primary/10 rounded-full">
                                        <form.icon className="h-6 w-6 text-primary" />
                                    </div>
                                    <CardTitle>{form.title}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <CardDescription>{form.description}</CardDescription>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
