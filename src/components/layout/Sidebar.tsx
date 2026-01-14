// src/components/layout/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  HardHat,
  LayoutDashboard,
  ShieldCheck,
  Users,
  BookCopy,
  MessageSquare,
  FileSignature,
  BrainCircuit,
  ListChecks,
  Building,
  DollarSign,
  Settings,
  BellRing,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  User,
  GanttChartSquare
} from "lucide-react";
import { useSidebarStore } from "@/hooks/use-sidebar-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PcgLogo } from "@/components/branding/PcgLogo";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { Separator } from "../ui/separator";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
  subItems?: NavItem[];
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ['superadmin', 'admin_empresa', 'jefe_obra', 'prevencionista'] },
  { href: "/obras", label: "Obras", icon: HardHat, roles: ['superadmin', 'admin_empresa', 'jefe_obra', 'prevencionista'] },
  {
    href: "/operaciones",
    label: "Operaciones",
    icon: GanttChartSquare,
    roles: ['superadmin', 'admin_empresa', 'jefe_obra'],
    subItems: [
      { href: "/operaciones/presupuestos", label: "Itemizados", icon: BookCopy, roles: ['superadmin', 'admin_empresa', 'jefe_obra'] },
      { href: "/operaciones/programacion", label: "Programación", icon: GanttChartSquare, roles: ['superadmin', 'admin_empresa', 'jefe_obra'] },
      { href: "/operaciones/estados-de-pago", label: "Estados de Pago", icon: FileSignature, roles: ['superadmin', 'admin_empresa', 'jefe_obra'] },
    ]
  },
  { href: "/prevencion", label: "Prevención", icon: ShieldCheck, roles: ['superadmin', 'admin_empresa', 'jefe_obra', 'prevencionista'], featureFlag: 'feature_risk_prevention_enabled' },
  { href: "/checklists-operacionales", label: "Checklists", icon: ListChecks, roles: ['superadmin', 'admin_empresa', 'jefe_obra', 'prevencionista'], featureFlag: 'feature_operational_checklists_enabled' },
  { href: "/cumplimiento", label: "Cumplimiento", icon: ShieldCheck, roles: ['superadmin', 'admin_empresa', 'contratista'], featureFlag: 'feature_compliance_module_enabled' },
  { href: "/cubicacion/analisis-planos", label: "Análisis IA", icon: BrainCircuit, roles: ['superadmin', 'admin_empresa', 'jefe_obra'], featureFlag: 'feature_plan_analysis_enabled' },
  { href: "/admin/documentos/proyecto", label: "Documentos", icon: BookCopy, roles: ['superadmin', 'admin_empresa', 'prevencionista'], featureFlag: 'feature_document_control_enabled' },
  { href: "/rdi", label: "RDI", icon: MessageSquare, roles: ['superadmin', 'admin_empresa', 'jefe_obra'] },
];

const adminNavItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard Admin", icon: LayoutDashboard, roles: ['superadmin'] },
  { href: "/admin/empresas", label: "Empresas", icon: Building, roles: ['superadmin'] },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users, roles: ['superadmin'] },
  { href: "/admin/solicitudes", label: "Solicitudes", icon: BellRing, roles: ['superadmin'] },
  { href: "/admin/facturacion", label: "Facturación", icon: DollarSign, roles: ['superadmin'] },
  { href: "/admin/pricing", label: "Precios", icon: Settings, roles: ['superadmin'] },
];

function NavLink({ item, isCollapsed }: { item: NavItem, isCollapsed: boolean }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
  const Icon = item.icon;

  const linkContent = (
    <div className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
      isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      isCollapsed && "justify-center"
    )}>
      <Icon className="h-5 w-5 shrink-0" />
      <span className={cn("transition-opacity", isCollapsed ? "sr-only" : "opacity-100")}>{item.label}</span>
    </div>
  );

  if (isCollapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={item.href}>{linkContent}</Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{item.label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return <Link href={item.href}>{linkContent}</Link>;
}


export default function Sidebar() {
  const { isCollapsed, toggleSidebar } = useSidebarStore();
  const { user, role, company, logout } = useAuth();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const handleToggle = () => {
    if (isMobile) {
      // En móvil, el toggle cierra el menú (que es un overlay)
      useSidebarStore.setState({ isCollapsed: true });
    } else {
      toggleSidebar();
    }
  }

  const navFiltered = navItems.filter(item => item.roles.includes(role));
  const adminFiltered = adminNavItems.filter(item => item.roles.includes(role));

  const sidebarContent = (
     <div className="flex h-full flex-col">
        <header className={cn("flex items-center justify-between p-4 border-b", isCollapsed && "justify-center")}>
          {!isCollapsed && <PcgLogo size={80} />}
          <Button variant="ghost" size="icon" onClick={handleToggle}>
            {isCollapsed ? <ChevronsRight /> : <ChevronsLeft />}
          </Button>
        </header>

        <nav className="flex-1 space-y-2 overflow-y-auto p-2">
            {navFiltered.map(item => <NavLink key={item.href} item={item} isCollapsed={isCollapsed} />)}
            {role === 'superadmin' && (
                <>
                    <Separator className="my-4"/>
                    {adminFiltered.map(item => <NavLink key={item.href} item={item} isCollapsed={isCollapsed} />)}
                </>
            )}
        </nav>

        <footer className="mt-auto border-t p-2">
            <NavLink item={{ href: '/perfil', label: user?.displayName || user?.email || 'Mi Perfil', icon: User, roles: [role]}} isCollapsed={isCollapsed} />
            <Button onClick={logout} variant="ghost" className={cn("w-full justify-start text-muted-foreground", isCollapsed && "justify-center")}>
                <LogOut className="h-5 w-5" />
                <span className={cn("ml-3", isCollapsed && "sr-only")}>Cerrar Sesión</span>
            </Button>
        </footer>
     </div>
  );

  if (isMobile) {
    return (
      <>
        {/* Overlay para cerrar en móvil */}
        {!isCollapsed && <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={handleToggle}></div>}
        <aside className={cn(
          "fixed top-0 left-0 h-full bg-card border-r z-50 transition-transform duration-300 ease-in-out md:hidden",
          isCollapsed ? "-translate-x-full" : "translate-x-0 w-64"
        )}>
          {sidebarContent}
        </aside>
      </>
    );
  }

  return (
    <aside className={cn(
      "hidden md:block fixed top-0 left-0 h-full bg-card border-r z-30 transition-all duration-300 ease-in-out",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {sidebarContent}
    </aside>
  );
}
