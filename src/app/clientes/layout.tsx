import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Avance de Obra - Panel de Cliente',
  description: 'Panel de seguimiento de avance de obra para clientes.',
};

export default function ClienteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={cn('min-h-screen bg-muted/40 font-sans antialiased', inter.variable)}>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
