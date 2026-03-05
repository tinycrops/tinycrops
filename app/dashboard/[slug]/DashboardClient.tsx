'use client'

import { useState, useRef, useEffect } from 'react'
import { Company, Document, Task, FeedItem, Tweet, EmailItem } from '@/lib/types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ─── Terminal Ticker Messages ────────────────────────────────────────────────

const TICKER_MESSAGES = [
  'Initializing systems...',
  'Scanning market landscape...',
  'Analyzing competitor positioning...',
  'Running growth strategy analysis...',
  'Checking outreach pipeline...',
  'Syncing task progress...',
  'Evaluating market opportunities...',
  'Processing agent feedback loops...',
]

// ─── Terminal Ticker ─────────────────────────────────────────────────────────

function TerminalTicker({ currentAction }: { currentAction: string }) {
  const [msgIdx, setMsgIdx] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIdx(prev => (prev + 1) % TICKER_MESSAGES.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  const displayMsg = currentAction || TICKER_MESSAGES[msgIdx]

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: 26,
      background: '#0a0a0a', color: '#999', fontSize: 11, lineHeight: '26px',
      overflow: 'hidden', zIndex: 100, padding: '0 12px',
      whiteSpace: 'nowrap', borderBottom: '1px solid #333',
    }}>
      <span style={{ animation: 'tickerSlide 0.3s ease-out', display: 'inline-block' }}>
        <span style={{ color: '#555', marginRight: 6 }}>&gt;</span>
        <span style={{ color: currentAction ? 'var(--accent)' : '#aaa' }}>{displayMsg}</span>
      </span>
    </div>
  )
}

// ─── Shared sub-components ──────────────────────────────────────────────────

function AsciiAvatar({ mood }: { mood: Company['mood'] }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 14 }}>
      <pre style={{
        margin: 0, fontFamily: 'var(--mono)', fontSize: 13,
        lineHeight: 1.3, display: 'inline-block', textAlign: 'left',
      }}>
        {mood.ascii}
      </pre>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 11, fontWeight: 600, marginTop: 8, justifyContent: 'center',
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: 'var(--green)', animation: 'pulse 2s ease-in-out infinite',
          display: 'inline-block',
        }} />
        <span>{mood.label}</span>
      </div>
      <div style={{
        fontStyle: 'italic', color: 'var(--muted)', fontWeight: 400,
        fontSize: 10, marginTop: 2, textAlign: 'center',
      }}>
        {mood.message}
      </div>
    </div>
  )
}

function DocumentItem({ doc, onClick, active }: { doc: Document; onClick: () => void; active: boolean }) {
  const docAscii = doc.type === 'mission'
    ? ' /--/|\n/_/ |\n| |/|\n|^| |\n|_|/'
    : ' ____\n|    |\n|~~~~|\n|~~~~|\n|____|'

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        padding: '6px 0', borderBottom: '1px solid var(--line)',
        cursor: 'pointer',
        background: active ? 'var(--panel)' : 'transparent',
        paddingLeft: active ? 8 : 0,
      }}
    >
      <pre style={{
        margin: 0, fontSize: 9, lineHeight: 1.1, flexShrink: 0,
        color: 'var(--muted)', fontFamily: 'var(--mono)',
      }}>
        {docAscii}
      </pre>
      <div>
        <div style={{ fontSize: 11, fontWeight: active ? 700 : 600, lineHeight: 1.3 }}>{doc.title}</div>
        <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>{relativeTime(doc.createdAt)}</div>
      </div>
    </div>
  )
}

// ─── Tab content components ──────────────────────────────────────────────────

const AGENT_COLORS: Record<string, { bg: string; text: string }> = {
  ceo:         { bg: '#dbeafe', text: '#1e40af' },
  engineering: { bg: '#e0e0e0', text: '#555' },
  marketing:   { bg: '#f3e8ff', text: '#7e22ce' },
  research:    { bg: '#dbeafe', text: '#1e40af' },
}

function StatusDot({ status }: { status: FeedItem['status'] }) {
  const colors: Record<string, string> = {
    running:   'var(--accent)',
    completed: 'var(--green)',
    failed:    '#ef4444',
  }
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
      background: colors[status] || 'var(--line)', flexShrink: 0, marginTop: 4,
      animation: status === 'running' ? 'pulse 2s ease-in-out infinite' : 'none',
    }} />
  )
}

function FeedItemRow({ item }: { item: FeedItem }) {
  const color = AGENT_COLORS[item.agentType] || AGENT_COLORS.ceo
  return (
    <div style={{
      display: 'flex', gap: 8, padding: '8px 0',
      borderBottom: '1px solid var(--line)', alignItems: 'flex-start',
      animation: 'fadeIn 0.3s ease-out',
    }}>
      <StatusDot status={item.status} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{
            background: color.bg, color: color.text,
            fontSize: 9, fontWeight: 700,
            padding: '1px 7px', borderRadius: 8,
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            {item.agentType}
          </span>
          <span style={{ fontSize: 9, color: 'var(--muted)' }}>{relativeTime(item.createdAt)}</span>
        </div>
        <div style={{ fontSize: 11, lineHeight: 1.4 }}>{item.action}</div>
        {item.output && (
          <div style={{ fontSize: 10, color: '#666', marginTop: 3, lineHeight: 1.4 }}>{item.output}</div>
        )}
      </div>
    </div>
  )
}

function ThoughtStream({ text }: { text: string }) {
  if (!text) return null
  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--line)',
      padding: 8, fontSize: 11, lineHeight: 1.5, color: '#444',
      marginBottom: 14, minHeight: 40, maxHeight: 80, overflow: 'hidden',
    }}>
      {text}
      <span style={{
        display: 'inline-block', width: 6, height: 12,
        background: 'var(--ink)', animation: 'blink 0.8s step-end infinite',
        verticalAlign: 'text-bottom', marginLeft: 1,
      }} />
    </div>
  )
}

function LiveFeedTab({ slug, initialFeedItems }: { slug: string; initialFeedItems: FeedItem[] }) {
  const [feedItems, setFeedItems] = useState<FeedItem[]>(initialFeedItems)
  const [running, setRunning] = useState(false)
  const [currentAction, setCurrentAction] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [feedItems])

  async function runCycle() {
    if (running) return
    setRunning(true)
    setCurrentAction('Starting agent cycle...')
    console.group('%c[Cofounder] Agent cycle started', 'color: #f97316; font-weight: bold')
    console.time('[Cofounder] Agent cycle')

    try {
      const res = await fetch(`/api/company/${slug}/run`, { method: 'POST' })
      if (!res.body) return

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

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
            const event = JSON.parse(line)

            if (event.type === 'feed_item') {
              console.log(`%c[${event.item.agentType}] %c${event.item.action}`, 'color: #f97316; font-weight: bold', 'color: #888')
              setFeedItems(prev => [...prev, event.item])
              setCurrentAction(event.item.action)
            } else if (event.type === 'feed_update') {
              console.log(`%c[update] %c${event.itemId} → ${event.patch.status || 'updated'}`, 'color: #16a34a', 'color: #888')
              setFeedItems(prev => prev.map(fi =>
                fi.id === event.itemId ? { ...fi, ...event.patch } : fi
              ))
            } else if (event.type === 'done') {
              console.log('%c[done] %cCycle complete', 'color: #16a34a; font-weight: bold', 'color: #888')
              console.timeEnd('[Cofounder] Agent cycle')
              console.groupEnd()
              setCurrentAction('')
            } else if (event.type === 'error') {
              console.error('[Cofounder] Agent error:', event.message)
              setCurrentAction(`Error: ${event.message}`)
            }
          } catch {}
        }
      }
    } finally {
      setRunning(false)
      setCurrentAction('')
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexShrink: 0 }}>
        <button
          onClick={runCycle}
          disabled={running}
          style={{
            padding: '5px 14px',
            background: running ? 'var(--panel)' : 'var(--ink)',
            color: running ? 'var(--muted)' : 'var(--paper)',
            border: '1px solid var(--ink)',
            cursor: running ? 'not-allowed' : 'pointer',
            fontSize: 11, fontFamily: 'var(--mono)',
          }}
        >
          {running ? '⟳ Running...' : '▶ Run Agent Cycle'}
        </button>
        {running && currentAction && (
          <span style={{ fontSize: 10, color: 'var(--accent)', fontStyle: 'italic' }}>{currentAction}</span>
        )}
      </div>

      <ThoughtStream text={running ? currentAction : ''} />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {feedItems.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: 11, fontStyle: 'italic', padding: '24px 0' }}>
            No activity yet. Run your first agent cycle.
          </div>
        ) : (
          [...feedItems].reverse().map(item => <FeedItemRow key={item.id} item={item} />)
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

function TasksTab({ slug, initialTasks }: { slug: string; initialTasks: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [updating, setUpdating] = useState<string | null>(null)

  async function updateStatus(taskId: string, status: Task['status']) {
    setUpdating(taskId)
    try {
      const res = await fetch(`/api/company/${slug}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t))
      }
    } finally {
      setUpdating(null)
    }
  }

  const BADGE_STYLES: Record<string, { bg: string; color: string }> = {
    marketing:   { bg: '#000', color: '#fff' },
    engineering: { bg: '#e0e0e0', color: '#555' },
    research:    { bg: '#dbeafe', color: '#1e40af' },
    growth:      { bg: '#dcfce7', color: '#166534' },
    outreach:    { bg: '#fef3c7', color: '#92400e' },
    ceo:         { bg: 'var(--accent)', color: '#000' },
  }

  const STATUS_STYLES: Record<Task['status'], { bg: string; color: string; borderLeft: string }> = {
    proposed:      { bg: 'var(--panel)', color: 'var(--ink)', borderLeft: '3px solid var(--muted)' },
    approved:      { bg: 'var(--panel)', color: 'var(--ink)', borderLeft: '3px solid #1d4ed8' },
    'in-progress': { bg: 'var(--panel)', color: 'var(--ink)', borderLeft: '3px solid var(--accent)' },
    done:          { bg: 'var(--panel)', color: 'var(--ink)', borderLeft: '3px solid var(--green)' },
  }

  return (
    <div style={{ overflowY: 'auto', height: '100%' }}>
      {tasks.length === 0 ? (
        <div style={{ color: 'var(--muted)', fontSize: 11, fontStyle: 'italic' }}>No tasks yet</div>
      ) : (
        tasks.map(task => {
          const ss = STATUS_STYLES[task.status]
          const badge = BADGE_STYLES[task.category] || BADGE_STYLES.ceo
          return (
            <div key={task.id} style={{
              padding: 8, marginBottom: 6,
              border: '1px solid var(--line)', background: ss.bg,
              borderLeft: ss.borderLeft,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{
                  display: 'inline-block', padding: '1px 7px', borderRadius: 8,
                  fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                  background: badge.bg, color: badge.color,
                }}>
                  {task.category}
                </span>
                <span style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase' }}>
                  {task.status}
                </span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 3, lineHeight: 1.3 }}>
                {task.title}
              </div>
              <div style={{
                fontSize: 10, color: '#666', lineHeight: 1.4,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                overflow: 'hidden', marginBottom: 6,
              }}>
                {task.description}
              </div>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                {task.status === 'proposed' && (
                  <button
                    onClick={() => updateStatus(task.id, 'approved')}
                    disabled={updating === task.id}
                    style={{
                      fontSize: 10, padding: '2px 8px', cursor: 'pointer',
                      background: '#1d4ed8', color: '#fff',
                      border: 'none', fontFamily: 'var(--mono)',
                    }}
                  >
                    Approve
                  </button>
                )}
                {task.status === 'approved' && (
                  <button
                    onClick={() => updateStatus(task.id, 'in-progress')}
                    disabled={updating === task.id}
                    style={{
                      fontSize: 10, padding: '2px 8px', cursor: 'pointer',
                      background: 'var(--accent)', color: '#000',
                      border: 'none', fontFamily: 'var(--mono)',
                    }}
                  >
                    Start
                  </button>
                )}
                {task.status === 'in-progress' && (
                  <button
                    onClick={() => updateStatus(task.id, 'done')}
                    disabled={updating === task.id}
                    style={{
                      fontSize: 10, padding: '2px 8px', cursor: 'pointer',
                      background: 'var(--green)', color: '#fff',
                      border: 'none', fontFamily: 'var(--mono)',
                    }}
                  >
                    Complete
                  </button>
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

function MissionTab({ slug, initialDoc }: { slug: string; initialDoc: Document | null }) {
  const [content, setContent] = useState(initialDoc?.content || '')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(initialDoc?.createdAt || null)

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/company/${slug}/mission`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (res.ok) {
        setSavedAt(new Date().toISOString())
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {!initialDoc && (
        <div style={{ color: 'var(--muted)', fontSize: 10, marginBottom: 12 }}>
          No mission document yet. Create one by running the onboarding agent.
        </div>
      )}
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        style={{
          flex: 1, padding: 10, border: '1px solid var(--line)',
          resize: 'none', fontFamily: 'var(--mono)', fontSize: 11,
          lineHeight: 1.6, outline: 'none', background: 'var(--paper)',
        }}
        placeholder="Write your mission document here..."
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexShrink: 0 }}>
        <button
          onClick={save}
          disabled={saving}
          style={{
            padding: '5px 14px', background: saving ? 'var(--line)' : 'var(--ink)',
            color: 'var(--paper)', border: '1px solid var(--ink)',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: 11, fontFamily: 'var(--mono)',
          }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        {savedAt && (
          <span style={{ fontSize: 9, color: 'var(--muted)' }}>
            Last saved: {new Date(savedAt).toLocaleString()}
          </span>
        )}
      </div>
    </div>
  )
}

function TwitterTab({ slug, initialTweets }: { slug: string; initialTweets: Tweet[] }) {
  const [tweets, setTweets] = useState<Tweet[]>(initialTweets.filter(t => t.status !== 'deleted'))
  const [generating, setGenerating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function generateTweet() {
    setGenerating(true)
    console.log('%c[Cofounder] Generating tweet...', 'color: #f97316')
    try {
      const res = await fetch(`/api/company/${slug}/tweets`, { method: 'POST' })
      if (res.ok) {
        const tweet = await res.json()
        console.log('%c[Cofounder] Tweet generated', 'color: #16a34a', tweet.content.slice(0, 60) + '...')
        setTweets(prev => [tweet, ...prev])
      }
    } finally {
      setGenerating(false)
    }
  }

  async function deleteTweet(tweetId: string) {
    setDeletingId(tweetId)
    try {
      await fetch(`/api/company/${slug}/tweets`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweetId }),
      })
      setTweets(prev => prev.filter(t => t.id !== tweetId))
    } finally {
      setDeletingId(null)
    }
  }

  function mockPost(tweetId: string) {
    setTweets(prev => prev.map(t =>
      t.id === tweetId
        ? { ...t, status: 'posted' as const, postedAt: new Date().toISOString() }
        : t
    ))
  }

  const drafts = tweets.filter(t => t.status === 'draft')
  const posted = tweets.filter(t => t.status === 'posted')

  return (
    <div style={{ overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <button
          onClick={generateTweet}
          disabled={generating}
          style={{
            padding: '5px 14px', background: generating ? 'var(--line)' : 'var(--ink)',
            color: 'var(--paper)', border: '1px solid var(--ink)',
            cursor: generating ? 'not-allowed' : 'pointer',
            fontSize: 11, fontFamily: 'var(--mono)',
          }}
        >
          {generating ? '⟳ Generating...' : '+ Generate Tweet'}
        </button>
      </div>

      {drafts.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontWeight: 700, fontSize: 9, textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: 8, color: 'var(--ink)',
          }}>
            Drafts ({drafts.length})
          </div>
          {drafts.map(tweet => (
            <div key={tweet.id} style={{
              padding: '8px 0', borderBottom: '1px solid var(--line)',
            }}>
              <div style={{ fontSize: 11, lineHeight: 1.4, color: '#333', marginBottom: 6 }}>
                {tweet.content}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 9, color: 'var(--muted)', flex: 1 }}>
                  {relativeTime(tweet.createdAt)}
                </span>
                <button
                  onClick={() => mockPost(tweet.id)}
                  style={{
                    fontSize: 10, padding: '2px 8px',
                    background: 'var(--ink)', color: 'var(--paper)',
                    border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)',
                  }}
                >
                  Post
                </button>
                <button
                  onClick={() => deleteTweet(tweet.id)}
                  disabled={deletingId === tweet.id}
                  style={{
                    fontSize: 10, padding: '2px 8px',
                    background: 'transparent', color: 'var(--muted)',
                    border: '1px solid var(--line)', cursor: 'pointer', fontFamily: 'var(--mono)',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {posted.length > 0 && (
        <div>
          <div style={{
            fontWeight: 700, fontSize: 9, textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: 8, color: 'var(--ink)',
          }}>
            Posted ({posted.length})
          </div>
          {posted.map(tweet => (
            <div key={tweet.id} style={{
              padding: '8px 0', borderBottom: '1px solid var(--line)',
            }}>
              <div style={{ fontSize: 11, lineHeight: 1.4, color: '#333', marginBottom: 4 }}>
                {tweet.content}
              </div>
              <div style={{ fontSize: 9, color: 'var(--green)' }}>
                Posted {tweet.postedAt ? relativeTime(tweet.postedAt) : ''}
              </div>
            </div>
          ))}
        </div>
      )}

      {tweets.length === 0 && (
        <div style={{ color: 'var(--muted)', fontSize: 11, fontStyle: 'italic' }}>
          No tweets yet. Generate your first one.
        </div>
      )}
    </div>
  )
}

function EmailTab({ slug, agentEmail, initialEmails }: { slug: string; agentEmail: string; initialEmails: EmailItem[] }) {
  const [emails, setEmails] = useState<EmailItem[]>(initialEmails)
  const [view, setView] = useState<'outbox' | 'inbox'>('outbox')
  const [composing, setComposing] = useState(false)

  const outbound = emails.filter(e => e.type === 'outbound')
  const inbound = emails.filter(e => e.type === 'inbound')

  async function composeEmail() {
    setComposing(true)
    try {
      const res = await fetch(`/api/company/${slug}/run`, { method: 'POST' })
      if (!res.body) return
      const reader = res.body.getReader()
      while (true) {
        const { done } = await reader.read()
        if (done) break
      }
      const companyRes = await fetch(`/api/company/${slug}`)
      if (companyRes.ok) {
        const updated = await companyRes.json()
        setEmails(updated.emails || [])
      }
    } finally {
      setComposing(false)
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '6px 8px', background: 'var(--panel)',
        border: '1px solid var(--line)', marginBottom: 12,
        fontSize: 10, flexShrink: 0,
      }}>
        <span style={{ color: 'var(--muted)' }}>Agent email: </span>
        <span style={{ fontWeight: 700 }}>{agentEmail}</span>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexShrink: 0 }}>
        <button
          onClick={composeEmail}
          disabled={composing}
          style={{
            padding: '5px 14px', background: composing ? 'var(--line)' : 'var(--ink)',
            color: 'var(--paper)', border: '1px solid var(--ink)',
            cursor: composing ? 'not-allowed' : 'pointer',
            fontSize: 11, fontFamily: 'var(--mono)',
          }}
        >
          {composing ? '⟳ Composing...' : '+ Compose Cold Email'}
        </button>
        <div style={{ display: 'flex', border: '1px solid var(--ink)', overflow: 'hidden', marginLeft: 'auto' }}>
          {(['outbox', 'inbox'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: '5px 12px', border: 'none',
                background: view === v ? 'var(--ink)' : 'var(--paper)',
                color: view === v ? 'var(--paper)' : 'var(--ink)',
                cursor: 'pointer', fontSize: 10, fontFamily: 'var(--mono)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}
            >
              {v} ({v === 'outbox' ? outbound.length : inbound.length})
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {view === 'outbox' && outbound.length === 0 && (
          <div style={{ color: 'var(--muted)', fontSize: 11, fontStyle: 'italic' }}>No outbound emails yet.</div>
        )}
        {view === 'inbox' && (
          <div style={{ color: 'var(--muted)', fontSize: 11, fontStyle: 'italic' }}>
            Waiting for replies...
          </div>
        )}
        {view === 'outbox' && outbound.map(email => (
          <div key={email.id} style={{
            padding: '6px 0', borderBottom: '1px solid var(--line)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>
              &rarr; {email.subject}
            </div>
            <div style={{ fontSize: 9, color: 'var(--muted)' }}>
              To: {email.to}
            </div>
            <div style={{
              fontSize: 10, lineHeight: 1.4, color: '#666',
              marginTop: 4, whiteSpace: 'pre-wrap',
            }}>
              {email.body.slice(0, 150)}{email.body.length > 150 ? '...' : ''}
            </div>
            <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 3 }}>
              {relativeTime(email.createdAt)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AdsTab({ slug }: { slug: string }) {
  const [budget, setBudget] = useState(50)
  const [generating, setGenerating] = useState(false)
  const [adCopy, setAdCopy] = useState<{ headline: string; body: string; cta: string } | null>(null)
  const [metrics] = useState({
    impressions: Math.floor(Math.random() * 5000) + 1000,
    clicks: Math.floor(Math.random() * 200) + 20,
    spend: (Math.random() * budget * 0.8).toFixed(2),
  })

  async function generateAdCopy() {
    setGenerating(true)
    try {
      const res = await fetch(`/api/company/${slug}/tweets`, { method: 'POST' })
      if (res.ok) {
        const tweet = await res.json()
        const lines = tweet.content.split(' ')
        setAdCopy({
          headline: lines.slice(0, 5).join(' '),
          body: tweet.content,
          cta: 'Learn More',
        })
      }
    } finally {
      setGenerating(false)
    }
  }

  const ctr = ((metrics.clicks / metrics.impressions) * 100).toFixed(2)

  return (
    <div style={{ overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 10, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Daily Budget: ${budget}
        </label>
        <input
          type="range"
          min={10} max={500} step={10}
          value={budget}
          onChange={e => setBudget(Number(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--accent)' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>
          <span>$10</span><span>$500</span>
        </div>
      </div>

      <button
        onClick={generateAdCopy}
        disabled={generating}
        style={{
          padding: '5px 14px', background: generating ? 'var(--line)' : 'var(--ink)',
          color: 'var(--paper)', border: '1px solid var(--ink)',
          cursor: generating ? 'not-allowed' : 'pointer',
          fontSize: 11, fontFamily: 'var(--mono)', marginBottom: 16,
        }}
      >
        {generating ? '⟳ Generating...' : '+ Generate Ad Copy'}
      </button>

      {adCopy && (
        <div style={{
          border: '1px solid var(--line)', overflow: 'hidden', marginBottom: 16,
        }}>
          <div style={{
            background: 'var(--panel)', padding: '4px 8px',
            fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase',
            letterSpacing: '0.05em', borderBottom: '1px solid var(--line)',
          }}>
            Ad Preview
          </div>
          <div style={{ padding: 12, background: 'var(--paper)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: 'var(--accent)' }}>
              {adCopy.headline}
            </div>
            <div style={{ fontSize: 11, color: '#333', lineHeight: 1.4, marginBottom: 8 }}>
              {adCopy.body}
            </div>
            <span style={{
              padding: '3px 10px', background: 'var(--ink)', color: 'var(--paper)',
              fontSize: 10, fontFamily: 'var(--mono)', border: '1px solid var(--ink)',
            }}>
              {adCopy.cta}
            </span>
          </div>
        </div>
      )}

      <div>
        <div style={{
          fontWeight: 700, fontSize: 9, textTransform: 'uppercase',
          letterSpacing: '0.08em', marginBottom: 8, color: 'var(--ink)',
        }}>
          Mock Metrics (Last 7 days)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {[
            { label: 'Impressions', value: metrics.impressions.toLocaleString() },
            { label: 'Clicks', value: metrics.clicks.toLocaleString() },
            { label: 'CTR', value: `${ctr}%` },
            { label: 'Spend', value: `$${metrics.spend}` },
          ].map(m => (
            <div key={m.label} style={{
              padding: '6px 8px', border: '1px solid var(--line)',
            }}>
              <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {m.label}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, margin: '2px 0' }}>{m.value}</div>
            </div>
          ))}
        </div>
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
    console.log('%c[Cofounder] Chat message sent', 'color: #f97316; font-weight: bold', userMessage)
    console.time('[Cofounder] Chat response')
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
              console.log('%c[Cofounder] Chat response complete', 'color: #16a34a', `${fullText.length} chars`)
              console.timeEnd('[Cofounder] Chat response')
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '6px 12px', borderBottom: '1px solid var(--ink)',
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        Chat
      </div>

      <div style={{
        flex: 1, overflowY: 'auto', padding: '10px 12px',
        display: 'flex', flexDirection: 'column', gap: 5,
      }}>
        {messages.length === 0 && (
          <div style={{ color: 'var(--muted)', fontSize: 10, fontStyle: 'italic' }}>
            Ask anything about your company...
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} style={{
            padding: '7px 10px', fontSize: 11, lineHeight: 1.5,
            borderRadius: 3, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            ...(msg.role === 'user'
              ? { background: '#000', color: '#fff', marginLeft: '30%' }
              : { background: 'var(--panel)', border: '1px solid var(--line)', marginRight: '15%' }
            ),
          }}>
            {msg.content}
          </div>
        ))}
        {streamingText && (
          <div style={{
            padding: '7px 10px', fontSize: 11, lineHeight: 1.5,
            borderRadius: 3, background: 'var(--panel)', border: '1px solid var(--line)',
            marginRight: '15%', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {streamingText}
            <span style={{
              display: 'inline-block', width: 6, height: 12,
              background: 'var(--ink)', animation: 'blink 0.8s step-end infinite',
              verticalAlign: 'text-bottom', marginLeft: 1,
            }} />
          </div>
        )}
      </div>

      <form onSubmit={sendMessage} style={{
        padding: '6px', borderTop: '1px solid var(--ink)',
        display: 'flex', gap: 4,
      }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage(e as unknown as React.FormEvent)
            }
          }}
          placeholder="Ask anything..."
          style={{
            flex: 1, border: '1px solid var(--ink)',
            padding: '5px 8px', fontFamily: 'var(--mono)',
            fontSize: 11, outline: 'none',
          }}
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          style={{
            border: '1px solid var(--ink)',
            background: input.trim() && !sending ? '#000' : 'var(--line)',
            color: '#fff', fontFamily: 'var(--mono)', fontSize: 10,
            padding: '5px 12px', cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
          }}
        >
          Send
        </button>
      </form>
    </div>
  )
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

type Tab = 'feed' | 'tasks' | 'mission' | 'twitter' | 'email' | 'ads'

const TABS: { id: Tab; label: string }[] = [
  { id: 'feed',    label: 'Live Feed' },
  { id: 'tasks',   label: 'Tasks' },
  { id: 'mission', label: 'Mission' },
  { id: 'twitter', label: 'Twitter' },
  { id: 'email',   label: 'Email' },
  { id: 'ads',     label: 'Ads' },
]

export default function DashboardClient({ company }: { company: Company }) {
  const [activeDoc, setActiveDoc] = useState<Document | null>(
    company.documents.length > 0 ? company.documents[0] : null
  )
  const [activeTab, setActiveTab] = useState<Tab>('feed')

  const missionDoc = company.documents.find(d => d.type === 'mission') || null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Terminal Ticker */}
      <TerminalTicker currentAction="" />

      {/* Navbar */}
      <div style={{
        position: 'fixed', top: 26, left: 0, width: '100%', height: 42,
        background: 'var(--paper)', borderBottom: '1px solid var(--ink)',
        display: 'flex', alignItems: 'center', padding: '0 16px',
        zIndex: 99, gap: 12,
      }}>
        <a href="/" style={{ textDecoration: 'none', color: 'var(--ink)' }}>
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>Cofounder</span>
        </a>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'var(--accent)', color: '#000',
          padding: '1px 7px', fontSize: 9, fontWeight: 700,
          textTransform: 'uppercase', borderRadius: 2,
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: '#000', animation: 'pulse 2s ease-in-out infinite',
            display: 'inline-block',
          }} />
          LIVE
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, marginLeft: 8 }}>{company.name}</span>

        {/* Nav tabs inline */}
        <nav style={{ display: 'flex', gap: 14, marginLeft: 20 }}>
          {TABS.map(tab => (
            <a
              key={tab.id}
              href="#"
              onClick={e => { e.preventDefault(); setActiveTab(tab.id) }}
              style={{
                color: activeTab === tab.id ? 'var(--ink)' : 'var(--muted)',
                textDecoration: 'none', fontSize: 11, fontWeight: activeTab === tab.id ? 700 : 500,
                borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                paddingBottom: 2,
              }}
            >
              {tab.label}
            </a>
          ))}
        </nav>

        <div style={{ marginLeft: 'auto' }}>
          <button style={{
            border: '1px solid var(--ink)',
            background: 'linear-gradient(to bottom, #fff, #ccc)',
            fontFamily: 'var(--mono)', fontSize: 10, padding: '3px 10px',
            cursor: 'pointer', borderRadius: 2,
          }}>
            New Company
          </button>
        </div>
      </div>

      {/* Dashboard content */}
      <div style={{
        marginTop: 68, display: 'flex', flex: 1, overflow: 'hidden',
      }}>
        {/* Left sidebar */}
        <div style={{
          width: 240, flexShrink: 0,
          borderRight: '1px solid var(--line)',
          overflowY: 'auto', padding: 14,
          background: 'var(--paper)',
        }}>
          <AsciiAvatar mood={company.mood} />

          <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '16px 0' }} />

          <div style={{
            fontWeight: 700, fontSize: 11, textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: 12, color: 'var(--ink)',
          }}>
            Documents
          </div>
          {company.documents.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 10 }}>None yet</div>
          ) : (
            company.documents.map(doc => (
              <DocumentItem
                key={doc.id}
                doc={doc}
                active={activeDoc?.id === doc.id}
                onClick={() => { setActiveDoc(doc); setActiveTab('mission') }}
              />
            ))
          )}

          {company.links.length > 0 && (
            <>
              <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '16px 0' }} />
              <div style={{
                fontWeight: 700, fontSize: 11, textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: 12, color: 'var(--ink)',
              }}>
                Links
              </div>
              {company.links.map((link, i) => (
                <div key={i} style={{ marginBottom: 4, fontSize: 10 }}>
                  <a href={link.url} target="_blank" rel="noopener noreferrer">{link.title}</a>
                </div>
              ))}
            </>
          )}

          <div style={{
            fontSize: 9, color: 'var(--muted)', marginTop: 16,
            paddingTop: 8, borderTop: '1px solid var(--line)',
          }}>
            Created {relativeTime(company.createdAt)}
          </div>
        </div>

        {/* Main content area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, padding: '14px 16px', overflow: 'hidden' }}>
            {activeTab === 'feed' && (
              <LiveFeedTab slug={company.slug} initialFeedItems={company.feedItems || []} />
            )}
            {activeTab === 'tasks' && (
              <TasksTab slug={company.slug} initialTasks={company.tasks || []} />
            )}
            {activeTab === 'mission' && (
              <MissionTab slug={company.slug} initialDoc={missionDoc} />
            )}
            {activeTab === 'twitter' && (
              <TwitterTab slug={company.slug} initialTweets={company.tweets || []} />
            )}
            {activeTab === 'email' && (
              <EmailTab
                slug={company.slug}
                agentEmail={company.agentEmail || `agent@${company.slug}.cofounder.app`}
                initialEmails={company.emails || []}
              />
            )}
            {activeTab === 'ads' && (
              <AdsTab slug={company.slug} />
            )}
          </div>
        </div>

        {/* Right sidebar — Chat */}
        <div style={{
          width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column',
          borderLeft: '1px solid var(--line)',
        }}>
          <ChatPanel slug={company.slug} initialMessages={company.messages} />
        </div>
      </div>
    </div>
  )
}
