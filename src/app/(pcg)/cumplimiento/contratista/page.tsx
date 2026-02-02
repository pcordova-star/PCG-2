// src/app/(pcg)/cumplimiento/contratista/page.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Loader2, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ComplianceCalendarMonth } from "@/types/pcg";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
    const { role, loading, user, companyId } = useAuth();
    const router = useRouter();

    const [currentPeriod, setCurrentPeriod] = useState<ComplianceCalendarMonth | null>(null);
    const [loadingCalendar, setLoadingCalendar] = useState(true);

    useEffect(() => {
        if (!loading && role !== 'contratista' && role !== 'superadmin') {
            router.replace('/dashboard');
        }
    }, [role, loading, router]);

    useEffect(() => {
        if (!companyId) {
            setLoadingCalendar(false);
            return;
        };

        const fetchCurrentPeriod = async () => {
            setLoadingCalendar(true);
            try {
                const year = new Date().getFullYear();
                const month = new Date().getMonth() + 1;
                const monthKey = `${year}-${String(month).padStart(2, '0')}`;

                const res = await fetch(`/api/mclp/calendar?companyId=${companyId}&year=${year}`);
                if (!res.ok) {
                    throw new Error("No se pudo cargar el calendario de cumplimiento.");
                }
                const calendarYear: ComplianceCalendarMonth[] = await res.json();
                
                const period = calendarYear.find(p => p.id === monthKey);
                setCurrentPeriod(period || null);

            } catch (error) {
                console.error("Error fetching compliance calendar:", error);
            } finally {
                setLoadingCalendar(false);
            }
        };

        fetchCurrentPeriod();
    }, [companyId]);

    if (loading || loadingCalendar) {
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
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Período de Cumplimiento Actual: {currentPeriod ? format(new Date(currentPeriod.id + '-02T00:00:00'), "MMMM yyyy", { locale: es }).replace(/^\w/, (c) => c.toUpperCase()) : 'Cargando...'}
                    </CardTitle>
                    <CardDescription>
                        Fechas clave para la carga y revisión de tu documentación.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {currentPeriod ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm font-semibold text-blue-800">Fecha de Corte de Carga</p>
                                <p className="text-lg font-bold">{format(new Date(currentPeriod.corteCarga), "dd 'de' MMMM", { locale: es })}</p>
                            </div>
                             <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm font-semibold text-yellow-800">Límite para Revisión</p>
                                <p className="text-lg font-bold">{format(new Date(currentPeriod.limiteRevision), "dd 'de' MMMM", { locale: es })}</p>
                            </div>
                             <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-sm font-semibold text-green-800">Fecha de Pago</p>
                                <p className="text-lg font-bold">{format(new Date(currentPeriod.fechaPago), "dd 'de' MMMM", { locale: es })}</p>
                            </div>
                        </div>
                    ) : (
                         <p className="text-muted-foreground">No se encontró información del período actual. Contacta al administrador.</p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Requisitos del Período</CardTitle>
                    <CardDescription>Sube la documentación requerida para habilitar tu estado de pago.</CardDescription>
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
