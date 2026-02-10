// src/app/public/layout.tsx
// Este layout minimalista se aplica a todas las rutas dentro de /public

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {children}
    </div>
  );
}