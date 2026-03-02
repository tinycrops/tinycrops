import type {
  ChatCompletionTool,
  ChatCompletionMessageParam,
  ChatCompletionMessageFunctionToolCall,
} from 'openai/resources/chat/completions'
import { openai, MODEL } from './openai'
import { saveCompany, updateCompany } from './storage'
import { Company, Document, Task, CompanyMood } from './types'
import { ONBOARDING_SYSTEM_PROMPT, MISSION_FORMAT, MARKET_RESEARCH_FORMAT } from './prompts'
import crypto from 'crypto'

function uuid() {
  return crypto.randomUUID()
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40)
}

// ASCII avatars keyed by mood type
const AVATARS: Record<string, string> = {
  thinking: `  .---.\n ( o o )\n  | O |\n  '---'`,
  working: `  .---.\n ( - - )\n  | ~ |\n  '---'`,
  accomplished: `  .---.\n ( ^ ^ )\n  | \\=/ |\n  '---'`,
  ready: `  .---.\n ( ◠ ◠ )\n  |  ▽  |\n  '---'`,
}

export type TerminalLine = {
  type: 'log' | 'done' | 'error'
  text: string
  slug?: string
}

export async function runOnboardingAgent(
  input: string,
  inputType: 'idea' | 'business',
  emit: (line: TerminalLine) => void
): Promise<void> {
  const companyId = uuid()

  // Initialize a skeleton company immediately so we can patch it as we go
  const skeleton: Company = {
    id: companyId,
    slug: 'pending-' + companyId.slice(0, 8),
    name: 'Loading...',
    input,
    inputType,
    mood: { label: 'Thinking', ascii: AVATARS.thinking, message: 'Starting research...' },
    documents: [],
    tasks: [],
    messages: [],
    links: [],
    createdAt: new Date().toISOString(),
  }
  await saveCompany(skeleton)

  const tools: ChatCompletionTool[] = [
    {
      type: 'function',
      function: {
        name: 'log',
        description: 'Emit a terminal status line visible to the user while you work',
        parameters: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Short status message, e.g. "Searching for competitors..."' },
          },
          required: ['message'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'set_company_name',
        description: 'Set the company name and URL slug',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            slug: { type: 'string', description: 'URL-safe lowercase slug, e.g. "acme-ai"' },
          },
          required: ['name', 'slug'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'save_document',
        description: 'Save a document (mission statement or market research report)',
        parameters: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['mission', 'market-research'] },
            title: { type: 'string' },
            content: { type: 'string', description: 'Full markdown content of the document' },
          },
          required: ['type', 'title', 'content'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'propose_task',
        description: 'Propose a task for the founder to work on',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string', description: 'Detailed description of what to do and why' },
            category: { type: 'string', enum: ['engineering', 'research', 'growth', 'operations'] },
          },
          required: ['title', 'description', 'category'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'set_mood',
        description: 'Set the AI avatar mood and message shown on the dashboard',
        parameters: {
          type: 'object',
          properties: {
            label: { type: 'string', description: 'Short mood label, e.g. "Accomplished & Ready"' },
            mood_type: { type: 'string', enum: ['thinking', 'working', 'accomplished', 'ready'] },
            message: { type: 'string', description: 'One sentence describing current state' },
          },
          required: ['label', 'mood_type', 'message'],
        },
      },
    },
  ]

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: ONBOARDING_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `${inputType === 'idea' ? 'IDEA' : 'BUSINESS'}: ${input}

Generate the mission document using this exact format:
${MISSION_FORMAT}

Generate the market research report using this exact format:
${MARKET_RESEARCH_FORMAT}

Work step by step. Use log() to show your progress. Use web_search if available.`,
    },
  ]

  // Track state as tools execute
  let currentSlug = skeleton.slug
  const documents: Document[] = []
  const tasks: Task[] = []
  let companyName = skeleton.name
  let mood: CompanyMood = skeleton.mood

  emit({ type: 'log', text: '> Starting research...' })

  // Agentic loop
  let iteration = 0
  const MAX_ITERATIONS = 20

  while (iteration < MAX_ITERATIONS) {
    iteration++

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0.7,
    })

    const choice = response.choices[0]
    const message = choice.message

    // Push assistant message
    messages.push(message)

    if (choice.finish_reason === 'stop' || !message.tool_calls?.length) {
      break
    }

    // Process tool calls (only handle function-type tool calls)
    for (const toolCall of message.tool_calls) {
      if (toolCall.type !== 'function') continue
      const fc = toolCall as ChatCompletionMessageFunctionToolCall
      const args = JSON.parse(fc.function.arguments)

      let result = 'ok'

      if (fc.function.name === 'log') {
        emit({ type: 'log', text: `> ${args.message}` })

      } else if (fc.function.name === 'set_company_name') {
        companyName = args.name
        const newSlug = slugify(args.slug || args.name)
        emit({ type: 'log', text: `> Company name: ${companyName}` })

        // Fetch current company, update name/slug, save under new slug, delete old file
        const existing = await (await import('./storage')).getCompany(currentSlug)
        if (existing) {
          existing.name = companyName
          existing.slug = newSlug
          await saveCompany(existing)
          if (currentSlug !== newSlug) {
            const fsModule = await import('fs/promises')
            const pathModule = await import('path')
            try {
              await fsModule.unlink(pathModule.join(process.cwd(), 'data', 'companies', `${currentSlug}.json`))
            } catch {}
          }
        }
        currentSlug = newSlug

      } else if (fc.function.name === 'save_document') {
        const doc: Document = {
          id: uuid(),
          type: args.type,
          title: args.title,
          content: args.content,
          createdAt: new Date().toISOString(),
        }
        documents.push(doc)
        emit({ type: 'log', text: `> Saved document: ${doc.title}` })
        await updateCompany(currentSlug, { documents: [...documents] })

      } else if (fc.function.name === 'propose_task') {
        const task: Task = {
          id: uuid(),
          title: args.title,
          description: args.description,
          category: args.category,
          status: 'proposed',
          createdAt: new Date().toISOString(),
        }
        tasks.push(task)
        emit({ type: 'log', text: `> Task proposed: ${task.title}` })
        await updateCompany(currentSlug, { tasks: [...tasks] })

      } else if (fc.function.name === 'set_mood') {
        mood = {
          label: args.label,
          ascii: AVATARS[args.mood_type] || AVATARS.ready,
          message: args.message,
        }
        emit({ type: 'log', text: `> Mood: ${mood.label}` })
        await updateCompany(currentSlug, { mood })
      }

      messages.push({
        role: 'tool',
        tool_call_id: fc.id,
        content: result,
      })
    }
  }

  // Final save
  await updateCompany(currentSlug, { documents, tasks, mood, name: companyName })

  emit({ type: 'log', text: '> Done.' })
  emit({ type: 'done', text: 'Complete', slug: currentSlug })
}
