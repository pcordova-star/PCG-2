"use client";

import { use, useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { Label } from '@/components/ui/label';

// Tipos de datos (deben coincidir con la página principal)
type Obra = {
  id: string;
  nombreFaena: string;
};

type EstadoGlobalDS44Obra =
  | "EN_IMPLEMENTACION"
  | "CUMPLE"
  | "CON_OBSERVACIONES"
  | "CRITICO";

type FichaDs44MandanteObra = {
    obraId: string;
    mandanteRazonSocial: string;
    mandanteRut: string;
    representanteLegal: string;
    responsableCoordinacionNombre: string;
    responsableCoordinacionCargo: string;
    responsableCoordinacionContacto: string;
    mutualidad: string;
    fechaInicioObra: string;
    fechaTerminoEstimado: string;
    existeReglamentoEspecial: boolean;
    existePlanUnicoSeguridad: boolean;
    existeProgramaCoordinacion: boolean;
    frecuenciaReunionesCoordinacion: string;
    mecanismosComunicacion: string;
    estadoGlobal: EstadoGlobalDS44Obra;
    observacionesGenerales: string;
    fechaUltimaRevision: string;
    revisadoPor: string;
    createdAt?: any;
    updatedAt?: any;
};

export default function ImprimirDs44MandantePage({ params }: { params: Promise<{ obraId: string }> }) {
  const [ficha, setFicha] = useState<FichaDs44MandanteObra | null>(null);
  const [obra, setObra] = useState<Obra | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { obraId } = use(params);

  useEffect(() => {
    if (!obraId) {
      setError("No se proporcionó un ID de obra.");
      setLoading(false);
      return;
    }

    const fetchDatos = async () => {
      setLoading(true);
      setError(null);
      try {
        const fichaRef = doc(firebaseDb, "obras", obraId, "ds44MandanteObra", "ficha");
        const fichaSnap = await getDoc(fichaRef);
        
        const obraRef = doc(firebaseDb, "obras", obraId);
        const obraSnap = await getDoc(obraRef);
        
        if (!obraSnap.exists()) {
             throw new Error("No se encontró la obra con el ID proporcionado.");
        }
        setObra({ id: obraSnap.id, ...obraSnap.data() } as Obra);

        if (fichaSnap.exists()) {
          setFicha({ obraId, ...fichaSnap.data() } as FichaDs44MandanteObra);
        } else {
           // Si no existe la ficha, creamos una vacía para poder imprimirla.
           setFicha({
            obraId,
            mandanteRazonSocial: "",
            mandanteRut: "",
            representanteLegal: "",
            responsableCoordinacionNombre: "",
            responsableCoordinacionCargo: "",
            responsableCoordinacionContacto: "",
            mutualidad: "",
            fechaInicioObra: "",
            fechaTerminoEstimado: "",
            existeReglamentoEspecial: false,
            existePlanUnicoSeguridad: false,
            existeProgramaCoordinacion: false,
            frecuenciaReunionesCoordinacion: "",
            mecanismosComunicacion: "",
            estadoGlobal: "EN_IMPLEMENTACION",
            observacionesGenerales: "",
            fechaUltimaRevision: new Date().toISOString().slice(0, 10),
            revisadoPor: "",
          });
        }

      } catch (err) {
        console.error("Error fetching DS44 record:", err);
        setError(err instanceof Error ? err.message : "Ocurrió un error al cargar la ficha DS44.");
      } finally {
        setLoading(false);
      }
    };

    fetchDatos();
  }, [obraId]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Cargando ficha DS44...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-destructive">{error}</div>;
  }

  if (!ficha || !obra) {
    return <div className="p-8 text-center text-muted-foreground">No se encontró el registro.</div>;
  }
  
  const getEstadoLabel = (estado: EstadoGlobalDS44Obra) => {
    switch (estado) {
        case "EN_IMPLEMENTACION": return "En implementación";
        case "CUMPLE": return "Cumple";
        case "CON_OBSERVACIONES": return "Cumple con observaciones";
        case "CRITICO": return "Crítico";
        default: return "No definido";
    }
  }

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
          <h1 className="text-xl font-bold">Vista Previa de Ficha DS44 Mandante / Obra</h1>
           <div className="flex gap-2">
             <Button asChild variant="outline">
                <Link href="/prevencion/ds44-mandante">Volver al formulario</Link>
            </Button>
            <Button onClick={() => window.print()}>Imprimir / Guardar PDF</Button>
          </div>
        </div>

        <div className="printable-area p-8 border rounded-lg bg-card text-card-foreground shadow-md text-sm">
            <header className="mb-8">
                <div className="flex justify-between items-start border-b pb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-primary">PCG 2.0</h2>
                        <p className="text-sm text-muted-foreground">{ficha.mandanteRazonSocial || 'Constructora Principal'}</p>
                    </div>
                    <div className="text-right text-sm">
                        <p><strong className="font-semibold">Obra:</strong> {obra.nombreFaena}</p>
                        <p><strong className="font-semibold">Última Revisión:</strong> {new Date(ficha.fechaUltimaRevision + 'T00:00:00').toLocaleDateString('es-CL')}</p>
                        <p><strong className="font-semibold">ID Obra:</strong> <span className="font-mono text-xs">{obra.id}</span></p>
                    </div>
                </div>
                <h3 className="text-center text-xl font-bold mt-4">
                    FICHA DE CUMPLIMIENTO DS44 – MANDANTE / OBRA
                </h3>
            </header>

            <main className="space-y-6">
                <section>
                    <h4 className="font-bold text-base mb-2 border-b pb-1">A. Datos del Mandante y de la Obra</h4>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                        <p><strong>Razón Social Mandante:</strong> {ficha.mandanteRazonSocial}</p>
                        <p><strong>RUT Mandante:</strong> {ficha.mandanteRut}</p>
                        <p><strong>Representante Legal:</strong> {ficha.representanteLegal}</p>
                        <p><strong>Mutualidad:</strong> {ficha.mutualidad}</p>
                        <p><strong>Fecha de Inicio:</strong> {ficha.fechaInicioObra ? new Date(ficha.fechaInicioObra + 'T00:00:00').toLocaleDateString('es-CL') : 'N/A'}</p>
                        <p><strong>Fecha de Término Estimado:</strong> {ficha.fechaTerminoEstimado ? new Date(ficha.fechaTerminoEstimado + 'T00:00:00').toLocaleDateString('es-CL') : 'N/A'}</p>
                    </div>
                </section>
                
                <section>
                    <h4 className="font-bold text-base mb-2 border-b pb-1">B. Responsable de Coordinación DS44</h4>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                        <p><strong>Nombre:</strong> {ficha.responsableCoordinacionNombre}</p>
                        <p><strong>Cargo:</strong> {ficha.responsableCoordinacionCargo}</p>
                        <p className="col-span-2"><strong>Contacto:</strong> {ficha.responsableCoordinacionContacto}</p>
                    </div>
                </section>
                
                <section>
                    <h4 className="font-bold text-base mb-2 border-b pb-1">C. Documentos y Coordinación DS44</h4>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                        <div className="flex items-center gap-2"><Checkbox id="c1" checked={ficha.existeReglamentoEspecial} disabled /><Label htmlFor="c1">Existe Reglamento Especial de Faena</Label></div>
                        <div className="flex items-center gap-2"><Checkbox id="c2" checked={ficha.existePlanUnicoSeguridad} disabled /><Label htmlFor="c2">Existe Plan de Seguridad Coordinado</Label></div>
                        <div className="flex items-center gap-2"><Checkbox id="c3" checked={ficha.existeProgramaCoordinacion} disabled /><Label htmlFor="c3">Existe Programa de Coordinación</Label></div>
                        <p><strong>Frecuencia Reuniones:</strong> {ficha.frecuenciaReunionesCoordinacion}</p>
                        <p className="col-span-2"><strong>Mecanismos de Comunicación:</strong> {ficha.mecanismosComunicacion}</p>
                    </div>
                </section>
                
                <section>
                    <h4 className="font-bold text-base mb-2 border-b pb-1">D. Estado Global y Observaciones</h4>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                        <p><strong>Estado Global:</strong> <span className="font-semibold">{getEstadoLabel(ficha.estadoGlobal)}</span></p>
                        <p><strong>Revisado Por:</strong> {ficha.revisadoPor}</p>
                        <div className="col-span-2 space-y-1">
                            <p><strong>Observaciones Generales:</strong></p>
                            <p className="text-muted-foreground pl-4 border-l-2 ml-2 min-h-[40px]">{ficha.observacionesGenerales || "Sin observaciones."}</p>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="mt-16 pt-8 border-t text-xs">
                <h4 className="font-semibold text-center mb-8">Firmas de Conformidad</h4>
                <div className="grid grid-cols-2 gap-12">
                    <div className="flex flex-col items-center">
                        <div className="w-full border-b mt-12 mb-2"></div>
                        <p className="font-semibold">Prevencionista de Riesgos (Constructora)</p>
                        <p>Nombre y Firma</p>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="w-full border-b mt-12 mb-2"></div>
                        <p className="font-semibold">Jefe de Obra (Constructora)</p>
                        <p>Nombre y Firma</p>
                    </div>
                </div>
            </footer>
        </div>
      </div>
    </div>
  );
}
