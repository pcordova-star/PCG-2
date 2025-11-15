"use client";

import './globals.css';
import { BODY_CLASSES } from '@/lib/layoutTheme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Bell,
  Home,
  HardHat,
  Activity,
  ShieldCheck,
  Settings,
  User,
  PanelLeft,
  FileText,
  LifeBuoy,
  ShieldAlert,
  Building,
  LogOut,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';


const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/obras', label: 'Obras', icon: HardHat },
  { href: '/operaciones', label: 'Operaciones', icon: Activity },
  { href: '/operaciones/estados-de-pago', label: 'Estados de Pago', icon: FileText },
  { href: '/prevencion', label: 'Prevención', icon: ShieldCheck },
];

const adminNavItems = [
    { href: '/admin/empresas', label: 'Gestión de Empresas', icon: Building },
    { href: '/admin/obras', label: 'Panel Global de Obras', icon: HardHat },
];


const publicPaths = ['/login/usuario', '/login/cliente', '/public/induccion'];

function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { user, customClaims, loading: authLoading, logout } = useAuth();
  
  const isPublicPage = pathname === '/' || publicPaths.some(path => pathname.startsWith(path)) || pathname.startsWith('/cliente');
  const isAdminPage = pathname.startsWith('/admin');
  const isSuperAdmin = customClaims?.role === 'SUPER_ADMIN';

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
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/operaciones') return pathname === '/operaciones' && !pathname.startsWith('/operaciones/estados-de-pago');
    return pathname.startsWith(href);
  };
  
  const sidebarWidth = isCollapsed ? "w-20" : "w-64";

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[auto_1fr]">
      {authLoading ? (
        <div className="flex items-center justify-center h-screen col-span-full">
            <h1 className="text-2xl font-bold">Verificando permisos...</h1>
        </div>
      ) : !user ? (
         <div className="flex flex-col items-center justify-center min-h-screen col-span-full">
            <h1 className="text-2xl font-bold">No has iniciado sesión</h1>
            <p className="text-muted-foreground">Serás redirigido al login.</p>
            <Button asChild variant="link" className="mt-4"><Link href="/">Ir al login ahora</Link></Button>
        </div>
      ) : (isAdminPage && !isSuperAdmin) ? (
        <div className="flex flex-col items-center justify-center min-h-screen col-span-full">
            <h1 className="text-2xl font-bold">Acceso Denegado</h1>
            <p className="text-muted-foreground">No tienes permisos para acceder a esta sección.</p>
            <Button asChild variant="link" className="mt-4"><Link href="/dashboard">Volver al Dashboard</Link></Button>
        </div>
      ) : (
        <>
          {/* Desktop Sidebar */}
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
                  <HardHat className="h-6 w-6 shrink-0" />
                  <span className={cn("transition-opacity", isCollapsed && "opacity-0 hidden")}>PCG 2.0</span>
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
                    <DropdownMenuItem>Perfil</DropdownMenuItem>
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
                {isSuperAdmin && (
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

          <div className={cn("flex flex-col transition-all duration-300 ease-in-out", isCollapsed ? "md:ml-20" : "md:ml-64")}>
             {/* Mobile Header & Sidebar */}
            <header className="flex h-14 items-center gap-4 border-b bg-white px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30 md:hidden">
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
                <SheetContent side="left" className="flex flex-col">
                  <nav className="grid gap-2 text-lg font-medium">
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 text-lg font-semibold text-primary mb-4"
                    >
                      <HardHat className="h-6 w-6" />
                      <span>PCG 2.0</span>
                    </Link>
                    {isSuperAdmin && (
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
                   <div className="mt-auto">
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
               <div className="flex-1">
                <h1 className="text-lg font-semibold text-muted-foreground">PCG 2.0</h1>
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
                  <DropdownMenuItem>Perfil</DropdownMenuItem>
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
        </>
      )}
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
          <MainLayout>{children}</MainLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
