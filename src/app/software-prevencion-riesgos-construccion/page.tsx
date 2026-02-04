// src/app/(pcg)/software-prevencion-riesgos-construccion/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, CheckCircle, FileWarning, Clock, ShieldCheck, FileText, GanttChartSquare } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

export const metadata = {
  title: "Software de Prevención de Riesgos para Construcción en Chile | PCG",
  description:
    "Digitaliza tu gestión de SSO. Cumple con el DS44, genera tu PPR y gestiona la IPER con enfoque de género. PCG es el software para prevencionistas en Chile.",
};

export default function SoftwarePrevencionRiesgosPage() {
    const router = useRouter();

    const beneficios = [
        {
            icon: FileText,
            title: "Trazabilidad Documental Completa",
            description: "Cada documento, desde la IPER hasta el registro de una charla, queda centralizado y vinculado. Se acabaron las auditorías buscando papeles en carpetas."
        },
        {
            icon: ShieldCheck,
            title: "Cumplimiento Normativo Simplificado",
            description: "PCG está diseñado en torno a la normativa chilena, incluyendo el DS44 y sus exigencias de enfoque de género, asegurando que tu gestión esté siempre al día."
        },
        {
            icon: Clock,
            title: "Reducción de Carga Administrativa",
            description: "Automatiza la generación del Programa de Prevención (PPR) y la recopilación de firmas, liberando al equipo de prevención para que esté en terreno y no detrás de un escritorio."
        },
        {
            icon: GanttChartSquare,
            title: "Continuidad Operacional",
            description: "Un sistema de prevención ordenado evita paralizaciones por incumplimiento y asegura que solo personal autorizado y acreditado ingrese y opere en faena."
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
                    <Badge variant="secondary" className="mb-4">Solución para Prevención y SSO</Badge>
                    <h1 className="text-4xl font-bold tracking-tight text-primary">
                        Software de Prevención de Riesgos para Construcción en Chile
                    </h1>
                    <p className="mt-4 text-lg max-w-3xl mx-auto text-muted-foreground">
                        Deja atrás el papel y las planillas Excel. Digitaliza, automatiza y centraliza tu Sistema de Gestión de Seguridad y Salud en el Trabajo (SGSST) para cumplir con la normativa y proteger a tu equipo.
                    </p>
                </div>
            </header>

            <main className="space-y-16">
                <section>
                    <Card className="bg-slate-50 border-dashed">
                        <CardHeader>
                            <CardTitle className="text-center text-xl text-slate-800">¿Tu gestión de prevención sigue dependiendo de carpetas físicas y planillas?</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                            <div className="space-y-2">
                                <FileWarning className="mx-auto h-10 w-10 text-amber-500" />
                                <h3 className="font-semibold">Información Descentralizada</h3>
                                <p className="text-sm text-muted-foreground">La matriz IPER está en un Excel, las charlas en una carpeta, los registros de incidentes en otra. Es imposible tener una visión global del estado de la seguridad en la obra.</p>
                            </div>
                             <div className="space-y-2">
                                <ShieldCheck className="mx-auto h-10 w-10 text-red-500" />
                                <h3 className="font-semibold">Riesgo de Incumplimiento</h3>
                                <p className="text-sm text-muted-foreground">Generar el Programa de Prevención (PPR) es un proceso manual y tedioso. Cumplir con las exigencias del DS44, como el enfoque de género, se vuelve una tarea titánica y propensa a errores.</p>
                            </div>
                             <div className="space-y-2">
                                <Clock className="mx-auto h-10 w-10 text-blue-500" />
                                <h3 className="font-semibold">Pérdida de Horas en Terreno</h3>
                                <p className="text-sm text-muted-foreground">El tiempo del prevencionista es valioso. Perderlo en tareas administrativas, buscando firmas o transcribiendo datos, es un costo directo para la seguridad y la productividad de la obra.</p>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                <section className="text-center">
                    <h2 className="text-3xl font-bold">La Normativa Chilena Exige una Gestión Integrada</h2>
                    <p className="mt-3 text-muted-foreground max-w-3xl mx-auto">
                        La legislación actual, incluyendo el DS44, no solo pide documentos aislados, sino un sistema de gestión coherente donde las acciones estén conectadas. Esto implica tener un control claro sobre:
                    </p>
                    <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="p-4 bg-muted/50 rounded-lg"><strong>Programa de Prevención</strong> (PPR) actualizado y basado en riesgos reales.</div>
                        <div className="p-4 bg-muted/50 rounded-lg"><strong>Matriz IPER</strong> que identifique todos los peligros y evalúe riesgos, incluyendo un enfoque de género.</div>
                        <div className="p-4 bg-muted/50 rounded-lg"><strong>Charlas y Capacitaciones</strong> que respondan directamente a los riesgos identificados en la IPER.</div>
                        <div className="p-4 bg-muted/50 rounded-lg"><strong>Registro y control</strong> de toda la documentación de personal y subcontratistas (DS44).</div>
                    </div>
                </section>

                <section>
                    <h2 className="text-3xl font-bold text-center">PCG Digitaliza tu Sistema de Gestión de Seguridad</h2>
                    <p className="mt-3 text-muted-foreground max-w-2xl mx-auto text-center">
                        PCG conecta todos los elementos de la prevención de riesgos en un flujo de trabajo lógico y automatizado.
                    </p>
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</div>
                                <div>
                                    <h4 className="font-semibold">Matriz IPER con Enfoque de Género</h4>
                                    <p className="text-sm text-muted-foreground">Registra tareas, peligros y evalúa riesgos de forma diferenciada para hombres y mujeres. El sistema calcula automáticamente el nivel de riesgo inherente y residual.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</div>
                                <div>
                                    <h4 className="font-semibold">Programa de Prevención (PPR) Automatizado</h4>
                                    <p className="text-sm text-muted-foreground">PCG genera el documento PPR de la obra automáticamente, extrayendo la información registrada en la IPER, el plan de capacitación y la organización de la obra. Se acabaron los "copy-paste".</p>
                                </div>
                            </div>
                        </div>
                         <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</div>
                                <div>
                                    <h4 className="font-semibold">Checklists y Formularios Digitales</h4>
                                    <p className="text-sm text-muted-foreground">Digitaliza tus inspecciones, registros de incidentes y hallazgos en terreno. Captura evidencia fotográfica y firmas digitales directamente desde el celular, con o sin conexión.</p>
                                </div>
                            </div>
                             <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">4</div>
                                <div>
                                    <h4 className="font-semibold">Cumplimiento DS44 Integrado</h4>
                                    <p className="text-sm text-muted-foreground">Gestiona la documentación de tus empresas subcontratistas y el ciclo de vida de cada trabajador, asegurando que solo personal autorizado y con sus documentos al día ingrese a faena.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="text-3xl font-bold text-center">Beneficios Operativos y Legales</h2>
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
                     <h2 className="text-2xl font-bold">La Prevención de Riesgos es Continuidad Operacional</h2>
                     <p className="mt-3 max-w-3xl mx-auto text-muted-foreground">
                        Una gestión de seguridad proactiva y ordenada no es un costo, es una inversión que protege lo más valioso: tu equipo y la continuidad de tu proyecto. Evitar una paralización por incumplimiento o un accidente grave tiene un retorno incalculable.
                    </p>
                </section>

                 <section className="text-center pt-8">
                    <h2 className="text-3xl font-bold">Deja de Administrar Papeles. Empieza a Prevenir Riesgos.</h2>
                    <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                        Descubre cómo PCG puede transformar el área de prevención de tu constructora, dándote más tiempo para estar en terreno y menos tiempo detrás de un escritorio.
                    </p>
                    <div className="mt-6">
                        <Button size="lg" asChild>
                             <a href="mailto:paulo@ipsconstruccion.cl?subject=Solicitud%20de%20Demo%20de%20PCG%20(Prevención%20de%20Riesgos)">Agendar una Demo Personalizada</a>
                        </Button>
                    </div>
                </section>
            </main>
        </div>
    );
}
