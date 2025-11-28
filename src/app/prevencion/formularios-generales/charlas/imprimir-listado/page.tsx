"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { firebaseDb } from "@/lib/firebaseClient";
import { collection, getDocs, query, where, orderBy, doc, getDoc, Timestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";

// --- Tipos de Datos (Reutilizados) ---
type Obra = {
  id: string;
  nombreFaena: string;
};

type CharlaEstado = "borrador" | "realizada" | "programada" | "cancelada";

type Charla = {
  id: string;
  obraId: string;
  titulo: string;
  estado: CharlaEstado;
  iperId: string;
  fechaCreacion: Timestamp;
  fechaRealizacion?: Timestamp;
};


// --- Funciones de Ayuda (Reutilizadas) ---
function EstadoBadge({ estado }: { estado: CharlaEstado }) {
    const classNames: Record<CharlaEstado, string> = {
        'borrador': 'bg-gray-100 text-gray-800 border-gray-300',
        'realizada': 'bg-green-100 text-green-800 border-green-300',
        'programada': 'bg-blue-100 text-blue-800 border-blue-300',
        'cancelada': 'bg-red-100 text-red-800 border-red-300'
    };
    return <Badge variant="outline" className={cn(classNames[estado] || 'bg-gray-100', 'font-semibold')}>{estado}</Badge>;
}


function ImprimirListadoCharlasInner() {
  const searchParams = useSearchParams();
  const obraId = searchParams.get('obraId');
  const estado = searchParams.get('estado') as CharlaEstado | 'todos' | null;

  const [obra, setObra] = useState<Obra | null>(null);
  const [charlas, setCharlas] = useState<Charla[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!obraId) {
      setError("No se especificó una obra para el reporte.");
      setLoading(false);
      return;
    }

    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      try {
        const obraRef = doc(firebaseDb, 'obras', obraId);
        const obraSnap = await getDoc(obraRef);
        if (obraSnap.exists()) {
          setObra({ id: obraSnap.id, nombreFaena: obraSnap.data().nombreFaena });
        } else {
          throw new Error("La obra especificada no fue encontrada.");
        }

        const charlasRef = collection(firebaseDb, "charlas");
        const qConstraints = [
            where("obraId", "==", obraId),
            orderBy("fechaCreacion", "desc")
        ];
        if (estado && estado !== 'todos') {
            qConstraints.push(where("estado", "==", estado));
        }

        const q = query(charlasRef, ...qConstraints);
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Charla));
        setCharlas(data);
        
      } catch (err) {
        console.error("Error al generar el listado:", err);
        setError(err instanceof Error ? err.message : "Un error ocurrió al cargar los datos.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [obraId, estado]);

  useEffect(() => {
    if (!loading && !error && charlas.length > 0) {
      setTimeout(() => window.print(), 500); 
    }
  }, [loading, error, charlas]);


  if (loading) {
    return <div className="p-8 text-center">Generando listado de charlas...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="bg-white min-h-screen p-4 sm:p-8 print:p-0">
        <style jsx global>{`
            @media print {
            body { background-color: #fff; color: #000; }
            .print-hidden { display: none !important; }
            .printable-area { box-shadow: none !important; border: none !important; padding: 0 !important; }
            }
            @page {
                size: A4 landscape;
                margin: 20mm;
            }
      `}</style>

      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6 print-hidden">
            <h1 className="text-xl font-bold">Vista Previa de Listado de Charlas</h1>
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.history.back()}>Volver</Button>
                <Button onClick={() => window.print()}>Imprimir / Guardar PDF</Button>
            </div>
        </div>

        <div className="printable-area p-8 border rounded-lg bg-card text-card-foreground shadow-md text-sm">
            <header className="mb-8">
                <div className="flex justify-between items-start border-b pb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-primary">PCG 2.0</h2>
                        <p className="text-muted-foreground">Reporte de Charlas de Seguridad</p>
                    </div>
                    <div className="text-right">
                        <p><strong className="font-semibold">Obra:</strong> {obra?.nombreFaena ?? 'N/A'}</p>
                        <p><strong className="font-semibold">Fecha Reporte:</strong> {new Date().toLocaleDateString('es-CL')}</p>
                         <p><strong className="font-semibold">Filtro Estado:</strong> {estado === 'todos' ? 'Todos' : estado}</p>
                    </div>
                </div>
            </header>

            <main>
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Título de la Charla</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha Creación</TableHead>
                        <TableHead>Fecha Realización</TableHead>
                        <TableHead>Ref. IPER</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {charlas.length === 0 
                        ? <TableRow><TableCell colSpan={5} className="text-center h-24">No hay charlas que coincidan con los filtros para este reporte.</TableCell></TableRow>
                        : charlas.map(charla => (
                            <TableRow key={charla.id}>
                                <TableCell className="font-medium">{charla.titulo}</TableCell>
                                <TableCell><EstadoBadge estado={charla.estado} /></TableCell>
                                <TableCell>{charla.fechaCreacion.toDate().toLocaleDateString('es-CL')}</TableCell>
                                <TableCell>{charla.fechaRealizacion ? charla.fechaRealizacion.toDate().toLocaleDateString('es-CL') : 'N/A'}</TableCell>
                                <TableCell className="font-mono text-xs">{charla.iperId.substring(0,8)}...</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </main>
        </div>
      </div>
    </div>
  );
}

export default function ImprimirListadoCharlasPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Cargando...</div>}>
            <ImprimirListadoCharlasInner/>
        </Suspense>
    )
}

