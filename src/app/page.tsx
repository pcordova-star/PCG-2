// src/app/page.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, CheckCircle, DollarSign, GanttChartSquare, HardHat, ShieldCheck, Users, Layers, Loader2, BrainCircuit, BarChart, Settings, SlidersHorizontal, ArrowDown, ArrowUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence, useInView, animate } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { firebaseDb } from '@/lib/firebaseClient';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { PcgLogo } from '@/components/branding/PcgLogo';


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
    <Link href={href} className="block group">
        <Card className="flex flex-col h-full transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1">
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
        </Card>
    </Link>
  );
};

const AnimatedPlatformMockup = () => {
    const scenes = [
        // Escena 1: Dashboard
        (
            <motion.div key="scene1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full p-2 md:p-4 grid grid-cols-3 grid-rows-3 gap-2 md:gap-4">
                <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="col-span-3 rounded-lg bg-slate-800/80 p-2 md:p-4">
                    <h3 className="text-xs md:text-sm font-bold text-white">Constructora Los Maitenes</h3>
                    <p className="text-[10px] md:text-xs text-slate-400">Obra: Reposición de Soleras Quinta Avenida</p>
                </motion.div>
                <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="col-span-1 row-span-2 rounded-lg bg-slate-800/80 p-2 md:p-4 flex flex-col justify-center items-center">
                    <Layers className="h-6 w-6 md:h-10 md:w-10 text-blue-400 mb-2"/>
                    <p className="text-white font-bold text-lg md:text-2xl">78%</p>
                    <p className="text-slate-400 text-[10px] md:text-xs text-center">Avance Físico</p>
                </motion.div>
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="col-span-2 row-span-2 rounded-lg bg-slate-800/80 p-2 md:p-4 flex flex-col">
                    <h4 className="text-xs md:text-sm font-bold text-white mb-2">Resumen</h4>
                    <div className="flex-1 grid grid-cols-2 gap-2 text-center">
                        <div className="bg-slate-700/50 rounded-md p-1 md:p-2"><p className="text-[10px] md:text-xs text-slate-300">Seguridad</p><p className="font-bold text-sm md:text-lg text-green-400">95%</p></div>
                        <div className="bg-slate-700/50 rounded-md p-1 md:p-2"><p className="text-[10px] md:text-xs text-slate-300">Costos</p><p className="font-bold text-sm md:text-lg text-yellow-400">102%</p></div>
                        <div className="bg-slate-700/50 rounded-md p-1 md:p-2"><p className="text-[10px] md:text-xs text-slate-300">Calidad</p><p className="font-bold text-sm md:text-lg text-blue-400">88%</p></div>
                        <div className="bg-slate-700/50 rounded-md p-1 md:p-2"><p className="text-[10px] md:text-xs text-slate-300">Plazo</p><p className="font-bold text-sm md:text-lg text-red-400">Atrasado</p></div>
                    </div>
                </motion.div>
            </motion.div>
        ),
        // Escena 2: Gantt
        (
             <motion.div key="scene2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full p-2 md:p-4 flex flex-col gap-2">
                <h3 className="text-xs md:text-sm font-bold text-white px-2">Programación y Avance (Gantt)</h3>
                <div className="flex-1 rounded-lg bg-slate-800/80 p-2 space-y-1.5 md:space-y-2">
                    {/* Simulacion de barras de Gantt */}
                    <div className="w-full h-4 md:h-6 rounded-sm bg-slate-700 flex items-center">
                        <div className="h-full bg-blue-500 rounded-sm" style={{ width: '80%' }}></div>
                    </div>
                    <div className="w-full h-4 md:h-6 rounded-sm bg-slate-700 flex items-center">
                        <div className="h-full bg-blue-500 rounded-sm" style={{ width: '60%', marginLeft: '10%' }}></div>
                    </div>
                    <div className="w-full h-4 md:h-6 rounded-sm bg-slate-700 flex items-center">
                        <div className="h-full bg-blue-500 rounded-sm" style={{ width: '40%', marginLeft: '25%' }}></div>
                    </div>
                     <div className="w-full h-4 md:h-6 rounded-sm bg-slate-700 flex items-center">
                        <div className="h-full bg-slate-500 rounded-sm" style={{ width: '30%', marginLeft: '50%' }}></div>
                    </div>
                </div>
            </motion.div>
        ),
        // Escena 3: Reporte con Foto
        (
            <motion.div key="scene3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full p-2 md:p-4">
                 <div className="w-full h-full rounded-lg bg-slate-800/80 p-2 md:p-4 flex flex-col md:flex-row gap-2 md:gap-4">
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }} className="w-full md:w-1/2 h-1/2 md:h-full rounded-md overflow-hidden relative">
                         <img src="/WhatsApp Image 2025-10-15 at 11.13.21 PM (2).jpeg" alt="Foto de obra" className="absolute inset-0 w-full h-full object-cover" data-ai-hint="construction site" />
                    </motion.div>
                    <div className="flex-1 flex flex-col">
                        <h4 className="text-xs md:text-sm font-bold text-white">Reporte de Avance</h4>
                        <p className="text-[10px] md:text-xs text-slate-400">Fecha: 20/10/2025</p>
                        <div className="mt-2 text-xs md:text-sm text-slate-200 bg-slate-700/50 rounded p-2 flex-1">
                            <p className="font-semibold">Actividad: Instalación de Soleras</p>
                            <p className="mt-1">Se completa la instalación de 50 metros lineales de soleras en el sector norte, cumpliendo con las especificaciones técnicas. Personal y equipo sin incidentes.</p>
                        </div>
                    </div>
                </div>
            </motion.div>
        )
    ];

    const [sceneIndex, setSceneIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setSceneIndex(prevIndex => (prevIndex + 1) % scenes.length);
        }, 5000); // Cambia cada 5 segundos
        return () => clearInterval(interval);
    }, [scenes.length]);


    return (
        <div className="relative w-full max-w-4xl h-64 md:h-96 rounded-xl border-2 border-primary/20 bg-slate-900 shadow-2xl shadow-primary/10 p-2 md:p-4">
            {/* Top Bar */}
            <div className="absolute top-2 left-2 md:top-4 md:left-4 flex gap-1.5 z-10">
                <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-red-500"></div>
                <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-yellow-400"></div>
                <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-green-500"></div>
            </div>
            <div className="w-full h-full rounded-md overflow-hidden">
                <AnimatePresence mode="wait">
                    {scenes[sceneIndex]}
                </AnimatePresence>
            </div>
        </div>
    );
};

const ContactForm = () => {
    const { toast } = useToast();
    const [formData, setFormData] = useState({ name: '', email: '', company: '', message: '' });
    const [isSending, setIsSending] = useState(false);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.message) {
            toast({ variant: 'destructive', title: 'Campos requeridos', description: 'Por favor, complete nombre, email y mensaje.' });
            return;
        }
        setIsSending(true);
        try {
            const mailRef = collection(firebaseDb, 'mail');
            await addDoc(mailRef, {
                to: ['admin@pcg.cl'], // Email del SUPER_ADMIN o de contacto
                message: {
                    subject: `Nuevo Contacto desde la Web: ${formData.name}`,
                    html: `
                        <p><strong>Nombre:</strong> ${formData.name}</p>
                        <p><strong>Email:</strong> ${formData.email}</p>
                        <p><strong>Empresa:</strong> ${formData.company || 'No especificada'}</p>
                        <hr>
                        <p><strong>Mensaje:</strong></p>
                        <p>${formData.message.replace(/\n/g, '<br>')}</p>
                    `,
                },
                createdAt: serverTimestamp(),
            });
            toast({ title: 'Mensaje enviado', description: 'Gracias por contactarnos. Nos pondremos en contacto contigo pronto.' });
            setFormData({ name: '', email: '', company: '', message: '' });
        } catch (error) {
            console.error("Error sending contact form:", error);
            toast({ variant: 'destructive', title: 'Error al enviar', description: 'No se pudo enviar tu mensaje. Inténtalo de nuevo más tarde.' });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Contacto</CardTitle>
                <CardDescription>¿Tienes alguna pregunta? Envíanos un mensaje y te responderemos a la brevedad.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre*</Label>
                            <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email*</Label>
                            <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} required />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="company">Empresa</Label>
                        <Input id="company" name="company" value={formData.company} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="message">Mensaje*</Label>
                        <Textarea id="message" name="message" value={formData.message} onChange={handleInputChange} required />
                    </div>
                    <Button type="submit" disabled={isSending} className="w-full">
                        {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSending ? 'Enviando...' : 'Enviar Mensaje'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}

function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (inView) {
      const controls = animate(0, value, {
        duration: 2,
        onUpdate(latest) {
          setDisplayValue(Math.round(latest));
        }
      });
      return () => controls.stop();
    }
  }, [inView, value]);

  return <span ref={ref}>{displayValue.toLocaleString('es-CL')}</span>;
}

function InteligenciaOperativaSection() {
    const ref = React.useRef(null);
    const inView = useInView(ref, { once: true, amount: 0.3 });

    return (
        <section ref={ref} className="py-20 md:py-28 bg-slate-900 text-white overflow-hidden relative">
            <div className="absolute inset-0 bg-grid-slate-700/[0.05] bg-[bottom_1px_center] animate-grid-pan"></div>
             <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900/80 to-slate-900"></div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
                        PCG está construido sobre la{" "}
                        <span className="relative inline-block">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">IO</span>
                            <motion.span 
                                initial={{ width: 0 }}
                                animate={inView ? { width: '100%' } : {}}
                                transition={{ duration: 0.8, delay: 0.5 }}
                                className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-400 to-indigo-500"
                            />
                        </span>
                        : Inteligencia Operativa.
                    </h2>
                    <p className="mt-6 text-lg text-slate-300">
                        Más de 20 años en terreno nos permitieron diseñar procesos que realmente resuelven los problemas de la operación. 
                        La IA es una herramienta dentro del sistema, pero la IO es el motor que optimiza, ordena y reduce costos en cada operación.
                    </p>
                </motion.div>

                <motion.div
                     initial="hidden"
                     animate={inView ? "visible" : "hidden"}
                     variants={{
                        visible: { transition: { staggerChildren: 0.1 } }
                     }}
                    className="relative rounded-xl border border-blue-500/20 bg-slate-800/50 backdrop-blur-md p-6 shadow-2xl shadow-blue-500/10 before:absolute before:inset-0 before:rounded-xl before:border-t before:border-b before:border-white/10 before:animate-border-y after:absolute after:inset-0 after:rounded-xl after:border-l after:border-r after:border-white/10 after:animate-border-x"
                >
                    <div className="absolute -top-px left-20 right-11 h-px bg-gradient-to-r from-blue-500/0 via-blue-500/40 to-blue-500/0"></div>
                    <div className="absolute -bottom-px left-11 right-20 h-px bg-gradient-to-r from-indigo-500/0 via-indigo-500/40 to-indigo-500/0"></div>
                     <div className="absolute inset-0 w-full h-full bg-scanline-pattern opacity-5 animate-scanline"></div>


                    <div className="grid grid-cols-2 gap-4">
                        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="rounded-lg bg-slate-900/70 p-4">
                            <CardTitle className="text-sm font-semibold text-blue-300 flex items-center gap-2"><ArrowUp/>Operaciones optimizadas (proyección)</CardTitle>
                            <p className="text-3xl font-bold mt-2">+10-<AnimatedNumber value={30} />%</p>
                        </motion.div>
                         <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="rounded-lg bg-slate-900/70 p-4">
                            <CardTitle className="text-sm font-semibold text-blue-300 flex items-center gap-2"><ArrowDown/>Tiempo administrativo (proyección)</CardTitle>
                            <p className="text-3xl font-bold mt-2">−20-<AnimatedNumber value={40} />%</p>
                        </motion.div>
                         <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="rounded-lg bg-slate-900/70 p-4">
                            <CardTitle className="text-sm font-semibold text-blue-300 flex items-center gap-2"><ArrowDown/>Reprocesos evitados (proyección)</CardTitle>
                            <p className="text-3xl font-bold mt-2">−10-<AnimatedNumber value={25} />%</p>
                        </motion.div>
                         <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="rounded-lg bg-slate-900/70 p-4">
                            <CardTitle className="text-sm font-semibold text-blue-300 flex items-center gap-2"><ArrowUp/>Desviaciones detectadas a tiempo (proyección)</CardTitle>
                            <p className="text-3xl font-bold mt-2">+15-<AnimatedNumber value={35} />%</p>
                        </motion.div>
                    </div>
                    <p className="text-xs text-slate-400 mt-4 text-center">Proyecciones referenciales: dependen del nivel de adopción y disciplina de registro.</p>
                </motion.div>
            </div>
        </section>
    );
}

export default function WelcomePage() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(error => {
        console.error("Error trying to play the video:", error);
      });
    }
  }, []);
  
  return (
    <>
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="#" className="font-bold text-lg text-primary">
                <PcgLogo size={100} />
              </Link>
              <nav className="hidden md:flex gap-6">
                <NavLink href="#">Producto</NavLink>
                <NavLink href="#">Módulos</NavLink>
                <NavLink href="#">Precios</NavLink>
                <NavLink href="#">Recursos</NavLink>
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild><Link href="/login/usuario">Ingresar</Link></Button>
              <Button asChild>
                <a href="mailto:paulo@ipsconstruccion.cl?subject=Solicitud%20de%20Demo%20de%20PCG">Agendar Demo</a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative min-h-[70vh] md:min-h-[90vh] w-full flex items-center justify-center text-center text-white overflow-hidden bg-slate-900">
            <video
                ref={videoRef}
                autoPlay
                loop
                muted
                playsInline
                className="absolute z-0 w-auto min-w-full min-h-full max-w-none object-cover"
            >
                <source src="/hero-video.mp4" type="video/mp4" />
                Your browser does not support the video tag.
            </video>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/60 to-transparent z-10"></div>
            <div className="absolute inset-0 bg-black/40 z-10"></div>
            
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="relative z-20 max-w-4xl mx-auto px-4"
            >
                <motion.div
                  className="mb-8 flex justify-center"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.5, type: 'spring', stiffness: 120 }}
                >
                  <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-xl p-6 z-30">
                    <PcgLogo size={120} />
                  </div>
                </motion.div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter text-shadow-lg mt-2">
                    Software de Gestión de Obras para Constructoras en Chile
                </h1>
                <p className="mt-6 text-lg text-primary-foreground/90 max-w-3xl mx-auto">
                    Centraliza operaciones, prevención de riesgos (DS44) y control de subcontratistas en una sola plataforma. Potencia tus proyectos con IA para optimizar costos y plazos.
                </p>
                <div className="mt-8 flex justify-center gap-4">
                <Button size="lg" asChild>
                    <a href="mailto:paulo@ipsconstruccion.cl?subject=Solicitud%20de%20Demo%20de%20PCG">Agendar Demo</a>
                </Button>
                </div>
            </motion.div>
        </section>
        
        <InteligenciaOperativaSection />


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
              <StepCard step="1" title="Crear obra" description="Define los datos maestros del proyecto: mandante, plazos, responsables y dirección." />
              <StepCard step="2" title="Cargar tu presupuesto" description="Importa tus APU o créalos en PCG. El sistema los conecta automáticamente a la programación." />
              <StepCard step="3" title="Programar las actividades" description="Define la ruta crítica y las duraciones. El sistema genera la Curva S y el flujo de caja proyectado." />
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
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <ModuleCard icon={HardHat} title="Gestión de Obras" description="Centraliza toda la información de tus proyectos. Asigna responsables, define datos maestros, gestiona contratos y mantén un registro documental ordenado y accesible desde cualquier lugar." href="/obras" />
              <ModuleCard icon={DollarSign} title="Presupuestos" description="Conecta tus análisis de precios unitarios con la programación y el avance real. Genera presupuestos dinámicos, controla costos y proyecta flujos de caja con precisión." href="/operaciones/presupuestos" />
              <ModuleCard icon={GanttChartSquare} title="Programación" description="Visualiza tu proyecto con una Curva S que compara el avance programado vs. el real. Registra el progreso diario y detecta desviaciones a tiempo para tomar acciones correctivas." href="/operaciones/programacion" />
              <ModuleCard icon={ShieldCheck} title="Prevención de Riesgos" description="Digitaliza la gestión de seguridad. Administra la documentación de contratistas (DS44), realiza inspecciones, registra IPER y gestiona incidentes desde un solo lugar." href="/software-prevencion-riesgos-construccion" />
            </div>
          </div>
        </section>

        {/* Testimonial */}
        <section className="py-20">
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
        
        {/* Final CTA & Contact */}
        <section id="contact" className="py-20">
             <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div className="text-center md:text-left">
                    <h2 className="text-3xl font-bold tracking-tight">¿Listo para tomar el control de tus obras?</h2>
                    <p className="mt-4 text-muted-foreground max-w-xl mx-auto md:mx-0">
                        Deja de adivinar y empieza a gestionar con datos. Agenda una demostración y descubre cómo PCG puede transformar tu operación.
                    </p>
                     <div className="mt-8 flex justify-center md:justify-start gap-4">
                        <Button size="lg" asChild>
                          <a href="mailto:paulo@ipsconstruccion.cl?subject=Solicitud%20de%20Demo%20de%20PCG">Agendar demo</a>
                        </Button>
                        <Button size="lg" variant="outline">Explorar el producto</Button>
                    </div>
                </div>
                <ContactForm />
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
                        <li><Link href="#contact" className="text-muted-foreground hover:text-primary">Contacto</Link></li>
                    </ul>
                </div>
                <div>
                    <h3 className="font-semibold">Legal</h3>
                    <ul className="mt-4 space-y-2 text-sm">
                        <li><Link href="/terminos" className="text-muted-foreground hover:text-primary">Términos de servicio</Link></li>
                        <li><Link href="#" className="text-muted-foreground hover:text-primary">Política de privacidad</Link></li>
                    </ul>
                </div>
           </div>
           <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
                <p>&copy; {new Date().getFullYear()} PCG 2.0. Todos los derechos reservados.</p>
           </div>
        </div>
      </footer>
    </>
  );
}
