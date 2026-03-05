import { NextRequest } from 'next/server'
import { getCompany, updateCompany } from '@/lib/storage'
import { Task } from '@/lib/types'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; taskId: string }> }
) {
  const { slug, taskId } = await params
  const { status } = await req.json()

  const validStatuses: Task['status'][] = ['proposed', 'approved', 'in-progress', 'done']
  if (!validStatuses.includes(status)) {
    return Response.json({ error: 'Invalid status' }, { status: 400 })
  }

  const company = await getCompany(slug)
  if (!company) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const tasks = company.tasks.map(t =>
    t.id === taskId ? { ...t, status } : t
  )

  await updateCompany(slug, { tasks })
  const updated = tasks.find(t => t.id === taskId)
  return Response.json(updated || { ok: true })
}
