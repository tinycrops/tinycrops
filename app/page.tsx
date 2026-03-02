'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type InputType = 'idea' | 'business'

type TerminalLine = {
  type: 'log' | 'done' | 'error'
  text: string
  slug?: string
}

export default function Home() {
  const router = useRouter()
  const [inputType, setInputType] = useState<InputType>('idea')
  const [value, setValue] = useState('')
  const [running, setRunning] = useState(false)
  const [lines, setLines] = useState<TerminalLine[]>([])
  const terminalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [lines])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim() || running) return

    setRunning(true)
    setLines([{ type: 'log', text: '> Initializing...' }])

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
            setLines(prev => [...prev, data])
            if (data.type === 'done' && data.slug) {
              setTimeout(() => router.push(`/dashboard/${data.slug}`), 800)
            }
          } catch {}
        }
      }
    } catch (err) {
      setLines(prev => [...prev, { type: 'error', text: `> Error: ${String(err)}` }])
      setRunning(false)
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: '80px auto', padding: '0 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 18, fontWeight: 'bold', margin: 0 }}>Cofounder</h1>
        <p style={{ margin: '8px 0 0', color: '#555' }}>
          Paste your idea. Walk away with a company.
        </p>
      </div>

      {!running ? (
        <form onSubmit={handleSubmit}>
          {/* Toggle */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 16, border: '1px solid #000' }}>
            <button
              type="button"
              onClick={() => setInputType('idea')}
              style={{
                flex: 1,
                padding: '6px 12px',
                background: inputType === 'idea' ? '#000' : '#fff',
                color: inputType === 'idea' ? '#fff' : '#000',
                border: 'none',
                borderRight: '1px solid #000',
              }}
            >
              I have an idea
            </button>
            <button
              type="button"
              onClick={() => setInputType('business')}
              style={{
                flex: 1,
                padding: '6px 12px',
                background: inputType === 'business' ? '#000' : '#fff',
                color: inputType === 'business' ? '#fff' : '#000',
                border: 'none',
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
              width: '100%',
              height: 120,
              padding: '10px',
              border: '1px solid #000',
              resize: 'vertical',
              background: '#fff',
              outline: 'none',
            }}
            disabled={running}
          />

          <button
            type="submit"
            disabled={!value.trim() || running}
            style={{
              marginTop: 12,
              padding: '8px 24px',
              background: value.trim() ? '#000' : '#ccc',
              color: '#fff',
              border: '1px solid #000',
              cursor: value.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Start →
          </button>
        </form>
      ) : (
        /* Terminal */
        <div>
          <div
            ref={terminalRef}
            style={{
              border: '1px solid #000',
              padding: '12px',
              height: 320,
              overflowY: 'auto',
              background: '#fff',
            }}
          >
            {lines.map((line, i) => (
              <div
                key={i}
                style={{
                  color: line.type === 'error' ? '#c00' : line.type === 'done' ? '#080' : '#000',
                  marginBottom: 2,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {line.text}
              </div>
            ))}
            {running && lines[lines.length - 1]?.type !== 'done' && (
              <span style={{ animation: 'blink 1s step-end infinite' }}>█</span>
            )}
          </div>
          <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
        </div>
      )}
    </div>
  )
}
