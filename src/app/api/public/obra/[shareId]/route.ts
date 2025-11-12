import { NextResponse } from 'next/server'
import { getPublicObraByShareId } from '@/server/queries/publicObra'

export async function GET(_req: Request, { params }: { params: { shareId: string } }) {
  try {
    const data = await getPublicObraByShareId(params.shareId)
    if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    return NextResponse.json(data, { status: 200 })
  } catch (e) {
    console.error('[API public/obra] error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
