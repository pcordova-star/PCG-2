// src/app/obras/[obraId]/rdi/[rdiId]/imprimir/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Rdi, Obra } from "@/types/pcg";
import { getRdiById } from "@/lib/rdi/rdiService";
import { getDoc, doc } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebaseClient";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function RdiPrintPage() {
  const params = useParams();
  const { user } = useAuth();

  const obraId = params.obraId as string;
  const rdiId = params.rdiId as string;

  const [rdi, setRdi] = useState<Rdi | null>(null);
  const [obra, setObra] = useState<Obra | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!obraId || !rdiId || !user) return;

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
    return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin mr-2" />Cargando documento...</div>;
  }
  
  if (error) {
    return <div className="text-center text-destructive p-8">{error}</div>;
  }
  
  if (!rdi || !obra) {
    return <div className="text-center text-muted-foreground p-8">No se encontraron los datos para generar el documento.</div>;
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
                <h1 className="text-xl font-bold">Vista Previa de RDI</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => window.history.back()}>Volver</Button>
                    <Button onClick={() => window.print()}>Imprimir / Guardar como PDF</Button>
                </div>
            </div>

            <div className="printable-area p-8 border rounded-lg bg-card text-card-foreground shadow-md text-sm">
                <header className="mb-8">
                    <div className="flex justify-between items-start border-b pb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-primary">PCG 2.0</h2>
                            <p className="text-sm text-muted-foreground">{obra.empresa?.nombre || 'Constructora Principal'}</p>
                        </div>
                        <div className="text-right text-sm">
                            <p><strong className="font-semibold">RDI:</strong> {rdi.correlativo}</p>
                            <p><strong className="font-semibold">Fecha Emisión:</strong> {rdi.createdAt.toDate().toLocaleDateString('es-CL')}</p>
                        </div>
                    </div>
                    <h3 className="text-center text-xl font-bold mt-4">
                        Requerimiento de Información (RDI)
                    </h3>
                </header>

                <main className="space-y-6">
                    <section>
                        <h4 className="font-bold text-base mb-2 border-b pb-1">Datos Generales</h4>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                            <p><strong>Obra:</strong> {obra.nombreFaena}</p>
                            <p><strong>Tipo:</strong> {rdi.tipo}</p>
                            <p><strong>Especialidad:</strong> {rdi.especialidad}</p>
                            <p><strong>Prioridad:</strong> {rdi.prioridad}</p>
                             <p><strong>Estado:</strong> {rdi.estado}</p>
                        </div>
                    </section>
                    <section>
                        <h4 className="font-bold text-base mb-2 border-b pb-1">Solicitante</h4>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                           <p><strong>Nombre:</strong> {rdi.solicitante.nombre}</p>
                           <p><strong>Email:</strong> {rdi.solicitante.email}</p>
                           <p><strong>Cargo:</strong> {rdi.solicitante.cargo || "No especificado"}</p>
                        </div>
                    </section>
                     <section>
                        <h4 className="font-bold text-base mb-2 border-b pb-1">Destinatario</h4>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                           <p><strong>Nombre:</strong> {rdi.destinatario.nombre}</p>
                           <p><strong>Email:</strong> {rdi.destinatario.email}</p>
                           <p><strong>Empresa:</strong> {rdi.destinatario.empresa || "No especificada"}</p>
                           <p><strong>Cargo:</strong> {rdi.destinatario.cargo || "No especificado"}</p>
                        </div>
                    </section>
                    <section>
                        <h4 className="font-bold text-base mb-2 border-b pb-1">Requerimiento</h4>
                         <p className="font-semibold">{rdi.titulo}</p>
                         <p className="text-muted-foreground whitespace-pre-line mt-2">{rdi.descripcion}</p>
                    </section>
                     <section>
                        <h4 className="font-bold text-base mb-2 border-b pb-1">Plazos e Impacto</h4>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                            <p><strong>Plazo de Respuesta Solicitado:</strong> {rdi.plazoRespuestaDias ? `${rdi.plazoRespuestaDias} días` : 'No especificado'}</p>
                            <p><strong>¿Afecta Plazo de Obra?:</strong> {rdi.afectaPlazo ? 'Sí' : 'No'}</p>
                            {rdi.afectaPlazo && <p><strong>Días de Aumento Solicitados:</strong> {rdi.diasAumentoSolicitados || 'No especificado'}</p>}
                        </div>
                    </section>
                </main>
                <footer className="mt-16 pt-8 border-t text-xs">
                    <h4 className="font-semibold text-center mb-8">Firmas</h4>
                    <div className="grid grid-cols-2 gap-12">
                        <div className="flex flex-col items-center">
                            <div className="w-full border-b mt-12 mb-2"></div>
                            <p className="font-semibold">Firma Solicitante</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-full border-b mt-12 mb-2"></div>
                            <p className="font-semibold">Firma Destinatario (Recepción)</p>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    </div>
  );
}

export default RdiPrintPage;
