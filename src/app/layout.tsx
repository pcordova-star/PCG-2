"use client";

import './globals.css';
import { BODY_CLASSES } from '@/lib/layoutTheme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Home,
  HardHat,
  Activity,
  ShieldCheck,
  Settings,
  PanelLeft,
  FileText,
  LifeBuoy,
  Building,
  LogOut,
  Users as UsersIcon,
  DollarSign,
  BookCopy,
  MessageSquare, // Añadido para RDI
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { cn } from '@/lib/utils';
import { PcgLogo } from '@/components/branding/PcgLogo';
import { useSearchParams } from 'next/navigation';


const navItemsBase = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, roles: ['superadmin', 'admin_empresa', 'jefe_obra', 'prevencionista'] },
  { href: '/obras', label: 'Obras', icon: HardHat, roles: ['superadmin', 'admin_empresa', 'jefe_obra', 'prevencionista'] },
  { href: '/operaciones', label: 'Operaciones', icon: Activity, roles: ['superadmin', 'admin_empresa', 'jefe_obra'] },
  { href: '/operaciones/estados-de-pago', label: 'Estados de Pago', icon: FileText, roles: ['superadmin', 'admin_empresa', 'jefe_obra'] },
  { href: '/prevencion', label: 'Prevención', icon: ShieldCheck, roles: ['superadmin', 'admin_empresa', 'jefe_obra', 'prevencionista'] },
  // Nueva ruta para el módulo de documentos
  { href: '/admin/documentos/proyecto', label: 'Documentos', icon: BookCopy, roles: ['superadmin', 'admin_empresa', 'prevencionista'] },
  { href: '/obras', label: 'RDI', icon: MessageSquare, roles: ['superadmin', 'admin_empresa', 'jefe_obra', 'prevencionista'] },
];

const adminNavItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: Home },
    { href: '/admin/empresas', label: 'Empresas', icon: Building },
    { href: '/admin/usuarios', label: 'Usuarios', icon: UsersIcon },
    { href: '/admin/facturacion', label: 'Facturación', icon: DollarSign },
];


const publicPaths = ['/login/usuario', '/login/cliente', '/public/induccion', '/terminos', '/accept-invite'];


// Componente hijo para leer el searchParam de forma segura sin afectar el layout
function LayoutLogic({ children }: { children: React.ReactNode }) {
    const searchParams = useSearchParams();
    const isPreview = searchParams.get('preview') === 'true';
    const { user, role, loading: authLoading, logout } = useAuth();
    const pathname = usePathname();

    const navItems = navItemsBase.filter(item => item.roles.includes(role));

    const isAdminOnlyPage = pathname.startsWith('/admin') && !pathname.startsWith('/admin/documentos');
    const canSeeAdminItems = role === 'superadmin';
    const [isCollapsed, setIsCollapsed] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const isPublicPage = pathname === '/' || publicPaths.some(path => pathname.startsWith(path));

    useEffect(() => {
        if (isPublicPage) return;
        
        startTimer();

        return () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        };
    }, [pathname, isPublicPage]);

    const startTimer = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
            setIsCollapsed(true);
        }, 4000);
    };

    const handleMouseEnter = () => {
        if (timerRef.current) {
        clearTimeout(timerRef.current);
        }
        setIsCollapsed(false);
    };

    const handleMouseLeave = () => {
        startTimer();
    };
    
    const toggleCollapse = () => {
        setIsCollapsed(prev => !prev);
        if (timerRef.current) {
        clearTimeout(timerRef.current);
        }
    };

    if (isPublicPage) {
        return <>{children}</>;
    }

    const isActive = (href: string) => {
        if (href === '/dashboard' || href === '/admin/dashboard') return pathname === href;
        if (href === '/operaciones') return pathname === '/operaciones' && !pathname.startsWith('/operaciones/estados-de-pago');
        return pathname.startsWith(href);
    };
    
    const sidebarWidth = isCollapsed ? "w-20" : "w-64";

    if (authLoading) {
        return (
        <div className="flex items-center justify-center h-screen col-span-full">
            <h1 className="text-2xl font-bold">Verificando permisos...</h1>
        </div>
        );
    }
    
    if (!user) {
        return (
        <div className="flex flex-col items-center justify-center min-h-screen col-span-full">
            <h1 className="text-2xl font-bold">No has iniciado sesión</h1>
            <p className="text-muted-foreground">Serás redirigido al login.</p>
            <Button asChild variant="link" className="mt-4"><Link href="/">Ir al login ahora</Link></Button>
        </div>
        );
    }
    
    const canAccessDocs = role === 'admin_empresa' || role === 'prevencionista';
    if (isAdminOnlyPage && !canSeeAdminItems) {
        if (pathname.startsWith('/admin/documentos') && canAccessDocs) {
            // Permite el acceso
        } else {
             return (
                <div className="flex flex-col items-center justify-center min-h-screen col-span-full">
                    <h1 className="text-2xl font-bold">Acceso Denegado</h1>
                    <p className="text-muted-foreground">No tienes permisos para acceder a esta sección.</p>
                    <Button asChild variant="link" className="mt-4"><Link href="/dashboard">Volver al Dashboard</Link></Button>
                </div>
            );
        }
    }
  
  const showSidebar = role !== 'cliente' || isPreview;

  return (
    <div className={cn("grid min-h-screen w-full", showSidebar && "md:grid-cols-[auto_1fr]")}>
      {showSidebar && (
        <aside
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={cn(
            "hidden md:flex flex-col gap-2 border-r bg-white transition-all duration-300 ease-in-out",
            sidebarWidth
          )}
        >
          <div className="flex h-16 items-center border-b px-4 lg:px-6 shrink-0">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 font-semibold text-primary"
              >
                <PcgLogo size={40} />
              </Link>
               <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="ml-auto h-8 w-8">
                    <Avatar>
                      <AvatarFallback>{user?.email?.[0]?.toUpperCase() ?? 'U'}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link href="/perfil">Mi Perfil</Link></DropdownMenuItem>
                  <DropdownMenuItem>Configuración</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                     <LogOut className="mr-2 h-4 w-4" />
                     Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
          </div>
          <div className="flex-1 overflow-y-auto">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              {canSeeAdminItems && (
                <div className="my-2">
                  <p className={cn("px-3 py-2 text-xs font-semibold text-muted-foreground transition-opacity", isCollapsed && "opacity-0 hidden")}>SUPER ADMIN</p>
                   {adminNavItems.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-3 text-muted-foreground transition-all hover:text-primary hover:bg-muted",
                        isActive(item.href) && "bg-muted text-primary",
                        isCollapsed && "justify-center"
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className={cn("truncate", isCollapsed && "hidden")}>{item.label}</span>
                    </Link>
                  ))}
                   <div className="my-2 border-t -mx-2"></div>
                </div>
              )}
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-3 text-muted-foreground transition-all hover:text-primary hover:bg-muted",
                    isActive(item.href) && "bg-muted text-primary",
                    isCollapsed && "justify-center"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className={cn("truncate", isCollapsed && "hidden")}>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
          <div id="tour-step-soporte" className="mt-auto p-4 border-t">
              <nav className="grid items-start px-2 text-sm font-medium lg:px-4 gap-2">
                 <Link
                    href="mailto:paulo@ipsconstruccion.cl?subject=Soporte%20Faena%20Manager%202.0"
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted",
                       isCollapsed && "justify-center"
                    )}
                  >
                    <LifeBuoy className="h-5 w-5 shrink-0" />
                    <span className={cn(isCollapsed && "hidden")}>Soporte</span>
                  </Link>
                 <Link
                    href="#"
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted",
                       isCollapsed && "justify-center"
                    )}
                  >
                    <Settings className="h-5 w-5 shrink-0" />
                    <span className={cn(isCollapsed && "hidden")}>Configuración</span>
                  </Link>
              </nav>
               <Button variant="ghost" size="icon" onClick={toggleCollapse} className="w-full mt-4 flex items-center justify-center gap-3">
                  <PanelLeft className="h-5 w-5" />
                  <span className={cn(isCollapsed && "hidden")}>{isCollapsed ? 'Expandir' : 'Colapsar'}</span>
              </Button>
          </div>
        </aside>
      )}

      <div className={cn(
        "flex flex-col", 
        showSidebar && (isCollapsed ? "md:ml-20" : "md:ml-64"),
        "transition-all duration-300 ease-in-out"
      )}>
         {/* Mobile Header & Sidebar */}
        <header className="flex h-14 items-center gap-4 border-b bg-white px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30 md:hidden">
          {showSidebar ? (
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                >
                  <PanelLeft className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col p-0">
                <SheetHeader className="p-6 pb-2">
                  <SheetTitle>
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 text-lg font-semibold text-primary"
                    >
                      <PcgLogo size={40} />
                      <span className="sr-only">PCG Dashboard</span>
                    </Link>
                  </SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto px-6">
                  <nav className="grid gap-2 text-lg font-medium">
                    {canSeeAdminItems && (
                      <>
                        <p className="px-3 py-2 text-sm font-semibold text-muted-foreground">SUPER ADMIN</p>
                        {adminNavItems.map((item) => (
                          <Link
                              key={item.label}
                              href={item.href}
                              className={cn(
                                "mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground",
                                isActive(item.href) && "bg-muted text-foreground"
                              )}
                            >
                              <item.icon className="h-5 w-5" />
                              {item.label}
                          </Link>
                        ))}
                         <div className="my-2 border-t -mx-3"></div>
                      </>
                    )}
                    {navItems.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                         className={cn(
                          "mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground",
                           isActive(item.href) && "bg-muted text-foreground"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                    ))}
                  </nav>
                </div>
                 <div className="mt-auto p-6 border-t">
                   <nav className="grid gap-2 text-lg font-medium">
                      <Link
                        href="mailto:paulo@ipsconstruccion.cl?subject=Soporte%20Faena%20Manager%202.0"
                        className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                      >
                        <LifeBuoy className="h-5 w-5" />
                        Soporte
                      </Link>
                       <Link
                        href="#"
                        className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                      >
                        <Settings className="h-5 w-5" />
                        Configuración
                      </Link>
                    </nav>
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <Link
                href="/cliente"
                className="flex items-center gap-2 font-semibold text-primary"
              >
              <PcgLogo size={36} />
            </Link>
          )}

           <div className="flex-1">
             {showSidebar && <PcgLogo size={36} />}
          </div>
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="rounded-full"
              >
                <Avatar>
                  <AvatarFallback>{user?.email?.[0]?.toUpperCase() ?? 'U'}</AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link href="/perfil">Mi Perfil</Link></DropdownMenuItem>
              <DropdownMenuItem>Ajustes</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
   return (
    <html lang="es">
      <body className={BODY_CLASSES}>
        <AuthProvider>
          <Suspense fallback={<div className="flex items-center justify-center h-screen">Cargando...</div>}>
            <LayoutLogic>{children}</LayoutLogic>
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}
