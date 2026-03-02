import fs from 'fs/promises'
import path from 'path'
import { Company } from './types'

const DATA_DIR = path.join(process.cwd(), 'data', 'companies')

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

function filePath(slug: string) {
  return path.join(DATA_DIR, `${slug}.json`)
}

export async function saveCompany(company: Company): Promise<void> {
  await ensureDir()
  await fs.writeFile(filePath(company.slug), JSON.stringify(company, null, 2), 'utf-8')
}

export async function getCompany(slug: string): Promise<Company | null> {
  try {
    const raw = await fs.readFile(filePath(slug), 'utf-8')
    return JSON.parse(raw) as Company
  } catch {
    return null
  }
}

export async function updateCompany(slug: string, patch: Partial<Company>): Promise<Company | null> {
  const company = await getCompany(slug)
  if (!company) return null
  const updated = { ...company, ...patch }
  await saveCompany(updated)
  return updated
}

export async function listCompanies(): Promise<Company[]> {
  await ensureDir()
  const files = await fs.readdir(DATA_DIR)
  const companies: Company[] = []
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    const raw = await fs.readFile(path.join(DATA_DIR, file), 'utf-8')
    companies.push(JSON.parse(raw))
  }
  return companies.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
