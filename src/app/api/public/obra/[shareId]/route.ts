// src/app/api/public/obra/[shareId]/route.ts
import { NextResponse } from 'next/server';
import { getAdminApp, getAdminFirestore } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

// Tipos de datos para las colecciones de Firestore
type Actividad = {
  id: string;
  nombreActividad: string;
  precioContrato: number;
  // Estos campos pueden no estar, así que son opcionales
  fechaInicio?: string;
  fechaFin?: string;
};

type AvanceDiario = {
  id: string;
  fecha: string; // "YYYY-MM-DD"
  porcentajeAvance: number;
  comentario?: string;
  visibleParaCliente: boolean;
  fotos?: string[]; // Array de URLs públicas o de Storage
  actividadId?: string;
};

// Inicializa Firebase Admin
getAdminApp();
const db = getAdminFirestore();

export async function GET(
  request: Request,
  { params }: { params: { shareId: string } }
) {
  const { shareId } = params;

  if (!shareId) {
    return NextResponse.json({ error: 'shareId es requerido' }, { status: 400 });
  }

  try {
    // 1. Encontrar la obra por su shareId
    const obrasRef = db.collection('obras');
    const q = obrasRef.where('clientePanel.shareId', '==', shareId).limit(1);
    const obraSnap = await q.get();

    if (obraSnap.empty) {
      return NextResponse.json({ error: 'Panel no encontrado' }, { status: 404 });
    }

    const obraDoc = obraSnap.docs[0];
    const obraData = obraDoc.data();
    const obraId = obraDoc.id;

    // 2. Obtener actividades y avances
    const actividadesRef = db.collection('obras').doc(obraId).collection('actividades');
    const avancesRef = db.collection('obras').doc(obraId).collection('avancesDiarios');

    const [actividadesSnap, avancesSnap] = await Promise.all([
      actividadesRef.get(),
      avancesRef.where('visibleParaCliente', '==', true).orderBy('fecha', 'desc').get(),
    ]);

    const actividades: Actividad[] = actividadesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Actividad));
    const avancesVisibles: AvanceDiario[] = avancesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AvanceDiario));
    
    // --- 3. Calcular Indicadores ---

    // Avance por actividad
    const avancePorActividad = new Map<string, number>();
    for (const avance of avancesVisibles) {
        if (avance.actividadId && !avancePorActividad.has(avance.actividadId)) {
            avancePorActividad.set(avance.actividadId, avance.porcentajeAvance);
        }
    }
    
    // Avance acumulado ponderado
    let avanceAcumulado = 0;
    const totalPrecio = actividades.reduce((sum, act) => sum + (act.precioContrato || 0), 0);
    
    if (totalPrecio > 0) {
      const sumaPonderada = actividades.reduce((sum, act) => {
        const progreso = avancePorActividad.get(act.id) || 0;
        return sum + (act.precioContrato || 0) * (progreso / 100);
      }, 0);
      avanceAcumulado = (sumaPonderada / totalPrecio) * 100;
    } else if (avancesVisibles.length > 0) {
      // Fallback: promedio simple si no hay precios
      const sumaPorcentajes = avancesVisibles.reduce((sum, av) => sum + (av.porcentajeAvance || 0), 0);
      avanceAcumulado = sumaPorcentajes / avancesVisibles.length;
    }
    
    // Última actualización
    const ultimaActualizacionISO = avancesVisibles.length > 0 ? avancesVisibles[0].fecha : null;
    
    // Conteo de actividades (simplificado, ya que no tenemos 'estado' en el modelo actual)
    // Asumimos que una actividad con 100% de avance está "completada"
    const completadas = actividades.filter(act => (avancePorActividad.get(act.id) || 0) >= 100).length;
    
    // Últimos avances para el feed
    const ultimosAvances = avancesVisibles.slice(0, 5).map(av => ({
        fechaISO: av.fecha,
        porcentaje: av.porcentajeAvance,
        comentario: av.comentario || '',
        imagenes: av.fotos || [],
    }));

    // 4. Construir la respuesta final
    const responsePayload = {
      obra: {
        nombreFaena: obraData.nombreFaena || 'Sin nombre',
        direccion: obraData.direccion || 'No especificada',
        mandanteRazonSocial: obraData.mandanteRazonSocial || 'No especificado',
        clienteEmail: obraData.clienteEmail || 'No especificado',
      },
      indicadores: {
        avanceAcumulado: isNaN(avanceAcumulado) ? 0 : avanceAcumulado,
        ultimaActualizacionISO: ultimaActualizacionISO,
        actividades: {
          programadas: actividades.length,
          completadas: completadas,
        },
      },
      ultimosAvances: ultimosAvances,
    };

    return NextResponse.json(responsePayload, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });

  } catch (error) {
    console.error('Error en API /api/public/obra/[shareId]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// Configuración para que Next.js revalide esta ruta cada 60 segundos (ISR)
export const revalidate = 60;
