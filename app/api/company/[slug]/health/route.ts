import { NextRequest, NextResponse } from 'next/server'
import { getCompany } from '@/lib/storage'
import { runHealthCheck } from '@/lib/modules/health-check'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const company = await getCompany(slug)
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  const report = await runHealthCheck(company)
  return NextResponse.json(report)
}
