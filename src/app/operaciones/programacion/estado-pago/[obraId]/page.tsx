

"use client";

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  doc,
  getDoc,
} from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';


type ItemEstadoPago = {
  actividadId: string;
  nombre: string;
  precioContrato: number;
  cantidad: number;
  unidad: string;
  porcentajeAvance: number;
  montoProyectado: number;
};

type Obra = {
  nombre: string;
  cliente?: string;
  direccion?: string;
  codigo?: string;
};

type EstadoDePagoCompleto = {
  obraId: string;
  correlativo: number;
  fechaGeneracion: string;
  fechaDeCorte: string;
  subtotal: number;
  iva: number;
  total: number;
  actividades: ItemEstadoPago[];
};

function EstadoDePagoPageInner() {
  const { obraId } = useParams<{ obraId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const edpId = searchParams.get('edpId');
  const fechaCorteParam = searchParams.get('fechaCorte');

  const [obra, setObra] = useState<Obra | null>(null);
  const [estadoDePago, setEstadoDePago] = useState<EstadoDePagoCompleto | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!obraId || !edpId) {
      setError('Faltan parámetros en la URL para cargar el estado de pago.');
      setLoading(false);
      return;
    }

    async function cargarEstadoDePago() {
      try {
        setLoading(true);
        setError(null);

        // 1) Datos de la obra
        const obraRef = doc(firebaseDb, 'obras', obraId);
        const obraSnap = await getDoc(obraRef);

        if (!obraSnap.exists()) {
          setError('No se encontró la obra.');
          setLoading(false);
          return;
        }

        const obraData = obraSnap.data() as any;
        setObra({
          nombre: obraData.nombreFaena ?? 'Obra sin nombre',
          cliente: obraData.clienteEmail ?? '',
          direccion: obraData.direccion ?? '',
          codigo: obraId,
        });

        // 2) Datos del Estado de Pago guardado
        const edpRef = doc(firebaseDb, 'obras', obraId, 'estadosDePago', edpId);
        const edpSnap = await getDoc(edpRef);

        if (!edpSnap.exists()) {
          setError('No se encontró el estado de pago con el ID proporcionado.');
          setLoading(false);
          return;
        }

        const edpData = edpSnap.data() as EstadoDePagoCompleto;
        setEstadoDePago(edpData);

      } catch (err) {
        console.error(err);
        setError('Ocurrió un error al cargar el estado de pago.');
      } finally {
        setLoading(false);
      }
    }

    cargarEstadoDePago();
  }, [obraId, edpId]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };
  
  const formatCurrency = (value: number) => {
    return value.toLocaleString('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    });
  };

  if (loading) {
    return <div className="p-8">Cargando estado de pago…</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600">{error}</div>;
  }

  if (!obra || !estadoDePago) {
    return <div className="p-8">No se encontraron datos para mostrar.</div>;
  }

  return (
    <div className="p-8 space-y-6 bg-white min-h-screen print:bg-white">
      {/* Encabezado */}
      <header className="border-b pb-4">
        <div className="flex justify-between items-start">
            <div>
                 <h1 className="text-2xl font-semibold">
                    Estado de Pago – {obra.nombre}
                </h1>
                <p className="text-sm text-gray-600">
                Código obra: {obra.codigo}
                </p>
                {obra.cliente && (
                <p className="text-sm text-gray-600">Cliente: {obra.cliente}</p>
                )}
                {obra.direccion && (
                <p className="text-sm text-gray-600">Dirección: {obra.direccion}</p>
                )}
                <p className="text-sm text-gray-600 mt-2">
                    Fecha de corte: {new Date(estadoDePago.fechaDeCorte + 'T00:00:00').toLocaleDateString('es-CL')}
                </p>
            </div>
             <div className="flex items-center gap-2 no-print">
                 <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                 </Button>
                <Button
                onClick={handlePrint}
                className="mt-4 px-4 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 print:hidden"
                >
                Imprimir / Exportar a PDF
                </Button>
            </div>
        </div>
      </header>

      {/* Tabla de actividades */}
      <section>
        <table className="w-full text-sm border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-200 px-2 py-1 text-left">Ítem</th>
              <th className="border border-gray-200 px-2 py-1 text-left">Descripción</th>
              <th className="border border-gray-200 px-2 py-1 text-right">Cant.</th>
              <th className="border border-gray-200 px-2 py-1 text-right">Un.</th>
              <th className="border border-gray-200 px-2 py-1 text-right">P. Unitario</th>
              <th className="border border-gray-200 px-2 py-1 text-right">% Avance</th>
              <th className="border border-gray-200 px-2 py-1 text-right">Monto a cobrar</th>
            </tr>
          </thead>
          <tbody>
            {estadoDePago.actividades.map((item, idx) => (
              <tr key={`edp-item-${item.actividadId}-${idx}`}>
                <td className="border border-gray-200 px-2 py-1">{idx + 1}</td>
                <td className="border border-gray-200 px-2 py-1">{item.nombre}</td>
                <td className="border border-gray-200 px-2 py-1 text-right">{item.cantidad}</td>
                <td className="border border-gray-200 px-2 py-1 text-right">{item.unidad}</td>
                <td className="border border-gray-200 px-2 py-1 text-right">
                  {formatCurrency(item.precioContrato)}
                </td>
                <td className="border border-gray-200 px-2 py-1 text-right">
                  {item.porcentajeAvance.toFixed(1)} %
                </td>
                <td className="border border-gray-200 px-2 py-1 text-right">
                  {formatCurrency(item.montoProyectado)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Totales y firmas */}
      <section className="mt-4 flex justify-end">
        <div className="w-full max-w-sm space-y-2 text-sm">
            <div className="flex justify-between">
                <span>Subtotal Neto:</span>
                <span>{formatCurrency(estadoDePago.subtotal)}</span>
            </div>
            <div className="flex justify-between">
                <span>IVA (19%):</span>
                <span>{formatCurrency(estadoDePago.iva)}</span>
            </div>
             <div className="flex justify-between border-t pt-2 font-bold text-base">
                <span>Total a Pagar:</span>
                <span>{formatCurrency(estadoDePago.total)}</span>
            </div>
        </div>
      </section>
      
      <section className="mt-4">
        <div className="grid grid-cols-2 gap-16 mt-12 print:mt-24">
          <div className="text-center">
            <div className="border-t border-gray-400 pt-2">
              Contratista
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-400 pt-2">
              Mandante / Inspector de Obra
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function EstadoDePagoPage() {
  return (
    <Suspense fallback={<div className="p-8">Cargando...</div>}>
      <EstadoDePagoPageInner />
    </Suspense>
  )
}
