// src/app/(pcg)/precios/page.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, GanttChartSquare, HardHat, ShieldCheck, Sparkles, DollarSign, ListChecks, BookCopy, Users, BrainCircuit, GitCompareArrows, UserCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const PriceCard = ({ title, price, description, features, icon: Icon, isFeatured = false }: { title: string, price: string, description: string, features: { title: string, desc: string }[], icon: React.ElementType, isFeatured?: boolean }) => (
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
            <ul className="space-y-4 text-sm">
                {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                        <Check className="h-4 w-4 mt-1 text-green-500 flex-shrink-0" />
                        <div>
                           <p className="font-semibold">{feature.title}</p>
                           <p className="text-muted-foreground text-xs">{feature.desc}</p>
                        </div>
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
        <CardHeader className="flex-row items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-full mt-1">
                <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
                <CardTitle className="text-lg">{title}</CardTitle>
                <CardDescription className="text-sm mt-1">{description}</CardDescription>
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
            title: "Plan Prevención de Riesgos",
            price: "5,5",
            description: "Digitaliza y automatiza todo el sistema de gestión de seguridad.",
            icon: ShieldCheck,
            isFeatured: false,
            features: [
                 { title: "Dashboard de Prevención", desc: "Panel visual con indicadores clave (KPIs) de accidentabilidad, frecuencia y gravedad para una visión gerencial." },
                 { title: "Programa de Prevención de Riesgos (PPR)", desc: "Genera automáticamente el documento PPR de cada obra, integrando IPER, plan de capacitación y charlas." },
                 { title: "Gestión de Contratistas (DS44)", desc: "Controla el cumplimiento documental de empresas externas y monitorea quiénes están al día para autorizar su ingreso." },
                 { title: "Ingreso de Personal (DS44)", desc: "Administra el ciclo de vida de cada trabajador, desde su registro hasta la verificación de su documentación de seguridad." },
                 { title: "IPER y Gestión de Incidentes", desc: "Registra, investiga y gestiona la matriz IPER con enfoque de género, y documenta incidentes con metodologías como Árbol de Causas o 5 Porqués." },
                 { title: "Checklists de Seguridad", desc: "Digitaliza tus inspecciones de seguridad, crea plantillas personalizadas y registra con fotos y firma digital." },
            ]
        },
        {
            title: "Plan Operaciones",
            price: "7,5",
            description: "La base para gestionar tus obras de principio a fin.",
            icon: GanttChartSquare,
            features: [
                { title: "Gestión de Obras", desc: "Centraliza la información maestra de cada proyecto. Asigna responsables, define mandantes, y adjunta contratos." },
                { title: "Itemizados y Presupuestos", desc: "Crea y administra tu catálogo de APU. Genera itemizados detallados para cada obra para un control de costos estandarizado." },
                { title: "Programación de Obras", desc: "Planifica tu proyecto con un Gantt interactivo, define la ruta crítica y visualiza el avance real vs. el programado con la Curva S." },
                { title: "Generación de Estados de Pago", desc: "Automatiza la creación de informes de avance financiero basados en el progreso físico real registrado en la programación." },
                { title: "Requerimientos de Información (RDI)", desc: "Digitaliza y formaliza la comunicación con mandantes, proyectistas y subcontratos, manteniendo una trazabilidad completa." },
            ]
        },
        {
            title: "Plan Pro",
            price: "10",
            description: "Acceso total. Todos los módulos operativos, de prevención y de IA incluidos.",
            icon: Sparkles,
            isFeatured: true,
            features: [
                { title: "Todo en Plan Operaciones", desc: "Gestión de obras, presupuestos, programación, estados de pago y RDI." },
                { title: "Todo en Plan Prevención", desc: "PPR, DS44 (empresas y personal), IPER, incidentes y checklists de seguridad." },
                { title: "Todos los Módulos Premium", desc: "Incluye Cumplimiento Legal, Checklists Operacionales, Control Documental, Acceso con QR, Análisis y Comparación de Planos con IA." },
                { title: "Soporte Prioritario", desc: "Asistencia preferencial para optimizar el uso de la plataforma." },
            ]
        }
    ];
    
    const modulosPremium = [
        { title: "Cumplimiento Legal (MCLP)", description: "Automatiza la gestión documental laboral de tus subcontratistas. Permite que cada uno suba su información a un portal dedicado para tu revisión y aprobación, clave para liberar sus estados de pago.", icon: ShieldCheck },
        { title: "Checklists Operacionales", description: "Expande el control de calidad más allá de la seguridad. Crea formularios digitales para protocolos de entrega, control de hormigonado, inspección de terminaciones y cualquier otro proceso operativo.", icon: ListChecks },
        { title: "Control Documental (ISO)", description: "Implementa un sistema de gestión documental alineado con ISO 9001. Administra versiones de procedimientos y políticas, y controla su distribución a las obras con registro de recepción.", icon: BookCopy },
        { title: "Control de Acceso (QR)", description: "Ofrece un portal de auto-atención para visitas y proveedores. Al escanear un QR en la entrada, completan una inducción básica de seguridad desde su teléfono, agilizando el acceso.", icon: UserCheck },
        { title: "Análisis de Planos con IA", description: "Sube un plano y recibe una cubicación de referencia generada por Inteligencia Artificial para partidas clave como superficies, m² de muros y losas. Ideal para validaciones rápidas.", icon: BrainCircuit },
        { title: "Comparación de Planos con IA", description: "Detecta automáticamente las diferencias entre dos versiones de un plano, cuantifica el impacto en la cubicación y genera un árbol de consecuencias por especialidad.", icon: GitCompareArrows },
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
                        Elige el plan que se adapte a tus necesidades. Todos nuestros planes incluyen usuarios y obras ilimitadas.
                    </p>
                </div>
            </header>

            <section>
                <h2 className="text-3xl font-bold text-center mb-8">Planes Base</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
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
