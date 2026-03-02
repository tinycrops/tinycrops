import { NextRequest } from 'next/server'
import { getCompany } from '@/lib/storage'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const company = await getCompany(slug)

  if (!company) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
  }

  return Response.json(company)
}
