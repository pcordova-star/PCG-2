"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  HardHat,
  ShieldCheck,
  Building,
  ListChecks,
  AlertTriangle,
  BookCopy,
  GanttChartSquare,
  ClipboardPlus,
  Camera,
  Newspaper,
  Siren,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, doc, getDoc, collectionGroup, limit } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { Company, Obra } from '@/types/pcg';
import { PcgLogo } from '@/components/branding/PcgLogo';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { QuickAccessCard } from '@/components/dashboard/QuickAccessCard';
import { ObraSelectionModal } from '@/components/dashboard/ObraSelectionModal';
import { useRouter } from 'next/navigation';

type SummaryData = {
  obrasActivas: number | null;
  tareasEnProgreso: number | null;
  alertasSeguridad: number | null;
};

const allMainModules = [
  {
    id: 'obras',
    title: 'Obras',
    description: 'Crea y gestiona tus proyectos. Asigna datos básicos, clientes y responsables para cada faena.',
    href: '/obras',
    icon: HardHat,
    linkText: 'Gestionar Obras',
    tooltip: 'Punto de partida. Crea y gestiona tus proyectos aquí.'
  },
  {
    id: 'presupuestos',
    title: 'Presupuestos',
    description: 'Administra tu catálogo de ítems y precios. Crea y duplica presupuestos detallados por obra.',
    href: '/operaciones/presupuestos',
    icon: BookCopy,
    linkText: 'Ir a Presupuestos',
    tooltip: 'Necesitas crear una obra primero para usar este módulo.'
  },
  {
    id: 'programacion',
    title: 'Programación',
    description: 'Define actividades, plazos y recursos. Registra avances y visualiza la Curva S del proyecto.',
    href: '/operaciones/programacion',
    icon: GanttChartSquare,
    linkText: 'Ir a Programación',
    tooltip: 'Necesitas crear una obra primero para usar este módulo.'
  },
   {
    id: 'prevencion',
    title: 'Prevención de Riesgos',
    description: 'Gestiona la seguridad: IPER, incidentes, charlas, DS44 y control documental de contratistas.',
    href: '/prevencion',
    icon: ShieldCheck,
    linkText: 'Ir a Prevención'
  }
];

const quickAccessModules = [
    {
        id: 'tour-step-avance-foto',
        title: 'Registro Fotográfico',
        description: 'Formulario rápido para dejar evidencia fotográfica de un hito o avance desde terreno.',
        href: '/operaciones/registro-fotografico',
        icon: Camera,
        color: 'blue' as const,
    },
    {
        id: 'tour-step-avance-cantidad',
        title: 'Registrar Avance por Cantidad',
        description: 'Formulario rápido para registrar cantidades ejecutadas desde tu dispositivo móvil.',
        href: '/operaciones/avance-en-terreno',
        icon: ClipboardPlus,
        color: 'green' as const,
    },
];


function getRoleName(role: string) {
    const roles: Record<string, string> = {
        superadmin: 'Super Administrador',
        admin_empresa: 'Admin de Empresa',
        jefe_obra: 'Jefe de Obra',
        prevencionista: 'Prevencionista de Riesgos',
        cliente: 'Cliente',
        none: 'Sin Rol Asignado'
    };
    return roles[role] || role;
}


export default function DashboardPage() {
  const { user, role, companyId, loading: authLoading } = useAuth();
  const router = useRouter();

  const [summaryData, setSummaryData] = useState<SummaryData>({
    obrasActivas: null,
    tareasEnProgreso: null,
    alertasSeguridad: null,
  });
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasObras, setHasObras] = useState(false);
  const [obras, setObras] = useState<Obra[]>([]);
  const [isObraModalOpen, setIsObraModalOpen] = useState(false);
  const [quickAccessTarget, setQuickAccessTarget] = useState('');

  const isPrevencionista = role === 'prevencionista';

  const mainModules = allMainModules.filter(module => {
    if (isPrevencionista) {
        return module.id === 'obras' || module.id === 'prevencion';
    }
    return true;
  });

  useEffect(() => {
    async function fetchDashboardData() {
        if (!user) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const isSuperAdmin = role === 'superadmin';

        try {
            // 1. Fetch Company Data (if not superadmin)
            if (!isSuperAdmin && companyId) {
                const companyRef = doc(firebaseDb, "companies", companyId);
                const companySnap = await getDoc(companyRef);
                if (companySnap.exists()) {
                    setCompany({ id: companySnap.id, ...companySnap.data() } as Company);
                }
            }
            
            // 1.5 Fetch Obras for selectors
            const obrasRef = collection(firebaseDb, 'obras');
            const qObrasConstraints = isSuperAdmin ? [] : [where('empresaId', '==', companyId)];
            const obrasQuery = query(obrasRef, ...qObrasConstraints);
            const obrasSnap = await getDocs(obrasQuery);
            const obrasList = obrasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra));
            setObras(obrasList);
            setHasObras(obrasList.length > 0);

            // 2. Fetch Summary Data
            const [obrasActivas, tareasEnProgreso, alertasSeguridad] = await Promise.all([
                // Obras Activas
                (async () => {
                    return obrasList.filter(o => o.estado === 'Activa').length;
                })(),
                // Tareas en Progreso
                (async () => {
                    try {
                        if (obrasList.length === 0) return 0;
                
                        const obrasIds = obrasList.map(doc => doc.id);
                        const CHUNK_SIZE = 30;
                        let totalTareas = 0;

                        for (let i = 0; i < obrasIds.length; i += CHUNK_SIZE) {
                            const chunkIds = obrasIds.slice(i, i + CHUNK_SIZE);
                             const q = query(
                                collectionGroup(firebaseDb, 'actividades'), 
                                where('obraId', 'in', chunkIds),
                                where('estado', '!=', 'Completada')
                            );
                            const snapshot = await getDocs(q);
                            totalTareas += snapshot.size;
                        }

                        return totalTareas;

                    } catch (error) {
                        console.warn("Error fetching in-progress tasks:", error);
                        return 0;
                    }
                })(),
                // Alertas de Seguridad
                (async () => {
                    try {
                        const alertasRef = collection(firebaseDb, 'investigacionesIncidentes');
                        const qAlertasConstraints = [where('estadoCierre', '==', 'Abierto')];
                         if (!isSuperAdmin && companyId) {
                            qAlertasConstraints.push(where('empresaId', '==', companyId));
                        }
                        const alertasQuery = query(alertasRef, ...qAlertasConstraints);
                        const alertasSnap = await getDocs(alertasQuery);
                        return alertasSnap.size;
                    } catch (error) {
                        console.warn("Error fetching security alerts:", error);
                        return 0;
                    }
                })()
            ]);
            
            setSummaryData({
              obrasActivas: obrasActivas ?? 0,
              tareasEnProgreso: tareasEnProgreso ?? 0,
              alertasSeguridad: alertasSeguridad ?? 0,
            });

        } catch (error) {
            console.error("Error fetching dashboard summary data:", error);
            setSummaryData({ obrasActivas: 0, tareasEnProgreso: 0, alertasSeguridad: 0 });
        } finally {
            setLoading(false);
        }
    }

    if (!authLoading && user) {
        fetchDashboardData();
    }
  }, [user, role, companyId, authLoading]);
  
  const handleQuickAccessClick = (target: string) => {
    if (obras.length === 1) {
        router.push(`${target}?obraId=${obras[0].id}`);
    } else {
        setQuickAccessTarget(target);
        setIsObraModalOpen(true);
    }
  }

  const handleObraSelected = (obraId: string) => {
      if (obraId && quickAccessTarget) {
          router.push(`${quickAccessTarget}?obraId=${obraId}`);
      }
      setIsObraModalOpen(false);
  }
  
  const summaryCards = [
    {
      id: 'tour-step-obras-activas',
      title: 'Obras Activas',
      value: summaryData.obrasActivas,
      icon: Building,
    },
    {
      id: 'tour-step-tareas-progreso',
      title: 'Tareas en Progreso',
      value: summaryData.tareasEnProgreso,
      icon: ListChecks,
    },
    {
      id: 'tour-step-alertas-seguridad',
      title: 'Alertas de Seguridad',
      value: summaryData.alertasSeguridad,
      icon: AlertTriangle,
    },
  ];

  const renderModuleCard = (mod: typeof allMainModules[0]) => {
    const isObraCard = mod.title === 'Obras';
    const showTooltip = !isObraCard && !hasObras;

    const card = (
         <Card className="rounded-xl border bg-white shadow-sm md:hover:shadow-md transition-shadow flex flex-col">
            <CardHeader>
                <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 bg-primary/10 rounded-full w-fit">
                        <mod.icon className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="font-headline text-2xl">{mod.title}</CardTitle>
                </div>
                <CardDescription className="pt-2">{mod.description}</CardDescription>
            </CardHeader>
            <CardFooter className="mt-auto">
                <Button asChild className="w-full" variant={mod.linkText === 'Próximamente' ? 'secondary' : 'default'} disabled={mod.linkText === 'Próximamente'}>
                    <Link href={mod.href}>{mod.linkText}</Link>
                </Button>
            </CardFooter>
        </Card>
    );

    if (showTooltip) {
      return (
        <Tooltip key={mod.title}>
          <TooltipTrigger asChild>{card}</TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold">{mod.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      );
    }
    
    // El tooltip de "Obras" es siempre útil
    if (isObraCard) {
        return (
             <Tooltip key={mod.title}>
                <TooltipTrigger asChild>{card}</TooltipTrigger>
                <TooltipContent>
                    <p className="font-semibold">{mod.tooltip}</p>
                </TooltipContent>
            </Tooltip>
        );
    }
    
    return <div key={mod.title}>{card}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex flex-col gap-4 md:gap-6 p-4 md:p-6">
        {/* --- CABECERA PERSONALIZADA --- */}
        <header className='rounded-xl border bg-card text-card-foreground shadow-sm p-6'>
            {authLoading || loading ? (
                <div className="space-y-2">
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                </div>
            ) : role === 'superadmin' ? (
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-primary">Panel Super Administrador</h1>
                    <p className="text-muted-foreground mt-1">Bienvenido, {user?.email}. Desde aquí puedes supervisar toda la plataforma PCG.</p>
                </div>
            ) : (
                 <div className="flex items-start gap-4">
                    <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center p-2">
                        <PcgLogo size={70} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-primary">Bienvenido a PCG</h1>
                        <p className="text-muted-foreground mt-1">
                            Estás operando en <strong>{company?.nombreFantasia || company?.razonSocial || 'Mi Empresa'}</strong> como <span className="font-semibold">{getRoleName(role)}</span>.
                        </p>
                         <p className="text-sm text-muted-foreground mt-2">
                           Esta es tu central de operaciones para gestionar obras, presupuestos, seguridad y más.
                        </p>
                    </div>
                </div>
            )}
        </header>

        {/* --- ACCESOS RÁPIDOS --- */}
         {!isPrevencionista && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                {quickAccessModules.map((mod) => (
                    <QuickAccessCard
                        key={mod.id}
                        title={mod.title}
                        description={mod.description}
                        icon={mod.icon}
                        color={mod.color}
                        onClick={() => handleQuickAccessClick(mod.href)}
                    />
                ))}
            </div>
        )}

        {/* Accesos a módulos principales */}
          <div>
              <h2 className="text-2xl font-semibold mb-4">Módulos Principales</h2>
              <TooltipProvider delayDuration={100}>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
                      {mainModules.map((mod) => renderModuleCard(mod))}
                      
                      {/* Para prevencionistas, la tarjeta de acceso rápido a hallazgos se muestra aquí */}
                      {isPrevencionista && (
                         <QuickAccessCard
                              title="Hallazgo de seguridad"
                              description="Registrar condición insegura en terreno"
                              icon={Siren}
                              color="orange"
                              onClick={() => handleQuickAccessClick('/prevencion/hallazgos/crear')}
                          />
                      )}
                  </div>
              </TooltipProvider>
          </div>

        {/* Diario Mural */}
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Newspaper className="h-6 w-6 text-primary"/>
                    <CardTitle>Diario Mural</CardTitle>
                </div>
                <CardDescription>Anuncios importantes, actualizaciones y noticias para todo el equipo.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-center py-8 bg-muted/50 rounded-lg">
                    <p className="text-muted-foreground">Próximamente: Aquí verás las últimas noticias y actualizaciones de la plataforma.</p>
                </div>
            </CardContent>
        </Card>

        <footer className="mt-8 border-t pt-8 text-center text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
                <PcgLogo size={60} />
                <p className="text-sm font-semibold italic">Una obra bien gestionada, una cadena completa alineada.</p>
                <p className="text-xs">&copy; {new Date().getFullYear()} PCG. Todos los derechos reservados.</p>
            </div>
        </footer>

      </div>
      <ObraSelectionModal 
        isOpen={isObraModalOpen}
        onClose={() => setIsObraModalOpen(false)}
        onSelect={handleObraSelected}
        obras={obras}
      />
    </div>
  );
}
