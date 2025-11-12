"use client";

import { useEffect, useState, use } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Copiamos el tipo de dato desde la página principal
type IPERRegistro = {
  id: string;
  obraId: string;
  obraNombre?: string;
  area: string;
  actividad: string;
  peligro: string;
  descripcionRiesgo: string;
  consecuencias: string;
  probabilidad: "Baja" | "Media" | "Alta";
  severidad: "Leve" | "Grave" | "Fatal";
  nivelRiesgo: "Tolerable" | "Importante" | "Intolerable";
  medidasControlExistentes: string;
  medidasControlPropuestas: string;
  responsableImplementacion: string;
  plazoImplementacion: string;
  fecha?: string;
  createdAt?: any;
};


export default function ImprimirIperPage({ params }: { params: Promise<{ id: string }> }) {
  const [registro, setRegistro] = useState<IPERRegistro | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { id: iperId } = use(params);

  useEffect(() => {
    if (!iperId) {
      setError("No se proporcionó un ID de registro IPER.");
      setLoading(false);
      return;
    }

    const fetchRegistro = async () => {
      setLoading(true);
      setError(null);
      try {
        const docRef = doc(firebaseDb, "iperRegistros", iperId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setRegistro({ id: docSnap.id, ...docSnap.data() } as IPERRegistro);
        } else {
          setError("No se encontró el registro IPER con el ID proporcionado.");
        }
      } catch (err) {
        console.error("Error fetching IPER record:", err);
        setError("Ocurrió un error al cargar el registro IPER desde Firestore.");
      } finally {
        setLoading(false);
      }
    };

    fetchRegistro();
  }, [iperId]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Cargando registro IPER...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-destructive">{error}</div>;
  }

  if (!registro) {
    return <div className="p-8 text-center text-muted-foreground">No se encontró el registro.</div>;
  }
  
  const fechaFormateada = registro.fecha ? new Date(registro.fecha + 'T00:00:00').toLocaleDateString('es-CL') : 'N/A';

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
          <h1 className="text-xl font-bold">Vista Previa de Ficha IPER</h1>
          <Button onClick={() => window.print()}>Imprimir / Guardar como PDF</Button>
        </div>

        <div className="printable-area p-8 border rounded-lg bg-card text-card-foreground shadow-md">
            {/* Encabezado del Documento */}
            <header className="mb-8">
                <div className="flex justify-between items-start border-b pb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-primary">PCG 2.0</h2>
                        <p className="text-sm text-muted-foreground">Constructora XYZ</p>
                    </div>
                    <div className="text-right text-sm">
                        <p><strong className="font-semibold">Obra:</strong> {registro.obraNombre || 'No especificada'}</p>
                        <p><strong className="font-semibold">Fecha:</strong> {fechaFormateada}</p>
                        <p><strong className="font-semibold">ID Registro:</strong> <span className="font-mono text-xs">{registro.id}</span></p>
                    </div>
                </div>
                <h3 className="text-center text-xl font-bold mt-4">
                    IDENTIFICACIÓN DE PELIGROS Y EVALUACIÓN DE RIESGOS (IPER)
                </h3>
            </header>

            {/* Cuerpo del Documento */}
            <main className="space-y-6 text-sm">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div><strong>Área / Frente de Trabajo:</strong> {registro.area}</div>
                <div><strong>Actividad Evaluada:</strong> {registro.actividad}</div>
              </div>
              
              <Separator />

              <div className="space-y-2">
                <h4 className="font-semibold text-base">Identificación del Peligro y Riesgo</h4>
                <p><strong>Peligro:</strong> {registro.peligro}</p>
                <p><strong>Riesgo:</strong> {registro.descripcionRiesgo}</p>
                <p><strong>Consecuencias Potenciales:</strong> {registro.consecuencias}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-semibold text-base">Evaluación del Riesgo</h4>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Probabilidad</TableHead>
                            <TableHead>Severidad</TableHead>
                            <TableHead>Nivel de Riesgo</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell>{registro.probabilidad}</TableCell>
                            <TableCell>{registro.severidad}</TableCell>
                            <TableCell className="font-bold">{registro.nivelRiesgo}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
              </div>

              <Separator />

              <div className="space-y-2">
                 <h4 className="font-semibold text-base">Medidas de Control</h4>
                 <div className="space-y-4">
                    <div>
                      <h5 className="font-semibold">Medidas Existentes:</h5>
                      <p className="text-muted-foreground pl-4 border-l-2 ml-2">{registro.medidasControlExistentes || "No se especifican."}</p>
                    </div>
                     <div>
                      <h5 className="font-semibold">Medidas Propuestas:</h5>
                      <p className="text-muted-foreground pl-4 border-l-2 ml-2">{registro.medidasControlPropuestas || "No se especifican."}</p>
                    </div>
                 </div>
              </div>

              <Separator />
               
              <div className="space-y-2">
                <h4 className="font-semibold text-base">Responsabilidades</h4>
                <p><strong>Responsable de Implementación:</strong> {registro.responsableImplementacion}</p>
                <p><strong>Plazo de Implementación:</strong> {registro.plazoImplementacion ? new Date(registro.plazoImplementacion + 'T00:00:00').toLocaleDateString('es-CL') : 'No especificado'}</p>
              </div>
            </main>

            {/* Pie de Página para Firmas */}
            <footer className="mt-16 pt-8 border-t text-xs">
                <h4 className="font-semibold text-center mb-8">Firmas de Conformidad y Recepción</h4>
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
                        <p className="font-semibold">Representante Trabajadores</p>
                         <p>Nombre y Firma</p>
                    </div>
                </div>
            </footer>
        </div>
      </div>
    </div>
  );
}
