// src/app/terminos/page.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export function TermsAndConditionsContent() {
    return (
        <div className="prose prose-sm max-w-none text-gray-700">
            <p className="text-xs text-gray-500">Fecha de última actualización: 15/11/2025</p>
            
            <h3 className="text-base font-semibold mt-4">1. Aceptación de los Términos</h3>
            <p>
                Al crear una cuenta, iniciar sesión o utilizar la plataforma PCG – Plataforma de Control y Gestión de Obras (“PCG”, “la Plataforma”, “el Servicio”), el usuario (“Usuario”, “Cliente”) declara haber leído, entendido y aceptado estos Términos y Condiciones de Uso (“Términos”).
                Si el Usuario no está de acuerdo con estos Términos, no debe utilizar la Plataforma.
            </p>
            <p>
                En caso de que el Usuario utilice PCG en representación de una empresa, constructora, mandante o cualquier otra persona jurídica, declara y garantiza que cuenta con las autorizaciones necesarias para aceptar estos Términos en su nombre.
            </p>

            <h3 className="text-base font-semibold mt-4">2. Objeto del Servicio</h3>
            <p>
                PCG es una plataforma digital orientada a la planificación, control y gestión de obras, que puede incluir, entre otros, los siguientes módulos:
            </p>
            <ul>
                <li>Registro y gestión de obras.</li>
                <li>Presupuestos y control de costos.</li>
                <li>Programación de actividades.</li>
                <li>Gestión de calidad.</li>
                <li>Gestión de prevención de riesgos y cumplimiento normativo.</li>
                <li>Portal de información para clientes/mandantes.</li>
            </ul>
            <p>
                PCG no reemplaza las obligaciones legales, contractuales ni técnicas del Usuario, sino que actúa como una herramienta de apoyo a la gestión.
            </p>

            <h3 className="text-base font-semibold mt-4">3. Creación de cuenta y acceso</h3>
            <p>
                Para utilizar PCG es necesario crear una cuenta de Usuario y proporcionar información verdadera, actual y completa. El Usuario se compromete a:
            </p>
            <ul>
                <li>Mantener la confidencialidad de sus credenciales de acceso.</li>
                <li>Notificar de inmediato cualquier uso no autorizado de su cuenta.</li>
                <li>No compartir su usuario y contraseña con terceros sin autorización interna de la empresa.</li>
            </ul>
            <p>
                El Administrador de la empresa dentro de PCG es responsable de:
            </p>
             <ul>
                <li>Habilitar y deshabilitar accesos.</li>
                <li>Asignar los roles correctos a cada usuario.</li>
                <li>Revisar periódicamente los permisos.</li>
            </ul>
            <p>
                PCG podrá suspender o cancelar cuentas que incumplan estos Términos o que se usen de forma fraudulenta o ilícita.
            </p>
            
            <h3 className="text-base font-semibold mt-4">4. Licencia de uso</h3>
            <p>
                PCG otorga al Cliente una licencia limitada, no exclusiva, revocable e intransferible para utilizar la Plataforma, exclusivamente para la gestión de sus propias obras y actividades internas.
            </p>
            <p>
                Queda expresamente prohibido:
            </p>
            <ul>
                <li>Revender o sublicenciar el acceso a PCG.</li>
                <li>Intentar copiar, descompilar, desarmar o realizar ingeniería inversa del código.</li>
                <li>Utilizar la Plataforma para actividades ilícitas, difamatorias, fraudulentas o que infrinjan derechos de terceros.</li>
            </ul>

            <h3 className="text-base font-semibold mt-4">5. Contenido ingresado por el Usuario</h3>
             <p>
                Toda la información, documentos, fotografías, checklists, registros de avances, incidentes y demás datos cargados en PCG (“Contenido del Usuario”) son de propiedad del Cliente.
            </p>
            <p>
                El Cliente otorga a PCG una licencia limitada para:
            </p>
             <ul>
                <li>Almacenar, procesar y mostrar dicho contenido dentro de la Plataforma.</li>
                <li>Generar reportes, paneles e indicadores de gestión internos para el propio Cliente.</li>
            </ul>
            <p>
                PCG no utilizará el Contenido del Usuario para fines distintos a la prestación del servicio, salvo que cuente con autorización expresa o que los datos hayan sido anonimizados y agregados para fines estadísticos o de mejora del producto.
            </p>
            <p>
                El Cliente es el único responsable de:
            </p>
            <ul>
                <li>La veracidad, integridad y legalidad del contenido que carga.</li>
                <li>Contar con las autorizaciones necesarias para tratar datos personales de trabajadores, contratistas y terceros conforme a la normativa aplicable.</li>
            </ul>

            <h3 className="text-base font-semibold mt-4">6. Datos personales y confidencialidad</h3>
            <p>
                PCG se compromete a tratar los datos personales alojados en la Plataforma conforme a la legislación vigente aplicable y a adoptar medidas razonables de seguridad para su protección.
            </p>
            <p>
                Sin perjuicio de lo anterior, el Cliente reconoce que:
            </p>
            <ul>
                <li>Ningún sistema es 100% infalible.</li>
                <li>Es responsable de definir quién tiene acceso a qué información dentro de su organización.</li>
                <li>Debe informar a sus trabajadores y contratistas sobre el uso de herramientas digitales como PCG, cuando corresponda.</li>
            </ul>
            <p>
                PCG podrá acceder de forma limitada a la información del Cliente con fines de:
            </p>
            <ul>
                <li>Soporte técnico.</li>
                <li>Mejora y mantenimiento del servicio.</li>
                <li>Detección y prevención de incidentes de seguridad.</li>
            </ul>
            <p>Dicho acceso se realizará bajo criterios de confidencialidad y mínimo acceso necesario.</p>

            <h3 className="text-base font-semibold mt-4">7. Disponibilidad del servicio</h3>
            <p>
                PCG procurará mantener la Plataforma disponible de forma continua, pero no garantiza:
            </p>
            <ul>
                <li>Ausencia total de errores.</li>
                <li>Disponibilidad ininterrumpida.</li>
                <li>Acceso en todo momento y desde cualquier dispositivo o ubicación.</li>
            </ul>
            <p>
                PCG podrá realizar mantenimientos programados, actualizaciones o cambios de infraestructura que puedan afectar temporalmente la disponibilidad, procurando minimizar el impacto y, cuando sea razonable, informar al Cliente.
            </p>

            <h3 className="text-base font-semibold mt-4">8. Responsabilidad</h3>
            <p>
                PCG es una herramienta de apoyo a la gestión y no reemplaza:
            </p>
            <ul>
                <li>La responsabilidad técnica del constructor, prevencionista de riesgos, profesionales a cargo o representantes legales.</li>
                <li>El cumplimiento de leyes, reglamentos, normas técnicas ni contratos con mandantes o autoridades.</li>
            </ul>
            <p>
                En la máxima medida permitida por la ley, PCG no será responsable por:
            </p>
            <ul>
                <li>Pérdida de datos ocasionada por uso indebido del servicio, falta de copias de respaldo por parte del Cliente o fallas externas a la infraestructura de PCG.</li>
                <li>Daños indirectos, lucro cesante o pérdida de oportunidad de negocio.</li>
                <li>Multas, sanciones o reclamaciones derivadas de incumplimientos normativos del Cliente.</li>
            </ul>
            <p>
                El Cliente es responsable final del uso que haga de la información que le entrega la Plataforma y de las decisiones de gestión que adopte en base a ella.
            </p>

            <h3 className="text-base font-semibold mt-4">9. Precios, planes y facturación</h3>
            <p>
                El uso de PCG puede estar sujeto a planes de suscripción, cobros por número de obras activas u otros esquemas comerciales informados al Cliente.
            </p>
            <p>
                PCG se reserva el derecho de:
            </p>
            <ul>
                <li>Actualizar precios y condiciones comerciales, lo cual será informado con anticipación razonable.</li>
                <li>Suspender o limitar el acceso en caso de morosidad o incumplimientos de pago, según los contratos comerciales vigentes.</li>
            </ul>
            <p>
                Los detalles específicos de precios, facturación, plazos y moneda se regulan en las propuestas comerciales, órdenes de compra o contratos particulares suscritos entre PCG y cada Cliente.
            </p>

            <h3 className="text-base font-semibold mt-4">10. Duración y término</h3>
            <p>
                Estos Términos se aplican mientras el Cliente utilice la Plataforma.
                PCG o el Cliente podrán dar término a la relación contractual conforme a lo señalado en:
            </p>
             <ul>
                <li>Los contratos comerciales específicos.</li>
                <li>La legislación aplicable.</li>
            </ul>
             <p>
                Al término del servicio, PCG podrá:
            </p>
            <ul>
                <li>Mantener los datos por un plazo razonable para permitir su exportación, si así se acuerda.</li>
                <li>Eliminar o anonimizar los datos pasados los plazos definidos de conservación, salvo obligación legal de mantenerlos.</li>
            </ul>
             <p>
                Se recomienda al Cliente exportar sus datos críticos antes del término del servicio.
            </p>

            <h3 className="text-base font-semibold mt-4">11. Modificaciones de los Términos</h3>
            <p>
                PCG podrá modificar estos Términos para reflejar:
            </p>
            <ul>
                <li>Cambios legales o regulatorios.</li>
                <li>Nuevas funcionalidades o servicios.</li>
                <li>Ajustes de seguridad u operativos.</li>
            </ul>
            <p>
                Las modificaciones serán publicadas en la Plataforma y entrarán en vigor desde su publicación, salvo que se indique una fecha distinta.
                El uso continuado de PCG por parte del Cliente después de la notificación constituirá aceptación de los nuevos Términos.
            </p>

            <h3 className="text-base font-semibold mt-4">12. Ley aplicable y jurisdicción</h3>
            <p>
                Salvo que las partes acuerden algo distinto por escrito, estos Términos se rigen por las leyes de la República de Chile, y cualquier controversia relacionada con el uso de la Plataforma será sometida a los tribunales ordinarios de justicia competentes en Chile.
            </p>

            <h3 className="text-base font-semibold mt-4">13. Contacto</h3>
            <p>
                Para consultas relacionadas con estos Términos, soporte o temas contractuales, el Cliente puede contactar a PCG a través de los canales de soporte indicados en la Plataforma o en los documentos comerciales.
            </p>
        </div>
    );
}


export default function TerminosPage() {
    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6 md:p-8">
            <div className="max-w-4xl mx-auto">
                <Button asChild variant="outline" className="mb-4">
                    <Link href="/"><ArrowLeft className="mr-2 h-4 w-4"/>Volver al inicio</Link>
                </Button>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">Términos y Condiciones de Uso de PCG</CardTitle>
                    </CardHeader>
                    <CardContent>
                       <TermsAndConditionsContent />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
