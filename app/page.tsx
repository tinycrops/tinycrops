'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type InputType = 'idea' | 'business'

type TerminalLine = {
  type: 'log' | 'done' | 'error'
  text: string
  slug?: string
}

const CAPABILITIES = [
  {
    label: 'Market Research',
    desc: 'Deep competitive analysis, market sizing, and positioning strategy — generated in minutes.',
    example: '> Analyzing 47 competitors in the AI writing space...\n> Market size: $4.2B by 2027 (CAGR 23.1%)\n> Key gap identified: No player serves non-English SMBs\n> Positioning recommendation: "AI writing for the global middle market"',
  },
  {
    label: 'Growth Strategy',
    desc: 'Autonomous task generation — from cold outreach to A/B tests to partnership plays.',
    example: '> Task proposed: Cold outreach to 50 Shopify Plus merchants\n> Task proposed: A/B test landing page headline variants\n> Task proposed: Partner integration with Stripe billing\n> Task proposed: Launch Product Hunt campaign (Thursday 12:01 AM PST)',
  },
  {
    label: 'Content & Outreach',
    desc: 'Drafts tweets, composes cold emails, writes ad copy — all personalized to your brand voice.',
    example: '> Tweet drafted: "Most AI tools automate tasks. We automate judgment..."\n> Cold email composed to j***@stripe.com\n> Subject: "Your merchants are leaving money on the table"\n> Ad copy generated: 3 variants for Meta campaign',
  },
  {
    label: 'Autonomous Execution',
    desc: 'CEO, engineering, marketing, and research agents work in cycles — 24/7, no babysitting.',
    example: '> Agent cycle #14 starting...\n> [CEO] Reviewing overnight metrics, adjusting priorities\n> [MARKETING] Scheduling 6 tweets, 3 email sequences\n> [RESEARCH] Scanning Y Combinator S24 for partnership leads\n> [ENGINEERING] Proposing analytics dashboard improvements',
  },
]

export default function Home() {
  const router = useRouter()
  const [inputType, setInputType] = useState<InputType>('idea')
  const [value, setValue] = useState('')
  const [running, setRunning] = useState(false)
  const [lines, setLines] = useState<TerminalLine[]>([])
  const [activeCapability, setActiveCapability] = useState(0)
  const terminalRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [lines])

  // Rotate capability showcase
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCapability(prev => (prev + 1) % CAPABILITIES.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim() || running) return

    setRunning(true)
    setLines([{ type: 'log', text: '> Initializing...' }])
    console.group('%c[Cofounder] Onboarding started', 'color: #f97316; font-weight: bold')
    console.log('Input:', value.trim())
    console.log('Type:', inputType)
    console.time('[Cofounder] Onboarding total')

    try {
      const res = await fetch('/api/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: value.trim(), inputType }),
      })

      if (!res.ok || !res.body) {
        throw new Error('Failed to start onboarding')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value: chunk } = await reader.read()
        if (done) break

        buffer += decoder.decode(chunk, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''

        for (const part of parts) {
          const line = part.replace(/^data: /, '').trim()
          if (!line) continue
          try {
            const data = JSON.parse(line) as TerminalLine
            const style = data.type === 'error' ? 'color: #ef4444' : data.type === 'done' ? 'color: #16a34a; font-weight: bold' : 'color: #888'
            console.log(`%c[onboard] ${data.text}`, style)
            setLines(prev => [...prev, data])
            if (data.type === 'done' && data.slug) {
              console.timeEnd('[Cofounder] Onboarding total')
              console.groupEnd()
              setTimeout(() => router.push(`/dashboard/${data.slug}`), 800)
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error('[Cofounder] Onboarding error:', err)
      console.timeEnd('[Cofounder] Onboarding total')
      console.groupEnd()
      setLines(prev => [...prev, { type: 'error', text: `> Error: ${String(err)}` }])
      setRunning(false)
    }
  }

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div style={{ background: 'var(--paper)', color: 'var(--ink)', minHeight: '100vh' }}>

      {/* ── Hero ── */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        padding: '0 24px', textAlign: 'center',
        position: 'relative',
      }}>
        {/* Terminal ticker at top */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: 26,
          background: '#0a0a0a', color: '#999', fontSize: 11, lineHeight: '26px',
          overflow: 'hidden', padding: '0 12px', whiteSpace: 'nowrap',
          borderBottom: '1px solid #333',
        }}>
          <span style={{ color: '#555', marginRight: 6 }}>&gt;</span>
          <span style={{ color: '#aaa' }}>Ready to build something extraordinary</span>
        </div>

        <div style={{ maxWidth: 680 }}>
          {/* Brand */}
          <div style={{ marginBottom: 32 }}>
            <h1 style={{
              fontSize: 48, fontWeight: 800, letterSpacing: '-0.03em',
              margin: 0, lineHeight: 1.1,
            }}>
              Cofounder
            </h1>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'var(--accent)', color: '#000',
              padding: '2px 10px', fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', borderRadius: 2, marginTop: 12,
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: '#000', animation: 'pulse 2s ease-in-out infinite',
                display: 'inline-block',
              }} />
              AI Agents Online
            </div>
          </div>

          {/* Tagline */}
          <p style={{
            fontSize: 20, lineHeight: 1.5, color: 'var(--ink)',
            marginBottom: 16, fontWeight: 400,
          }}>
            Paste your idea. Walk away with a company.
          </p>
          <p style={{
            fontSize: 13, lineHeight: 1.7, color: 'var(--muted)',
            marginBottom: 40, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto',
          }}>
            Autonomous AI agents handle market research, competitive analysis,
            growth strategy, content creation, and outreach — while you sleep.
            Not a tool. A co-founder that never stops working.
          </p>

          {/* CTA */}
          <button
            onClick={scrollToForm}
            style={{
              padding: '10px 32px', background: 'var(--ink)', color: 'var(--paper)',
              border: '1px solid var(--ink)', cursor: 'pointer',
              fontSize: 13, fontFamily: 'var(--mono)', fontWeight: 700,
              letterSpacing: '0.02em',
            }}
          >
            Start Building &darr;
          </button>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase',
          letterSpacing: '0.1em', animation: 'pulse 2s ease-in-out infinite',
        }}>
          Scroll
        </div>
      </section>

      {/* ── Capabilities Showcase ── */}
      <section style={{
        borderTop: '1px solid var(--ink)',
        padding: '80px 24px',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{
            fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 12,
          }}>
            What Your AI Co-founder Does
          </div>
          <h2 style={{
            fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em',
            margin: '0 0 48px', lineHeight: 1.2,
          }}>
            Four autonomous agents.<br />
            One relentless machine.
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'var(--line)' }}>
            {/* Left: capability list */}
            <div style={{ background: 'var(--paper)' }}>
              {CAPABILITIES.map((cap, i) => (
                <div
                  key={i}
                  onClick={() => setActiveCapability(i)}
                  style={{
                    padding: '16px 20px',
                    borderLeft: activeCapability === i ? '3px solid var(--accent)' : '3px solid transparent',
                    background: activeCapability === i ? 'var(--panel)' : 'var(--paper)',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--line)',
                  }}
                >
                  <div style={{
                    fontSize: 12, fontWeight: 700, marginBottom: 4,
                    color: activeCapability === i ? 'var(--ink)' : 'var(--muted)',
                  }}>
                    {cap.label}
                  </div>
                  <div style={{ fontSize: 11, color: '#666', lineHeight: 1.4 }}>
                    {cap.desc}
                  </div>
                </div>
              ))}
            </div>

            {/* Right: terminal output */}
            <div style={{
              background: '#0a0a0a', padding: '20px', color: '#aaa',
              fontSize: 11, lineHeight: 1.6, fontFamily: 'var(--mono)',
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
            }}>
              <div style={{ color: '#555', fontSize: 9, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Agent Output
              </div>
              <pre style={{
                margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'var(--mono)',
                fontSize: 11, lineHeight: 1.6, color: '#ccc',
                animation: 'fadeIn 0.3s ease-out',
              }}>
                {CAPABILITIES[activeCapability].example}
              </pre>
              <span style={{
                display: 'inline-block', width: 6, height: 12,
                background: 'var(--accent)', animation: 'blink 0.8s step-end infinite',
                marginTop: 8,
              }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── The Vision ── */}
      <section style={{
        borderTop: '1px solid var(--ink)',
        padding: '80px 24px', textAlign: 'center',
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <p style={{
            fontSize: 22, lineHeight: 1.5, fontWeight: 400,
            color: 'var(--ink)', margin: 0,
          }}>
            &ldquo;Every company deserves a brilliant co-founder.<br />
            Now every founder has one.&rdquo;
          </p>
          <div style={{
            marginTop: 24, fontSize: 10, color: 'var(--muted)',
            textTransform: 'uppercase', letterSpacing: '0.1em',
          }}>
            The future of company building is autonomous
          </div>
        </div>
      </section>

      {/* ── Onboarding Form ── */}
      <section
        ref={formRef}
        style={{
          borderTop: '1px solid var(--ink)',
          padding: '80px 24px 120px', textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{
            fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.1em', color: 'var(--accent)', marginBottom: 12,
          }}>
            Get Started
          </div>
          <h2 style={{
            fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em',
            margin: '0 0 8px',
          }}>
            Paste your idea
          </h2>
          <p style={{
            fontSize: 12, color: 'var(--muted)', marginBottom: 32,
          }}>
            In 60 seconds, your AI co-founder will generate a company name, mission document,
            market research, strategic tasks, and outreach plan.
          </p>

          {!running ? (
            <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
              {/* Toggle */}
              <div style={{ display: 'flex', gap: 0, marginBottom: 12, border: '1px solid var(--ink)' }}>
                <button
                  type="button"
                  onClick={() => setInputType('idea')}
                  style={{
                    flex: 1, padding: '6px 12px',
                    background: inputType === 'idea' ? 'var(--ink)' : 'var(--paper)',
                    color: inputType === 'idea' ? 'var(--paper)' : 'var(--ink)',
                    border: 'none', borderRight: '1px solid var(--ink)',
                    fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer',
                  }}
                >
                  I have an idea
                </button>
                <button
                  type="button"
                  onClick={() => setInputType('business')}
                  style={{
                    flex: 1, padding: '6px 12px',
                    background: inputType === 'business' ? 'var(--ink)' : 'var(--paper)',
                    color: inputType === 'business' ? 'var(--paper)' : 'var(--ink)',
                    border: 'none',
                    fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer',
                  }}
                >
                  I have a business
                </button>
              </div>

              {/* Input */}
              <textarea
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder={
                  inputType === 'idea'
                    ? 'Describe your idea in a sentence or two...'
                    : 'Paste your website URL or describe your business...'
                }
                style={{
                  width: '100%', height: 120, padding: '10px',
                  border: '1px solid var(--ink)', resize: 'vertical',
                  background: 'var(--paper)', outline: 'none',
                  fontFamily: 'var(--mono)', fontSize: 11,
                }}
                disabled={running}
              />

              <button
                type="submit"
                disabled={!value.trim() || running}
                style={{
                  marginTop: 10, padding: '8px 24px',
                  background: value.trim() ? 'var(--ink)' : 'var(--line)',
                  color: 'var(--paper)', border: '1px solid var(--ink)',
                  cursor: value.trim() ? 'pointer' : 'not-allowed',
                  fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700,
                }}
              >
                Start &rarr;
              </button>
            </form>
          ) : (
            /* Terminal */
            <div style={{ textAlign: 'left' }}>
              <div
                ref={terminalRef}
                style={{
                  border: '1px solid var(--ink)', padding: '12px',
                  height: 320, overflowY: 'auto',
                  background: '#0a0a0a', color: '#aaa',
                  fontFamily: 'var(--mono)', fontSize: 11,
                }}
              >
                {lines.map((line, i) => (
                  <div
                    key={i}
                    style={{
                      color: line.type === 'error' ? '#ef4444'
                           : line.type === 'done' ? 'var(--green)'
                           : '#ccc',
                      marginBottom: 2,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      animation: 'fadeIn 0.2s ease-out',
                    }}
                  >
                    {line.text}
                  </div>
                ))}
                {running && lines[lines.length - 1]?.type !== 'done' && (
                  <span style={{
                    display: 'inline-block', width: 6, height: 12,
                    background: 'var(--accent)', animation: 'blink 0.8s step-end infinite',
                  }} />
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid var(--line)',
        padding: '16px 24px',
        textAlign: 'center',
        fontSize: 9, color: 'var(--muted)',
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        Cofounder — Autonomous AI Business Development
      </footer>
    </div>
  )
}
