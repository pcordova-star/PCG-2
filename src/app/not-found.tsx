// src/app/not-found.tsx

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen p-6">
      <h1 className="text-3xl font-bold mb-4">Página no encontrada</h1>
      <p className="text-gray-600">Lo sentimos, la ruta solicitada no existe en esta aplicación.</p>
    </div>
  );
}
