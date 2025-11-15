// src/app/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useInView, useAnimation, animate } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Building, CheckCircle, ChevronRight, DollarSign, GanttChartSquare, HardHat, PieChart, ShieldCheck, Users, Zap } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
    {children}
  </Link>
);

const FeatureCard = ({ icon, title, description }: { icon: React.ElementType, title: string, description: string }) => {
  const Icon = icon;
  return (
    <Card className="text-center">
      <CardHeader>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="mt-4 text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  );
};


const StepCard = ({ step, title, description }: { step: string, title: string, description: string }) => (
  <div className="flex">
    <div className="flex flex-col items-center mr-4">
      <div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary text-primary">
          <span className="font-bold">{step}</span>
        </div>
      </div>
      <div className="w-px h-full bg-primary/20"></div>
    </div>
    <div className="pb-8">
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
);


const ModuleCard = ({ icon, title, description, href }: { icon: React.ElementType, title: string, description: string, href: string }) => {
  const Icon = icon;
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full">
                <Icon className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" asChild>
          <Link href={href}>Ver módulo <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

const AnimatedMetric = ({ value, suffix, text }: { value: number; suffix: string; text: string }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const controls = useAnimation();
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isInView) {
      controls.start({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5 }
      });
      const animation = animate(0, value, {
        duration: 2,
        ease: "easeOut",
        onUpdate: (latest) => {
          setDisplayValue(Math.round(latest));
        }
      });
      return () => animation.stop();
    }
  }, [isInView, value, controls]);
  
  return (
    <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={controls}
    >
      <p className="text-5xl font-bold">{displayValue}{suffix}</p>
      <p className="mt-2 text-primary-foreground/80">{text}</p>
    </motion.div>
  );
};

const AnimatedPlatformMockup = () => {
    const ref = React.useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { 
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };
    
    const itemVariants = {
        hidden: { opacity: 0, y: 20, scale: 0.95 },
        visible: { opacity: 1, y: 0, scale: 1 }
    };

    return (
        <motion.div 
            ref={ref}
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="relative grid grid-cols-3 grid-rows-3 gap-3 md:gap-4 w-full max-w-4xl h-64 md:h-96 rounded-xl border-2 border-primary/20 bg-slate-900 shadow-2xl shadow-primary/10 p-3 md:p-4"
        >
            {/* Top Bar */}
            <div className="absolute top-2 left-2 md:top-4 md:left-4 flex gap-1.5">
                <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-red-500"></div>
                <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-yellow-400"></div>
                <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-green-500"></div>
            </div>

            {/* Main Dashboard Card */}
            <motion.div variants={itemVariants} className="col-span-2 row-span-2 rounded-lg bg-slate-800/80 p-2 md:p-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs md:text-sm font-bold text-white">Avance de Obra</h4>
                  <p className="text-[10px] md:text-xs text-slate-400">Edificio Los Álamos</p>
                </div>
                 <div className="w-full h-8 md:h-12 bg-slate-700/50 rounded-md flex items-center p-1 md:p-2">
                    <div className="w-3/4 h-full bg-blue-500/50 rounded"></div>
                 </div>
            </motion.div>

            {/* Side Card 1 */}
            <motion.div variants={itemVariants} className="col-span-1 row-span-1 rounded-lg bg-slate-800/80 p-2 md:p-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 md:w-6 md:h-6 text-green-400 shrink-0" />
                <div>
                    <h5 className="text-[10px] md:text-xs font-semibold text-white">Seguridad</h5>
                    <p className="text-[10px] text-slate-400">0 Incidentes</p>
                </div>
            </motion.div>
            
            {/* Side Card 2 */}
            <motion.div variants={itemVariants} className="col-span-1 row-span-1 rounded-lg bg-slate-800/80 p-2 md:p-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 md:w-6 md:h-6 text-yellow-400 shrink-0" />
                <div>
                    <h5 className="text-[10px] md:text-xs font-semibold text-white">Costos</h5>
                    <p className="text-[10px] text-slate-400">+2%</p>
                </div>
            </motion.div>

            {/* Bottom Card */}
             <motion.div variants={itemVariants} className="col-span-3 row-span-1 rounded-lg bg-slate-800/80 p-2 md:p-4 flex flex-col">
                <h4 className="text-xs md:text-sm font-bold text-white">Programación</h4>
                <div className="flex-grow w-full h-px bg-slate-700/50 rounded-full mt-2 relative">
                    <div className="absolute top-0 left-[10%] w-1/4 h-full bg-indigo-500/70 rounded-full"></div>
                    <div className="absolute top-0 left-[40%] w-1/3 h-full bg-purple-500/70 rounded-full"></div>
                </div>
             </motion.div>
        </motion.div>
    );
};


export default function WelcomePage() {
  return (
    <div className="bg-slate-50 text-foreground">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="#" className="font-bold text-lg text-primary">PCG</Link>
              <nav className="hidden md:flex gap-6">
                <NavLink href="#">Producto</NavLink>
                <NavLink href="#">Módulos</NavLink>
                <NavLink href="#">Precios</NavLink>
                <NavLink href="#">Recursos</NavLink>
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild><Link href="/login/usuario">Ingresar</Link></Button>
              <Button>Agendar Demo</Button>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="py-20 md:py-32">
          <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 text-center">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter text-primary">
                    PCG: Una obra bien gestionada, una cadena completa alineada.
                </h1>
                <p className="mt-6 text-lg md:text-xl text-muted-foreground">
                    PCG es la plataforma de control y gestión diseñada para constructoras que necesitan alinear presupuesto, programación, calidad y prevención de riesgos en una sola vista.
                </p>
            </div>
            <div className="mt-8 flex justify-center gap-4">
              <Button size="lg">Ver demo en 3 minutos</Button>
              <Button size="lg" variant="outline">Hablar con un experto</Button>
            </div>
            <div className="mt-12 md:mt-16 flex justify-center">
              <AnimatedPlatformMockup />
            </div>
          </div>
        </section>
        
        {/* Social Proof */}
        <section className="py-16">
            <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 text-center">
                <p className="text-sm font-semibold text-muted-foreground tracking-wider uppercase">
                    Confían en nosotros para gestionar sus proyectos
                </p>
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 items-center">
                    <div className="h-8 w-full bg-gray-300 rounded-md animate-pulse"></div>
                    <div className="h-8 w-full bg-gray-300 rounded-md animate-pulse"></div>
                    <div className="h-8 w-full bg-gray-300 rounded-md animate-pulse"></div>
                    <div className="h-8 w-full bg-gray-300 rounded-md animate-pulse"></div>
                    <div className="h-8 w-full bg-gray-300 rounded-md animate-pulse hidden lg:block"></div>
                </div>
            </div>
        </section>


        {/* Why ERP is not enough */}
        <section className="py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold tracking-tight">¿Por qué un ERP genérico no sirve en obra?</h2>
              <p className="mt-4 text-muted-foreground">
                Las obras tienen una dinámica que los sistemas de gestión tradicionales no entienden. Necesitas una herramienta construida para el terreno, no para la oficina.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
              <FeatureCard icon={HardHat} title="La obra es dinámica" description="El plan cambia. PCG te permite ajustar la programación y ver el impacto en tiempo real en costos y plazos, algo imposible en un sistema rígido." />
              <FeatureCard icon={Users} title="Todos deben estar conectados" description="Desde el jefe de obra hasta el prevencionista y el cliente. PCG centraliza la información para que las decisiones se tomen con datos, no con suposiciones." />
              <FeatureCard icon={DollarSign} title="El costo se controla en terreno" description="Cada avance de obra es un costo. PCG conecta el progreso físico con el presupuesto, dándote control financiero real día a día." />
            </div>
          </div>
        </section>

        {/* How PCG works */}
        <section className="py-20">
          <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold tracking-tight">Cómo PCG ordena tu operación</h2>
              <p className="mt-4 text-muted-foreground">En 4 simples pasos, pasas del caos de planillas y correos a un flujo de trabajo ordenado y centralizado.</p>
            </div>
            <div className="mt-12 max-w-md mx-auto">
              <StepCard step="1" title="Crea tu obra" description="Define los datos maestros del proyecto: mandante, plazos, responsables y dirección." />
              <StepCard step="2" title="Carga tu presupuesto" description="Importa tus APU o créalos en PCG. El sistema los conecta automáticamente a la programación." />
              <StepCard step="3" title="Programa las actividades" description="Define la ruta crítica y las duraciones. El sistema genera la Curva S y el flujo de caja proyectado." />
              <StepCard step="4" title="Calidad y Prevención" description="Registra avances, controla la calidad con protocolos y gestiona la prevención de riesgos desde un solo lugar." />
            </div>
          </div>
        </section>

        {/* Modules Section */}
        <section className="py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold tracking-tight">Un módulo para cada necesidad de la obra</h2>
              <p className="mt-4 text-muted-foreground">PCG está diseñado modularmente para que puedas enfocarte en lo que más importa, con la certeza de que toda la información está conectada.</p>
            </div>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <ModuleCard icon={HardHat} title="Obras" description="Gestión central de tus proyectos. Define datos maestros, clientes y responsables." href="/obras" />
              <ModuleCard icon={DollarSign} title="Presupuestos" description="Administra tu catálogo de precios, crea y duplica presupuestos detallados por obra." href="/operaciones/presupuestos" />
              <ModuleCard icon={GanttChartSquare} title="Programación" description="Define actividades, plazos y recursos. Registra avances y visualiza la Curva S." href="/operaciones/programacion" />
              <ModuleCard icon={CheckCircle} title="Calidad" description="Define y aplica protocolos de calidad en terreno, asociando evidencia fotográfica y no conformidades." href="#" />
              <ModuleCard icon={ShieldCheck} title="Prevención de Riesgos" description="Gestiona IPER, incidentes, charlas y documentación de seguridad (DS44)." href="/prevencion" />
              <ModuleCard icon={Users} title="Portal Cliente" description="Dale a tu cliente una visión transparente del avance de su proyecto, con reportes y fotos." href="/cliente" />
            </div>
          </div>
        </section>

        {/* Who is it for */}
        <section className="py-20">
          <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold tracking-tight">Para cada rol en la obra</h2>
              <p className="mt-4 text-muted-foreground">PCG entrega la información que cada profesional necesita, en el formato que le sirve.</p>
            </div>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card>
                <CardHeader><CardTitle>Gerencia / Directorio</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">Visibilidad completa del margen, avance y riesgos de todos los proyectos en un solo dashboard.</p></CardContent>
              </Card>
               <Card>
                <CardHeader><CardTitle>Jefes de Obra / Administradores</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">Control diario del avance físico vs. el programado y el presupuestado, con reportes automáticos.</p></CardContent>
              </Card>
               <Card>
                <CardHeader><CardTitle>Prevencionistas de Riesgos</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">Gestión digital de formularios, cumplimiento del DS44 y seguimiento de planes de acción desde el celular.</p></CardContent>
              </Card>
               <Card>
                <CardHeader><CardTitle>Mandantes / Clientes</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">Acceso a un portal exclusivo para ver el progreso real de su inversión con fotos y reportes claros.</p></CardContent>
              </Card>
            </div>
          </div>
        </section>
        
        {/* Metrics */}
        <section className="py-20 bg-primary text-primary-foreground">
            <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                    <AnimatedMetric value={30} suffix="%" text="Menos tiempo en reportes manuales" />
                    <AnimatedMetric value={15} suffix="%" text="Mejora en la precisión del control de costos" />
                    <AnimatedMetric value={99} suffix="%" text="Trazabilidad en la gestión de calidad y seguridad" />
                </div>
            </div>
        </section>

        {/* Testimonial */}
        <section className="py-20 bg-white">
            <div className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8 text-center">
                <Avatar className="w-20 h-20 mx-auto mb-4">
                    <AvatarImage src="https://picsum.photos/seed/101/100/100" />
                    <AvatarFallback>EP</AvatarFallback>
                </Avatar>
                <blockquote className="text-xl italic text-foreground">
                    "PCG cambió la forma en que gestionamos nuestras obras. Pasamos de un desorden de planillas a tener una fuente única de verdad. Además nuestro cliente también puede interactuar con nosotros en la plataforma."
                </blockquote>
                <p className="mt-4 font-semibold">Erick Pizarro</p>
                <p className="text-sm text-muted-foreground">Gerente General IPS Construcción</p>
            </div>
        </section>
        
        {/* Final CTA */}
        <section className="py-20">
             <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 text-center">
                <h2 className="text-3xl font-bold tracking-tight">¿Listo para tomar el control de tus obras?</h2>
                <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
                    Deja de adivinar y empieza a gestionar con datos. Agenda una demostración y descubre cómo PCG puede transformar tu operación.
                </p>
                 <div className="mt-8 flex justify-center gap-4">
                    <Button size="lg">Agendar demo</Button>
                    <Button size="lg" variant="outline">Explorar el producto</Button>
                </div>
            </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
           <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div>
                    <h3 className="font-semibold">Producto</h3>
                    <ul className="mt-4 space-y-2 text-sm">
                        <li><Link href="#" className="text-muted-foreground hover:text-primary">Módulos</Link></li>
                        <li><Link href="#" className="text-muted-foreground hover:text-primary">Precios</Link></li>
                        <li><Link href="#" className="text-muted-foreground hover:text-primary">Seguridad</Link></li>
                    </ul>
                </div>
                 <div>
                    <h3 className="font-semibold">Recursos</h3>
                    <ul className="mt-4 space-y-2 text-sm">
                        <li><Link href="#" className="text-muted-foreground hover:text-primary">Blog</Link></li>
                        <li><Link href="#" className="text-muted-foreground hover:text-primary">Casos de Éxito</Link></li>
                        <li><Link href="#" className="text-muted-foreground hover:text-primary">Soporte</Link></li>
                    </ul>
                </div>
                 <div>
                    <h3 className="font-semibold">Compañía</h3>
                    <ul className="mt-4 space-y-2 text-sm">
                        <li><Link href="#" className="text-muted-foreground hover:text-primary">Sobre nosotros</Link></li>
                        <li><Link href="#" className="text-muted-foreground hover:text-primary">Contacto</Link></li>
                    </ul>
                </div>
                <div>
                    <h3 className="font-semibold">Legal</h3>
                    <ul className="mt-4 space-y-2 text-sm">
                        <li><Link href="#" className="text-muted-foreground hover:text-primary">Términos de servicio</Link></li>
                        <li><Link href="#" className="text-muted-foreground hover:text-primary">Política de privacidad</Link></li>
                    </ul>
                </div>
           </div>
           <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
                <p>&copy; {new Date().getFullYear()} PCG 2.0. Todos los derechos reservados.</p>
           </div>
        </div>
      </footer>
    </div>
  );
}
