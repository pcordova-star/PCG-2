// src/app/layout-logic.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarFooter,
  SidebarInset,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { PcgLogo } from "@/components/branding/PcgLogo";
import {
  Building,
  GanttChartSquare,
  HardHat,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  User,
  BookCopy,
  MessageSquare,
  FileSignature,
  BrainCircuit,
  ListChecks,
} from "lucide-react";
import Link from "next/link";
import { UserRole } from "@/lib/roles";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
  subItems?: NavItem[];
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ['superadmin', 'admin_empresa', 'jefe_obra', 'prevencionista'] },
  {
    href: "/obras",
    label: "Obras",
    icon: HardHat,
    roles: ['superadmin', 'admin_empresa', 'jefe_obra', 'prevencionista'],
  },
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
  {
    href: "/cubicacion",
    label: "Cubicación IA",
    icon: BrainCircuit,
    roles: ['superadmin', 'admin_empresa', 'jefe_obra'],
    subItems: [
        { href: "/cubicacion/analisis-planos", label: "Análisis de Planos", icon: BrainCircuit, roles: ['superadmin', 'admin_empresa', 'jefe_obra'] }
    ]
  },
  {
    href: "/checklists",
    label: "Checklists",
    icon: ListChecks,
    roles: ['superadmin', 'admin_empresa', 'jefe_obra', 'prevencionista'],
    subItems: [
        { href: "/checklists-operacionales/plantillas", label: "Plantillas", icon: ListChecks, roles: ['superadmin', 'admin_empresa', 'jefe_obra'] },
        { href: "/checklists-operacionales/respuestas", label: "Respuestas", icon: FileSignature, roles: ['superadmin', 'admin_empresa', 'jefe_obra', 'prevencionista'] },
    ]
  },
  {
    href: "/prevencion",
    label: "Prevención",
    icon: ShieldCheck,
    roles: ['superadmin', 'admin_empresa', 'jefe_obra', 'prevencionista'],
    subItems: [
        { href: "/prevencion/hallazgos", label: "Hallazgos", icon: ShieldCheck, roles: ['superadmin', 'admin_empresa', 'jefe_obra', 'prevencionista'] },
        { href: "/prevencion/empresas-contratistas", label: "Empresas Contratistas", icon: Building, roles: ['superadmin', 'admin_empresa', 'prevencionista'] },
        { href: "/prevencion/ingreso-personal", label: "Ingreso de Personal", icon: Users, roles: ['superadmin', 'admin_empresa', 'prevencionista'] },
    ]
  },
  {
    href: "/rdi",
    label: "RDI",
    icon: MessageSquare,
    roles: ['superadmin', 'admin_empresa', 'jefe_obra'],
  },
  {
    href: "/cumplimiento",
    label: "Cumplimiento",
    icon: ShieldCheck,
    roles: ['superadmin', 'admin_empresa', 'contratista'],
  }
];

const adminNavItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ['superadmin'] },
  { href: "/admin/empresas", label: "Empresas", icon: Building, roles: ['superadmin'] },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users, roles: ['superadmin'] },
  { href: "/admin/documentos/corporativos", label: "Documentos", icon: BookCopy, roles: ['superadmin'] },
];

function NavMenu({ items, role, pathname }: { items: NavItem[], role: UserRole, pathname: string }) {
  const filteredItems = items.filter(item => item.roles.includes(role));

  return (
    <SidebarMenu>
      {filteredItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          {item.subItems ? (
            <>
              <SidebarMenuButton
                isActive={pathname.startsWith(item.href)}
                isSubmenu
              >
                <item.icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
              <SidebarMenuSub>
                {item.subItems.filter(sub => sub.roles.includes(role)).map(subItem => (
                  <SidebarMenuSubItem key={subItem.href}>
                    <SidebarMenuSubButton
                      href={subItem.href}
                      isActive={pathname === subItem.href}
                    >
                      {subItem.label}
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </>
          ) : (
            <SidebarMenuButton
              href={item.href}
              isActive={pathname === item.href}
            >
              <item.icon />
              <span>{item.label}</span>
            </SidebarMenuButton>
          )}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

export default function LayoutLogic({ children }: { children: React.ReactNode }) {
  const { user, role, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicPage = ['/', '/login/usuario', '/login/cliente', '/accept-invite', '/terminos', '/sin-acceso'].includes(pathname) || pathname.startsWith('/public/');
  const showSidebar = user && !isPublicPage;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Cargando...
      </div>
    );
  }
  
  if (!user && !isPublicPage) {
    // router.replace('/login/usuario'); // Ya manejado por AuthContext
    return null;
  }

  return (
    <div className="flex min-h-screen w-full">
      {showSidebar && (
        <Sidebar>
            <SidebarHeader>
                <PcgLogo />
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu>
                    <NavMenu items={navItems} role={role} pathname={pathname} />
                    {role === 'superadmin' && (
                        <>
                            <SidebarMenuSubItem>
                                <SidebarMenuButton isSubmenu>
                                    <LayoutDashboard/>
                                    <span>Admin</span>
                                </SidebarMenuButton>
                                <SidebarMenuSub>
                                    <NavMenu items={adminNavItems} role={role} pathname={pathname} />
                                </SidebarMenuSub>
                            </SidebarMenuSubItem>
                        </>
                    )}
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton href="/perfil">
                            <User/>
                            <span>Mi Perfil</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={logout}>
                            <LogOut/>
                            <span>Cerrar Sesión</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
      )}
      <SidebarInset>
        <div className="p-4 md:p-8">
            {children}
        </div>
      </SidebarInset>
    </div>
  );
}