// src/app/(pcg)/software-estados-de-pago-construccion/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, CheckCircle, FileWarning, Clock, GanttChartSquare, DollarSign, RefreshCw, Link as LinkIcon, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

export const metadata = {
  title: "Software para Estados de Pago en Construcción | PCG Chile",
  description:
    "Automatiza la generación de Estados de Pago (EDP) conectando el avance físico real con tu presupuesto. Reduce errores, ahorra tiempo y asegura la precisión financiera de tus obras con PCG.",
};

export default function EstadosDePagoPage() {
    const router = useRouter();

    const problemasComunes = [
        {
            icon: Clock,
            title: "Desfase entre Avance Físico y Financiero",
            description: "El avance que se reporta en terreno no coincide con el que se cobra, generando discrepancias que retrasan la aprobación y el pago."
        },
        {
            icon: FileWarning,
            title: "Errores de Traspaso Manual",
            description: "Copiar y pegar datos desde la programación (Project/Excel) a la planilla de EDP es una fuente constante de errores humanos que distorsionan el valor real."
        },
        {
            icon: RefreshCw,
            title: "Cálculos que no Cuadran",
            description: "Ajustes por obras extras, retenciones o anticipos convierten la planilla de cálculo en un laberinto propenso a fallas, afectando la confianza del mandante."
        }
    ];

    const beneficios = [
        {
            icon: DollarSign,
            title: "Precisión Financiera Total",
            description: "El estado de pago refleja exactamente el costo del avance real medido en terreno, eliminando errores de cálculo y suposiciones."
        },
        {
            icon: Clock,
            title: "Ahorro de Horas Administrativas",
            description: "Reduce drásticamente el tiempo que el Administrador de Contrato o Jefe de Obra dedica a preparar, revisar y corregir planillas de EDP."
        },
        {
            icon: CheckCircle,
            title: "Aprobaciones Más Rápidas",
            description: "Un EDP claro, trazable y respaldado por datos de la plataforma genera confianza en la ITO y el mandante, agilizando el ciclo de revisión y pago."
        },
        {
            icon: GanttChartSquare,
            title: "Visibilidad Gerencial",
            description: "Obtén una visión clara y en tiempo real del flujo de caja, el costo real vs. presupuestado y el margen del proyecto, basado en datos y no en estimaciones."
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
                    <Badge variant="secondary" className="mb-4">Módulo de Operaciones y Finanzas</Badge>
                    <h1 className="text-4xl font-bold tracking-tight text-primary">
                        Software para Generar Estados de Pago en Obras de Construcción
                    </h1>
                    <p className="mt-4 text-lg max-w-3xl mx-auto text-muted-foreground">
                        Deja de perder tiempo y dinero con planillas de cálculo. Conecta el avance físico real de tu obra con el presupuesto y automatiza la generación de Estados de Pago (EDP) precisos y confiables.
                    </p>
                </div>
            </header>

            <main className="space-y-16">
                <section>
                    <Card className="bg-slate-50 border-dashed">
                        <CardHeader>
                            <CardTitle className="text-center text-xl text-slate-800">¿Por qué los Estados de Pago fallan en obra?</CardTitle>
                             <CardDescription className="text-center">El proceso manual es el eslabón débil entre la operación en terreno y las finanzas del proyecto.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                            {problemasComunes.map((p, i) => (
                                <div className="space-y-2" key={i}>
                                    <p.icon className="mx-auto h-10 w-10 text-amber-500" />
                                    <h3 className="font-semibold">{p.title}</h3>
                                    <p className="text-sm text-muted-foreground">{p.description}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </section>

                <section className="text-center">
                    <h2 className="text-3xl font-bold">La Solución: Conectar Programación, Presupuesto y Avance Real</h2>
                    <p className="mt-3 text-muted-foreground max-w-3xl mx-auto">
                        PCG elimina el trabajo manual y los errores al integrar los tres pilares del control de proyectos en un flujo de trabajo automatizado.
                    </p>
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">1</div>
                            <div>
                                <h4 className="font-semibold">Todo nace en el Presupuesto</h4>
                                <p className="text-sm text-muted-foreground">Tu itemizado con precios unitarios es la base. Cada partida se convierte en una actividad programable.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">2</div>
                            <div>
                                <h4 className="font-semibold">El Avance se Registra en Terreno</h4>
                                <p className="text-sm text-muted-foreground">El supervisor o jefe de obra registra el avance diario (ej: m² de muro, ml de tubería) directamente en la actividad correspondiente desde su celular o computador.</p>
                            </div>
                        </div>
                         <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">3</div>
                            <div>
                                <h4 className="font-semibold">El Estado de Pago se Calcula Solo</h4>
                                <p className="text-sm text-muted-foreground">Con un clic, PCG calcula el monto a cobrar para cada partida, multiplicando el avance real acumulado por el precio unitario del contrato. Sin planillas, sin errores de tipeo.</p>
                            </div>
                        </div>
                    </div>
                </section>

                 <section>
                    <Card className="bg-muted/30">
                        <CardHeader className="items-center text-center">
                            <BookOpen className="h-8 w-8 text-primary"/>
                            <CardTitle>Aprende a Evitar los Errores Clásicos</CardTitle>
                            <CardDescription>Lee nuestro artículo detallado y descubre los 5 errores más comunes en la confección de Estados de Pago y cómo una plataforma digital los previene.</CardDescription>
                        </CardHeader>
                        <CardFooter className="justify-center">
                            <Button asChild>
                                <Link href="/blog/errores-estados-de-pago-construccion">Leer Artículo del Blog</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </section>

                <section>
                    <h2 className="text-3xl font-bold text-center">Beneficios Financieros y Operativos</h2>
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
                     <h2 className="text-2xl font-bold">Un Estado de Pago Preciso es Continuidad Operacional</h2>
                     <p className="mt-3 max-w-3xl mx-auto text-muted-foreground">
                       Cuando el mandante confía en tus números y los subcontratistas reciben sus pagos a tiempo, el proyecto fluye sin interrupciones. Un EDP automatizado y transparente es una de las palancas más efectivas para mejorar la rentabilidad y reducir conflictos en la obra.
                    </p>
                    <Button size="sm" variant="outline" className="mt-4" asChild>
                        <Link href="/control-subcontratistas-ds44">
                            <LinkIcon className="mr-2 h-4 w-4" />
                            Conoce cómo agilizar también la certificación de subcontratistas
                        </Link>
                    </Button>
                </section>

                 <section className="text-center pt-8">
                    <h2 className="text-3xl font-bold">Deja de Pelear con las Planillas. Empieza a Facturar lo Correcto.</h2>
                    <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                        Descubre cómo PCG puede devolverte el control financiero de tus obras, dándote la confianza de que cada estado de pago es un reflejo fiel de tu trabajo.
                    </p>
                    <div className="mt-6">
                        <Button size="lg" asChild>
                             <a href="mailto:paulo@ipsconstruccion.cl?subject=Solicitud%20de%20Demo%20de%20PCG%20(Estados%20de%20Pago)">Agendar una Demo Personalizada</a>
                        </Button>
                    </div>
                </section>
            </main>
        </div>
    );
}
