import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'PCG 2.0',
  description: 'Plataforma de gestión de obras para empresas constructoras',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className={cn('font-body antialiased min-h-screen flex flex-col bg-background')}>
        <header className="bg-primary text-primary-foreground shadow-md sticky top-0 z-50">
          <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="text-2xl font-bold font-headline">
              PCG 2.0
            </Link>
            <nav className="flex items-center space-x-4 lg:space-x-6">
              <Link href="/" className="text-sm font-medium transition-colors hover:text-primary-foreground/80">
                Home
              </Link>
              <Link href="/obras" className="text-sm font-medium transition-colors hover:text-primary-foreground/80">
                Obras
              </Link>
              <Link href="/operaciones" className="text-sm font-medium transition-colors hover:text-primary-foreground/80">
                Operaciones
              </Link>
              <Link href="/prevencion" className="text-sm font-medium transition-colors hover:text-primary-foreground/80">
                Prevención
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-6xl">
          {children}
        </main>
      </body>
    </html>
  );
}
