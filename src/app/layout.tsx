import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/context/AuthContext';
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

export const metadata: Metadata = {
  title: 'PCG 2.0',
  description: 'Plataforma de gestión de obras para empresas constructoras',
};

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/obras', label: 'Obras', icon: HardHat },
  { href: '/operaciones', label: 'Operaciones', icon: Activity },
  { href: '/prevencion', label: 'Prevención', icon: ShieldCheck },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={cn('font-body antialiased bg-muted/40')}>
        <AuthProvider>
          <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
            <aside className="hidden border-r bg-muted/40 md:block">
              <div className="flex h-full max-h-screen flex-col gap-2">
                <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                  <Link
                    href="/"
                    className="flex items-center gap-2 font-semibold text-primary"
                  >
                    <HardHat className="h-6 w-6" />
                    <span className="">PCG 2.0</span>
                  </Link>
                </div>
                <div className="flex-1">
                  <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                    {navItems.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    ))}
                  </nav>
                </div>
                <div className="mt-auto p-4">
                  <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                     <Link
                        href="/login"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                      >
                        <User className="h-4 w-4" />
                        Login
                      </Link>
                     <Link
                        href="#"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                      >
                        <Settings className="h-4 w-4" />
                        Configuración
                      </Link>
                  </nav>
                </div>
              </div>
            </aside>
            <div className="flex flex-col">
              <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0 md:hidden"
                    >
                      <PanelLeft className="h-5 w-5" />
                      <span className="sr-only">Toggle navigation menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="flex flex-col">
                    <nav className="grid gap-2 text-lg font-medium">
                      <Link
                        href="/"
                        className="flex items-center gap-2 text-lg font-semibold text-primary mb-4"
                      >
                        <HardHat className="h-6 w-6" />
                        <span>PCG 2.0</span>
                      </Link>
                      {navItems.map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                        >
                          <item.icon className="h-5 w-5" />
                          {item.label}
                        </Link>
                      ))}
                    </nav>
                     <div className="mt-auto">
                       <nav className="grid gap-2 text-lg font-medium">
                          <Link
                            href="/login"
                            className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                          >
                            <User className="h-5 w-5" />
                            Login
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
                <div className="w-full flex-1">
                  <h1 className="text-lg font-semibold text-muted-foreground">Dashboard</h1>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="rounded-full"
                    >
                      <Avatar>
                        <AvatarFallback>U</AvatarFallback>
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
                    <DropdownMenuItem>Cerrar sesión</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </header>
              <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                {children}
              </main>
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
