// src/app/(pcg)/control-subcontratistas-ds44/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, CheckCircle, FileWarning, Clock, TrendingUp, ShieldCheck, DollarSign, GanttChartSquare } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

export const metadata = {
  title: "Software para Control de Subcontratistas y Cumplimiento DS44 | PCG",
  description:
    "Automatiza el control documental de subcontratistas y cumple con el DS44 en Chile. Libera estados de pago a tiempo y reduce riesgos legales con PCG.",
};

export default function ControlSubcontratistasPage() {
    const router = useRouter();

    const beneficios = [
        {
            icon: Clock,
            title: "Ahorro de Tiempo Administrativo",
            description: "Elimina el seguimiento manual por correo y planillas. Reduce en más de un 70% el tiempo dedicado a solicitar, recibir y revisar documentación."
        },
        {
            icon: ShieldCheck,
            title: "Mitigación de Riesgos Legales",
            description: "Asegura el cumplimiento continuo del DS 44 y la Ley de Subcontratación. Mantén un registro auditable y siempre disponible ante fiscalizaciones de la Dirección del Trabajo."
        },
        {
            icon: DollarSign,
            title: "Agilidad en Estados de Pago",
            description: "Libera los pagos a tus subcontratistas sin demoras. El sistema te alerta qué empresas están acreditadas, eliminando el principal cuello de botella para cursar los pagos."
        },
        {
            icon: GanttChartSquare,
            title: "Continuidad Operacional",
            description: "Evita paralizaciones de faenas por incumplimiento. Asegúrate de que solo personal y empresas acreditadas ingresen y operen en tu obra."
        }
    ];

    return (
        <div className="space-y-12 max-w-5xl mx-auto">
            <header className="space-y-4">
                <Button variant="outline" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </Button>
                <div className="text-center">
                    <Badge variant="secondary" className="mb-4">Módulo de Cumplimiento y Control Documental</Badge>
                    <h1 className="text-4xl font-bold tracking-tight text-primary">
                        Software para el Control de Subcontratistas y Cumplimiento DS44 en Chile
                    </h1>
                    <p className="mt-4 text-lg max-w-3xl mx-auto text-muted-foreground">
                        Centraliza la gestión documental, automatiza el cumplimiento del Decreto Supremo 44 y libera los estados de pago a tiempo, sin riesgos ni demoras.
                    </p>
                </div>
            </header>

            <main className="space-y-16">
                <section>
                    <Card className="bg-slate-50 border-dashed">
                        <CardHeader>
                            <CardTitle className="text-center text-xl text-slate-800">¿El control de subcontratistas es tu mayor cuello de botella?</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                            <div className="space-y-2">
                                <FileWarning className="mx-auto h-10 w-10 text-amber-500" />
                                <h3 className="font-semibold">Caos Documental</h3>
                                <p className="text-sm text-muted-foreground">Cientos de correos, planillas Excel desactualizadas y carpetas en Drive que nadie mantiene. La información crítica está dispersa y es imposible de auditar.</p>
                            </div>
                             <div className="space-y-2">
                                <ShieldCheck className="mx-auto h-10 w-10 text-red-500" />
                                <h3 className="font-semibold">Riesgo Legal y Operativo</h3>
                                <p className="text-sm text-muted-foreground">El incumplimiento del DS44 puede resultar en multas, paralización de faenas y responsabilidad solidaria ante accidentes. ¿Estás seguro de que todos cumplen?</p>
                            </div>
                             <div className="space-y-2">
                                <Clock className="mx-auto h-10 w-10 text-blue-500" />
                                <h3 className="font-semibold">Pagos Atrasados</h3>
                                <p className="text-sm text-muted-foreground">El proceso de acreditación manual retrasa la aprobación de estados de pago, generando fricción con tus subcontratistas y afectando el avance de la obra.</p>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                <section className="text-center">
                    <h2 className="text-3xl font-bold">La Solución: Automatiza el Cumplimiento con PCG</h2>
                    <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
                        PCG transforma un proceso manual y reactivo en un sistema automatizado, centralizado y proactivo que te devuelve el control.
                    </p>
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</div>
                                <div>
                                    <h4 className="font-semibold">Portal de Autogestión para Subcontratistas</h4>
                                    <p className="text-sm text-muted-foreground">Cada empresa subcontratista recibe un acceso a su propio portal, donde puede cargar y gestionar su documentación de forma autónoma, liberando a tu equipo de la carga administrativa.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</div>
                                <div>
                                    <h4 className="font-semibold">Checklists de Cumplimiento Dinámicos</h4>
                                    <p className="text-sm text-muted-foreground">Define los documentos requeridos una sola vez (contratos, F30-1, certificados, etc.). La plataforma genera automáticamente los requisitos para cada período, indicando qué falta y cuándo vence.</p>
                                </div>
                            </div>
                        </div>
                         <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</div>
                                <div>
                                    <h4 className="font-semibold">Flujos de Revisión y Alertas</h4>
                                    <p className="text-sm text-muted-foreground">Tu equipo de prevención o administración recibe notificaciones cuando hay nuevos documentos para revisar. Aprueba o rechaza con comentarios claros, creando una trazabilidad completa.</p>
                                </div>
                            </div>
                             <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">4</div>
                                <div>
                                    <h4 className="font-semibold">Dashboard de Cumplimiento en Tiempo Real</h4>
                                    <p className="text-sm text-muted-foreground">Visualiza de un vistazo el estado de cumplimiento de todas tus empresas subcontratistas. Filtra por obra, empresa o estado para tomar decisiones informadas al instante.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="text-3xl font-bold text-center">Beneficios Directos para tu Obra</h2>
                    <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {beneficios.map((b, i) => (
                            <Card key={i} className="text-center">
                                <CardHeader>
                                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                        <b.icon className="w-6 h-6 text-primary" />
                                    </div>
                                    <CardTitle className="mt-2 text-base">{b.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-muted-foreground">{b.description}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>

                <section className="bg-muted rounded-lg p-8 text-center">
                     <h2 className="text-2xl font-bold">El Impacto Financiero: Estados de Pago sin Fricción</h2>
                     <p className="mt-3 max-w-2xl mx-auto text-muted-foreground">
                        Un subcontratista acreditado es un estado de pago que se puede cursar. Al automatizar la validación documental, PCG elimina la principal barrera para el flujo de pagos, mejorando la relación con tus colaboradores y asegurando la continuidad de los trabajos.
                    </p>
                </section>

                 <section className="text-center pt-8">
                    <h2 className="text-3xl font-bold">Deja de Perseguir Papeles. Empieza a Gestionar.</h2>
                    <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                        Descubre cómo PCG puede ahorrarle decenas de horas a tu equipo y proteger a tu empresa de riesgos innecesarios.
                    </p>
                    <div className="mt-6">
                        <Button size="lg" asChild>
                             <a href="mailto:paulo@ipsconstruccion.cl?subject=Solicitud%20de%20Demo%20de%20PCG%20(Control%20Subcontratistas)">Agendar una Demo Personalizada</a>
                        </Button>
                    </div>
                </section>

            </main>
        </div>
    );
}
