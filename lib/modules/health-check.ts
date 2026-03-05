import { Company } from '../types'
import { openai, MODEL } from '../openai'

// --- Types ---

export type CheckStatus = 'pass' | 'warn' | 'fail'

export interface Check {
  id: string
  name: string
  status: CheckStatus
  value: string        // what was measured
  threshold: string    // what it was measured against
  detail?: string      // optional context
}

export interface HealthReport {
  slug: string
  name: string
  timestamp: string
  calculated: Check[]   // deterministic, from data
  observed: Check[]     // agentic, from LLM inspection
  summary: {
    pass: number
    warn: number
    fail: number
    grade: string       // A through F
  }
}

// --- Calculated checks (deterministic) ---
// These are the "PoB engine" — they compute directly from state.

function checkMissionExists(company: Company): Check {
  const mission = company.documents.find(d => d.type === 'mission')
  const hasContent = !!mission && mission.content.trim().length > 100
  return {
    id: 'mission_exists',
    name: 'Mission document',
    status: hasContent ? 'pass' : 'fail',
    value: mission ? `${mission.content.trim().length} chars` : 'missing',
    threshold: '> 100 chars',
  }
}

function checkMarketResearch(company: Company): Check {
  const research = company.documents.find(d => d.type === 'market-research')
  const hasContent = !!research && research.content.trim().length > 100
  return {
    id: 'market_research_exists',
    name: 'Market research',
    status: hasContent ? 'pass' : 'fail',
    value: research ? `${research.content.trim().length} chars` : 'missing',
    threshold: '> 100 chars',
  }
}

function checkTaskCoverage(company: Company): Check {
  const categories = Array.from(new Set(company.tasks.map(t => t.category)))
  const total = ['engineering', 'research', 'growth', 'operations'].length
  const covered = categories.length
  return {
    id: 'task_coverage',
    name: 'Task category coverage',
    status: covered >= 3 ? 'pass' : covered >= 2 ? 'warn' : 'fail',
    value: `${covered}/${total} categories`,
    threshold: '>= 3 categories',
    detail: `Present: ${categories.join(', ') || 'none'}`,
  }
}

function checkTaskVolume(company: Company): Check {
  const count = company.tasks.length
  return {
    id: 'task_volume',
    name: 'Task pipeline depth',
    status: count >= 5 ? 'pass' : count >= 3 ? 'warn' : 'fail',
    value: `${count} tasks`,
    threshold: '>= 5 tasks',
  }
}

function checkTaskVelocity(company: Company): Check {
  const total = company.tasks.length
  if (total === 0) {
    return {
      id: 'task_velocity',
      name: 'Task completion rate',
      status: 'fail',
      value: 'no tasks',
      threshold: '> 0% done',
    }
  }
  const done = company.tasks.filter(t => t.status === 'done').length
  const ratio = done / total
  return {
    id: 'task_velocity',
    name: 'Task completion rate',
    status: ratio > 0.2 ? 'pass' : ratio > 0 ? 'warn' : 'fail',
    value: `${done}/${total} (${Math.round(ratio * 100)}%)`,
    threshold: '> 20% completed',
  }
}

function checkAgentActivity(company: Company): Check {
  const completedCycles = company.cycles.filter(c => c.completedAt)
  return {
    id: 'agent_activity',
    name: 'Agent cycles completed',
    status: completedCycles.length >= 3 ? 'pass' : completedCycles.length >= 1 ? 'warn' : 'fail',
    value: `${completedCycles.length} cycles`,
    threshold: '>= 3 cycles',
  }
}

function checkContentPipeline(company: Company): Check {
  const draftTweets = company.tweets.filter(t => t.status === 'draft').length
  const draftEmails = company.emails.filter(e => e.status === 'draft').length
  const total = draftTweets + draftEmails
  return {
    id: 'content_pipeline',
    name: 'Content ready to ship',
    status: total >= 3 ? 'pass' : total >= 1 ? 'warn' : 'fail',
    value: `${draftTweets} tweets, ${draftEmails} emails`,
    threshold: '>= 3 draft pieces',
  }
}

function checkStaleness(company: Company): Check {
  const timestamps = [
    company.createdAt,
    ...company.feedItems.map(f => f.completedAt || f.createdAt),
    ...company.cycles.map(c => c.completedAt || c.startedAt),
    ...company.messages.map(m => m.createdAt),
  ].filter(Boolean).map(t => new Date(t).getTime())

  const latest = Math.max(...timestamps)
  const hoursAgo = (Date.now() - latest) / (1000 * 60 * 60)

  return {
    id: 'staleness',
    name: 'Last activity',
    status: hoursAgo < 24 ? 'pass' : hoursAgo < 72 ? 'warn' : 'fail',
    value: hoursAgo < 1 ? `${Math.round(hoursAgo * 60)}m ago` : `${Math.round(hoursAgo)}h ago`,
    threshold: '< 24 hours',
  }
}

function runCalculatedChecks(company: Company): Check[] {
  return [
    checkMissionExists(company),
    checkMarketResearch(company),
    checkTaskCoverage(company),
    checkTaskVolume(company),
    checkTaskVelocity(company),
    checkAgentActivity(company),
    checkContentPipeline(company),
    checkStaleness(company),
  ]
}

// --- Observed checks (agentic) ---
// These are the "LLM enrichment layer" — a single, structured observation pass.
// Like assistant-poe's stat_watch: it reads state and produces structured assessments.

const OBSERVATION_PROMPT = `You are a business health validator. You receive a company's mission and market research documents.
Your job is to evaluate them against specific criteria and return structured pass/warn/fail assessments.

You are NOT a strategist. You do NOT generate advice. You OBSERVE and JUDGE against thresholds.

Evaluate these 4 checks:

1. "specificity" — Does the mission name a specific customer, specific problem, and specific mechanism?
   PASS: All three are concrete and named. WARN: Two of three. FAIL: Vague on two or more.

2. "differentiation" — Does the market research identify a gap that no listed competitor fills?
   PASS: A clear, named gap. WARN: Gap is implied but not sharp. FAIL: Competitors cover the same ground.

3. "actionability" — Could a stranger read these docs and know what to build first?
   PASS: First action is obvious. WARN: Direction is clear but first step is ambiguous. FAIL: No clear starting point.

4. "market_timing" — Does the research cite a specific, verifiable reason why NOW is the right time?
   PASS: Cites a dated trend, event, or metric. WARN: General trend without specifics. FAIL: No timing argument.

Respond with ONLY a JSON array of exactly 4 objects:
[
  {"id": "specificity", "status": "pass|warn|fail", "detail": "one sentence"},
  {"id": "differentiation", "status": "pass|warn|fail", "detail": "one sentence"},
  {"id": "actionability", "status": "pass|warn|fail", "detail": "one sentence"},
  {"id": "market_timing", "status": "pass|warn|fail", "detail": "one sentence"}
]

No markdown. No explanation. Just the JSON array.`

const OBSERVATION_NAMES: Record<string, string> = {
  specificity: 'Mission specificity',
  differentiation: 'Competitive differentiation',
  actionability: 'Actionability of vision',
  market_timing: 'Market timing argument',
}

const OBSERVATION_THRESHOLDS: Record<string, string> = {
  specificity: 'Names customer, problem, and mechanism',
  differentiation: 'Clear gap no competitor fills',
  actionability: 'Stranger knows what to build first',
  market_timing: 'Cites dated trend or metric',
}

async function runObservedChecks(company: Company): Promise<Check[]> {
  const mission = company.documents.find(d => d.type === 'mission')
  const research = company.documents.find(d => d.type === 'market-research')

  if (!mission && !research) {
    return Object.entries(OBSERVATION_NAMES).map(([id, name]) => ({
      id,
      name,
      status: 'fail' as CheckStatus,
      value: 'no documents to evaluate',
      threshold: OBSERVATION_THRESHOLDS[id],
    }))
  }

  const content = [
    mission ? `## Mission\n${mission.content}` : '',
    research ? `## Market Research\n${research.content}` : '',
  ].filter(Boolean).join('\n\n')

  const response = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0,
    messages: [
      { role: 'system', content: OBSERVATION_PROMPT },
      { role: 'user', content },
    ],
  })

  const raw = response.choices[0]?.message?.content?.trim() || '[]'

  try {
    const results = JSON.parse(raw) as Array<{ id: string; status: CheckStatus; detail: string }>
    return results.map(r => ({
      id: r.id,
      name: OBSERVATION_NAMES[r.id] || r.id,
      status: r.status,
      value: r.status,
      threshold: OBSERVATION_THRESHOLDS[r.id] || '',
      detail: r.detail,
    }))
  } catch {
    return Object.entries(OBSERVATION_NAMES).map(([id, name]) => ({
      id,
      name,
      status: 'warn' as CheckStatus,
      value: 'observation failed to parse',
      threshold: OBSERVATION_THRESHOLDS[id],
    }))
  }
}

// --- Grade computation ---

function computeGrade(checks: Check[]): string {
  const total = checks.length
  if (total === 0) return 'F'
  const score = checks.reduce((acc, c) => {
    if (c.status === 'pass') return acc + 1
    if (c.status === 'warn') return acc + 0.5
    return acc
  }, 0)
  const ratio = score / total
  if (ratio >= 0.9) return 'A'
  if (ratio >= 0.75) return 'B'
  if (ratio >= 0.6) return 'C'
  if (ratio >= 0.4) return 'D'
  return 'F'
}

// --- Public API ---

export async function runHealthCheck(company: Company): Promise<HealthReport> {
  const calculated = runCalculatedChecks(company)
  const observed = await runObservedChecks(company)
  const all = [...calculated, ...observed]

  return {
    slug: company.slug,
    name: company.name,
    timestamp: new Date().toISOString(),
    calculated,
    observed,
    summary: {
      pass: all.filter(c => c.status === 'pass').length,
      warn: all.filter(c => c.status === 'warn').length,
      fail: all.filter(c => c.status === 'fail').length,
      grade: computeGrade(all),
    },
  }
}
