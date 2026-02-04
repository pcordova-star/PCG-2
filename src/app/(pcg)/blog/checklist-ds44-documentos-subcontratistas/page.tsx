// src/app/(pcg)/blog/checklist-ds44-documentos-subcontratistas/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, FileWarning, Link as LinkIcon, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Checklist DS44: 11 Documentos Clave para Subcontratistas en Chile | PCG",
  description: "Conoce el checklist de los 11 documentos que el DS44 te exige para cada trabajador subcontratista en tu obra. Evita multas y agiliza tus estados de pago.",
};

const DocumentoItem = ({ numero, titulo, descripcion }: { numero: string, titulo: string, descripcion: string }) => (
    <div className="flex items-start gap-4 py-4 border-b last:border-b-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg flex-shrink-0">
            {numero}
        </div>
        <div>
            <h4 className="font-semibold text-foreground">{titulo}</h4>
            <p className="text-muted-foreground mt-1">{descripcion}</p>
        </div>
    </div>
);


export default function ChecklistDs44Page() {
    const router = useRouter();

    return (
        <div className="bg-slate-50 py-12">
            <div className="max-w-4xl mx-auto space-y-8 px-4">
                <header className="space-y-4">
                    <Button variant="outline" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver
                    </Button>
                    <div className="text-center">
                        <Badge variant="secondary" className="mb-4">Guía de Cumplimiento</Badge>
                        <h1 className="text-4xl font-bold tracking-tight text-primary">
                           Checklist DS44: Los 11 Documentos que Debes Exigir a tus Subcontratistas en Chile
                        </h1>
                        <p className="mt-4 text-lg max-w-3xl mx-auto text-muted-foreground">
                           La gestión documental de subcontratistas es uno de los mayores cuellos de botella administrativos y legales en la construcción. Descubre qué documentos son obligatorios y cómo un sistema digital puede transformar este proceso de un riesgo a una ventaja competitiva.
                        </p>
                    </div>
                </header>

                <main className="prose prose-lg max-w-none mx-auto bg-white p-8 rounded-xl shadow-sm border">
                    <p>
                        Para cualquier constructora en Chile, la gestión de subcontratistas es un pilar fundamental de la operación. Sin embargo, también representa uno de los mayores "dolores de cabeza" administrativos. La persecución de documentos por correo, el desorden de carpetas en Drive y la incertidumbre sobre si un subcontratista está al día para liberar su estado de pago son problemas que consumen cientos de horas y exponen a la empresa principal a serios riesgos legales.
                    </p>
                    <p>
                        El Decreto Supremo 44 (DS44), que modifica el DS 76 sobre la Gestión de la Seguridad y Salud en el Trabajo en Obras, vino a reforzar estas obligaciones, estableciendo un marco claro de responsabilidades. No cumplirlo no es una opción.
                    </p>

                    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 my-6 rounded-r-lg">
                        <h3 className="font-semibold text-amber-900 mt-0">¿Qué es el DS44 y por qué te impacta directamente?</h3>
                        <p className="text-amber-800 text-sm">
                            El DS44 establece que la empresa principal (mandante o constructora) es <strong>responsable solidaria</strong> de la seguridad y salud de todos los trabajadores en la faena, incluyendo los de sus empresas contratistas y subcontratistas. Esto significa que, ante un accidente o una fiscalización de la Dirección del Trabajo, la empresa principal responde como si el trabajador fuera propio. La única forma de demostrar una gestión diligente es a través de un control documental riguroso y sistemático.
                        </p>
                    </div>
                    
                    <h2 className="text-2xl font-bold">El Checklist Definitivo: Los 11 Documentos del DS44 para Cada Trabajador Subcontratista</h2>
                    <p>
                        Para asegurar el cumplimiento y proteger a tu empresa, debes solicitar, verificar y mantener al día una carpeta digital por cada trabajador de tus subcontratos. Este es el checklist esencial que no puede faltar:
                    </p>
                    
                    <div className="not-prose my-8 space-y-2">
                        <DocumentoItem 
                            numero="01"
                            titulo="Contrato de Trabajo Vigente"
                            descripcion="Verifica que las condiciones (cargo, jornada, obra) coincidan con la realidad. Debe estar firmado por ambas partes."
                        />
                        <DocumentoItem 
                            numero="02"
                            titulo="Certificado de Afiliación a Mutualidad"
                            descripcion="Confirma que el trabajador está cubierto por un organismo administrador de la Ley 16.744 (ACHS, Mutual, IST, etc.)."
                        />
                        <DocumentoItem 
                            numero="03"
                            titulo="Certificado de Cotizaciones Previsionales"
                            descripcion="Comprueba el pago de AFP, Salud (Fonasa/Isapre) y Seguro de Cesantía del mes anterior al trabajado. Indispensable para la Ley de Subcontratación."
                        />
                        <DocumentoItem 
                            numero="04"
                            titulo="Examen de Aptitud Vigente"
                            descripcion="También conocido como Examen Médico Pre-Ocupacional, debe ser específico para los riesgos del cargo (ej. altura física, espacios confinados)."
                        />
                         <DocumentoItem 
                            numero="05"
                            titulo="Registro de Inducción o “Derecho a Saber” (DAS)"
                            descripcion="Debe estar firmado por el trabajador y detallar los riesgos específicos a los que estará expuesto en su puesto de trabajo en TU obra."
                        />
                         <DocumentoItem 
                            numero="06"
                            titulo="Registro de Entrega de EPP"
                            descripcion="Documento que acredita que el trabajador recibió los Elementos de Protección Personal necesarios para su labor, firmado y fechado."
                        />
                         <DocumentoItem 
                            numero="07"
                            titulo="Copia del Reglamento Interno de Orden, Higiene y Seguridad (RIOHS)"
                            descripcion="La empresa subcontratista debe entregar a sus trabajadores el RIOHS, y tú debes tener el registro de esa entrega."
                        />
                         <DocumentoItem 
                            numero="08"
                            titulo="Registro de la Jornada de Trabajo"
                            descripcion="Copia del sistema de control de asistencia (libro, sistema electrónico) que demuestre el cumplimiento de la jornada laboral y horas extras."
                        />
                         <DocumentoItem 
                            numero="09"
                            titulo="Certificado de Antecedentes"
                            descripcion="Requerido para roles específicos que implican manejo de valores, seguridad o acceso a zonas sensibles, según el reglamento de la obra."
                        />
                         <DocumentoItem 
                            numero="10"
                            titulo="Licencias y Certificaciones del Cargo"
                            descripcion="Indispensable para operadores de maquinaria, eléctricos autorizados (SEC), soldadores calificados, etc. Deben estar vigentes."
                        />
                         <DocumentoItem 
                            numero="11"
                            titulo="Liquidaciones de Sueldo Firmadas"
                            descripcion="Acredita el pago de remuneraciones, complementando el certificado de cotizaciones para el cumplimiento laboral."
                        />
                    </div>

                    <h2 className="text-2xl font-bold">Los Errores Comunes al Gestionar estos Documentos Manualmente</h2>
                     <ul className="list-disc pl-5">
                        <li><strong>Información Dispersa:</strong> Documentos en correos, otros en WhatsApp, algunos en carpetas físicas. Imposible tener una visión unificada.</li>
                        <li><strong>Versiones Desactualizadas:</strong> Se aprueba un estado de pago con un certificado de mutualidad que venció la semana pasada.</li>
                        <li><strong>Proceso Reactivo:</strong> La revisión documental se hace a fin de mes, bajo presión, en lugar de ser un proceso continuo que garantice el cumplimiento diario.</li>
                        <li><strong>Falta de Trazabilidad:</strong> No queda registro de quién aprobó, rechazó o solicitó un documento, lo que dificulta las auditorías y la defensa ante fiscalizaciones.</li>
                    </ul>

                     <h2 className="text-2xl font-bold">Cómo Digitalizar el Cumplimiento DS44 para Evitar Errores</h2>
                    <p>
                        La única forma de gestionar esta complejidad a escala es mediante una plataforma digital diseñada para ello. Un software de control de subcontratistas como PCG transforma este proceso:
                    </p>
                    <ol className="list-decimal pl-5">
                        <li><strong>Centralización Total:</strong> Todos los documentos de todas las empresas y todos sus trabajadores viven en un solo lugar, organizados por obra y período.</li>
                        <li><strong>Portal de Autogestión para Subcontratistas:</strong> En lugar de perseguirlos, cada subcontratista recibe un acceso para cargar su documentación. La plataforma les notifica automáticamente qué falta y cuándo vence.</li>
                        <li><strong>Flujos de Aprobación Claros:</strong> Tu equipo de prevención o administración recibe los documentos para revisar, aprobar u observar con comentarios, creando una trazabilidad completa.</li>
                        <li><strong>Dashboard de Cumplimiento en Tiempo Real:</strong> Con un solo vistazo, sabes qué empresas están "en verde" para liberar su estado de pago, eliminando el principal cuello de botella del proceso.</li>
                    </ol>

                    <div className="bg-blue-50 border-l-4 border-blue-400 p-6 my-8 rounded-r-lg not-prose">
                        <h3 className="font-semibold text-blue-900 mt-0 text-xl">El Verdadero Costo de No Digitalizar</h3>
                        <p className="text-blue-800 text-base">
                           Retrasar un estado de pago por desorden documental no solo genera fricción con tus colaboradores, sino que impacta directamente la cadena de pagos y el avance de la obra. Un sistema digital no es un gasto, es una inversión en continuidad operacional.
                        </p>
                        <Button asChild className="mt-4" size="lg">
                            <Link href="/control-subcontratistas-ds44">
                                <ShieldCheck className="mr-2" />
                                Descubre cómo PCG automatiza tu cumplimiento
                            </Link>
                        </Button>
                    </div>

                </main>
            </div>
        </div>
    );
}
