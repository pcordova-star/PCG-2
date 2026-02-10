// src/app/(pcg)/precios/page.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, GanttChartSquare, Layers, PackagePlus, Crown, BarChart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, ListChecks } from "lucide-react";


// A new component for add-on modules
const AddonCard = ({ title, price, description, icon: Icon }: { title: string, price: string, description: string, icon: React.ElementType }) => (
    <Card className="bg-slate-50 border-dashed">
        <CardHeader>
            <div className="flex items-center gap-4">
                 <div className="p-3 bg-primary/10 rounded-full">
                    <Icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{title}</CardTitle>
            </div>
             <CardDescription className="pt-2">{description}</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-2xl font-bold text-primary">{price}</p>
        </CardContent>
    </Card>
);

export default function PreciosPage() {
    const router = useRouter();

    const planOperacionesFeatures = [
        "Gestión de Obras",
        "Itemizados y Presupuestos",
        "Programación (Gantt y Curva S)",
        "Generación de Estados de Pago",
        "Requerimientos de Información (RDI)"
    ];

    const preciosBajaComplejidad = [
        { tier: "1 – 5", price: "2,0 UF" },
        { tier: "6 – 20", price: "1,6 UF" },
        { tier: "21 – 50", price: "1,3 UF" },
        { tier: "51 – 80", price: "1,0 UF" },
    ];

    return (
        <div className="space-y-16">
            <header className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-4xl font-bold font-headline tracking-tight">Planes y Precios</h1>
                    <p className="mt-2 text-lg text-muted-foreground">
                        Precios flexibles que se adaptan a la complejidad real de tu operación, no al tamaño de tu empresa.
                    </p>
                </div>
            </header>

            {/* Main Plans */}
            <section>
                <h2 className="text-3xl font-bold text-center mb-8">Planes por Complejidad Operativa</h2>
                 <div className="max-w-xs mx-auto text-center mb-12">
                     <p className="text-sm p-2 bg-yellow-100 border border-yellow-200 rounded-md text-yellow-800">
                        Una obra se considera de <strong>Baja Complejidad</strong> con hasta 50 partidas en su itemizado principal, y de <strong>Alta Complejidad</strong> si supera las 50 partidas.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {/* Plan Obras de Baja Complejidad */}
                    <Card className="flex flex-col">
                        <CardHeader>
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-primary/10 rounded-full"><Layers className="h-8 w-8 text-primary"/></div>
                                <CardTitle className="text-2xl">Obras de Baja Complejidad</CardTitle>
                            </div>
                            <CardDescription>Ideal para constructoras con múltiples proyectos simultáneos de menor escala, como mantenciones o remodelaciones.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                             <p className="font-semibold mb-2">Plan Operaciones (Base):</p>
                             <ul className="space-y-2 text-sm mb-6">
                                {planOperacionesFeatures.map((feature) => (
                                    <li key={feature} className="flex items-center gap-2 text-muted-foreground"><Check className="h-4 w-4 text-green-500" />{feature}</li>
                                ))}
                            </ul>
                            <p className="font-semibold mb-2">Precios por volumen (por obra / mes):</p>
                            <Table>
                                <TableHeader><TableRow><TableHead>Rango de Obras</TableHead><TableHead className="text-right">Precio Unitario</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {preciosBajaComplejidad.map((tier) => (
                                        <TableRow key={tier.tier}>
                                            <TableCell>{tier.tier}</TableCell>
                                            <TableCell className="text-right font-bold">{tier.price}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                        <CardFooter>
                            <Button asChild className="w-full"><a href="mailto:paulo@ipsconstruccion.cl?subject=Consulta%20sobre%20Plan%20de%20Baja%20Complejidad">Contactar para Contratar</a></Button>
                        </CardFooter>
                    </Card>

                    {/* Plan Obras de Alta Complejidad */}
                     <Card className="flex flex-col border-primary shadow-lg ring-2 ring-primary/50">
                        <CardHeader>
                           <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-primary/10 rounded-full"><GanttChartSquare className="h-8 w-8 text-primary"/></div>
                                <CardTitle className="text-2xl">Obras de Alta Complejidad</CardTitle>
                            </div>
                            <CardDescription>Para proyectos de mayor envergadura con más de 50 partidas, que requieren un control detallado.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                             <p className="font-semibold mb-2">Plan Operaciones (Base):</p>
                             <ul className="space-y-2 text-sm mb-6">
                                {planOperacionesFeatures.map((feature) => (
                                    <li key={feature} className="flex items-center gap-2 text-muted-foreground"><Check className="h-4 w-4 text-green-500" />{feature}</li>
                                ))}
                            </ul>
                            <div className="text-center my-8">
                                <span className="text-5xl font-bold tracking-tight">4,0</span>
                                <span className="text-muted-foreground"> UF / mes por obra</span>
                            </div>
                            <p className="text-xs text-center text-muted-foreground">Este precio es fijo y no aplica descuento por volumen. Cada obra de alta complejidad se factura individualmente.</p>
                        </CardContent>
                         <CardFooter>
                            <Button asChild className="w-full"><a href="mailto:paulo@ipsconstruccion.cl?subject=Consulta%20sobre%20Plan%20de%20Alta%20Complejidad">Contactar para Contratar</a></Button>
                        </CardFooter>
                    </Card>
                </div>
            </section>

             {/* Módulos Adicionales */}
            <section>
                <h2 className="text-3xl font-bold text-center mb-8">Potencia tu Plan Base con Módulos Adicionales</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    <AddonCard 
                        title="Prevención, Seguridad y Cumplimiento"
                        price="+35%"
                        description="Añade el módulo de Prevención (PPR, IPER, DS44) y el de Cumplimiento Legal de Subcontratistas (MCLP)."
                        icon={ShieldCheck}
                    />
                     <AddonCard 
                        title="Control y Calidad Operativa"
                        price="+25%"
                        description="Incorpora Checklists Operacionales para protocolos de calidad y Control Documental (ISO)."
                        icon={ListChecks}
                    />
                    <div className="md:col-span-2 lg:col-span-1">
                        <AddonCard 
                            title="Contratación Conjunta"
                            price="+45% (Ahorra 15%)"
                            description="Lleva ambos paquetes de módulos (Prevención y Calidad) con un descuento especial."
                            icon={PackagePlus}
                        />
                    </div>
                </div>
            </section>
            
            {/* Planes Especiales */}
            <section>
                 <h2 className="text-3xl font-bold text-center mb-8">Planes Especiales</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-full"><Crown className="h-6 w-6 text-primary"/></div>
                                <CardTitle>Plan Enterprise</CardTitle>
                            </div>
                            <CardDescription>Para constructoras que gestionan más de 80 obras de baja complejidad.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <ul className="space-y-2 text-sm text-muted-foreground">
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" />Obras de baja complejidad ilimitadas.</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" />Todos los módulos adicionales incluidos.</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" />Módulos de IA con política de uso justo.</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" />SLA y soporte prioritario.</li>
                            </ul>
                            <p className="text-xs mt-4">Las obras de alta complejidad se facturan por separado según su tarifa.</p>
                        </CardContent>
                        <CardFooter><Button className="w-full" variant="outline">Consultar Precio Enterprise</Button></CardFooter>
                    </Card>
                    <Card>
                        <CardHeader>
                             <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-full"><BarChart className="h-6 w-6 text-primary"/></div>
                                <CardTitle>Dashboard Ejecutivo</CardTitle>
                            </div>
                            <CardDescription>Un panel de control para la alta dirección con una vista consolidada de los KPIs de las obras asignadas.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="text-center my-4">
                                <span className="text-4xl font-bold tracking-tight">0,75</span>
                                <span className="text-muted-foreground"> UF / mes por usuario</span>
                            </div>
                        </CardContent>
                         <CardFooter><Button className="w-full" variant="outline">Habilitar Dashboard</Button></CardFooter>
                    </Card>
                </div>
            </section>
        </div>
    );
}
