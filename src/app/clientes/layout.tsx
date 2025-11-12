import type { Metadata } from 'next';
import '../globals.css';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Avance de Obra - PCG 2.0',
  description: 'Panel de seguimiento de avance de obra para clientes.',
};

export default function ClienteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={cn('font-body antialiased bg-muted/40')}>
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
