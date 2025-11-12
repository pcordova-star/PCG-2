"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { EmpresaContratista } from "../page";

type Obra = {
    id: string;
    nombreFaena: string;
    mandanteRazonSocial: string;
    direccion: string;
};

// We use a slightly different type here to accept the serialized date string
type SerializableEmpresaContratista = Omit<EmpresaContratista, 'fechaCreacion'> & {
    fechaCreacion: string;
};

type FichaContentProps = {
    empresa: SerializableEmpresaContratista;
    obra: Obra;
};

// Componente cliente para manejar interacciones como la impresión
export default function FichaContent({ empresa, obra }: FichaContentProps) {

    const handlePrint = () => {
        window.print();
    };

    const docItems = [
        { label: "Contrato marco / orden de compra", checked: empresa.contratoMarco },
        { label: "Certificado de mutual", checked: empresa.certificadoMutual },
        { label: "Certificado cotizaciones", checked: empresa.certificadoCotizaciones },
        { label: "Padrón de trabajadores", checked: empresa.padronTrabajadores },
        { label: "Reglamento interno", checked: empresa.reglamentoInterno },
        { label: "Matriz de riesgos / IPER", checked: empresa.matrizRiesgos },
        { label: "Procedimientos de trabajo seguro", checked: empresa.procedimientosTrabajoSeguro },
        { label: "Programa de trabajo", checked: empresa.programaTrabajo },
        { label: "Plan de emergencia propio", checked: empresa.planEmergenciaPropio },
        { label: "Registro capacitación interna", checked: empresa.registroCapacitacionInterna },
        { label: "Acta reunión inicial de coordinación", checked: empresa.actaReunionInicial },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-6">
             <style jsx global>{`
                @media print {
                body { background-color: #fff; color: #000; }
                .print-hidden { display: none !important; }
                .printable-area { 
                    box-shadow: none !important; 
                    border: none !important; 
                    padding: 0 !important; 
                }
                }
            `}</style>
            <div className="flex justify-between items-center print-hidden">
                <h1 className="text-xl font-bold">Ficha de Empresa Contratista DS44</h1>
                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <Link href="/prevencion/empresas-contratistas">Volver al Listado</Link>
                    </Button>
                    <Button onClick={handlePrint}>Imprimir / Exportar PDF</Button>
                </div>
            </div>

            <div className="printable-area p-8 border rounded-lg bg-card text-card-foreground shadow-md text-sm">
                <header className="mb-8">
                    <div className="flex justify-between items-start border-b pb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-primary">PCG 2.0</h2>
                            <p className="text-sm text-muted-foreground">{obra.mandanteRazonSocial}</p>
                        </div>
                        <div className="text-right text-sm">
                            <p><strong className="font-semibold">Obra:</strong> {obra.nombreFaena}</p>
                            <p><strong className="font-semibold">Fecha Evaluación:</strong> {new Date(empresa.fechaEvaluacion + 'T00:00:00').toLocaleDateString('es-CL')}</p>
                            <p><strong className="font-semibold">ID Empresa:</strong> <span className="font-mono text-xs">{empresa.id}</span></p>
                        </div>
                    </div>
                    <h3 className="text-center text-xl font-bold mt-4">
                        FICHA DE EVALUACIÓN DE EMPRESA CONTRATISTA / SUBCONTRATISTA – DS44
                    </h3>
                </header>

                <main className="space-y-6">
                    <section>
                        <h4 className="font-bold text-base mb-2 border-b pb-1">A. Datos de la Empresa</h4>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                            <p><strong>Razón Social:</strong> {empresa.razonSocial}</p>
                            <p><strong>RUT:</strong> {empresa.rut}</p>
                            <p><strong>Representante Legal:</strong> {empresa.representanteLegal}</p>
                            <p><strong>Tipo:</strong> {empresa.tipoEmpresa}</p>
                            <p><strong>Contacto:</strong> {empresa.contactoNombre}</p>
                             <p><strong>Teléfono / Email:</strong> {empresa.contactoTelefono} / {empresa.contactoEmail}</p>
                        </div>
                    </section>
                    
                    <section>
                        <h4 className="font-bold text-base mb-2 border-b pb-1">B. Documentación de Cumplimiento DS44</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                            {docItems.map((item, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <Checkbox id={`doc-${index}`} checked={item.checked} disabled />
                                    <Label htmlFor={`doc-${index}`}>{item.label}</Label>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section>
                        <h4 className="font-bold text-base mb-2 border-b pb-1">C. Evaluación y Observaciones</h4>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                            <p><strong>Estado Global:</strong> <span className="font-semibold">{empresa.estadoEvaluacion}</span></p>
                            <p><strong>Evaluado Por:</strong> {empresa.evaluador}</p>
                            <div className="col-span-2 space-y-1">
                                <p><strong>Observaciones Generales:</strong></p>
                                <p className="text-muted-foreground pl-4 border-l-2 ml-2 min-h-[40px]">{empresa.observacionesGenerales || "Sin observaciones."}</p>
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
                            <p className="font-semibold">Representante Empresa Contratista</p>
                            <p>Nombre y Firma</p>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
