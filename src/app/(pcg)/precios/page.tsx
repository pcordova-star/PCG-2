// src/app/(pcg)/precios/page.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, GanttChartSquare, HardHat, ShieldCheck, Sparkles, DollarSign, ListChecks, BookCopy, Users, BrainCircuit } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const PriceCard = ({ title, price, description, features, icon: Icon, isFeatured = false }: { title: string, price: string, description: string, features: string[], icon: React.ElementType, isFeatured?: boolean }) => (
    <Card className={`flex flex-col ${isFeatured ? 'border-primary shadow-lg' : ''}`}>
        <CardHeader className="items-center text-center">
            <div className={`p-4 rounded-full bg-primary/10 mb-4`}>
                <Icon className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
            <div className="text-center mb-6">
                <span className="text-4xl font-bold">{price}</span>
                <span className="text-muted-foreground"> UF/mes + IVA</span>
            </div>
            <ul className="space-y-2 text-sm">
                {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                        <Check className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                    </li>
                ))}
            </ul>
        </CardContent>
        <CardFooter>
            <Button className="w-full" variant={isFeatured ? 'default' : 'outline'}>Contratar Plan</Button>
        </CardFooter>
    </Card>
);

const PremiumModuleCard = ({ title, price, description, icon: Icon }: { title: string, price: string, description: string, icon: React.ElementType }) => (
    <Card>
        <CardHeader className="flex-row items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full">
                <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
                <CardTitle className="text-lg">{title}</CardTitle>
                <CardDescription className="text-xs">{description}</CardDescription>
            </div>
        </CardHeader>
        <CardFooter className="flex justify-end items-center gap-4">
            <div className="text-right">
                <span className="text-2xl font-bold">{price}</span>
                <span className="text-sm text-muted-foreground"> UF/mes</span>
            </div>
            <Button size="sm">Añadir</Button>
        </CardFooter>
    </Card>
);


export default function PreciosPage() {
    const router = useRouter();

    const planesBase = [
        {
            title: "Plan Operaciones",
            price: "6,5",
            description: "La base para gestionar tus obras de principio a fin.",
            icon: GanttChartSquare,
            features: [
                "Gestión de Obras Ilimitadas",
                "Itemizados y Presupuestos",
                "Programación de Obra (Gantt y Curva S)",
                "Generación de Estados de Pago",
                "Requerimientos de Información (RDI)",
                "Usuarios ilimitados",
            ]
        },
        {
            title: "Plan Prevención de Riesgos",
            price: "6,5",
            description: "Digitaliza y automatiza todo el sistema de gestión de seguridad.",
            icon: ShieldCheck,
            isFeatured: true,
            features: [
                "Dashboard de Prevención (KPIs)",
                "Generación de Programa de Prevención (PPR)",
                "Gestión de Empresas Contratistas (DS44)",
                "Ingreso de Personal y Documentación (DS44)",
                "Investigación de Incidentes y Accidentes (IPER)",
                "Checklists de Seguridad",
            ]
        }
    ];
    
    const modulosPremium = [
        { title: "Cumplimiento Legal (MCLP)", description: "Gestiona la documentación mensual de subcontratistas.", icon: ShieldCheck },
        { title: "Checklists Operacionales", description: "Crea y gestiona checklists para calidad y protocolos.", icon: ListChecks },
        { title: "Control Documental (ISO)", description: "Administra documentos corporativos y por proyecto.", icon: BookCopy },
        { title: "Control de Acceso (QR)", description: "Portal de inducción QR para visitas y proveedores.", icon: Users },
        { title: "Análisis de Planos (IA)", description: "Cubicaciones de referencia usando IA.", icon: BrainCircuit },
        { title: "Comparación de Planos (IA)", description: "Detecta diferencias e impactos entre versiones.", icon: Sparkles },
    ];

    return (
        <div className="space-y-12">
            <header className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-4xl font-bold font-headline tracking-tight">Planes y Precios</h1>
                    <p className="mt-2 text-lg text-muted-foreground">
                        Elige el plan que se adapte a tus necesidades. Todos nuestros planes incluyen usuarios ilimitados.
                    </p>
                </div>
            </header>

            <section>
                <h2 className="text-3xl font-bold text-center mb-8">Planes Base</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {planesBase.map((plan) => <PriceCard key={plan.title} {...plan} />)}
                </div>
            </section>
            
            <section>
                <h2 className="text-3xl font-bold text-center mb-8">Módulos Premium Adicionales</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    {modulosPremium.map(mod => <PremiumModuleCard key={mod.title} {...mod} price="1,5" />)}
                </div>
            </section>

        </div>
    );
}
