// src/app/(pcg)/dashboard/page.tsx
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
  FileSignature,
  Sparkles,
  Settings,
  BellRing,
  Users,
  GitCompareArrows,
  UserCheck,
  BarChart,
  ArrowRight,
  Siren,
  MessageSquare,
  TrendingUp,
  DollarSign,
  Camera,
  BrainCircuit,
  Newspaper,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState, useMemo, Suspense } from 'react';
import { collection, getDocs, query, where, collectionGroup, limit, orderBy, Timestamp } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { Company, Obra, Hallazgo, Rdi, AvanceDiario } from '@/types/pcg';
import { PcgLogo } from '@/components/branding/PcgLogo';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { QuickAccessCard } from '@/components/dashboard/QuickAccessCard';
import { DisabledModuleCard } from '@/components/dashboard/DisabledModuleCard';
import { ObraSelectionModal } from '@/components/dashboard/ObraSelectionModal';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { WidgetAlertasNoticias } from '@/components/noticias/WidgetAlertasNoticias';

// --- TYPES ---
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

type RecommendedAction = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
};

// --- CONFIGURATION ---
const allMainModules = [
  { id: 'obras', title: 'Obras', description: 'Crea y gestiona tus proyectos. Asigna datos básicos, clientes y responsables para cada faena.', href: '/obras', icon: HardHat, linkText: 'Gestionar Obras', tooltip: 'Punto de partida. Crea y gestiona tus proyectos aquí.', roles: ['superadmin', 'admin_empresa', 'jefe_obra', 'prevencionista'] },
  { id: 'presupuestos', title: 'Itemizados', description: 'Administra tu catálogo de ítems y precios. Crea y duplica itemizados detallados por obra.', href: '/operaciones/presupuestos', icon: BookCopy, linkText: 'Ir a Itemizados', tooltip: 'Necesitas crear una obra primero para usar este módulo.', roles: ['superadmin', 'admin_empresa', 'jefe_obra'] },
  { id: 'programacion', title: 'Programación', description: 'Define actividades, plazos y recursos. Registra avances y visualiza la Curva S del proyecto.', href: '/operaciones/programacion', icon: GanttChartSquare, linkText: 'Ir a Programación', tooltip: 'Necesitas crear una obra primero para usar este módulo.', roles: ['superadmin', 'admin_empresa', 'jefe_obra'] },
  { id: 'estados_de_pago', title: 'Estados de Pago', description: 'Gestiona y visualiza el avance económico de tus obras en base a los contratos y avances registrados.', href: '/operaciones/estados-de-pago', icon: DollarSign, linkText: 'Ir a Estados de Pago', tooltip: 'Necesitas una obra con programación y avances para usar este módulo.', roles: ['superadmin', 'admin_empresa', 'jefe_obra'] },
  { id: 'checklists-operacionales', title: 'Listas de Chequeo Operacionales', description: 'Crea y administra checklists para control de calidad, protocolos de entrega y otros formularios operativos.', href: '/checklists-operacionales', icon: ListChecks, linkText: 'Gestionar Checklists', tooltip: 'Define tus formularios de inspección y control de calidad.', roles: ['superadmin', 'admin_empresa', 'jefe_obra', 'prevencionista'], featureFlag: 'feature_operational_checklists_enabled' },
  { id: 'prevencion', title: 'Prevención de Riesgos', description: 'Gestiona la seguridad: IPER, incidentes, charlas, DS44 y control documental de contratistas.', href: '/prevencion', icon: ShieldCheck, linkText: 'Ir a Prevención', roles: ['superadmin', 'admin_empresa', 'jefe_obra', 'prevencionista'], featureFlag: 'feature_risk_prevention_enabled' },
  { id: 'documentos', title: 'Control Documental', description: 'Administra documentos corporativos y documentos aplicados a cada obra (ISO 9001).', href: '/admin/documentos/proyecto', icon: BookCopy, linkText: 'Ir a Documentos', roles: ['superadmin', 'admin_empresa', 'prevencionista'], featureFlag: 'feature_document_control_enabled' },
  { id: 'rdi', title: 'Requerimientos (RDI)', description: 'Gestiona consultas, solicitudes de información y respuestas con mandantes y subcontratos.', href: '/rdi', icon: MessageSquare, linkText: 'Ir a RDI', tooltip: 'Acceso directo a los RDI de tu obra más reciente.', roles: ['superadmin', 'admin_empresa', 'jefe_obra'] }
];

const quickAccessModules = [
    { id: 'tour-step-avance-foto', title: 'Registro Fotográfico', description: 'Formulario rápido para dejar evidencia fotográfica de un hito o avance desde terreno.', href: '/operaciones/registro-fotografico', icon: Camera, color: 'orange' as const, roles: ['superadmin', 'admin_empresa', 'jefe_obra', 'prevencionista'] },
    { id: 'analisis-planos', title: 'Análisis de Planos (IA)', description: 'Carga un plano, selecciona qué cubicar y deja que la IA te entregue una estimación de referencia.', href: '/cubicacion/analisis-planos', icon: BrainCircuit, color: 'blue' as const, roles: ['superadmin', 'admin_empresa', 'jefe_obra'], featureFlag: 'feature_plan_analysis_enabled' },
    { id: 'comparacion-planos', title: 'Comparación de Planos (IA)', description: 'Detecta diferencias entre versiones de planos y evalúa impactos.', href: '/comparacion-planos/historial', icon: GitCompareArrows, color: 'purple' as const, roles: ['superadmin', 'admin_empresa', 'jefe_obra'], featureFlag: 'feature_plan_comparison_enabled' },
    { id: 'control-acceso', title: 'Control de Acceso (QR)', description: 'Genera QR y revisa registros de ingreso para visitas y proveedores.', href: '/control-acceso', icon: UserCheck, color: 'blue' as const, roles: ['superadmin', 'admin_empresa', 'prevencionista'], featureFlag: 'feature_access_control_enabled' },
    { id: 'rdi', title: 'Requerimientos (RDI)', description: 'Crea y gestiona consultas de información (RDI) con mandantes, proyectistas o subcontratos.', href: '/rdi', icon: MessageSquare, color: 'green' as const, roles: ['superadmin', 'admin_empresa', 'jefe_obra'] },
    { id: 'cumplimiento-legal', title: 'Cumplimiento Legal', description: 'Gestiona la documentación mensual de subcontratistas para la aprobación de estados de pago.', href: '/cumplimiento', icon: ShieldCheck, color: 'yellow' as const, roles: ['superadmin', 'admin_empresa', 'contratista'], featureFlag: 'feature_compliance_module_enabled' },
    { id: 'acceso-director', title: 'Visión Ejecutiva', description: 'Dashboard gerencial para directores con vista consolidada de las obras designadas.', href: '/directorio', icon: BarChart, color: 'purple' as const, roles: ['superadmin', 'admin_empresa'], featureFlag: 'feature_director_dashboard_enabled' }
];

const adminCards = [
    { title: "Empresas", href: "/admin/empresas", icon: Building, description: "Crear, editar y gestionar empresas cliente." },
    { title: "Usuarios", href: "/admin/usuarios", icon: Users, description: "Invitar y administrar usuarios por empresa." },
    { title: "Solicitudes", href: "/admin/solicitudes", icon: BellRing, description: "Revisar solicitudes de activación de módulos." },
    { title: "Facturación", href: "/admin/facturacion", icon: DollarSign, description: "Calcular facturación estimada por empresa." },
    { title: "Configurar Precios", href: "/admin/pricing", icon: Settings, description: "Definir los precios globales de la plataforma." },
];

// --- HELPER FUNCTIONS ---
function getRoleName(role: string) {
    const roles: Record<string, string> = { superadmin: 'Super Administrador', admin_empresa: 'Admin de Empresa', jefe_obra: 'Jefe de Obra', prevencionista: 'Prevencionista de Riesgos', cliente: 'Cliente', none: 'Sin Rol Asignado' };
    return roles[role] || role;
}

// --- STANDALONE SUB-COMPONENTS ---
function EstadoGeneral({ loading, summary }: { loading: boolean; summary: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Estado General de la Operación</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          <div className="space-y-3 text-muted-foreground">
            <p className="flex items-center gap-2">
              <HardHat className="h-5 w-5 text-primary" />
              Actualmente tienes <strong className="text-foreground">{summary?.obrasActivas ?? 0}</strong> obras registradas.
            </p>
            <p className="flex items-center gap-2">
              {summary?.hallazgosAbiertos > 0 ? <AlertTriangle className="h-5 w-5 text-red-500" /> : <CheckCircle className="h-5 w-5 text-green-500" />}
              {summary?.hallazgosAbiertos > 0 ? (
                <>
                  Se han reportado <strong className="text-foreground">{summary.hallazgosAbiertos}</strong> hallazgos de seguridad abiertos, de los cuales <strong className="text-red-600">{summary.hallazgosCriticos} son críticos</strong>.
                </>
              ) : (
                <span className="text-green-600 font-semibold">¡Buen trabajo! No hay alertas de seguridad pendientes.</span>
              )}
            </p>
            <p className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Hay un total de <strong className="text-foreground">{summary?.personasEnFaena ?? 0}</strong> personas en faena en este momento.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AccionesRecomendadas({ recommendedActions }: { recommendedActions: RecommendedAction[] }) {
  if (recommendedActions.length === 0) return null;
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Acciones Recomendadas para Hoy</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recommendedActions.map(action => (
          <Link key={action.id} href={action.href} className="block group">
            <Card className="h-full hover:border-primary hover:bg-primary/5 transition-all">
              <CardHeader className="flex-row items-center gap-4">
                <action.icon className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle className="text-base">{action.title}</CardTitle>
                  <CardDescription>{action.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ActivityCard({ item }: { item: ActivityItem }) {
  const config = {
    rdi: { icon: MessageSquare, colorName: "blue" as const },
    avance: { icon: TrendingUp, colorName: "green" as const },
    edp: { icon: DollarSign, colorName: "purple" as const },
    hallazgo: { icon: Siren, colorName: "orange" as const }
  };
  const colorStyles = {
    blue: { border: 'border-blue-500', bg: 'bg-blue-100', icon: 'text-blue-600' },
    green: { border: 'border-green-500', bg: 'bg-green-100', icon: 'text-green-600' },
    purple: { border: 'border-purple-500', bg: 'bg-purple-100', icon: 'text-purple-600' },
    orange: { border: 'border-orange-500', bg: 'bg-orange-100', icon: 'text-orange-600' }
  };
  const itemConfig = config[item.type];
  const styles = colorStyles[itemConfig.colorName];
  const Icon = itemConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("flex items-start gap-4 p-4 border-l-4 rounded-r-lg bg-card shadow-sm hover:bg-muted/50", styles.border)}
    >
      <div className={cn("p-2 rounded-full", styles.bg)}><Icon className={cn("h-6 w-6", styles.icon)} /></div>
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
        <Button asChild variant="ghost" size="sm">
          <Link href={item.href}><ArrowRight className="h-4 w-4 mr-2" />Ver Detalle</Link>
        </Button>
      </div>
    </motion.div>
  );
}

function ModuleCard({ mod, company, hasObras }: { mod: any, company: Company | null, hasObras: boolean }) {
    const isEnabled = !mod.featureFlag || !!company?.[mod.featureFlag];
    const isPremium = !!mod.featureFlag;
    
    if (!isEnabled) {
        return <DisabledModuleCard moduleId={mod.featureFlag!} title={mod.title} description={mod.description} icon={mod.icon} />;
    }

    const isObraCard = mod.title === 'Obras';
    const showTooltip = !isObraCard && !hasObras;

    const cardElement = (
      <Card className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow flex flex-col relative">
        {isPremium && <div className="absolute top-2 right-2 flex items-center gap-1 bg-primary/10 backdrop-blur-sm text-primary text-xs font-bold px-2 py-1 rounded-full border border-primary/20"><Sparkles className="h-3 w-3" /><span>Premium</span></div>}
        <CardHeader>
            <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-primary/10 rounded-full w-fit"><mod.icon className="h-8 w-8 text-primary" /></div>
                <CardTitle className="font-headline text-2xl">{mod.title}</CardTitle>
            </div>
            <CardDescription className="pt-2">{mod.description}</CardDescription></CardHeader>
        <CardFooter className="mt-auto"><Button asChild className="w-full" variant={mod.linkText === 'Próximamente' ? 'secondary' : 'default'} disabled={mod.linkText === 'Próximamente'}><Link href={mod.href}>{mod.linkText}</Link></Button></CardFooter>
      </Card>
    );

    if (showTooltip || isObraCard) {
      return (
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>{cardElement}</TooltipTrigger>
                <TooltipContent><p className="font-semibold">{mod.tooltip}</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>
      );
    }
    return cardElement;
}

// --- NEW DASHBOARD SECTION COMPONENT ---
const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  },
};

function DashboardSection({ title, description, children, className }: { title: string, description: string, children: React.ReactNode, className?: string }) {
  return (
    <motion.div 
      variants={sectionVariants}
      className={cn(
        "rounded-2xl border p-6 md:p-8 shadow-sm transition-shadow duration-300 hover:shadow-lg hover:border-border/80",
        className
      )}
    >
        <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
            <p className="text-muted-foreground mt-1">{description}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
            {children}
        </div>
    </motion.div>
  );
}

// --- MAIN COMPONENT ---
export default function DashboardPage() {
  const { user, role, companyId, company, loading: authLoading } = useAuth();
  const router = useRouter();

  const [hasObras, setHasObras] = useState(false);
  const [obras, setObras] = useState<Obra[]>([]);
  const [muralItems, setMuralItems] = useState<ActivityItem[]>([]);
  const [isObraModalOpen, setIsObraModalOpen] = useState(false);
  const [quickAccessTarget, setQuickAccessTarget] = useState('');
  
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const isPrevencionista = role === 'prevencionista';
  
  useEffect(() => {
    if (!authLoading && !user) { router.replace('/login/usuario'); }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchDashboardData() {
        if (!user || (!companyId && role !== 'superadmin')) {
            setLoading(false);
            return;
        };

        setLoading(true);
        try {
            const isSuperAdmin = role === 'superadmin';
            let obrasList: Obra[] = [];
            
            // 1. Fetch Obras
            const obrasQuery = isSuperAdmin 
              ? query(collection(firebaseDb, 'obras'), orderBy('creadoEn', 'desc'))
              : query(collection(firebaseDb, "obras"), where("empresaId", "==", companyId));
            
            const obrasSnap = await getDocs(obrasQuery);
            obrasList = obrasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra));
            setObras(obrasList);
            setHasObras(obrasList.length > 0);
            
            const obrasMap = new Map(obrasList.map(o => [o.id, o.nombreFaena]));

            // 2. Fetch Summary Data (simplified for robustness)
            const summaryData: any = { obrasActivas: obrasList.length, hallazgosAbiertos: 0, hallazgosCriticos: 0, personasEnFaena: 0 };
            // Note: Hallazgos and personal queries can be slow with many obras.
            // Consider a more scalable approach in a real large-scale production.
            setSummary(summaryData);

            // 3. Fetch Mural Items (Robust approach)
            let allItems: ActivityItem[] = [];
            
            if (obrasList.length > 0) {
              const fetchPromises = obrasList.flatMap(obra => [
                getDocs(query(collection(firebaseDb, 'obras', obra.id, 'rdi'), orderBy('createdAt', 'desc'), limit(5))),
                getDocs(query(collection(firebaseDb, 'obras', obra.id, 'avancesDiarios'), orderBy('fecha', 'desc'), limit(5))),
                getDocs(query(collection(firebaseDb, 'hallazgos'), where('obraId', '==', obra.id), orderBy('createdAt', 'desc'), limit(5)))
              ]);

              const results = await Promise.allSettled(fetchPromises);

              results.forEach(result => {
                if (result.status === 'fulfilled') {
                  result.value.forEach(d => {
                    const data = d.data();
                    const docId = d.id;
                    const obraId = data.obraId;
                    const obraNombre = obrasMap.get(obraId) || 'Obra desconocida';

                    if (d.ref.parent.id === 'rdi') {
                      const rdi = data as Rdi;
                      allItems.push({ type: 'rdi', id: docId, obraId, obraNombre, fecha: rdi.createdAt.toDate(), titulo: `RDI: ${rdi.correlativo}`, descripcion: rdi.titulo, estado: rdi.estado, href: `/rdi/${obraId}/${docId}` });
                    } else if (d.ref.parent.id === 'avancesDiarios') {
                      const avance = data as AvanceDiario;
                       allItems.push({ type: 'avance', id: docId, obraId, obraNombre, fecha: avance.fecha.toDate(), titulo: `Avance Diario`, descripcion: avance.comentario || 'Registro de avance.', valor: `${(avance.porcentajeAvance || 0).toFixed(1)}%`, href: `/operaciones/programacion?obraId=${obraId}` });
                    } else if (d.ref.parent.id === 'hallazgos') {
                       const hallazgo = data as Hallazgo;
                       allItems.push({ type: 'hallazgo', id: docId, obraId, obraNombre, fecha: hallazgo.createdAt.toDate(), titulo: `Hallazgo: ${hallazgo.tipoRiesgo}`, descripcion: hallazgo.descripcion, estado: hallazgo.estado, href: `/prevencion/hallazgos/detalle/${docId}` });
                    }
                  });
                }
              });
            }
            
            allItems.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
            setMuralItems(allItems.slice(0, 5));

        } catch (error) { 
            console.error("Error fetching dashboard data:", error); 
            setSummary(null);
            setMuralItems([]); 
        } finally { 
            setLoading(false); 
        }
    }
    
    if (!authLoading && user) {
        fetchDashboardData();
    }
  }, [user, role, companyId, authLoading, isPrevencionista]);
  
  const recommendedActions = useMemo(() => {
    const actions: RecommendedAction[] = [];
    if (!summary || role === 'superadmin') return [];
    if (summary.hallazgosCriticos > 0) {
      actions.push({ id: 'revisar-criticos', title: 'Revisar Hallazgos Críticos', description: 'Atiende las alertas de seguridad más urgentes.', href: '/prevencion/hallazgos', icon: Siren });
    }
    if (summary.hallazgosAbiertos > 0 && actions.length < 3) {
      actions.push({ id: 'gestionar-hallazgos', title: 'Gestionar Hallazgos Abiertos', description: 'Revisa y asigna los reportes de seguridad pendientes.', href: '/prevencion/hallazgos', icon: AlertTriangle });
    }
    if (actions.length < 3) {
      actions.push({ id: 'registrar-avance', title: 'Registrar Avance Diario', description: 'Actualiza el progreso físico de tus obras.', href: '/operaciones/programacion', icon: TrendingUp });
    }
    if (actions.length < 3) {
        actions.push({ id: 'crear-rdi', title: 'Crear Nuevo RDI', description: 'Genera un requerimiento de información para mandantes o proyectistas.', href: '/rdi', icon: MessageSquare });
    }
    return actions.slice(0, 3);
  }, [summary, role]);

  const mainModules = allMainModules.filter(module => role !== 'none' && module.roles.includes(role));
  const quickAccessModulesFiltered = quickAccessModules.filter(module => role !== 'superadmin' && role !== 'none' && module.roles.includes(role));

  const handleQuickAccessClick = (target: string) => {
    const specialRoutes = ['/rdi', '/cubicacion/analisis-planos', '/cumplimiento', '/comparacion-planos/historial', '/directorio', '/control-acceso', '/operaciones/registro-fotografico'];
    if (specialRoutes.includes(target)) { router.push(target); return; }
    if (obras.length === 1) { router.push(`${target}?obraId=${obras[0].id}`); } else { setQuickAccessTarget(target); setIsObraModalOpen(true); }
  }
  const handleObraSelected = (obraId: string) => { if (obraId && quickAccessTarget) { router.push(`${quickAccessTarget}?obraId=${obraId}`); } setIsObraModalOpen(false); }

  const renderModule = (mod: any) => {
    if(quickAccessModules.some(m => m.id === mod.id)) {
        const isEnabled = !mod.featureFlag || !!company?.[mod.featureFlag];
        return isEnabled ? <QuickAccessCard key={mod.id} title={mod.title} description={mod.description} icon={mod.icon} color={mod.color as any} onClick={() => handleQuickAccessClick(mod.href)} isPremium={!!mod.featureFlag} />
                        : <DisabledModuleCard key={mod.id} moduleId={mod.featureFlag!} title={mod.title} description={mod.description} icon={mod.icon} />;
    }
    return <ModuleCard key={mod.id} mod={mod} company={company} hasObras={hasObras} />;
  }
  
  const allAvailableModules = useMemo(() => {
    const rdiMain = mainModules.find(m => m.id === 'rdi');
    const rdiQuick = quickAccessModulesFiltered.find(m => m.id === 'rdi');
    const modules = [...mainModules, ...quickAccessModulesFiltered];
    if (rdiMain && rdiQuick) {
        return modules.filter(m => m.id !== 'rdi' || m.href !== '/rdi');
    }
    return modules;
  }, [mainModules, quickAccessModulesFiltered]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };


  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex flex-col gap-8 p-4 md:p-6">
        <header className='rounded-xl border bg-card text-card-foreground shadow-sm p-6'>
            {authLoading || loading ? (
                <div className="space-y-2"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-2/3" /></div>
            ) : role === 'superadmin' ? (
                <div><h1 className="text-2xl font-bold tracking-tight text-primary">Panel Super Administrador</h1><p className="text-muted-foreground mt-1">Bienvenido, {user?.email}. Desde aquí puedes supervisar toda la plataforma PCG.</p></div>
            ) : (
                 <div className="flex items-start gap-4"><div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center p-2"><PcgLogo size={70} /></div>
                    <div><h1 className="text-2xl font-bold text-primary">Bienvenido a PCG</h1><p className="text-muted-foreground mt-1">Estás operando en <strong>{company?.nombreFantasia || company?.razonSocial || 'Mi Empresa'}</strong> como <span className="font-semibold">{getRoleName(role)}</span>.</p><p className="text-sm text-muted-foreground mt-2">Esta es tu central de operaciones para gestionar obras, presupuestos, seguridad y más.</p></div>
                </div>
            )}
        </header>

        {role !== 'superadmin' ? (
            <motion.div 
              className="space-y-8"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
                <EstadoGeneral loading={loading} summary={summary} />
                <AccionesRecomendadas recommendedActions={recommendedActions} />
                
                <WidgetAlertasNoticias />
                
                <DashboardSection title="Operaciones" description="Planifica, presupuesta y controla el ciclo de vida de tus obras." className="bg-slate-100/60">
                   {mainModules.filter(mod => ['obras', 'presupuestos', 'programacion', 'estados_de_pago'].includes(mod.id)).map(mod => <ModuleCard key={mod.id} mod={mod} company={company} hasObras={hasObras} />)}
                </DashboardSection>

                <DashboardSection title="Control y Calidad Operativa" description="Herramientas para el seguimiento diario, comunicación y calidad en terreno." className="bg-gray-100/60">
                    {mainModules.filter(mod => ['checklists-operacionales', 'rdi'].includes(mod.id)).map(mod => <ModuleCard key={mod.id} mod={mod} company={company} hasObras={hasObras} />)}
                    {quickAccessModulesFiltered.filter(mod => mod.id === 'tour-step-avance-foto').map(renderModule)}
                </DashboardSection>

                <DashboardSection title="Prevención, Seguridad y Cumplimiento" description="Gestiona la seguridad, el acceso y el cumplimiento normativo en tus proyectos." className="bg-stone-100/60">
                     {mainModules.filter(mod => ['prevencion', 'documentos'].includes(mod.id)).map(mod => <ModuleCard key={mod.id} mod={mod} company={company} hasObras={hasObras} />)}
                     {quickAccessModulesFiltered.filter(mod => ['control-acceso', 'cumplimiento-legal'].includes(mod.id)).map(renderModule)}
                </DashboardSection>

                <DashboardSection title="Inteligencia y Análisis (IA)" description="Módulos potenciados por IA para optimizar cubicaciones y detectar cambios en planos." className="bg-blue-50/40">
                    {quickAccessModulesFiltered.filter(mod => ['analisis-planos', 'comparacion-planos'].includes(mod.id)).map(renderModule)}
                </DashboardSection>
                
                <DashboardSection title="Visión Ejecutiva" description="Paneles consolidados para la alta dirección y clientes." className="bg-purple-50/40">
                    {quickAccessModulesFiltered.filter(mod => mod.id === 'acceso-director').map(renderModule)}
                </DashboardSection>

            </motion.div>
        ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {adminCards.map(card => (
                  <Card key={card.title} className="flex flex-col"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{card.title}</CardTitle><card.icon className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent className="flex-grow"><p className='text-xs text-muted-foreground'>{card.description}</p></CardContent><CardFooter><Button asChild className="w-full mt-2" variant="outline"><Link href={card.href}>Gestionar</Link></Button></CardFooter></Card>
                ))}
            </div>
        )}

        {role !== 'superadmin' && (
          <Card><CardHeader><div className="flex items-center gap-3"><Newspaper className="h-6 w-6 text-primary"/><CardTitle>Diario Mural de Actividad</CardTitle></div><CardDescription>Última actividad registrada en tus obras.</CardDescription></CardHeader>
              <CardContent>
                  {loading ? <div className="space-y-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
                           : muralItems.length === 0 ? <div className="text-center py-8 bg-muted/50 rounded-lg"><p className="text-muted-foreground">No hay actividad reciente para mostrar en tus obras.</p></div>
                           : <div className="space-y-3">{muralItems.map(item => <ActivityCard key={item.id} item={item} />)}</div>}
              </CardContent>
          </Card>
        )}

        <footer className="mt-8 border-t pt-8 text-center text-muted-foreground">
            <div className="flex flex-col items-center gap-2"><PcgLogo size={60} /><p className="text-sm font-semibold italic">Una obra bien gestionada, una cadena completa alineada.</p><p className="text-xs">&copy; {new Date().getFullYear()} PCG. Todos los derechos reservados.</p></div>
        </footer>

      </div>
      <ObraSelectionModal isOpen={isObraModalOpen} onClose={() => setIsObraModalOpen(false)} onSelect={handleObraSelected} obras={obras} />
    </div>
  );
}
