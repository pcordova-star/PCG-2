// src/app/cumplimiento/contratista/page.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

// --- Tipos de Datos (Simulados por ahora) ---
type EstadoCumplimiento = "CUMPLIENDO" | "EN_REVISION" | "ACCION_REQUERIDA" | "PENDIENTE_DE_CARGA";
type EstadoDocumento = "Aprobado" | "En Revisión" | "Observado" | "Pendiente de Carga";

const documentosRequeridos = [
  { id: 'doc1', nombre: 'F30-1 de la Dirección del Trabajo', estado: 'Aprobado' as EstadoDocumento },
  { id: 'doc2', nombre: 'Planilla de Cotizaciones Previsionales', estado: 'Observado' as EstadoDocumento, observacion: 'El mes de la planilla es incorrecto. Se requiere la del mes de Octubre 2025.' },
  { id: 'doc3', nombre: 'Liquidaciones de Sueldo Firmadas', estado: 'Pendiente de Carga' as EstadoDocumento },
  { id: 'doc4', nombre: 'Certificado de Mutualidad', estado: 'En Revisión' as EstadoDocumento },
];

const estadoConfig: Record<EstadoCumplimiento, {
    title: string;
    description: string;
    icon: React.ElementType;
    color: string;
}> = {
    "CUMPLIENDO": {
        title: "Cumpliendo - Documentación Aprobada",
        description: "Felicitaciones, tu estado de pago para este período ha sido habilitado.",
        icon: CheckCircle,
        color: "bg-green-100 border-green-300 text-green-800",
    },
    "EN_REVISION": {
        title: "En Revisión",
        description: "Hemos recibido tu documentación. Nuestro equipo la está revisando.",
        icon: Clock,
        color: "bg-blue-100 border-blue-300 text-blue-800",
    },
    "ACCION_REQUERIDA": {
        title: "Acción Requerida - Tienes Documentos Observados",
        description: "Revisa los comentarios y vuelve a subir los documentos correctos para habilitar tu pago.",
        icon: AlertTriangle,
        color: "bg-red-100 border-red-300 text-red-800",
    },
    "PENDIENTE_DE_CARGA": {
        title: "Pendiente de Carga",
        description: "Sube los documentos requeridos antes de la fecha de corte para iniciar el proceso.",
        icon: Clock,
        color: "bg-yellow-100 border-yellow-300 text-yellow-800",
    }
};

const getEstadoGlobal = (): EstadoCumplimiento => {
    if (documentosRequeridos.some(d => d.estado === 'Observado')) return 'ACCION_REQUERIDA';
    if (documentosRequeridos.some(d => d.estado === 'Pendiente de Carga')) return 'PENDIENTE_DE_CARGA';
    if (documentosRequeridos.some(d => d.estado === 'En Revisión')) return 'EN_REVISION';
    return 'CUMPLIENDO';
}

const estadoDocConfig: Record<EstadoDocumento, { color: string, label: string }> = {
    'Aprobado': { color: 'bg-green-100 text-green-800', label: 'Aprobado' },
    'En Revisión': { color: 'bg-blue-100 text-blue-800', label: 'En Revisión' },
    'Observado': { color: 'bg-red-100 text-red-800', label: 'Observado' },
    'Pendiente de Carga': { color: 'bg-gray-100 text-gray-800', label: 'Pendiente' }
};

export default function ContratistaDashboardPage() {
    const { role, loading, user } = useAuth();
    const router = useRouter();

    const [estadoGlobal, setEstadoGlobal] = useState<EstadoCumplimiento>(getEstadoGlobal());

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

    const config = estadoConfig[estadoGlobal];
    const Icon = config.icon;

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold">Portal del Contratista</h1>
                <p className="text-muted-foreground">Bienvenido, {user?.displayName || user?.email}.</p>
            </header>

            <Card className={cn("border-l-4", config.color)}>
                <CardHeader className="flex flex-row items-center gap-4">
                    <Icon className="h-8 w-8" />
                    <div>
                        <CardTitle className="text-lg">{config.title}</CardTitle>
                        <CardDescription className="text-sm">{config.description}</CardDescription>
                    </div>
                </CardHeader>
            </Card>

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