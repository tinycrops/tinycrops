import { NextRequest } from 'next/server'
import { runOnboardingAgent } from '@/lib/onboarding-agent'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const { input, inputType } = await req.json()

  if (!input?.trim()) {
    return new Response(JSON.stringify({ error: 'Input is required' }), { status: 400 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        await runOnboardingAgent(
          input.trim(),
          inputType || 'idea',
          (line) => send(line)
        )
      } catch (err) {
        send({ type: 'error', text: `Error: ${err instanceof Error ? err.message : String(err)}` })
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
