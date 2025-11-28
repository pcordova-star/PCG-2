// src/app/operaciones/programacion/estado-pago/[estadoPagoId]/page.tsx

interface EstadoPagoPageProps {
  params: {
    estadoPagoId: string;
  };
}

export default function EstadoPagoPage({ params }: EstadoPagoPageProps) {
  const { estadoPagoId } = params;

  return (
    <main className="p-4">
      <h1 className="text-xl font-semibold mb-2">
        Estado de pago
      </h1>
      <p className="text-sm text-gray-600">
        Vista temporal para el estado de pago con ID: <strong>{estadoPagoId}</strong>
      </p>
      <p className="mt-4 text-sm">
        Esta página es un placeholder. Más adelante se puede conectar a los datos reales de programación y estados de pago.
      </p>
    </main>
  );
}
