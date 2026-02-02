// src/app/(pcg)/cumplimiento/contratista/dashboard/page.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type EstadoDocumento = "Aprobado" | "En Revisión" | "Observado" | "Pendiente de Carga";

const documentosRequeridos = [
  { id: 'doc1', nombre: 'F30-1 de la Dirección del Trabajo', estado: 'Aprobado' as EstadoDocumento },
  { id: 'doc2', nombre: 'Planilla de Cotizaciones Previsionales', estado: 'Observado' as EstadoDocumento, observacion: 'El mes de la planilla es incorrecto. Se requiere la del mes de Octubre 2025.' },
  { id: 'doc3', nombre: 'Liquidaciones de Sueldo Firmadas', estado: 'Pendiente de Carga' as EstadoDocumento },
  { id: 'doc4', nombre: 'Certificado de Mutualidad', estado: 'En Revisión' as EstadoDocumento },
];

const estadoDocConfig: Record<EstadoDocumento, { color: string, label: string }> = {
    'Aprobado': { color: 'bg-green-100 text-green-800', label: 'Aprobado' },
    'En Revisión': { color: 'bg-blue-100 text-blue-800', label: 'En Revisión' },
    'Observado': { color: 'bg-red-100 text-red-800', label: 'Observado' },
    'Pendiente de Carga': { color: 'bg-gray-100 text-gray-800', label: 'Pendiente' }
};

export default function ContratistaDashboardPage() {
    const { role, loading, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && role !== 'contratista' && role !== 'superadmin') {
            router.replace('/dashboard');
        }
    }, [role, loading, router]);

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (role !== 'contratista' && role !== 'superadmin') {
        return null;
    }

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold">Portal del Contratista</h1>
                <p className="text-muted-foreground">Bienvenido, {user?.displayName || user?.email}.</p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Requisitos del Período: Noviembre 2025</CardTitle>
                    <CardDescription>Sube la documentación requerida para habilitar tu estado de pago. Fecha de corte: 25/11/2025.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {documentosRequeridos.map(doc => (
                             <Card key={doc.id} className={doc.estado === 'Observado' ? 'border-red-300' : ''}>
                                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div className="flex-1">
                                        <p className="font-medium">{doc.nombre}</p>
                                        {doc.estado === 'Observado' && <p className="text-xs text-red-600 mt-1"><strong>Observación:</strong> {doc.observacion}</p>}
                                    </div>
                                    <div className="flex items-center gap-4 flex-shrink-0">
                                        <Badge className={estadoDocConfig[doc.estado].color}>{estadoDocConfig[doc.estado].label}</Badge>
                                        {doc.estado === 'Pendiente de Carga' && <Button size="sm">Subir Archivo</Button>}
                                        {doc.estado === 'Observado' && <Button size="sm" variant="destructive">Corregir y Volver a Subir</Button>}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
