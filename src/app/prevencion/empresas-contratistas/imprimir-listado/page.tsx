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
type ObraPrevencion = {
  id: string;
  nombreFaena: string;
};

type EstadoEvaluacionEmpresa = "POR_EVALUAR" | "APROBADA" | "APROBADA_CON_OBSERVACIONES" | "RECHAZADA";

type EmpresaContratista = {
  id: string;
  obraId: string;
  razonSocial: string;
  rut: string;
  estadoEvaluacion: EstadoEvaluacionEmpresa;
  evaluador: string;
  fechaEvaluacion: string;
  // Añadimos los campos de documentos para el conteo
  contratoMarco: boolean; certificadoMutual: boolean; certificadoCotizaciones: boolean;
  padronTrabajadores: boolean; reglamentoInterno: boolean; matrizRiesgos: boolean;
  procedimientosTrabajoSeguro: boolean; programaTrabajo: boolean; planEmergenciaPropio: boolean;
  registroCapacitacionInterna: boolean; actaReunionInicial: boolean;
};

// --- Funciones de Ayuda (Reutilizadas) ---
function EstadoBadge({ estado }: { estado: EstadoEvaluacionEmpresa }) {
    const classNames: Record<EstadoEvaluacionEmpresa, string> = {
        'POR_EVALUAR': 'bg-gray-100 text-gray-800 border-gray-300',
        'APROBADA': 'bg-green-100 text-green-800 border-green-300',
        'APROBADA_CON_OBSERVACIONES': 'bg-yellow-100 text-yellow-800 border-yellow-300',
        'RECHAZADA': 'bg-red-100 text-red-800 border-red-300'
    };
    const labels: Record<EstadoEvaluacionEmpresa, string> = {
        'POR_EVALUAR': 'Por Evaluar',
        'APROBADA': 'Aprobada',
        'APROBADA_CON_OBSERVACIONES': 'Con Observaciones',
        'RECHAZADA': 'Rechazada'
    };
    return <Badge variant="outline" className={cn(classNames[estado] || 'bg-gray-100', 'font-semibold')}>{labels[estado]}</Badge>;
}

function countDocsOk(empresa: EmpresaContratista): number {
    const docs = [
        empresa.contratoMarco, empresa.certificadoMutual, empresa.certificadoCotizaciones,
        empresa.padronTrabajadores, empresa.reglamentoInterno, empresa.matrizRiesgos,
        empresa.procedimientosTrabajoSeguro, empresa.programaTrabajo, empresa.planEmergenciaPropio,
        empresa.registroCapacitacionInterna, empresa.actaReunionInicial
    ];
    return docs.filter(Boolean).length;
}


function ImprimirListadoInner() {
  const searchParams = useSearchParams();
  const obraId = searchParams.get('obraId');
  const estado = searchParams.get('estado') as EstadoEvaluacionEmpresa | 'TODOS' | null;

  const [obra, setObra] = useState<ObraPrevencion | null>(null);
  const [empresas, setEmpresas] = useState<EmpresaContratista[]>([]);
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
        // Cargar datos de la obra
        const obraRef = doc(firebaseDb, 'obras', obraId);
        const obraSnap = await getDoc(obraRef);
        if (obraSnap.exists()) {
          setObra({ id: obraSnap.id, nombreFaena: obraSnap.data().nombreFaena });
        } else {
          throw new Error("La obra especificada no fue encontrada.");
        }

        // Cargar empresas
        const empresasRef = collection(firebaseDb, "empresasContratistas");
        const qConstraints = [
            where("obraId", "==", obraId),
            orderBy("razonSocial", "asc")
        ];
        if (estado && estado !== 'TODOS') {
            qConstraints.push(where("estadoEvaluacion", "==", estado));
        }

        const q = query(empresasRef, ...qConstraints);
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as EmpresaContratista));
        setEmpresas(data);
        
      } catch (err) {
        console.error("Error al generar el listado:", err);
        setError(err instanceof Error ? err.message : "Un error ocurrió al cargar los datos.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [obraId, estado]);

  // Disparar la impresión una vez que los datos estén cargados
  useEffect(() => {
    if (!loading && !error && empresas.length > 0) {
      setTimeout(() => window.print(), 500); // Pequeño delay para asegurar renderizado
    }
  }, [loading, error, empresas]);


  if (loading) {
    return <div className="p-8 text-center">Generando listado...</div>;
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
            <h1 className="text-xl font-bold">Vista Previa de Listado de Empresas</h1>
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
                        <p className="text-muted-foreground">Reporte de Empresas Contratistas DS44</p>
                    </div>
                    <div className="text-right">
                        <p><strong className="font-semibold">Obra:</strong> {obra?.nombreFaena ?? 'N/A'}</p>
                        <p><strong className="font-semibold">Fecha Reporte:</strong> {new Date().toLocaleDateString('es-CL')}</p>
                         <p><strong className="font-semibold">Filtro Estado:</strong> {estado === 'TODOS' ? 'Todos' : estado}</p>
                    </div>
                </div>
            </header>

            <main>
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Razón Social / RUT</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Docs OK</TableHead>
                        <TableHead>Evaluador</TableHead>
                        <TableHead>Fecha Evaluación</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {empresas.length === 0 
                        ? <TableRow><TableCell colSpan={5} className="text-center h-24">No hay empresas que coincidan con los filtros para este reporte.</TableCell></TableRow>
                        : empresas.map(emp => (
                            <TableRow key={emp.id}>
                                <TableCell>
                                    <div className="font-medium">{emp.razonSocial}</div>
                                    <div className="text-xs text-muted-foreground">{emp.rut}</div>
                                </TableCell>
                                <TableCell><EstadoBadge estado={emp.estadoEvaluacion} /></TableCell>
                                <TableCell className="font-semibold">{countDocsOk(emp)} / 11</TableCell>
                                <TableCell>{emp.evaluador}</TableCell>
                                <TableCell>{emp.fechaEvaluacion}</TableCell>
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

export default function ImprimirListadoPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Cargando...</div>}>
            <ImprimirListadoInner/>
        </Suspense>
    )
}
