
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { firebaseDb } from "@/lib/firebaseClient";
import { collection, doc, getDoc, getDocs, query, where, orderBy } from "firebase/firestore";

// Tipos de datos que vienen de Firestore
type Obra = {
  id: string;
  nombreFaena: string;
  direccion: string;
  clienteEmail: string;
};

type AvanceDiario = {
  id: string;
  obraId: string;
  fecha: string; // "YYYY-MM-DD"
  porcentajeAvance: number; // 0-100
  comentario: string;
  fotoUrl?: string;
  fotos?: string[];
  visibleParaCliente: boolean;
  creadoPor: string;
};

// Función auxiliar para calcular los días desde una fecha
function getDiasDesde(fechaIso: string | null): number | null {
  if (!fechaIso) return null;
  const hoy = new Date();
  const [year, month, day] = fechaIso.split('-').map(Number);
  const f = new Date(Date.UTC(year, month - 1, day));
  
  hoy.setUTCHours(0, 0, 0, 0);

  const diffMs = hoy.getTime() - f.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDias < 0 ? 0 : diffDias;
}

// El componente ahora es async para poder usar `await`
export default async function ClienteObraPage({
  params,
}: {
  params: { obraId: string };
}) {
  // Se espera la resolución de los parámetros de la ruta
  const { obraId } = params;

  // 1. Obtener los datos de la obra desde Firestore
  const obraRef = doc(firebaseDb, "obras", obraId);
  const obraSnap = await getDoc(obraRef);

  if (!obraSnap.exists()) {
    return (
      <section className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Obra no encontrada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              La obra que estás intentando visualizar no existe o ya no está
              disponible en el panel del cliente. El ID buscado fue: {obraId}
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  const obra = { id: obraSnap.id, ...obraSnap.data() } as Obra;

  // 2. Obtener los avances de la obra desde Firestore
  const avancesColRef = collection(firebaseDb, "avancesDiarios");
  const q = query(
    avancesColRef,
    where("obraId", "==", obraId),
    where("visibleParaCliente", "==", true),
    orderBy("fecha", "desc")
  );
  const avancesSnap = await getDocs(q);

  const avancesObra = avancesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
  })) as AvanceDiario[];


  const ultimoAvance = avancesObra[0];
  const porcentajeActual = ultimoAvance?.porcentajeAvance ?? 0;
  const ultimaFecha = ultimoAvance?.fecha ?? null;
  const diasDesdeUltima = getDiasDesde(ultimaFecha);

  // Ordenar para el gráfico de barras (ascendente)
  const avancesAsc = [...avancesObra].sort((a, b) =>
    a.fecha < b.fecha ? -1 : 1
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Encabezado de la obra */}
      <header className="space-y-2">
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Avance de obra: {obra.nombreFaena}
        </h1>
        <p className="text-muted-foreground">
          Dirección: {obra.direccion}
        </p>
        <p className="text-sm text-muted-foreground/80">
          Panel de seguimiento para el cliente asociado a:{" "}
          <span className="font-mono">{obra.clienteEmail}</span>
        </p>
      </header>

      {/* Resumen de avance actual */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
            <CardHeader>
                <CardTitle className="text-base font-semibold text-muted-foreground">Avance acumulado</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-4xl font-bold">
                    {porcentajeActual}
                    <span className="text-2xl align-top">%</span>
                </p>
                {ultimaFecha ? (
                    <div className="text-sm text-muted-foreground mt-2 space-y-1">
                        <p>Última actualización: {ultimaFecha}</p>
                         {diasDesdeUltima !== null && (
                            <p className="text-xs">
                                {diasDesdeUltima === 0
                                ? "Actualizado hoy"
                                : diasDesdeUltima === 1
                                ? "Actualizado hace 1 día"
                                : `Actualizado hace ${diasDesdeUltima} días`}
                            </p>
                        )}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground mt-2">
                    Aún no hay avances visibles para esta obra.
                    </p>
                )}
            </CardContent>
        </Card>

        <Card className="md:col-span-2">
            <CardHeader>
                <CardTitle className="text-base font-semibold text-muted-foreground">Descripción general</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-card-foreground">
                    En este panel podrás revisar el avance reportado por el equipo de
                    obra, con fotografías y comentarios diarios. Solo se muestran las
                    actualizaciones marcadas como visibles para el cliente.
                </p>
            </CardContent>
        </Card>
      </div>

       {/* Gráfico de avance */}
       {avancesAsc.length > 1 && (
        <section className="space-y-3">
            <h2 className="text-xl font-semibold font-headline">
            Evolución del avance
            </h2>
            <Card>
                <CardContent className="p-6">
                     <div className="flex items-end gap-2 h-32">
                        {avancesAsc.map((av) => (
                        <div key={av.id} className="flex-1 flex flex-col items-center gap-1 group">
                            <div className="flex-1 flex items-end w-full relative">
                            <div
                                className="w-full rounded-t-lg bg-primary/80 transition-all duration-300 group-hover:bg-primary"
                                style={{ height: `${av.porcentajeAvance || 0}%` }}
                            />
                             <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-card text-card-foreground text-xs font-bold px-2 py-1 rounded-md border shadow-sm">
                                {av.porcentajeAvance}%
                            </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                            {av.fecha.slice(5)}{/* muestra MM-DD */}
                            </p>
                        </div>
                        ))}
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground text-center">
                        Cada barra representa el porcentaje de avance acumulado en la fecha del
                        reporte visible para el cliente.
                    </p>
                </CardContent>
            </Card>
        </section>
        )}

      {/* Si no hay avances visibles */}
      {avancesObra.length === 0 ? (
        <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
                <p>
                Todavía no hay avances publicados para esta obra.
                </p>
                <p className="mt-2 text-sm">
                Cuando el equipo de obra comience a reportar, aparecerán aquí las fotos y comentarios más
                recientes.
                </p>
            </CardContent>
        </Card>
      ) : (
        <>
          {/* Lista / timeline de avances */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold font-headline">
              Historial de Avances
            </h2>
            <div className="space-y-6">
              {avancesObra.map((av) => (
                <Card
                  key={av.id}
                  className="overflow-hidden shadow-md transition-all hover:shadow-lg"
                >
                  {av.fotoUrl && (
                    <div className="border-b bg-muted/30">
                      <img
                        src={av.fotoUrl}
                        alt={`Avance ${av.fecha}`}
                        className="h-64 w-full object-cover"
                      />
                    </div>
                  )}
                  <CardContent className="p-6 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <p className="font-semibold text-lg text-primary">
                            {av.fecha}
                            </p>
                            <p className="text-sm text-muted-foreground">
                            Avance acumulado a la fecha: {av.porcentajeAvance}%
                            </p>
                        </div>
                         <p className="text-xs text-muted-foreground">
                          Registrado por: {av.creadoPor}
                        </p>
                    </div>
                    <p className="text-card-foreground/90 whitespace-pre-line pt-2">
                      {av.comentario}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
