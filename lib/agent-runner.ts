import type {
  ChatCompletionTool,
  ChatCompletionMessageParam,
  ChatCompletionMessageFunctionToolCall,
} from 'openai/resources/chat/completions'
import { openai, MODEL } from './openai'
import { getCompany, addFeedItem, updateFeedItem, addTweet, addEmail, startCycle, completeCycle, updateCompany } from './storage'
import { FeedItem, Tweet, EmailItem, Task } from './types'
import crypto from 'crypto'

function uuid() {
  return crypto.randomUUID()
}

export type AgentEvent =
  | { type: 'feed_item'; item: FeedItem }
  | { type: 'feed_update'; itemId: string; patch: Partial<FeedItem> }
  | { type: 'done'; summary: string }
  | { type: 'error'; message: string }

export async function runAgentCycle(
  slug: string,
  emit: (event: AgentEvent) => void
): Promise<void> {
  const company = await getCompany(slug)
  if (!company) {
    emit({ type: 'error', message: 'Company not found' })
    return
  }

  const cycleId = uuid()
  const cycle = {
    id: cycleId,
    startedAt: new Date().toISOString(),
    feedItemIds: [] as string[],
  }
  await startCycle(slug, cycle)

  const feedItemIds: string[] = []

  // Build context from mission doc and last 5 completed tasks
  const missionDoc = company.documents.find(d => d.type === 'mission')
  const recentTasks = company.tasks
    .filter(t => t.status === 'done')
    .slice(-5)

  const contextBlock = [
    missionDoc ? `## Mission Document\n${missionDoc.content}` : '',
    recentTasks.length > 0
      ? `## Recently Completed Tasks\n${recentTasks.map(t => `- ${t.title}: ${t.description}`).join('\n')}`
      : '',
    `## Company: ${company.name}`,
    `## Input: ${company.input}`,
  ].filter(Boolean).join('\n\n')

  const systemPrompt = `You are the CEO agent for ${company.name}, an autonomous AI executive that takes high-value actions to grow the company.

${contextBlock}

Your job: Execute 3-5 concrete, high-value actions across marketing, engineering, research, and growth.

For each action:
1. Call log() to announce what you're doing
2. Do the work (draft tweet, compose email, propose task, etc.)
3. Call complete_action() with a summary of what you accomplished

Be specific, creative, and actionable. Think like a scrappy startup CEO.`

  const tools: ChatCompletionTool[] = [
    {
      type: 'function',
      function: {
        name: 'log',
        description: 'Emit a status message while working on an action',
        parameters: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Short status message describing what you are doing' },
            agentType: {
              type: 'string',
              enum: ['ceo', 'engineering', 'marketing', 'research'],
              description: 'Which agent type is performing this action',
            },
          },
          required: ['message', 'agentType'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'complete_action',
        description: 'Mark the current action as completed with a summary of what was accomplished',
        parameters: {
          type: 'object',
          properties: {
            action: { type: 'string', description: 'Name/title of the action completed' },
            output: { type: 'string', description: 'Summary of what was produced or accomplished' },
            agentType: {
              type: 'string',
              enum: ['ceo', 'engineering', 'marketing', 'research'],
            },
          },
          required: ['action', 'output', 'agentType'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'propose_task',
        description: 'Propose a new task for the founder to work on',
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
        name: 'draft_tweet',
        description: 'Draft a tweet for the company social media account',
        parameters: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'Tweet content (max 280 chars), can include hashtags' },
          },
          required: ['content'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'compose_email',
        description: 'Draft an outbound cold email for partnerships, press, or sales',
        parameters: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Recipient email or role description (e.g. "press@techcrunch.com")' },
            subject: { type: 'string' },
            body: { type: 'string', description: 'Full email body text' },
          },
          required: ['to', 'subject', 'body'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'engineering_task',
        description: 'Log a mock engineering action (e.g. code review, architecture decision)',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string', description: 'Technical details of the engineering action' },
          },
          required: ['title', 'description'],
        },
      },
    },
  ]

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: 'Run your daily cycle. Execute 3-5 high-value actions. Use log() as you work, complete_action() when done with each item.',
    },
  ]

  // Track current running feed item
  let currentFeedItemId: string | null = null
  const cycleSummaryParts: string[] = []

  let iteration = 0
  const MAX_ITERATIONS = 25

  while (iteration < MAX_ITERATIONS) {
    iteration++

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0.8,
    })

    const choice = response.choices[0]
    const message = choice.message
    messages.push(message)

    if (choice.finish_reason === 'stop' || !message.tool_calls?.length) {
      break
    }

    for (const toolCall of message.tool_calls) {
      if (toolCall.type !== 'function') continue
      const fc = toolCall as ChatCompletionMessageFunctionToolCall
      const args = JSON.parse(fc.function.arguments)

      let result = 'ok'

      if (fc.function.name === 'log') {
        const feedItem: FeedItem = {
          id: uuid(),
          companySlug: slug,
          agentType: args.agentType || 'ceo',
          action: args.message,
          status: 'running',
          createdAt: new Date().toISOString(),
        }
        await addFeedItem(slug, feedItem)
        feedItemIds.push(feedItem.id)
        currentFeedItemId = feedItem.id
        emit({ type: 'feed_item', item: feedItem })

      } else if (fc.function.name === 'complete_action') {
        const feedItem: FeedItem = {
          id: uuid(),
          companySlug: slug,
          agentType: args.agentType || 'ceo',
          action: args.action,
          status: 'completed',
          output: args.output,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        }
        // Mark previous running item as completed if exists
        if (currentFeedItemId) {
          await updateFeedItem(slug, currentFeedItemId, {
            status: 'completed',
            completedAt: new Date().toISOString(),
            output: args.output,
          })
          emit({ type: 'feed_update', itemId: currentFeedItemId, patch: { status: 'completed', completedAt: feedItem.completedAt, output: args.output } })
          currentFeedItemId = null
        } else {
          await addFeedItem(slug, feedItem)
          feedItemIds.push(feedItem.id)
          emit({ type: 'feed_item', item: feedItem })
        }
        cycleSummaryParts.push(`✓ ${args.action}: ${args.output}`)

      } else if (fc.function.name === 'propose_task') {
        const task: Task = {
          id: uuid(),
          title: args.title,
          description: args.description,
          category: args.category,
          status: 'proposed',
          createdAt: new Date().toISOString(),
        }
        const current = await getCompany(slug)
        if (current) {
          await updateCompany(slug, { tasks: [...current.tasks, task] })
        }
        result = `Task "${args.title}" proposed`

      } else if (fc.function.name === 'draft_tweet') {
        const tweet: Tweet = {
          id: uuid(),
          content: args.content.slice(0, 280),
          status: 'draft',
          createdAt: new Date().toISOString(),
        }
        await addTweet(slug, tweet)
        result = `Tweet drafted: "${tweet.content.slice(0, 50)}..."`

      } else if (fc.function.name === 'compose_email') {
        const email: EmailItem = {
          id: uuid(),
          from: `agent@${slug}.cofounder.app`,
          to: args.to,
          subject: args.subject,
          body: args.body,
          type: 'outbound',
          status: 'draft',
          createdAt: new Date().toISOString(),
        }
        await addEmail(slug, email)
        result = `Email drafted to ${args.to}: "${args.subject}"`

      } else if (fc.function.name === 'engineering_task') {
        const feedItem: FeedItem = {
          id: uuid(),
          companySlug: slug,
          agentType: 'engineering',
          action: args.title,
          status: 'completed',
          output: args.description,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        }
        await addFeedItem(slug, feedItem)
        feedItemIds.push(feedItem.id)
        emit({ type: 'feed_item', item: feedItem })
        result = `Engineering task logged: ${args.title}`
      }

      messages.push({
        role: 'tool',
        tool_call_id: fc.id,
        content: result,
      })
    }
  }

  // Mark any still-running feed item as completed
  if (currentFeedItemId) {
    await updateFeedItem(slug, currentFeedItemId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    })
    emit({ type: 'feed_update', itemId: currentFeedItemId, patch: { status: 'completed', completedAt: new Date().toISOString() } })
  }

  const summary = cycleSummaryParts.join('\n') || 'Agent cycle completed.'
  await completeCycle(slug, cycleId, summary, feedItemIds)
  emit({ type: 'done', summary })
}
