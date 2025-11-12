"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebaseClient';
import { Button } from '@/components/ui/button';
import { InduccionAccesoFaena } from '@/lib/induccionAccesoFaena';

// Interfaz para los datos de la obra (ajusta según tu modelo de datos)
interface Obra {
  id?: string;
  nombreFaena: string;
  mandante?: string;
  direccion?: string;
  codigoInterno?: string;
  mandanteRazonSocial?: string;
  mandanteRut?: string;
  prevencionistaNombre?: string;
  jefeObraNombre?: string;
}

export default function ImprimirInduccionPage() {
  const { id } = useParams<{ id: string }>();
  const [induccion, setInduccion] = useState<InduccionAccesoFaena | null>(null);
  const [obra, setObra] = useState<Obra | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!id) {
      setError("No se proporcionó un ID de registro.");
      setLoading(false);
      return;
    }

    const fetchDatos = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Cargar la inducción
        const induccionRef = doc(firebaseDb, "induccionesAccesoFaena", id);
        const induccionSnap = await getDoc(induccionRef);

        if (!induccionSnap.exists()) {
          throw new Error("No se encontró el registro de inducción con el ID proporcionado.");
        }
        const induccionData = { id: induccionSnap.id, ...induccionSnap.data() } as InduccionAccesoFaena;
        setInduccion(induccionData);

        // 2. Cargar la obra asociada
        const obraRef = doc(firebaseDb, "obras", induccionData.obraId);
        const obraSnap = await getDoc(obraRef);

        if (!obraSnap.exists()) {
          throw new Error("No se encontró la obra asociada a esta inducción.");
        }
        const obraData = { id: obraSnap.id, ...obraSnap.data() } as Obra;
        setObra(obraData);

      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : "Ocurrió un error al cargar los datos.");
      } finally {
        setLoading(false);
      }
    };

    fetchDatos();
  }, [id]);
  
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const boolToTexto = (valor?: boolean) => (valor ? "Sí" : "No");

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Cargando registro...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-destructive">{error}</div>;
  }

  if (!induccion || !obra) {
    return <div className="p-8 text-center text-muted-foreground">No se encontraron los datos.</div>;
  }

  return (
    <div className="bg-background min-h-screen p-4 sm:p-8 print:bg-white print:p-0">
      <style jsx global>{`
        @media print {
          body { background-color: #fff; color: #000; }
          .print-hidden { display: none !important; }
          .printable-area { box-shadow: none !important; border: none !important; padding: 0 !important; }
        }
      `}</style>
      
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-center print-hidden">
          <h1 className="text-xl font-bold">Vista Previa de Ficha de Inducción</h1>
          <div className='flex gap-2'>
            <Button variant="outline" onClick={() => window.history.back()}>Volver</Button>
            <Button onClick={handlePrint}>Imprimir / Guardar PDF</Button>
          </div>
        </div>

        <div className="printable-area p-8 border rounded-lg bg-card text-card-foreground shadow-md text-sm">
            {/* Encabezado */}
            <header className="mb-6 border-b pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-primary">Inducción de Acceso a Faena</h2>
                  <p className="text-muted-foreground">Registro de Visitas / Proveedores / Inspectores</p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-bold text-lg">PCG 2.0</p>
                  <p className="font-mono text-muted-foreground">ID: {induccion.id}</p>
                </div>
              </div>
            </header>

            {/* Datos de la Obra */}
            <section className="mb-6">
              <h3 className="font-bold text-base mb-2 border-b pb-1">1. Datos de la Obra</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <p><strong>Razón Social:</strong> {obra.mandanteRazonSocial || 'No especificada'}</p>
                <p><strong>RUT:</strong> {obra.mandanteRut || 'No especificado'}</p>
                <p><strong>Nombre de Obra:</strong> {obra.nombreFaena}</p>
                <p><strong>Código Obra:</strong> {obra.id}</p>
                <p><strong>Mandante:</strong> {obra.mandante || 'No especificado'}</p>
                <p><strong>Ubicación:</strong> {obra.direccion || 'No especificada'}</p>
                <p><strong>Jefe de Obra:</strong> {obra.jefeObraNombre || 'No especificado'}</p>
                <p><strong>Prevencionista:</strong> {obra.prevencionistaNombre || 'No especificado'}</p>
              </div>
            </section>

            {/* Datos de la Persona */}
            <section className="mb-6">
              <h3 className="font-bold text-base mb-2 border-b pb-1">2. Datos de la Persona</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <p><strong>Tipo de Visita:</strong> {induccion.tipoVisita}</p>
                <p><strong>Nombre Completo:</strong> {induccion.nombreCompleto}</p>
                <p><strong>RUT:</strong> {induccion.rut}</p>
                <p><strong>Empresa:</strong> {induccion.empresa}</p>
                <p><strong>Cargo:</strong> {induccion.cargo}</p>
                <p><strong>Teléfono:</strong> {induccion.telefono}</p>
                <p><strong>Correo:</strong> {induccion.correo}</p>
              </div>
            </section>
            
            {/* Datos de Ingreso */}
            <section className="mb-6">
              <h3 className="font-bold text-base mb-2 border-b pb-1">3. Datos del Ingreso</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <p><strong>Fecha Ingreso:</strong> {induccion.fechaIngreso}</p>
                <p><strong>Hora Ingreso:</strong> {induccion.horaIngreso}</p>
              </div>
            </section>

            {/* Comprensión y Aceptación */}
            <section className="mb-6">
              <h3 className="font-bold text-base mb-2 border-b pb-1">4. Comprensión y Aceptación</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold">Preguntas de Comprensión</h4>
                  <ul className="list-disc pl-5 text-muted-foreground">
                    <li>¿Debe respetar siempre las indicaciones del personal de la obra? <strong>({induccion.respuestaPregunta1})</strong></li>
                    <li>¿Está permitido caminar bajo cargas suspendidas? <strong>({induccion.respuestaPregunta2})</strong></li>
                    <li>En caso de emergencia, ¿debe seguir las rutas de evacuación? <strong>({induccion.respuestaPregunta3})</strong></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold">Declaraciones y Compromisos</h4>
                  <ul className="list-disc pl-5 text-muted-foreground">
                    <li>Declara haber leído y comprendido el Reglamento Especial: <strong>{boolToTexto(induccion.aceptaReglamento)}</strong></li>
                    <li>Se compromete a utilizar los EPP requeridos: <strong>{boolToTexto(induccion.aceptaEpp)}</strong></li>
                    <li>Acepta el tratamiento de sus datos personales: <strong>{boolToTexto(induccion.aceptaTratamientoDatos)}</strong></li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Firma */}
            <section>
              <h3 className="font-bold text-base mb-2 border-b pb-1">5. Firma de Aceptación</h3>
              <div className="border rounded-md bg-muted/20 p-4 h-40 flex items-center justify-center">
                {induccion.firmaDataUrl ? (
                  <img src={induccion.firmaDataUrl} alt="Firma del visitante" className="max-h-full max-w-full object-contain" />
                ) : (
                  <p className="text-muted-foreground">No se registró firma digital.</p>
                )}
              </div>
              <div className="mt-2 text-center text-xs text-muted-foreground">
                <p>Firma del visitante / proveedor / inspector</p>
                <p>Fecha: {induccion.fechaIngreso} - Hora: {induccion.horaIngreso}</p>
              </div>
            </section>
        </div>
      </div>
    </div>
  );
}
