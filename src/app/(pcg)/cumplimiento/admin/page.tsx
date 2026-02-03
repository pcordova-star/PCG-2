// src/app/cumplimiento/admin/page.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect } from "react";
import { Loader2, Calendar, Users, ListChecks, ArrowLeft, FileCheck } from "lucide-react";

export default function AdminCumplimientoPage() {
    const { role, loading, company } = useAuth();
    const router = useRouter();

    const isComplianceEnabled = company?.feature_compliance_module_enabled ?? false;

    useEffect(() => {
        if (!loading) {
            if (!['admin_empresa', 'superadmin', 'jefe_obra'].includes(role)) {
                router.replace('/dashboard');
            }
            if (!isComplianceEnabled && role !== 'superadmin') {
                router.replace('/dashboard');
            }
        }
    }, [role, loading, isComplianceEnabled, router]);

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (!isComplianceEnabled && role === 'superadmin') {
         return (
            <div className="space-y-6">
                <header>
                    <Button asChild variant="outline" size="sm" className="mb-4">
                      <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Dashboard</Link>
                    </Button>
                    <h1 className="text-3xl font-bold">Módulo de Cumplimiento Legal</h1>
                    <p className="text-muted-foreground">Gestión de programas y revisión de documentación de subcontratistas.</p>
                </header>
                <Card className="bg-yellow-50 border-yellow-300">
                    <CardHeader>
                        <CardTitle>Módulo Deshabilitado</CardTitle>
                        <CardDescription>
                            Este módulo no está activado para tu empresa. El superadministrador puede habilitarlo desde el panel de gestión de empresas.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (!['admin_empresa', 'superadmin', 'jefe_obra'].includes(role)) {
        return null;
    }

    const adminActions = [
        {
            title: "Revisión de Documentos",
            description: "Revisa y aprueba los documentos mensuales de tus subcontratistas.",
            href: "/cumplimiento/revision",
            icon: FileCheck,
            roles: ['admin_empresa', 'superadmin']
        },
        {
            title: "Documentos Requeridos",
            description: "Define la lista de documentos que se solicitarán mensualmente a los subcontratistas.",
            href: "/cumplimiento/admin/programa",
            icon: ListChecks,
            roles: ['admin_empresa', 'superadmin', 'jefe_obra']
        },
        {
            title: "Calendario Anual",
            description: "Ajusta las fechas de corte, revisión y pago para cada mes del año.",
            href: "/cumplimiento/admin/calendario",
            icon: Calendar,
            roles: ['admin_empresa', 'superadmin', 'jefe_obra']
        },
        {
            title: "Gestionar Subcontratistas",
            description: "Añade, desactiva y gestiona el acceso de tus empresas subcontratistas.",
            href: "/cumplimiento/admin/subcontratistas",
            icon: Users,
            roles: ['admin_empresa', 'superadmin']
        }
    ].filter(action => action.roles.includes(role));

    return (
        <div className="space-y-6">
            <header>
                 <Button asChild variant="outline" size="sm" className="mb-4">
                  <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Dashboard</Link>
                </Button>
                <h1 className="text-3xl font-bold">Panel de Cumplimiento Legal</h1>
                <p className="text-muted-foreground">Gestión de programas y revisión de documentación de subcontratistas.</p>
            </header>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {adminActions.map(action => (
                    <Card key={action.href} className="flex flex-col">
                        <CardHeader className="flex-row items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-full">
                                <action.icon className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle>{action.title}</CardTitle>
                                <CardDescription className="mt-1">{action.description}</CardDescription>
                            </div>
                        </CardHeader>
                        <CardFooter className="mt-auto">
                            <Button asChild className="w-full">
                                <Link href={action.href}>Gestionar</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
