import { NextRequest } from 'next/server'
import { getCompany, addTweet, deleteTweet } from '@/lib/storage'
import { openai, MODEL } from '@/lib/openai'
import { Tweet } from '@/lib/types'
import crypto from 'crypto'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const company = await getCompany(slug)
  if (!company) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const missionDoc = company.documents.find(d => d.type === 'mission')
  const context = missionDoc
    ? `Company: ${company.name}\n\nMission:\n${missionDoc.content.slice(0, 800)}`
    : `Company: ${company.name}\nDescription: ${company.input}`

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are the social media manager for ${company.name}. Write a single engaging tweet (max 280 characters) that promotes the company, shares insight, or builds the brand. Be authentic, punchy, and specific. Include relevant hashtags. Return ONLY the tweet text, nothing else.`,
      },
      {
        role: 'user',
        content: context,
      },
    ],
    temperature: 0.9,
    max_tokens: 100,
  })

  const content = response.choices[0].message.content?.trim() || ''
  const tweet: Tweet = {
    id: crypto.randomUUID(),
    content: content.slice(0, 280),
    status: 'draft',
    createdAt: new Date().toISOString(),
  }

  await addTweet(slug, tweet)
  return Response.json(tweet)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { tweetId } = await req.json()

  if (!tweetId) {
    return Response.json({ error: 'tweetId required' }, { status: 400 })
  }

  await deleteTweet(slug, tweetId)
  return Response.json({ ok: true })
}
