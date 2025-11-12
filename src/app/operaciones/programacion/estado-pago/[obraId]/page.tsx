
"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import Link from 'next/link';

// --- Tipos de Datos ---
type Obra = {
  id: string;
  nombreFaena: string;
  direccion?: string;
  clienteEmail?: string;
};

type ActividadEnEDP = {
  id: string;
  nombreActividad: string;
  precioContrato: number;
  porcentajeAvance: number;
  montoProyectado: number;
};

type EstadoDePago = {
  id: string;
  correlativo: number;
  fechaGeneracion: string;
  subtotal: number;
  iva: number;
  total: number;
  actividades: ActividadEnEDP[];
};

function EstadoDePagoPageInner({ params }: { params: { obraId: string } }) {
  const { obraId } = params;
  const searchParams = useSearchParams();
  const edpId = searchParams.get("edpId");

  const [obra, setObra] = useState<Obra | null>(null);
  const [estadoDePago, setEstadoDePago] = useState<EstadoDePago | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!obraId || !edpId) {
      setError("No se proporcionó un ID de obra o de estado de pago.");
      setLoading(false);
      return;
    }

    const fetchDatos = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Cargar datos de la obra
        const obraRef = doc(firebaseDb, "obras", obraId);
        const obraSnap = await getDoc(obraRef);
        if (!obraSnap.exists()) throw new Error("No se encontró la obra con el ID proporcionado.");
        setObra({ id: obraSnap.id, ...obraSnap.data() } as Obra);

        // 2. Cargar el estado de pago específico
        const edpRef = doc(firebaseDb, "obras", obraId, "estadosDePago", edpId);
        const edpSnap = await getDoc(edpRef);
        if (!edpSnap.exists()) throw new Error("No se encontró el estado de pago con el ID proporcionado.");
        setEstadoDePago({ id: edpSnap.id, ...edpSnap.data() } as EstadoDePago);

      } catch (err) {
        console.error("Error al cargar estado de pago:", err);
        setError(err instanceof Error ? err.message : "Ocurrió un error al cargar los datos.");
      } finally {
        setLoading(false);
      }
    };

    fetchDatos();
  }, [obraId, edpId]);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando Estado de Pago...</div>;
  if (error) return <div className="p-8 text-center text-destructive">{error}</div>;
  if (!obra || !estadoDePago) return <div className="p-8 text-center text-muted-foreground">No se encontraron los datos solicitados.</div>;

  return (
    <div className="bg-background min-h-screen p-4 sm:p-8 print:p-0">
      <style jsx global>{`
        @media print {
          body { background-color: #fff; color: #000; }
          .print-hidden { display: none !important; }
          .printable-area { box-shadow: none !important; border: none !important; padding: 0 !important; }
        }
      `}</style>
      
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6 print-hidden">
          <h1 className="text-xl font-bold">Estado de Pago EDP-{estadoDePago.correlativo.toString().padStart(3, '0')}</h1>
           <div className="flex gap-2">
             <Button asChild variant="outline">
                <Link href="/operaciones/programacion">Volver</Link>
            </Button>
            <Button onClick={() => window.print()}>Imprimir / Guardar PDF</Button>
          </div>
        </div>

        <div className="printable-area p-8 border rounded-lg bg-card text-card-foreground shadow-md text-sm">
            <header className="mb-8">
                <div className="flex justify-between items-start border-b pb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-primary">Estado de Pago N° {estadoDePago.correlativo.toString().padStart(3, '0')}</h2>
                        <p className="text-sm text-muted-foreground">{obra.nombreFaena}</p>
                    </div>
                    <div className="text-right text-xs">
                        <p><strong>Obra ID:</strong> <span className="font-mono">{obra.id}</span></p>
                        <p><strong>Cliente:</strong> {obra.clienteEmail || 'No especificado'}</p>
                        <p><strong>Dirección:</strong> {obra.direccion || 'No especificada'}</p>
                        <p><strong>Fecha Emisión:</strong> {estadoDePago.fechaGeneracion}</p>
                    </div>
                </div>
            </header>

            <main>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Actividad</TableHead>
                    <TableHead className="text-right">Precio Contrato</TableHead>
                    <TableHead className="text-center">% Avance</TableHead>
                    <TableHead className="text-right">Monto a Cobrar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estadoDePago.actividades.length > 0 ? (
                    estadoDePago.actividades.map((act) => (
                      <TableRow key={act.id}>
                        <TableCell className="font-medium">{act.nombreActividad}</TableCell>
                        <TableCell className="text-right">{formatCurrency(act.precioContrato)}</TableCell>
                        <TableCell className="text-center font-mono">{act.porcentajeAvance}%</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(act.montoProyectado)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No hay actividades en este estado de pago.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="text-right font-bold">Subtotal</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(estadoDePago.subtotal)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={3} className="text-right font-bold">IVA (19%)</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(estadoDePago.iva)}</TableCell>
                  </TableRow>
                  <TableRow className="text-lg">
                    <TableCell colSpan={3} className="text-right font-extrabold">Total a Pagar</TableCell>
                    <TableCell className="text-right font-extrabold">{formatCurrency(estadoDePago.total)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </main>

            <footer className="mt-24 pt-8 border-t text-xs">
                <h4 className="font-semibold text-center mb-12">Firmas de Conformidad</h4>
                <div className="grid grid-cols-2 gap-16">
                    <div className="flex flex-col items-center">
                        <div className="w-full border-b mt-12 mb-2"></div>
                        <p className="font-semibold">Contratista</p>
                        <p>[Nombre y Firma]</p>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="w-full border-b mt-12 mb-2"></div>
                        <p className="font-semibold">Mandante / Inspector de Obra</p>
                        <p>[Nombre y Firma]</p>
                    </div>
                </div>
            </footer>
        </div>
      </div>
    </div>
  );
}


export default async function EstadoDePagoPage({ params: paramsPromise }: { params: Promise<{ obraId: string }> }) {
  const params = await paramsPromise;
  return (
    <Suspense fallback={<div>Cargando Estado de Pago...</div>}>
      <EstadoDePagoPageInner params={params} />
    </Suspense>
  );
}
