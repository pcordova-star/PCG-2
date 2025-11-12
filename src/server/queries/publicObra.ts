// src/server/queries/publicObra.ts
import 'server-only'
import { getFirestore } from 'firebase-admin/firestore'
import { getAdminApp } from '@/lib/firebaseAdmin'

export type PublicObraData = {
  obraId: string
  nombre: string
  direccion?: string
  mandante?: string
  contacto?: { nombre?: string; email?: string; telefono?: string }
  avanceAcumulado?: number
  ultimaActualizacion?: string | null
  actividades?: { programadas: number; completadas: number }
  avancesPublicados?: Array<{
    id: string
    fecha: string
    porcentaje?: number
    comentario?: string
    fotos?: string[]
  }>
}

export async function getPublicObraByShareId(shareId: string): Promise<PublicObraData | null> {
  if (!shareId) return null
  const app = getAdminApp()
  const db = getFirestore(app)

  // 1) localizar obra por panel cliente
  const q = await db.collection('obras')
    .where('clientePanel.shareId', '==', shareId)
    .where('clientePanel.enabled', '==', true)
    .limit(1)
    .get()

  if (q.empty) return null
  const snap = q.docs[0]!
  const obra = snap.data() || {}
  const obraId = snap.id

  // 2) datos básicos
  const nombre = obra.nombreFaena ?? obra.nombre ?? 'Obra sin nombre'
  const direccion = obra.direccion ?? obra.ubicacion ?? undefined
  const mandante = obra.mandante ?? obra.cliente ?? undefined
  const contacto = obra.contactoCliente ?? obra.contacto ?? {}

  // 3) KPIs (tolerar faltantes)
  const avanceAcumulado = Number(obra.avanceAcumulado ?? 0)
  
  // 4) actividades (contadores simples)
  let programadas = 0, completadas = 0
  try {
    const acts = await db.collection('obras').doc(obraId).collection('actividades').get()
    programadas = acts.size
    acts.forEach(d => { if (d.get('estado') === 'Completada' || d.get('estado') === 'Terminada') completadas++ })
  } catch { /* no bloquear */ }

  // 5) últimos avances publicados (visibles para cliente)
  const avances: PublicObraData['avancesPublicados'] = []
  try {
    const aqs = await db.collection('obras').doc(obraId).collection('avancesDiarios')
      .where('visibleParaCliente', '==', true)
      .orderBy('fecha', 'desc')
      .limit(10)
      .get()
      
    aqs.forEach(d => {
      const x = d.data() || {}
      const fecha = x.fecha?.toDate?.() ? x.fecha.toDate() : (typeof x.fecha === 'string' ? new Date(x.fecha) : null);
      
      avances.push({
        id: d.id,
        fecha: fecha ? fecha.toISOString() : new Date().toISOString(),
        porcentaje: x.porcentajeAvance ?? x.porcentaje ?? undefined,
        comentario: x.comentario ?? x.nota ?? '',
        fotos: Array.isArray(x.fotos) ? x.fotos : (x.fotoUrl ? [x.fotoUrl] : []),
      })
    })
  } catch(e) { 
    console.error("Error fetching 'avancesDiarios'", e)
    /* no bloquear */ 
  }
  
  const ultimaActualizacion = avances.length > 0 ? avances[0]!.fecha : null;


  return {
    obraId,
    nombre,
    direccion,
    mandante,
    contacto,
    avanceAcumulado,
    ultimaActualizacion,
    actividades: { programadas, completadas },
    avancesPublicados: avances,
  }
}
