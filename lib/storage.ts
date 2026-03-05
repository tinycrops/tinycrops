import fs from 'fs/promises'
import path from 'path'
import { Company, FeedItem, Tweet, EmailItem, AgentCycle, ModuleConfig } from './types'

const DATA_DIR = path.join(process.cwd(), 'data', 'companies')

const DEFAULT_MODULES: ModuleConfig = {
  twitter: { enabled: true, frequency: 'daily' },
  email: { enabled: true, dailyLimit: 10 },
  ads: { enabled: false, dailyBudget: 50 },
  engineering: { enabled: true },
}

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
    const company = JSON.parse(raw) as Company
    // Backward compat: fill in missing new fields for older stored companies
    return {
      ...company,
      feedItems: company.feedItems ?? [],
      tweets: company.tweets ?? [],
      emails: company.emails ?? [],
      cycles: company.cycles ?? [],
      agentEmail: company.agentEmail ?? `agent@${company.slug}.cofounder.app`,
      modules: company.modules ?? DEFAULT_MODULES,
    }
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
    const company = JSON.parse(raw) as Company
    companies.push({
      ...company,
      feedItems: company.feedItems ?? [],
      tweets: company.tweets ?? [],
      emails: company.emails ?? [],
      cycles: company.cycles ?? [],
      agentEmail: company.agentEmail ?? `agent@${company.slug}.cofounder.app`,
      modules: company.modules ?? DEFAULT_MODULES,
    })
  }
  return companies.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function addFeedItem(slug: string, item: FeedItem): Promise<Company | null> {
  const company = await getCompany(slug)
  if (!company) return null
  const updated = { ...company, feedItems: [...company.feedItems, item] }
  await saveCompany(updated)
  return updated
}

export async function updateFeedItem(slug: string, itemId: string, patch: Partial<FeedItem>): Promise<Company | null> {
  const company = await getCompany(slug)
  if (!company) return null
  const feedItems = company.feedItems.map(fi =>
    fi.id === itemId ? { ...fi, ...patch } : fi
  )
  const updated = { ...company, feedItems }
  await saveCompany(updated)
  return updated
}

export async function addTweet(slug: string, tweet: Tweet): Promise<Company | null> {
  const company = await getCompany(slug)
  if (!company) return null
  const updated = { ...company, tweets: [...company.tweets, tweet] }
  await saveCompany(updated)
  return updated
}

export async function deleteTweet(slug: string, tweetId: string): Promise<Company | null> {
  const company = await getCompany(slug)
  if (!company) return null
  const tweets = company.tweets.map(t =>
    t.id === tweetId ? { ...t, status: 'deleted' as const } : t
  )
  const updated = { ...company, tweets }
  await saveCompany(updated)
  return updated
}

export async function addEmail(slug: string, email: EmailItem): Promise<Company | null> {
  const company = await getCompany(slug)
  if (!company) return null
  const updated = { ...company, emails: [...company.emails, email] }
  await saveCompany(updated)
  return updated
}

export async function updateMissionDoc(slug: string, content: string): Promise<Company | null> {
  const company = await getCompany(slug)
  if (!company) return null
  const documents = company.documents.map(doc =>
    doc.type === 'mission' ? { ...doc, content } : doc
  )
  const updated = { ...company, documents }
  await saveCompany(updated)
  return updated
}

export async function startCycle(slug: string, cycle: AgentCycle): Promise<Company | null> {
  const company = await getCompany(slug)
  if (!company) return null
  const updated = { ...company, cycles: [...company.cycles, cycle] }
  await saveCompany(updated)
  return updated
}

export async function completeCycle(slug: string, cycleId: string, summary: string, feedItemIds: string[]): Promise<Company | null> {
  const company = await getCompany(slug)
  if (!company) return null
  const cycles = company.cycles.map(c =>
    c.id === cycleId
      ? { ...c, completedAt: new Date().toISOString(), summary, feedItemIds }
      : c
  )
  const updated = { ...company, cycles }
  await saveCompany(updated)
  return updated
}
