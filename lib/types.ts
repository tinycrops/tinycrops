export type InputType = 'idea' | 'business'

export interface CompanyMood {
  label: string
  ascii: string
  message: string
}

export interface Document {
  id: string
  type: 'mission' | 'market-research' | 'custom'
  title: string
  content: string
  createdAt: string
}

export interface Task {
  id: string
  title: string
  description: string
  category: 'engineering' | 'research' | 'growth' | 'operations'
  status: 'proposed' | 'approved' | 'in-progress' | 'done'
  createdAt: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface FeedItem {
  id: string
  companySlug: string
  agentType: 'ceo' | 'engineering' | 'marketing' | 'research'
  action: string
  status: 'running' | 'completed' | 'failed'
  output?: string
  createdAt: string
  completedAt?: string
}

export interface Tweet {
  id: string
  content: string
  status: 'draft' | 'posted' | 'deleted'
  scheduledFor?: string
  postedAt?: string
  createdAt: string
}

export interface EmailItem {
  id: string
  from: string
  to: string
  subject: string
  body: string
  type: 'outbound' | 'inbound'
  status: 'draft' | 'sent'
  createdAt: string
}

export interface AgentCycle {
  id: string
  startedAt: string
  completedAt?: string
  summary?: string
  feedItemIds: string[]
}

export interface ModuleConfig {
  twitter: { enabled: boolean; frequency: 'daily' | 'weekly' }
  email: { enabled: boolean; dailyLimit: number }
  ads: { enabled: boolean; dailyBudget: number }
  engineering: { enabled: boolean }
}

export interface Company {
  id: string
  slug: string
  name: string
  input: string
  inputType: InputType
  mood: CompanyMood
  documents: Document[]
  tasks: Task[]
  messages: Message[]
  links: { title: string; url: string }[]
  createdAt: string
  feedItems: FeedItem[]
  tweets: Tweet[]
  emails: EmailItem[]
  cycles: AgentCycle[]
  agentEmail: string
  modules: ModuleConfig
}
