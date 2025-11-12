"use client";

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Copiamos el tipo de dato desde la página principal
type RegistroPlanAccion = {
  id: string;
  obraId: string;
  obraNombre?: string;
  origen: "IPER" | "INCIDENTE" | "OBSERVACION" | "OTRO";
  referencia: string; 
  descripcionAccion: string;
  responsable: string;
  plazo: string;
  estado: "Pendiente" | "En progreso" | "Cerrada";
  avance: string;
  observacionesCierre: string;
  fechaCreacion: string;
  creadoPor: string;
  createdAt?: any;
};

export default function ImprimirPlanAccionPage({ params }: { params: { id: string } }) {
  const [registro, setRegistro] = useState<RegistroPlanAccion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const planId = params.id;

  useEffect(() => {
    if (!planId) {
      setError("No se proporcionó un ID de plan de acción.");
      setLoading(false);
      return;
    }

    const fetchRegistro = async () => {
      setLoading(true);
      setError(null);
      try {
        const docRef = doc(firebaseDb, "planesAccion", planId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setRegistro({ id: docSnap.id, ...docSnap.data() } as RegistroPlanAccion);
        } else {
          setError("No se encontró el plan de acción con el ID proporcionado.");
        }
      } catch (err) {
        console.error("Error fetching plan de acción:", err);
        setError("Ocurrió un error al cargar el plan de acción desde Firestore.");
      } finally {
        setLoading(false);
      }
    };

    fetchRegistro();
  }, [planId]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Cargando Plan de Acción...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-destructive">{error}</div>;
  }

  if (!registro) {
    return <div className="p-8 text-center text-muted-foreground">No se encontró el registro.</div>;
  }
  
  const fechaFormateada = registro.fechaCreacion ? new Date(registro.fechaCreacion + 'T00:00:00').toLocaleDateString('es-CL') : 'N/A';

  return (
    <div className="bg-background min-h-screen p-4 sm:p-8">
      <style jsx global>{`
        @media print {
          body {
            background-color: #fff;
            color: #000;
          }
          .print-hidden {
            display: none !important;
          }
           .printable-area {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
          }
        }
      `}</style>
      
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6 print-hidden">
          <h1 className="text-xl font-bold">Vista Previa de Plan de Acción</h1>
          <Button onClick={() => window.print()}>Imprimir / Guardar como PDF</Button>
        </div>

        <div className="printable-area p-8 border rounded-lg bg-card text-card-foreground shadow-md">
            <header className="mb-8">
                <div className="flex justify-between items-start border-b pb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-primary">PCG 2.0</h2>
                        <p className="text-sm text-muted-foreground">Constructora XYZ</p>
                    </div>
                    <div className="text-right text-sm">
                        <p><strong className="font-semibold">Obra:</strong> {registro.obraNombre || 'No especificada'}</p>
                        <p><strong className="font-semibold">Fecha:</strong> {fechaFormateada}</p>
                        <p><strong className="font-semibold">ID Plan:</strong> <span className="font-mono text-xs">{registro.id}</span></p>
                    </div>
                </div>
                <h3 className="text-center text-xl font-bold mt-4">
                    PLAN DE ACCIÓN Y SEGUIMIENTO
                </h3>
            </header>

            <main className="space-y-6 text-sm">
              <div>
                <h4 className="font-semibold text-base mb-2">Información General</h4>
                <p><strong>Origen de la Acción:</strong> {registro.origen}</p>
                <p><strong>Referencia (ID Origen):</strong> {registro.referencia || 'N/A'}</p>
                <p><strong>Creado por:</strong> {registro.creadoPor || 'No especificado'}</p>
              </div>

              <div>
                <h4 className="font-semibold text-base mb-2">Acciones a Implementar</h4>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Acción Correctiva / Preventiva</TableHead>
                            <TableHead>Responsable</TableHead>
                            <TableHead>Plazo</TableHead>
                            <TableHead>Estado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell>{registro.descripcionAccion}</TableCell>
                            <TableCell>{registro.responsable}</TableCell>
                            <TableCell>{registro.plazo ? new Date(registro.plazo + 'T00:00:00').toLocaleDateString('es-CL') : 'N/A'}</TableCell>
                            <TableCell>{registro.estado}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
              </div>
              
               <div>
                <h4 className="font-semibold text-base mb-2">Seguimiento y Cierre</h4>
                <p><strong>Comentarios de Avance:</strong></p>
                <p className="text-muted-foreground pl-4 border-l-2 ml-2 min-h-[40px]">{registro.avance || "Sin comentarios."}</p>
                 <p className="mt-2"><strong>Observaciones de Cierre:</strong></p>
                <p className="text-muted-foreground pl-4 border-l-2 ml-2 min-h-[40px]">{registro.observacionesCierre || "Sin comentarios."}</p>
              </div>
            </main>

            <footer className="mt-16 pt-8 border-t text-xs">
                <h4 className="font-semibold text-center mb-8">Firmas de Conformidad y Revisión</h4>
                <div className="grid grid-cols-3 gap-12">
                    <div className="flex flex-col items-center">
                        <div className="w-full border-b mt-12 mb-2"></div>
                        <p className="font-semibold">Prevencionista de Riesgos</p>
                        <p>Nombre y Firma</p>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="w-full border-b mt-12 mb-2"></div>
                        <p className="font-semibold">Jefe de Obra / Supervisor</p>
                         <p>Nombre y Firma</p>
                    </div>
                     <div className="flex flex-col items-center">
                        <div className="w-full border-b mt-12 mb-2"></div>
                        <p className="font-semibold">Gerente de Proyecto</p>
                         <p>Nombre y Firma</p>
                    </div>
                </div>
            </footer>
        </div>
      </div>
    </div>
  );
}
