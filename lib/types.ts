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
}
