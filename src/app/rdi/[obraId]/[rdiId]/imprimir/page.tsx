// src/app/rdi/[obraId]/[rdiId]/imprimir/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Rdi, Obra } from "@/types/pcg";
import { getRdiById } from "@/lib/rdi/rdiService";
import { getDoc, doc } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function RdiPrintPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const obraId = params.obraId as string;
  const rdiId = params.rdiId as string;

  const [rdi, setRdi] = useState<Rdi | null>(null);
  const [obra, setObra] = useState<Obra | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!obraId || !rdiId || !user) {
      if (!loading) setLoading(true);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const rdiData = await getRdiById(obraId, rdiId);
        if (!rdiData) {
          throw new Error("RDI no encontrado.");
        }
        setRdi(rdiData);

        const obraRef = doc(firebaseDb, "obras", obraId);
        const obraSnap = await getDoc(obraRef);
        if (obraSnap.exists()) {
          setObra({ id: obraSnap.id, ...obraSnap.data() } as Obra);
        } else {
          throw new Error("Obra no encontrada.");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [obraId, rdiId, user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-100">
        <Loader2 className="animate-spin mr-2" />
        Cargando documento...
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-destructive p-8 bg-slate-100">{error}</div>;
  }

  if (!rdi || !obra) {
    return (
      <div className="text-center text-muted-foreground p-8 bg-slate-100">
        No se encontraron los datos para generar el documento.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-6 print:bg-white print:py-0">
        <style jsx global>{`
            @media print {
                body { background-color: #fff; color: #000; }
                .print\\:hidden { display: none !important; }
            }
        `}</style>
      
      <div className="w-full max-w-4xl flex justify-between mb-4 print:hidden px-4">
        <Button onClick={() => router.back()} variant="outline">
          Volver
        </Button>
        <Button onClick={() => window.print()}>Imprimir / Guardar como PDF</Button>
      </div>

      <div className="w-full max-w-4xl bg-white text-black shadow-md rounded-md p-8 print:shadow-none print:rounded-none print:p-0">
        <header className="mb-8">
          <div className="flex justify-between items-start border-b pb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">{obra.empresa?.nombre || 'Constructora PCG'}</h2>
              <p className="text-sm text-gray-500">{obra.mandanteRazonSocial}</p>
            </div>
            <div className="text-right text-xs">
              <p>
                <strong className="font-semibold">Correlativo:</strong> {rdi.correlativo}
              </p>
            </div>
          </div>
          <h1 className="text-center text-2xl font-bold mt-6">
            Requerimiento de Información (RDI)
          </h1>
        </header>

        <main className="space-y-6 text-sm">
          <section>
            <h2 className="text-base font-semibold border-b pb-1 mb-2">Datos Generales</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              <div><span className="font-medium">Obra:</span> {obra.nombreFaena}</div>
              <div><span className="font-medium">Tipo:</span> {rdi.tipo}</div>
              <div><span className="font-medium">Especialidad:</span> {rdi.especialidad}</div>
              <div><span className="font-medium">Estado:</span> {rdi.estado}</div>
              <div><span className="font-medium">Prioridad:</span> {rdi.prioridad}</div>
              <div><span className="font-medium">Fecha Emisión:</span> {rdi.createdAt.toDate().toLocaleDateString('es-CL')}</div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold border-b pb-1 mb-2">Solicitante</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              <div><span className="font-medium">Nombre:</span> {rdi.solicitante.nombre}</div>
              <div><span className="font-medium">Email:</span> {rdi.solicitante.email}</div>
              <div className="col-span-2"><span className="font-medium">Cargo:</span> {rdi.solicitante.cargo || "No especificado"}</div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold border-b pb-1 mb-2">Destinatario</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              <div><span className="font-medium">Nombre:</span> {rdi.destinatario.nombre}</div>
              <div><span className="font-medium">Email:</span> {rdi.destinatario.email}</div>
              <div><span className="font-medium">Empresa:</span> {rdi.destinatario.empresa || "No especificada"}</div>
              <div><span className="font-medium">Cargo:</span> {rdi.destinatario.cargo || "No especificado"}</div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold border-b pb-1 mb-2">Requerimiento</h2>
            <div className="space-y-2">
                <p><span className="font-medium">Título:</span> {rdi.titulo}</p>
                <div>
                    <p className="font-medium">Descripción:</p>
                    <p className="text-gray-700 whitespace-pre-line mt-1">{rdi.descripcion}</p>
                </div>
            </div>
          </section>
          
          <section>
            <h2 className="text-base font-semibold border-b pb-1 mb-2">Plazos e Impacto en Programa</h2>
             <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <div><span className="font-medium">Plazo de respuesta (días):</span> {rdi.plazoRespuestaDias || "No especificado"}</div>
                <div><span className="font-medium">¿Afecta plazo de obra?:</span> {rdi.afectaPlazo ? 'Sí' : 'No'}</div>
                {rdi.afectaPlazo && <div><span className="font-medium">Días de aumento solicitados:</span> {rdi.diasAumentoSolicitados || "No especificado"}</div>}
                {rdi.afectaPlazo && <div><span className="font-medium">Días de aumento aprobados:</span> {rdi.diasAumentoAprobados || "No especificado"}</div>}
             </div>
          </section>

          {rdi.respuestaTexto && (
            <section>
              <h2 className="text-base font-semibold border-b pb-1 mb-2">Respuesta del Cliente</h2>
              <p className="text-gray-700 whitespace-pre-line">{rdi.respuestaTexto}</p>
            </section>
          )}

        </main>
        
        <footer className="mt-16 text-sm">
           <div className="grid grid-cols-2 gap-8">
            <div className="text-center">
              <div className="border-t border-black mt-8 pt-1">
                Firma representante Empresa
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-black mt-8 pt-1">
                Firma representante Cliente
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default RdiPrintPage;
