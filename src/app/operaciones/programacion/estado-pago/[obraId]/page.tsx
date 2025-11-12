
"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Actividad = {
  id: string;
  nombre: string;
  unidad?: string;
  cantidadContrato?: number;
  precioContrato: number;
};

type ItemEstadoPago = {
  actividadId: string;
  nombre: string;
  precioContrato: number;
  porcentajeAvance: number;
  montoProyectado: number;
};

type Obra = {
  nombre: string;
  cliente?: string;
  direccion?: string;
  codigo?: string;
};

export default function EstadoDePagoPage() {
  const { obraId } = useParams<{ obraId: string }>();

  const [obra, setObra] = useState<Obra | null>(null);
  const [items, setItems] = useState<ItemEstadoPago[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [iva, setIva] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fechaDeCorte, setFechaDeCorte] = useState(new Date().toISOString().slice(0, 10));


  useEffect(() => {
    if (!obraId) return;

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

        // 2) Actividades de la obra
        const actividadesRef = collection(obraRef, 'actividades');
        const actividadesSnap = await getDocs(actividadesRef);

        const actividades: Actividad[] = actividadesSnap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            nombre: data.nombreActividad ?? 'Actividad sin nombre',
            precioContrato: Number(data.precioContrato ?? 0),
          };
        });

        // 3) Avances diarios de la obra, filtrados por fecha de corte
        const avancesRef = collection(obraRef, 'avancesDiarios');
        const q = query(avancesRef, where("fecha", "<=", fechaDeCorte));
        const avancesSnap = await getDocs(q);

        const avancesPorActividad = new Map<
          string,
          { porcentajeAvance: number; fecha: Date }
        >();

        avancesSnap.forEach((docAvance) => {
          const data = docAvance.data() as any;
          const actividadId = data.actividadId as string | undefined;
          if (!actividadId) return;

          const porcentaje = Number(data.porcentajeAvance ?? 0);
          
          const fechaString = data.fecha as string;
          const fecha = new Date(`${fechaString}T00:00:00`);

          const actual = avancesPorActividad.get(actividadId);
          if (!actual || fecha > actual.fecha) {
            avancesPorActividad.set(actividadId, { porcentajeAvance: porcentaje, fecha });
          }
        });

        // 4) Construir items de estado de pago
        const itemsCalculados: ItemEstadoPago[] = actividades.map((act) => {
          const avance = avancesPorActividad.get(act.id);
          const porcentaje = avance?.porcentajeAvance ?? 0;
          const montoProyectado = (act.precioContrato * porcentaje) / 100;

          return {
            actividadId: act.id,
            nombre: act.nombre,
            precioContrato: act.precioContrato,
            porcentajeAvance: porcentaje,
            montoProyectado,
          };
        });

        const subtotalCalculado = itemsCalculados.reduce(
          (sum, item) => sum + item.montoProyectado,
          0,
        );
        
        const ivaCalculado = subtotalCalculado * 0.19;
        const totalCalculado = subtotalCalculado + ivaCalculado;

        setItems(itemsCalculados);
        setSubtotal(subtotalCalculado);
        setIva(ivaCalculado);
        setTotal(totalCalculado);

      } catch (err) {
        console.error(err);
        setError('Ocurrió un error al cargar el estado de pago.');
      } finally {
        setLoading(false);
      }
    }

    cargarEstadoDePago();
  }, [obraId, fechaDeCorte]);

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

  if (!obra) {
    return <div className="p-8">No se encontraron datos de la obra.</div>;
  }

  return (
    <div className="p-8 space-y-6 bg-white min-h-screen print:bg-white">
      {/* Encabezado */}
      <header className="border-b pb-4">
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
        <div className="text-sm text-gray-600 mt-2 flex items-center gap-2 print:hidden">
            <Label htmlFor="fecha-corte">Fecha de corte:</Label>
            <Input 
                id="fecha-corte"
                type="date" 
                value={fechaDeCorte} 
                onChange={(e) => setFechaDeCorte(e.target.value)}
                className="w-auto"
            />
        </div>
        <p className="text-sm text-gray-600 mt-2 hidden print:block">
            Fecha de corte: {new Date(fechaDeCorte + 'T00:00:00').toLocaleDateString('es-CL')}
        </p>
        <button
          onClick={handlePrint}
          className="mt-4 px-4 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 print:hidden"
        >
          Imprimir / Exportar a PDF
        </button>
      </header>

      {/* Tabla de actividades */}
      <section>
        <table className="w-full text-sm border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-200 px-2 py-1 text-left">Ítem</th>
              <th className="border border-gray-200 px-2 py-1 text-left">Descripción</th>
              <th className="border border-gray-200 px-2 py-1 text-right">Precio contrato</th>
              <th className="border border-gray-200 px-2 py-1 text-right">% Avance</th>
              <th className="border border-gray-200 px-2 py-1 text-right">Monto a cobrar</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.actividadId}>
                <td className="border border-gray-200 px-2 py-1">{idx + 1}</td>
                <td className="border border-gray-200 px-2 py-1">{item.nombre}</td>
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
                <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
                <span>IVA (19%):</span>
                <span>{formatCurrency(iva)}</span>
            </div>
             <div className="flex justify-between border-t pt-2 font-bold text-base">
                <span>Total a Pagar:</span>
                <span>{formatCurrency(total)}</span>
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

