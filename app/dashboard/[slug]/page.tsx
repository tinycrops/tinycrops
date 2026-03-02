import { getCompany } from '@/lib/storage'
import { notFound } from 'next/navigation'
import DashboardClient from './DashboardClient'

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const company = await getCompany(slug)

  if (!company) notFound()

  return <DashboardClient company={company} />
}
