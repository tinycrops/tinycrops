import { NextRequest } from 'next/server'
import { updateMissionDoc, getCompany } from '@/lib/storage'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { content } = await req.json()

  if (typeof content !== 'string') {
    return Response.json({ error: 'content required' }, { status: 400 })
  }

  const updated = await updateMissionDoc(slug, content)
  if (!updated) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const doc = updated.documents.find(d => d.type === 'mission')
  return Response.json(doc || { ok: true })
}
