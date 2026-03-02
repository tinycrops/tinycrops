'use client'

import { useState } from 'react'
import { Company, Document, Task } from '@/lib/types'

const CATEGORY_COLORS: Record<string, string> = {
  engineering: '#e8e8e8',
  research: '#e8e8e8',
  growth: '#e8e8e8',
  operations: '#e8e8e8',
}

function AsciiAvatar({ mood }: { mood: Company['mood'] }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <pre style={{
        margin: 0,
        fontFamily: 'inherit',
        fontSize: 13,
        lineHeight: 1.4,
        display: 'inline-block',
      }}>
        {mood.ascii}
      </pre>
      <div style={{ marginTop: 8 }}>
        <div style={{ fontWeight: 'bold', fontSize: 12 }}>{mood.label}</div>
        <div style={{ color: '#555', fontSize: 12, marginTop: 2 }}>{mood.message}</div>
      </div>
    </div>
  )
}

function DocumentItem({
  doc,
  onClick,
  active,
}: {
  doc: Document
  onClick: () => void
  active: boolean
}) {
  const docAscii = doc.type === 'mission'
    ? ' /--/|\n/_/ |\n| |/|\n|^| |\n|_|/'
    : ' ____\n|    |\n|~~~~|\n|~~~~|\n|____|'

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '8px 0',
        borderBottom: '1px solid #e8e8e8',
        cursor: 'pointer',
        background: active ? '#f0f0f0' : 'transparent',
        paddingLeft: active ? 8 : 0,
      }}
    >
      <pre style={{ margin: 0, fontSize: 10, lineHeight: 1.2, flexShrink: 0 }}>
        {docAscii}
      </pre>
      <div>
        <div style={{ fontSize: 13, fontWeight: active ? 'bold' : 'normal' }}>{doc.title}</div>
        <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
          {new Date(doc.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  )
}

function TaskCard({ task }: { task: Task }) {
  return (
    <div style={{
      padding: '6px 8px',
      marginBottom: 8,
      border: '1px solid #000',
      background: '#d4d4d4',
      cursor: 'pointer',
    }}>
      <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 4 }}>{task.title}</div>
      <div style={{ fontSize: 12, color: '#333', lineHeight: 1.3 }}>
        {task.description.slice(0, 120)}{task.description.length > 120 ? '...' : ''}
      </div>
      <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
        <span style={{
          background: '#e8e8e8',
          padding: '2px 8px',
          borderRadius: 10,
          fontSize: 11,
          color: '#555',
          textTransform: 'capitalize',
        }}>
          {task.category}
        </span>
        <span style={{
          background: task.status === 'proposed' ? '#000' : '#080',
          color: '#fff',
          padding: '2px 8px',
          borderRadius: 10,
          fontSize: 11,
          textTransform: 'capitalize',
        }}>
          {task.status}
        </span>
      </div>
    </div>
  )
}

function ChatPanel({ slug, initialMessages }: { slug: string; initialMessages: Company['messages'] }) {
  const [messages, setMessages] = useState(initialMessages || [])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [streamingText, setStreamingText] = useState('')

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || sending) return

    const userMessage = input.trim()
    setInput('')
    setSending(true)
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString(),
    }])
    setStreamingText('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, message: userMessage }),
      })

      if (!res.body) return

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''

        for (const part of parts) {
          const line = part.replace(/^data: /, '').trim()
          if (!line) continue
          try {
            const data = JSON.parse(line)
            if (data.delta) {
              fullText += data.delta
              setStreamingText(fullText)
            }
            if (data.done) {
              setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: fullText,
                createdAt: new Date().toISOString(),
              }])
              setStreamingText('')
            }
          } catch {}
        }
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      borderLeft: '1px solid #000',
    }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #ccc' }}>
        <strong>Co-founder</strong>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        {messages.length === 0 && (
          <div style={{ color: '#999', fontSize: 12, fontStyle: 'italic' }}>
            Ask me anything about your company...
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id}>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>
              {msg.role === 'user' ? 'You' : 'Cofounder'}
            </div>
            <div style={{
              fontSize: 13,
              lineHeight: 1.5,
              background: msg.role === 'user' ? '#f5f5f5' : '#fff',
              border: '1px solid #e8e8e8',
              padding: '8px 10px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {streamingText && (
          <div>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>Cofounder</div>
            <div style={{
              fontSize: 13,
              lineHeight: 1.5,
              border: '1px solid #e8e8e8',
              padding: '8px 10px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {streamingText}
              <span style={{ animation: 'blink 1s step-end infinite' }}>█</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} style={{ padding: '8px', borderTop: '1px solid #ccc', display: 'flex', gap: 6 }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage(e as unknown as React.FormEvent)
            }
          }}
          placeholder="Ask your co-founder..."
          rows={2}
          style={{
            flex: 1,
            padding: '6px 8px',
            border: '1px solid #ccc',
            resize: 'none',
            outline: 'none',
            background: '#fff',
          }}
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          style={{
            padding: '0 12px',
            background: input.trim() && !sending ? '#000' : '#ccc',
            color: '#fff',
            border: '1px solid #000',
            cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
            alignSelf: 'stretch',
          }}
        >
          →
        </button>
      </form>
    </div>
  )
}

export default function DashboardClient({ company }: { company: Company }) {
  const [activeDoc, setActiveDoc] = useState<Document | null>(
    company.documents.length > 0 ? company.documents[0] : null
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>

      {/* Left column */}
      <div style={{
        width: 220,
        flexShrink: 0,
        borderRight: '1px solid #000',
        overflowY: 'auto',
        padding: '16px',
      }}>
        {/* Brand */}
        <div style={{ marginBottom: 20 }}>
          <a href="/" style={{ textDecoration: 'none', color: '#000' }}>
            <span style={{ fontWeight: 'bold', fontSize: 13 }}>Cofounder</span>
          </a>
        </div>

        {/* Company name */}
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 'bold', margin: 0 }}>{company.name}</h2>
        </div>

        {/* Avatar */}
        <AsciiAvatar mood={company.mood} />

        {/* Documents */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Documents
          </div>
          {company.documents.length === 0 ? (
            <div style={{ color: '#999', fontSize: 12 }}>None yet</div>
          ) : (
            company.documents.map(doc => (
              <DocumentItem
                key={doc.id}
                doc={doc}
                active={activeDoc?.id === doc.id}
                onClick={() => setActiveDoc(doc)}
              />
            ))
          )}
        </div>

        {/* Links */}
        {company.links.length > 0 && (
          <div>
            <div style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Links
            </div>
            {company.links.map((link, i) => (
              <div key={i} style={{ marginBottom: 4, fontSize: 12 }}>
                <a href={link.url} target="_blank" rel="noopener noreferrer">{link.title}</a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Middle column */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
        {/* Tasks */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tasks
          </div>
          {company.tasks.length === 0 ? (
            <div style={{ color: '#999', fontSize: 12 }}>No tasks yet</div>
          ) : (
            company.tasks.map(task => <TaskCard key={task.id} task={task} />)
          )}
        </div>

        {/* Active document */}
        {activeDoc && (
          <div>
            <div style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {activeDoc.title}
            </div>
            <div style={{
              border: '1px solid #e8e8e8',
              padding: '16px',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
              fontSize: 13,
            }}>
              {activeDoc.content}
            </div>
          </div>
        )}
      </div>

      {/* Right column — chat */}
      <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <ChatPanel slug={company.slug} initialMessages={company.messages} />
      </div>
    </div>
  )
}
