import type { Metadata } from 'next';
import '../globals.css';
import { Toaster } from '@/components/ui/toaster';
import { BODY_CLASSES } from '@/lib/layoutTheme';

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
    <html lang="es">
      {/* Usamos BODY_CLASSES para asegurar que el servidor y el cliente rendericen el mismo className en el body, evitando errores de hidratación. */}
      <body className={BODY_CLASSES}>
        <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
