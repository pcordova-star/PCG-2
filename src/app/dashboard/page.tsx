
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
  MessageSquare,
  TrendingUp,
  DollarSign,
  BrainCircuit,
  FileSignature,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, doc, getDoc, collectionGroup, limit, orderBy } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { Company, Obra, Hallazgo, Rdi, AvanceDiario, Presupuesto } from '@/types/pcg';
import { PcgLogo } from '@/components/branding/PcgLogo';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { QuickAccessCard } from '@/components/dashboard/QuickAccessCard';
import { DisabledModuleCard } from '@/components/dashboard/DisabledModuleCard'; // NUEVO
import { ObraSelectionModal } from '@/components/dashboard/ObraSelectionModal';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

// Definición de tipos para los nuevos items del mural
type ActivityItem = {
  type: 'rdi' | 'avance' | 'edp' | 'hallazgo';
  id: string;
  obraId: string;
  obraNombre: string;
  fecha: Date;
  titulo: string;
  descripcion: string;
  valor?: string;
  estado?: string;
  href: string;
};

// Nuevo componente para las tarjetas de actividad
const ActivityCard = ({ item }: { item: ActivityItem }) => {
  const config = {
    rdi: {
      icon: MessageSquare,
      color: "blue",
    },
    avance: {
      icon: TrendingUp,
      color: "green",
    },
    edp: {
      icon: DollarSign,
      color: "purple",
    },
    hallazgo: {
      icon: Siren,
      color: "orange"
    }
  };

  const Icon = config[item.type].icon;
  const color = config[item.type].color;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-start gap-4 p-4 border-l-4 rounded-r-lg bg-card shadow-sm hover:bg-muted/50"
      style={{ borderColor: `hsl(var(--${color}))` }}
    >
      <div className={`p-2 bg-${color}-100 rounded-full`}>
        <Icon className={`h-6 w-6 text-${color}-600`} />
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-center">
            <p className="font-semibold text-sm">{item.titulo}</p>
            {item.estado && <Badge variant="outline">{item.estado}</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">{item.obraNombre} - {item.fecha.toLocaleDateString('es-CL')}</p>
        <div className="flex justify-between items-end mt-2">
            <p className="text-sm text-muted-foreground">{item.descripcion}</p>
            {item.valor && <p className="text-sm font-bold text-primary">{item.valor}</p>}
        </div>
      </div>
       <Button asChild variant="ghost" size="sm">
            <Link href={item.href}>Ver</Link>
        </Button>
    </motion.div>
  );
};


const allMainModules = [
  {
    id: 'obras',
    title: 'Obras',
    description: 'Crea y gestiona tus proyectos. Asigna datos básicos, clientes y responsables para cada faena.',
    href: '/obras',
    icon: HardHat,
    linkText: 'Gestionar Obras',
    tooltip: 'Punto de partida. Crea y gestiona tus proyectos aquí.',
    roles: ['superadmin', 'admin_empresa', 'jefe_obra', 'prevencionista']
  },
  {
    id: 'presupuestos',
    title: 'Itemizados',
    description: 'Administra tu catálogo de ítems y precios. Crea y duplica itemizados detallados por obra.',
    href: '/operaciones/presupuestos',
    icon: BookCopy,
    linkText: 'Ir a Itemizados',
    tooltip: 'Necesitas crear una obra primero para usar este módulo.',
    roles: ['superadmin', 'admin_empresa', 'jefe_obra']
  },
  {
    id: 'programacion',
    title: 'Programación',
    description: 'Define actividades, plazos y recursos. Registra avances y visualiza la Curva S del proyecto.',
    href: '/operaciones/programacion',
    icon: GanttChartSquare,
    linkText: 'Ir a Programación',
    tooltip: 'Necesitas crear una obra primero para usar este módulo.',
    roles: ['superadmin', 'admin_empresa', 'jefe_obra']
  },
   {
    id: 'estados_de_pago',
    title: 'Estados de Pago',
    description: 'Gestiona y visualiza el avance económico de tus obras en base a los contratos y avances registrados.',
    href: '/operaciones/estados-de-pago',
    icon: DollarSign,
    linkText: 'Ir a Estados de Pago',
    tooltip: 'Necesitas una obra con programación y avances para usar este módulo.',
    roles: ['superadmin', 'admin_empresa', 'jefe_obra']
  },
  {
    id: 'checklists-operacionales',
    title: 'Listas de Chequeo Operacionales',
    description: 'Crea y administra checklists para control de calidad, protocolos de entrega y otros formularios operativos.',
    href: '/checklists-operacionales',
    icon: ListChecks,
    linkText: 'Gestionar Checklists',
    tooltip: 'Define tus formularios de inspección y control de calidad.',
    roles: ['superadmin', 'admin_empresa', 'jefe_obra'],
    featureFlag: 'feature_operational_checklists_enabled'
  },
  {
    id: 'prevencion',
    title: 'Prevención de Riesgos',
    description: 'Gestiona la seguridad: IPER, incidentes, charlas, DS44 y control documental de contratistas.',
    href: '/prevencion',
    icon: ShieldCheck,
    linkText: 'Ir a Prevención',
    roles: ['superadmin', 'admin_empresa', 'jefe_obra', 'prevencionista'],
    featureFlag: 'feature_risk_prevention_enabled'
  },
  {
    id: 'documentos',
    title: 'Control Documental',
    description: 'Administra documentos corporativos y documentos aplicados a cada obra (ISO 9001).',
    href: '/admin/documentos/proyecto',
    icon: BookCopy,
    linkText: 'Ir a Documentos',
    roles: ['superadmin', 'admin_empresa', 'prevencionista'],
    featureFlag: 'feature_document_control_enabled'
  },
  {
    id: 'rdi',
    title: 'Requerimientos (RDI)',
    description: 'Gestiona consultas, solicitudes de información y respuestas con mandantes y subcontratos.',
    href: '/rdi',
    icon: MessageSquare,
    linkText: 'Ir a RDI',
    tooltip: 'Acceso directo a los RDI de tu obra más reciente.',
    roles: ['superadmin', 'admin_empresa', 'jefe_obra']
  },
];

const quickAccessModules = [
    {
        id: 'tour-step-avance-foto',
        title: 'Registro Fotográfico',
        description: 'Formulario rápido para dejar evidencia fotográfica de un hito o avance desde terreno.',
        href: '/operaciones/registro-fotografico',
        icon: Camera,
        color: 'orange' as const,
        roles: ['superadmin', 'admin_empresa', 'jefe_obra', 'prevencionista']
    },
    {
        id: 'analisis-planos',
        title: 'Análisis de Planos (IA)',
        description: 'Carga un plano, selecciona qué cubicar y deja que la IA te entregue una estimación de referencia.',
        href: '/cubicacion/analisis-planos',
        icon: BrainCircuit,
        color: 'blue' as const,
        roles: ['superadmin', 'admin_empresa', 'jefe_obra'],
        featureFlag: 'feature_plan_analysis_enabled'
    },
     {
        id: 'rdi',
        title: 'Requerimientos (RDI)',
        description: 'Crea y gestiona consultas de información (RDI) con mandantes, proyectistas o subcontratos.',
        href: '/rdi',
        icon: MessageSquare,
        color: 'green' as const,
        roles: ['superadmin', 'admin_empresa', 'jefe_obra']
    },
     {
        id: 'cumplimiento-legal',
        title: 'Cumplimiento Legal',
        description: 'Gestiona la documentación mensual de subcontratistas para la aprobación de estados de pago.',
        href: '/cumplimiento',
        icon: ShieldCheck,
        color: 'yellow' as const,
        roles: ['superadmin', 'admin_empresa', 'contratista'],
        featureFlag: 'feature_compliance_module_enabled'
    }
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
  const { user, role, companyId, company, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [hasObras, setHasObras] = useState(false);
  const [obras, setObras] = useState<Obra[]>([]);
  const [muralItems, setMuralItems] = useState<ActivityItem[]>([]);
  const [isObraModalOpen, setIsObraModalOpen] = useState(false);
  const [quickAccessTarget, setQuickAccessTarget] = useState('');

  const isPrevencionista = role === 'prevencionista';
  
  const mainModules = allMainModules.filter(module => {
    if (role === 'none') return false;
    if (!module.roles.includes(role)) return false;
    // No filtramos por feature flag aquí, lo manejamos en el renderizado
    return true;
  });

  const filteredQuickAccessModules = quickAccessModules.map(mod => {
    return mod;
  }).filter(module => {
    if (role === 'none') return false;
    if (!module.roles.includes(role)) return false;
    // No filtramos por feature flag aquí
    return true;
  });


  useEffect(() => {
    async function fetchDashboardData() {
        if (!user || !companyId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const isSuperAdmin = role === 'superadmin';

        try {
            
            const obrasRef = collection(firebaseDb, 'obras');
            const qObrasConstraints = isSuperAdmin ? [] : [where('empresaId', '==', companyId)];
            const obrasQuery = query(obrasRef, ...qObrasConstraints);
            const obrasSnap = await getDocs(obrasQuery);
            const obrasList = obrasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra));
            setObras(obrasList);
            setHasObras(obrasList.length > 0);
            const obrasIds = obrasList.map(doc => doc.id);
            const obrasMap = new Map(obrasList.map(o => [o.id, o.nombreFaena]));

            if (obrasIds.length === 0) {
                setMuralItems([]);
                setLoading(false);
                return;
            }
            
            const canUseInQuery = obrasIds.length > 0 && obrasIds.length <= 30;

            if (isPrevencionista) {
                const hallazgosQuery = canUseInQuery
                  ? query(collectionGroup(firebaseDb, 'hallazgos'), where('obraId', 'in', obrasIds), orderBy('createdAt', 'desc'), limit(5))
                  : query(collectionGroup(firebaseDb, 'hallazgos'), orderBy('createdAt', 'desc'), limit(10));
                
                const hallazgosSnap = await getDocs(hallazgosQuery);
                const hallazgosItems: ActivityItem[] = hallazgosSnap.docs
                    .map(d => ({ id: d.id, ...d.data() } as Hallazgo))
                    .filter(h => obrasIds.includes(h.obraId))
                    .map(h => ({
                        type: 'hallazgo', id: h.id!, obraId: h.obraId, obraNombre: obrasMap.get(h.obraId) || 'Obra desconocida',
                        fecha: h.createdAt.toDate(), titulo: `Hallazgo: ${h.tipoRiesgo}`, descripcion: h.descripcion,
                        estado: h.estado, href: `/prevencion/hallazgos/detalle/${h.id}`
                    }));

                setMuralItems(hallazgosItems);

            } else {
                const rdiQuery = canUseInQuery
                  ? query(collectionGroup(firebaseDb, 'rdi'), where('obraId', 'in', obrasIds), orderBy('createdAt', 'desc'), limit(3))
                  : query(collectionGroup(firebaseDb, 'rdi'), orderBy('createdAt', 'desc'), limit(10));

                const avancesQuery = canUseInQuery
                  ? query(collectionGroup(firebaseDb, 'avancesDiarios'), where('obraId', 'in', obrasIds), orderBy('fecha', 'desc'), limit(3))
                  : query(collectionGroup(firebaseDb, 'avancesDiarios'), orderBy('fecha', 'desc'), limit(10));

                const edpQuery = canUseInQuery
                  ? query(collectionGroup(firebaseDb, 'estadosDePago'), where('obraId', 'in', obrasIds), orderBy('creadoEn', 'desc'), limit(2))
                  : query(collectionGroup(firebaseDb, 'estadosDePago'), orderBy('creadoEn', 'desc'), limit(5));

                const [rdiSnap, avancesSnap, edpSnap] = await Promise.all([
                    getDocs(rdiQuery),
                    getDocs(avancesQuery),
                    getDocs(edpQuery)
                ]);

                let rdiItems: ActivityItem[] = rdiSnap.docs
                  .map(d => ({ id: d.id, ...d.data() } as Rdi))
                  .filter(rdi => obrasIds.includes(rdi.obraId))
                  .map(rdi => ({
                        type: 'rdi', id: rdi.id, obraId: rdi.obraId, obraNombre: obrasMap.get(rdi.obraId) || 'Obra desconocida',
                        fecha: rdi.createdAt.toDate(), titulo: `RDI: ${rdi.correlativo}`, descripcion: rdi.titulo,
                        estado: rdi.estado, href: `/rdi/${rdi.obraId}/${rdi.id}`
                    }));

                let avanceItems: ActivityItem[] = avancesSnap.docs
                  .map(d => ({ id: d.id, ...d.data() } as AvanceDiario))
                  .filter(avance => obrasIds.includes(avance.obraId))
                  .map(avance => ({
                        type: 'avance', id: avance.id, obraId: avance.obraId, obraNombre: obrasMap.get(avance.obraId) || 'Obra desconocida',
                        fecha: avance.fecha.toDate(), titulo: `Avance Diario`, descripcion: avance.comentario || 'Registro de avance.',
                        valor: `${avance.porcentajeAvance?.toFixed(1) || 0}%`, href: `/operaciones/programacion?obraId=${avance.obraId}`
                    }));
                
                let edpItems: ActivityItem[] = edpSnap.docs
                  .map(d => ({ id: d.id, ...d.data() } as any))
                  .filter(edp => obrasIds.includes(edp.obraId))
                  .map(edp => ({
                        type: 'edp', id: edp.id, obraId: edp.obraId, obraNombre: obrasMap.get(edp.obraId) || 'Obra desconocida',
                        fecha: edp.creadoEn.toDate(), titulo: `Estado de Pago`, descripcion: `Correlativo EDP-${String(edp.correlativo).padStart(3, '0')}`,
                        valor: edp.total.toLocaleString('es-CL', {style: 'currency', currency: 'CLP'}), href: `/operaciones/estados-de-pago?obraId=${edp.obraId}`
                    }));

                const allItems = [...rdiItems, ...avanceItems, ...edpItems];
                allItems.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
                setMuralItems(allItems.slice(0, 5));
            }

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            setMuralItems([]);
        } finally {
            setLoading(false);
        }
    }

    if (!authLoading && user) {
        fetchDashboardData();
    }
  }, [user, role, companyId, authLoading, isPrevencionista]);
  
  const handleQuickAccessClick = (target: string) => {
    if (['/rdi', '/cubicacion/analisis-planos', '/cumplimiento'].includes(target)) {
        router.push(target);
        return;
    }
    if (obras.length === 1) {
        const obraId = obras[0].id;
        const finalTarget = `${target}?obraId=${obraId}`;
        router.push(finalTarget);
    } else {
        setQuickAccessTarget(target);
        setIsObraModalOpen(true);
    }
  }

  const handleObraSelected = (obraId: string) => {
      if (obraId && quickAccessTarget) {
          const finalTarget = `${quickAccessTarget}?obraId=${obraId}`;
          router.push(finalTarget);
      }
      setIsObraModalOpen(false);
  }

  const renderModuleCard = (mod: typeof allMainModules[0]) => {
    const isEnabled = !mod.featureFlag || !!company?.[mod.featureFlag];
    const isPremium = !!mod.featureFlag;

    if (!isEnabled) {
        return <DisabledModuleCard key={mod.id} moduleId={mod.featureFlag!} title={mod.title} description={mod.description} icon={mod.icon} />;
    }

    const isObraCard = mod.title === 'Obras';
    const showTooltip = !isObraCard && !hasObras;
    
    let cardBackgroundColor = 'bg-white';
    if (isPremium) {
        if (mod.id === 'prevencion') cardBackgroundColor = 'bg-slate-50';
    }

    const card = (
         <Card className={cn(
             "rounded-xl border shadow-sm md:hover:shadow-md transition-shadow flex flex-col relative",
             cardBackgroundColor
         )}>
            {isPremium && (
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-primary/10 backdrop-blur-sm text-primary text-xs font-bold px-2 py-1 rounded-full border border-primary/20">
                  <Sparkles className="h-3 w-3" />
                  <span>Premium</span>
                </div>
            )}
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

         {isPrevencionista ? (
             <QuickAccessCard
                  title="Hallazgo de seguridad"
                  description="Registrar condición insegura en terreno"
                  icon={Siren}
                  color="orange"
                  onClick={() => handleQuickAccessClick('/prevencion/hallazgos/crear')}
              />
         ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {filteredQuickAccessModules.map((mod) => {
                    const isEnabled = !mod.featureFlag || !!company?.[mod.featureFlag];
                    const isPremium = !!mod.featureFlag;
                    return isEnabled ? (
                        <QuickAccessCard
                            key={mod.id}
                            title={mod.title}
                            description={mod.description}
                            icon={mod.icon}
                            color={mod.color as any}
                            onClick={() => handleQuickAccessClick(mod.href)}
                            isPremium={isPremium}
                        />
                    ) : (
                        <DisabledModuleCard
                            key={mod.id}
                            moduleId={mod.featureFlag!}
                            title={mod.title}
                            description={mod.description}
                            icon={mod.icon}
                        />
                    );
                })}
            </div>
        )}

          <div>
              <h2 className="text-2xl font-semibold mb-4">Módulos Principales</h2>
              <TooltipProvider delayDuration={100}>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
                      {mainModules.map((mod) => renderModuleCard(mod))}
                  </div>
              </TooltipProvider>
          </div>

        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Newspaper className="h-6 w-6 text-primary"/>
                    <CardTitle>Diario Mural de Actividad</CardTitle>
                </div>
                <CardDescription>Última actividad registrada en tus obras.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                ) : muralItems.length === 0 ? (
                    <div className="text-center py-8 bg-muted/50 rounded-lg">
                        <p className="text-muted-foreground">No hay actividad reciente para mostrar en tus obras.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {muralItems.map(item => <ActivityCard key={item.id} item={item} />)}
                    </div>
                )}
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
