
// src/app/(pcg)/prevencion/formularios-generales/page.tsx
"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, BookCheck, ClipboardList, Siren } from 'lucide-react';
import { Button } from '@/components/ui/button';

const formularios = [
    {
        title: "IPER con Enfoque de Género",
        description: "Identificación de Peligros y Evaluación de Riesgos según los requerimientos del DS-44.",
        href: "/prevencion/formularios-generales/iper",
        icon: BookCheck,
        status: "active"
    },
    {
        title: "Registro de Incidentes",
        description: "Reporta un accidente o incidente para iniciar el proceso de investigación y determinar sus causas raíz.",
        href: "/prevencion/formularios-generales/incidentes",
        icon: Siren,
        status: "active"
    },
    {
        title: "Planes de Acción",
        description: "Define y haz seguimiento a las medidas correctivas. (En construcción)",
        href: "/prevencion/formularios-generales/planes-accion",
        icon: ClipboardList,
        status: "inactive"
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
                    <Link href={form.href} key={form.title} className={`block ${form.status === 'inactive' ? 'pointer-events-none' : 'hover:-translate-y-1 transition-transform'}`}>
                        <Card className={`h-full ${form.status === 'inactive' ? 'bg-muted/50' : ''}`}>
                            <CardHeader>
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-full ${form.status === 'inactive' ? 'bg-gray-200' : 'bg-primary/10'}`}>
                                        <form.icon className={`h-6 w-6 ${form.status === 'inactive' ? 'text-gray-500' : 'text-primary'}`} />
                                    </div>
                                    <CardTitle className={form.status === 'inactive' ? 'text-muted-foreground' : ''}>{form.title}</CardTitle>
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
