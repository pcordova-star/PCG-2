// src/app/api/public/obra/[shareId]/route.ts
import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

// --- Tipos de datos ---

type Actividad = {
  id: string;
  nombreActividad: string;
  precioContrato?: number; // Es opcional
  // Otros campos que no necesitamos para este endpoint
};

type AvanceDiario = {
  id: string;
  fecha: string; // ISO string
  porcentajeAvance: number;
  comentario?: string;
  fotos?: string[];
  visibleParaCliente: boolean;
};

type ObraData = {
  nombreFaena: string;
  direccion: string;
  mandanteRazonSocial: string;
  clienteEmail: string;
  clientePanel?: {
    enabled?: boolean;
    shareId?: string;
  };
};

type PublicObraData = {
  obra: {
    nombreFaena: string;
    direccion: string;
    mandanteRazonSocial: string;
    clienteEmail: string;
  };
  indicadores: {
    avanceAcumulado: number;
    ultimaActualizacionISO: string | null;
    actividades: {
      programadas: number;
      completadas: number;
    };
  };
  ultimosAvances: {
    fechaISO: string;
    porcentaje: number;
    comentario: string;
    imagenes: string[];
  }[];
};

// --- Endpoint GET ---

export async function GET(
  request: Request,
  { params }: { params: { shareId: string } }
) {
  const { shareId } = params;
  if (!shareId) {
    return NextResponse.json({ error: 'shareId es requerido' }, { status: 400 });
  }

  try {
    const db = getAdminFirestore();

    // 1. Buscar la obra por shareId
    const obrasRef = db.collection('obras');
    const q = obrasRef.where('clientePanel.shareId', '==', shareId).limit(1);
    const obraSnap = await q.get();

    if (obraSnap.empty) {
      return NextResponse.json({ error: 'Panel no encontrado o deshabilitado' }, { status: 404 });
    }

    const obraDoc = obraSnap.docs[0];
    const obraId = obraDoc.id;
    const obraData = obraDoc.data() as ObraData;

    // Validar que el panel esté habilitado
    if (!obraData.clientePanel || obraData.clientePanel.enabled !== true) {
        return NextResponse.json({ error: 'Este panel de cliente no está habilitado.' }, { status: 403 });
    }

    // 2. Cargar sub-colecciones
    const actividadesRef = db.collection('obras').doc(obraId).collection('actividades');
    const avancesRef = db.collection('obras').doc(obraId).collection('avancesDiarios');

    const [actividadesSnap, avancesSnap] = await Promise.all([
      actividadesRef.get(),
      avancesRef.where('visibleParaCliente', '==', true).orderBy('fecha', 'desc').get(),
    ]);

    const actividades: Actividad[] = actividadesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Actividad));
    const avancesVisibles: AvanceDiario[] = avancesSnap.docs.map(doc => {
        const data = doc.data();
        let fecha = data.fecha;
        // Convertir Timestamp a ISO string si es necesario
        if (fecha instanceof Timestamp) {
            fecha = fecha.toDate().toISOString().split('T')[0];
        }
        return { id: doc.id, ...data, fecha } as AvanceDiario;
    });

    // 3. Calcular Indicadores
    
    // Avance ponderado
    const actividadesConPrecio = actividades.filter(a => typeof a.precioContrato === 'number' && a.precioContrato > 0);
    let avanceAcumulado = 0;

    if (actividadesConPrecio.length > 0) {
      const avancesPorActividad = new Map<string, number>();
       // Ordenar para obtener el último avance de cada actividad
      const avancesOrdenados = [...avancesVisibles].sort((a,b) => a.fecha < b.fecha ? 1 : -1);
      for (const avance of avancesOrdenados) {
        if (avance.id && !avancesPorActividad.has(avance.id)) {
            avancesPorActividad.set(avance.id, avance.porcentajeAvance);
        }
      }

      let totalPonderado = 0;
      let totalPrecios = 0;
      actividadesConPrecio.forEach(act => {
        const avanceActividad = avancesPorActividad.get(act.id) ?? 0;
        totalPonderado += (act.precioContrato! * (avanceActividad / 100));
        totalPrecios += act.precioContrato!;
      });
      avanceAcumulado = totalPrecios > 0 ? (totalPonderado / totalPrecios) * 100 : 0;
    } else if (avancesVisibles.length > 0) {
        // Fallback: si no hay precios, usar el porcentaje del último avance general
        avanceAcumulado = avancesVisibles[0]?.porcentajeAvance ?? 0;
    }
    
    // Última actualización
    const ultimaActualizacionISO = avancesVisibles.length > 0 ? avancesVisibles[0].fecha : null;

    // Conteo de actividades (simplificado)
    const actividadesProgramadas = actividades.length;
    // Asumimos que una actividad con 100% de avance en su último reporte está "completada"
    const actividadesCompletadas = actividades.filter(act => {
        const ultimoAvance = avancesVisibles.find(av => av.id === act.id);
        return ultimoAvance && ultimoAvance.porcentajeAvance >= 100;
    }).length;

    // 4. Preparar datos de respuesta
    const respuesta: PublicObraData = {
      obra: {
        nombreFaena: obraData.nombreFaena,
        direccion: obraData.direccion,
        mandanteRazonSocial: obraData.mandanteRazonSocial,
        clienteEmail: obraData.clienteEmail,
      },
      indicadores: {
        avanceAcumulado: parseFloat(avanceAcumulado.toFixed(1)),
        ultimaActualizacionISO,
        actividades: {
          programadas: actividadesProgramadas,
          completadas: actividadesCompletadas,
        },
      },
      ultimosAvances: avancesVisibles.slice(0, 5).map(av => ({
        fechaISO: av.fecha,
        porcentaje: av.porcentajeAvance,
        comentario: av.comentario ?? '',
        imagenes: av.fotos ?? [],
      })),
    };

    return NextResponse.json(respuesta, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
      },
    });

  } catch (error) {
    console.error(`[API /public/obra] Error para shareId ${shareId}:`, error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Error interno del servidor: ' + error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Error interno del servidor desconocido.' }, { status: 500 });
  }
}
