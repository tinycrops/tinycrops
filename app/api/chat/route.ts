import { NextRequest } from 'next/server'
import { openai, MODEL } from '@/lib/openai'
import { getCompany, updateCompany } from '@/lib/storage'
import { CHAT_SYSTEM_PROMPT } from '@/lib/prompts'
import { Message } from '@/lib/types'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { slug, message } = await req.json()

  if (!slug || !message?.trim()) {
    return new Response(JSON.stringify({ error: 'slug and message are required' }), { status: 400 })
  }

  const company = await getCompany(slug)
  if (!company) {
    return new Response(JSON.stringify({ error: 'Company not found' }), { status: 404 })
  }

  // Save user message
  const userMsg: Message = {
    id: crypto.randomUUID(),
    role: 'user',
    content: message.trim(),
    createdAt: new Date().toISOString(),
  }
  const messages = [...(company.messages || []), userMsg]
  await updateCompany(slug, { messages })

  const systemPrompt = CHAT_SYSTEM_PROMPT({
    name: company.name,
    input: company.input,
    documents: company.documents,
    tasks: company.tasks,
  })

  // Build message history for OpenAI
  const history = messages.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let fullContent = ''

      try {
        const openaiStream = await openai.chat.completions.create({
          model: MODEL,
          messages: [{ role: 'system', content: systemPrompt }, ...history],
          stream: true,
          temperature: 0.8,
          max_tokens: 500,
        })

        for await (const chunk of openaiStream) {
          const delta = chunk.choices[0]?.delta?.content
          if (delta) {
            fullContent += delta
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`))
          }
        }

        // Save assistant message
        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: fullContent,
          createdAt: new Date().toISOString(),
        }
        await updateCompany(slug, { messages: [...messages, assistantMsg] })

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
