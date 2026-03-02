'use client'

import { useState, useEffect, useRef } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────
type ServiceStatus = 'live' | 'building' | 'failed' | 'paused' | 'creating'
type ServiceKind = 'web' | 'worker' | 'cron' | 'static' | 'private'
type DbKind = 'postgres' | 'keyvalue'
type DbStatus = 'available' | 'creating'
type MemberRole = 'owner' | 'admin' | 'member' | 'viewer'
type DeployStatus = 'live' | 'building' | 'failed' | 'cancelled' | 'queued'
type View = 'dashboard' | 'service' | 'databases' | 'team' | 'deployments' | 'new-service'
type ServiceTab = 'overview' | 'logs' | 'env' | 'settings' | 'deploys'

interface EnvVar { id: string; key: string; value: string; isSecret: boolean }
interface Deployment {
  id: string; status: DeployStatus; commitSha: string; commitMessage: string
  triggeredBy: string; createdAt: string; duration: string; buildDuration: string
}
interface LogEntry { id: string; level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'; message: string; timestamp: string }
interface Service {
  id: string; name: string; kind: ServiceKind; status: ServiceStatus
  region: string; instanceType: string; url: string; branch: string
  lastDeploy: string; commitSha: string; commitMessage: string
  buildCommand: string; startCommand: string; port: number
  healthCheckPath: string; numInstances: number; autoScaling: boolean
  envVars: EnvVar[]; deployments: Deployment[]; logs: LogEntry[]
}
interface Database {
  id: string; name: string; kind: DbKind; status: DbStatus
  region: string; version: string; instanceType: string
  storageGb: number; connectionString: string; createdAt: string
}
interface TeamMember { id: string; name: string; email: string; role: MemberRole; joinedAt: string; avatar: string }
interface Notification { id: string; title: string; body: string; read: boolean; createdAt: string; kind: 'deploy' | 'billing' | 'team' }

// ── Mock Data ─────────────────────────────────────────────────────────────────
const INIT_SERVICES: Service[] = [
  {
    id: '1', name: 'api-gateway', kind: 'web', status: 'live',
    region: 'US East (Ohio)', instanceType: 'Standard',
    url: 'https://api-gateway.onrender.com', branch: 'main',
    lastDeploy: '12 minutes ago', commitSha: 'a3f2c1d',
    commitMessage: 'feat: add rate limiting middleware',
    buildCommand: 'npm install && npm run build', startCommand: 'npm start',
    port: 3000, healthCheckPath: '/health', numInstances: 3, autoScaling: true,
    envVars: [
      { id: 'e1', key: 'NODE_ENV', value: 'production', isSecret: false },
      { id: 'e2', key: 'DATABASE_URL', value: 'postgresql://user:pass@host/db', isSecret: true },
      { id: 'e3', key: 'JWT_SECRET', value: 'super-secret-jwt-key-2024', isSecret: true },
      { id: 'e4', key: 'REDIS_URL', value: 'redis://redis-cache-kv.internal:6379', isSecret: true },
      { id: 'e5', key: 'PORT', value: '3000', isSecret: false },
    ],
    deployments: [
      { id: 'd1', status: 'live', commitSha: 'a3f2c1d', commitMessage: 'feat: add rate limiting middleware', triggeredBy: 'alice@acme.com', createdAt: '12 minutes ago', duration: '2m 14s', buildDuration: '1m 42s' },
      { id: 'd2', status: 'live', commitSha: 'b8e1f3a', commitMessage: 'fix: handle null user sessions', triggeredBy: 'bob@acme.com', createdAt: '3 hours ago', duration: '1m 58s', buildDuration: '1m 31s' },
      { id: 'd3', status: 'failed', commitSha: 'c9d4e5f', commitMessage: 'refactor: update all dependencies', triggeredBy: 'alice@acme.com', createdAt: '1 day ago', duration: '3m 02s', buildDuration: '2m 55s' },
      { id: 'd4', status: 'live', commitSha: 'd2a3b1c', commitMessage: 'chore: bump node to 20.x LTS', triggeredBy: 'alice@acme.com', createdAt: '2 days ago', duration: '2m 05s', buildDuration: '1m 38s' },
    ],
    logs: [
      { id: 'l1', level: 'INFO', message: 'Server listening on port 3000', timestamp: '14:32:01.224' },
      { id: 'l2', level: 'INFO', message: 'Connected to PostgreSQL — pool size: 10', timestamp: '14:32:01.891' },
      { id: 'l3', level: 'INFO', message: 'Redis client connected successfully', timestamp: '14:32:02.112' },
      { id: 'l4', level: 'INFO', message: 'GET /health 200 2ms', timestamp: '14:32:15.003' },
      { id: 'l5', level: 'WARN', message: 'Rate limit approaching for client 192.168.1.1 (90/100)', timestamp: '14:33:07.441' },
      { id: 'l6', level: 'INFO', message: 'POST /api/v1/auth/login 200 45ms', timestamp: '14:33:12.003' },
      { id: 'l7', level: 'INFO', message: 'GET /api/v1/users 200 12ms', timestamp: '14:33:18.227' },
      { id: 'l8', level: 'ERROR', message: 'Stripe webhook signature mismatch — check STRIPE_WEBHOOK_SECRET', timestamp: '14:33:44.882' },
      { id: 'l9', level: 'INFO', message: 'GET /api/v1/products 200 8ms', timestamp: '14:34:01.003' },
      { id: 'l10', level: 'INFO', message: 'Health check passed. Uptime: 99.98%. Latency p99: 87ms', timestamp: '14:35:00.000' },
      { id: 'l11', level: 'DEBUG', message: 'Cache hit ratio: 94.2% (last 5 min)', timestamp: '14:35:00.001' },
      { id: 'l12', level: 'INFO', message: 'GET /api/v1/orders 200 23ms', timestamp: '14:36:02.114' },
    ],
  },
  {
    id: '2', name: 'web-frontend', kind: 'static', status: 'live',
    region: 'US West (Oregon)', instanceType: 'Static',
    url: 'https://web-frontend.onrender.com', branch: 'main',
    lastDeploy: '1 hour ago', commitSha: 'f5e8d2a',
    commitMessage: 'fix: mobile nav overflow on iOS Safari',
    buildCommand: 'npm install && npm run build', startCommand: '',
    port: 0, healthCheckPath: '/', numInstances: 1, autoScaling: false,
    envVars: [
      { id: 'e6', key: 'NEXT_PUBLIC_API_URL', value: 'https://api-gateway.onrender.com', isSecret: false },
      { id: 'e7', key: 'NEXT_PUBLIC_STRIPE_KEY', value: 'pk_live_51ABC...', isSecret: false },
    ],
    deployments: [
      { id: 'd5', status: 'live', commitSha: 'f5e8d2a', commitMessage: 'fix: mobile nav overflow on iOS Safari', triggeredBy: 'carol@acme.com', createdAt: '1 hour ago', duration: '3m 45s', buildDuration: '3m 22s' },
      { id: 'd6', status: 'live', commitSha: 'g1h2i3j', commitMessage: 'feat: dark mode toggle + persist to localStorage', triggeredBy: 'carol@acme.com', createdAt: '6 hours ago', duration: '4m 12s', buildDuration: '3m 55s' },
    ],
    logs: [
      { id: 'l13', level: 'INFO', message: 'Build completed. 47 static files generated.', timestamp: '13:15:22.441' },
      { id: 'l14', level: 'INFO', message: 'Deploying to global CDN (22 edge nodes)', timestamp: '13:15:23.002' },
      { id: 'l15', level: 'INFO', message: 'Cache invalidated for 47 paths', timestamp: '13:15:24.118' },
      { id: 'l16', level: 'INFO', message: 'Deploy complete. TTL: 0s (always fresh)', timestamp: '13:15:24.220' },
    ],
  },
  {
    id: '3', name: 'worker-jobs', kind: 'worker', status: 'building',
    region: 'US East (Ohio)', instanceType: 'Starter',
    url: '', branch: 'develop',
    lastDeploy: 'Deploying…', commitSha: 'h7j9k1l',
    commitMessage: 'feat: add email queue processor with retry backoff',
    buildCommand: 'pip install -r requirements.txt', startCommand: 'celery -A tasks worker --loglevel=info',
    port: 0, healthCheckPath: '', numInstances: 2, autoScaling: false,
    envVars: [
      { id: 'e8', key: 'CELERY_BROKER_URL', value: 'redis://redis-cache-kv.internal:6379/0', isSecret: true },
      { id: 'e9', key: 'SMTP_HOST', value: 'smtp.sendgrid.net', isSecret: false },
      { id: 'e10', key: 'SENDGRID_API_KEY', value: 'SG.xxxx.yyyy', isSecret: true },
    ],
    deployments: [
      { id: 'd7', status: 'building', commitSha: 'h7j9k1l', commitMessage: 'feat: add email queue processor with retry backoff', triggeredBy: 'alice@acme.com', createdAt: 'Just now', duration: '--', buildDuration: '--' },
      { id: 'd8', status: 'live', commitSha: 'i8k0l2m', commitMessage: 'fix: retry failed jobs with exponential backoff', triggeredBy: 'bob@acme.com', createdAt: '2 days ago', duration: '1m 44s', buildDuration: '1m 22s' },
    ],
    logs: [
      { id: 'l17', level: 'INFO', message: '[Build] Starting build for commit h7j9k1l', timestamp: '14:40:00.001' },
      { id: 'l18', level: 'INFO', message: '[Build] pip install -r requirements.txt', timestamp: '14:40:00.442' },
      { id: 'l19', level: 'INFO', message: '[Build] Collecting celery==5.3.4', timestamp: '14:40:01.003' },
      { id: 'l20', level: 'WARN', message: '[Build] Dependency conflict: celery 5.3 requires kombu>=5.3.2', timestamp: '14:40:15.227' },
      { id: 'l21', level: 'INFO', message: '[Build] Resolving conflict…', timestamp: '14:40:16.003' },
    ],
  },
  {
    id: '4', name: 'scheduler-cron', kind: 'cron', status: 'paused',
    region: 'EU (Frankfurt)', instanceType: 'Free',
    url: '', branch: 'main',
    lastDeploy: '5 days ago', commitSha: 'j9l1m3n',
    commitMessage: 'fix: correct UTC timezone handling in job scheduler',
    buildCommand: 'go build -o scheduler .', startCommand: './scheduler',
    port: 0, healthCheckPath: '', numInstances: 1, autoScaling: false,
    envVars: [
      { id: 'e11', key: 'TZ', value: 'UTC', isSecret: false },
      { id: 'e12', key: 'CRON_SECRET', value: 'cron_token_abc123', isSecret: true },
    ],
    deployments: [
      { id: 'd9', status: 'live', commitSha: 'j9l1m3n', commitMessage: 'fix: correct UTC timezone handling', triggeredBy: 'alice@acme.com', createdAt: '5 days ago', duration: '0m 48s', buildDuration: '0m 31s' },
    ],
    logs: [],
  },
  {
    id: '5', name: 'internal-api', kind: 'private', status: 'failed',
    region: 'US East (Ohio)', instanceType: 'Standard',
    url: 'internal-api.internal', branch: 'feature/auth-v2',
    lastDeploy: '2 hours ago', commitSha: 'k0m2n4o',
    commitMessage: 'feat: OAuth2 PKCE flow implementation',
    buildCommand: 'cargo build --release', startCommand: './target/release/internal-api',
    port: 8080, healthCheckPath: '/ping', numInstances: 1, autoScaling: false,
    envVars: [
      { id: 'e13', key: 'OAUTH_CLIENT_ID', value: 'client_12345_prod', isSecret: false },
      { id: 'e14', key: 'OAUTH_CLIENT_SECRET', value: 'sec_live_xxxxxxxx', isSecret: true },
    ],
    deployments: [
      { id: 'd10', status: 'failed', commitSha: 'k0m2n4o', commitMessage: 'feat: OAuth2 PKCE flow implementation', triggeredBy: 'bob@acme.com', createdAt: '2 hours ago', duration: '4m 33s', buildDuration: '4m 30s' },
      { id: 'd11', status: 'live', commitSha: 'l1n3o5p', commitMessage: 'fix: token refresh race condition', triggeredBy: 'alice@acme.com', createdAt: '4 days ago', duration: '3m 21s', buildDuration: '3m 05s' },
    ],
    logs: [
      { id: 'l22', level: 'INFO', message: 'Compiling internal-api v0.3.1 (release)', timestamp: '12:05:00.003' },
      { id: 'l23', level: 'INFO', message: 'Compiling 247 crates in parallel…', timestamp: '12:05:00.441' },
      { id: 'l24', level: 'ERROR', message: "error[E0502]: cannot borrow `state` as mutable because it is also borrowed as immutable", timestamp: '12:09:28.003' },
      { id: 'l25', level: 'ERROR', message: '  --> src/auth/pkce.rs:84:5', timestamp: '12:09:28.004' },
      { id: 'l26', level: 'ERROR', message: '   |', timestamp: '12:09:28.005' },
      { id: 'l27', level: 'ERROR', message: '84 |     state.tokens.push(token);', timestamp: '12:09:28.006' },
      { id: 'l28', level: 'ERROR', message: 'Build failed with exit code 101', timestamp: '12:09:30.001' },
    ],
  },
]

const INIT_DATABASES: Database[] = [
  { id: 'db1', name: 'postgres-main', kind: 'postgres', status: 'available', region: 'US East (Ohio)', version: '15', instanceType: 'Standard', storageGb: 20, connectionString: 'postgresql://postgres-main-user:***@postgres-main-pg.internal:5432/postgres_main', createdAt: '45 days ago' },
  { id: 'db2', name: 'redis-cache', kind: 'keyvalue', status: 'available', region: 'US East (Ohio)', version: '7.2', instanceType: 'Starter', storageGb: 1, connectionString: 'redis://redis-cache-kv.internal:6379', createdAt: '30 days ago' },
  { id: 'db3', name: 'analytics-db', kind: 'postgres', status: 'creating', region: 'EU (Frankfurt)', version: '15', instanceType: 'Pro', storageGb: 100, connectionString: '', createdAt: 'Just now' },
]

const INIT_TEAM: TeamMember[] = [
  { id: 't1', name: 'Alice Chen', email: 'alice@acme.com', role: 'owner', joinedAt: '1 year ago', avatar: 'AC' },
  { id: 't2', name: 'Bob Martinez', email: 'bob@acme.com', role: 'admin', joinedAt: '8 months ago', avatar: 'BM' },
  { id: 't3', name: 'Carol Johnson', email: 'carol@acme.com', role: 'member', joinedAt: '5 months ago', avatar: 'CJ' },
  { id: 't4', name: 'Dave Kim', email: 'dave@acme.com', role: 'viewer', joinedAt: '2 months ago', avatar: 'DK' },
]

const INIT_NOTIFS: Notification[] = [
  { id: 'n1', title: 'Deploy succeeded', body: 'api-gateway deployed from a3f2c1d on main', read: false, createdAt: '12 min ago', kind: 'deploy' },
  { id: 'n2', title: 'Deploy failed', body: 'internal-api build failed on feature/auth-v2', read: false, createdAt: '2 hours ago', kind: 'deploy' },
  { id: 'n3', title: 'Team member added', body: 'Dave Kim joined your team as Viewer', read: false, createdAt: '2 days ago', kind: 'team' },
  { id: 'n4', title: 'Deploy succeeded', body: 'web-frontend deployed from f5e8d2a on main', read: true, createdAt: '1 hour ago', kind: 'deploy' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
const statusColor = (s: string) => ({ live: '#22c55e', available: '#22c55e', building: '#f59e0b', creating: '#f59e0b', failed: '#ef4444', paused: '#64748b', cancelled: '#64748b', queued: '#60a5fa', deleted: '#ef4444' } as Record<string, string>)[s] ?? '#64748b'
const statusBg = (s: string) => ({ live: '#052e16', available: '#052e16', building: '#1c1309', creating: '#1c1309', failed: '#1a0505', paused: '#0f1623', cancelled: '#0f1623', queued: '#0c1a2e' } as Record<string, string>)[s] ?? '#0f1623'
const roleColor = (r: MemberRole) => ({ owner: '#818cf8', admin: '#f59e0b', member: '#22c55e', viewer: '#64748b' })[r]
const logColor = (l: string) => ({ INFO: '#94a3b8', WARN: '#f59e0b', ERROR: '#f87171', DEBUG: '#60a5fa' } as Record<string, string>)[l] ?? '#94a3b8'
const kindLabel = (k: string) => ({ web: 'Web Service', worker: 'Background Worker', cron: 'Cron Job', static: 'Static Site', private: 'Private Service', postgres: 'PostgreSQL', keyvalue: 'Key Value' } as Record<string, string>)[k] ?? k
const kindIcon = (k: string) => ({ web: '⬡', worker: '⚙', cron: '⏱', static: '◈', private: '⬢', postgres: '◉', keyvalue: '⚡' } as Record<string, string>)[k] ?? '●'

// ── Main Component ────────────────────────────────────────────────────────────
export default function RenderClone() {
  const [view, setView] = useState<View>('dashboard')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [serviceTab, setServiceTab] = useState<ServiceTab>('overview')
  const [services, setServices] = useState<Service[]>(INIT_SERVICES)
  const [databases] = useState<Database[]>(INIT_DATABASES)
  const [team] = useState<TeamMember[]>(INIT_TEAM)
  const [notifs, setNotifs] = useState<Notification[]>(INIT_NOTIFS)
  const [showNotifs, setShowNotifs] = useState(false)
  const [showConnStr, setShowConnStr] = useState<Record<string, boolean>>({})
  const [showEnvVal, setShowEnvVal] = useState<Record<string, boolean>>({})
  const [newKey, setNewKey] = useState('')
  const [newVal, setNewVal] = useState('')
  const [newSecret, setNewSecret] = useState(false)
  const [deployingId, setDeployingId] = useState<string | null>(null)
  const logsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight
  }, [selectedService, serviceTab])

  const unread = notifs.filter(n => !n.read).length

  const nav = (v: View, svc?: Service) => {
    setView(v)
    if (svc) { setSelectedService(svc); setServiceTab('overview') }
    setShowNotifs(false)
  }

  const handleDeploy = (svcId: string) => {
    setDeployingId(svcId)
    setTimeout(() => setDeployingId(null), 3000)
  }

  const addEnvVar = () => {
    if (!newKey.trim() || !selectedService) return
    const updated = [...(selectedService.envVars), { id: Date.now().toString(), key: newKey, value: newVal, isSecret: newSecret }]
    const updatedSvc = { ...selectedService, envVars: updated }
    setSelectedService(updatedSvc)
    setServices(services.map(s => s.id === selectedService.id ? updatedSvc : s))
    setNewKey(''); setNewVal(''); setNewSecret(false)
  }

  const deleteEnvVar = (id: string) => {
    if (!selectedService) return
    const updated = selectedService.envVars.filter(e => e.id !== id)
    const updatedSvc = { ...selectedService, envVars: updated }
    setSelectedService(updatedSvc)
    setServices(services.map(s => s.id === selectedService.id ? updatedSvc : s))
  }

  // ── Styles ──────────────────────────────────────────────────────────────────
  const S = {
    app: { display: 'flex', height: '100vh', background: '#0f172a', fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace", fontSize: 13, color: '#e2e8f0', overflow: 'hidden' } as React.CSSProperties,
    sidebar: { width: 220, background: '#0f172a', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column' as const, flexShrink: 0 },
    logo: { padding: '20px 20px 16px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 10 },
    logoIcon: { width: 28, height: 28, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 },
    logoText: { fontWeight: 700, fontSize: 15, color: '#f1f5f9', letterSpacing: -0.3 },
    nav: { padding: '12px 10px', flex: 1, overflowY: 'auto' as const },
    navSection: { fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: 1.2, textTransform: 'uppercase' as const, padding: '8px 10px 4px' },
    navItem: (active: boolean): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 6, cursor: 'pointer', color: active ? '#f1f5f9' : '#64748b', background: active ? '#1e293b' : 'transparent', fontWeight: active ? 600 : 400, fontSize: 13, transition: 'all 0.15s', marginBottom: 1, border: 'none', width: '100%', textAlign: 'left' }),
    sidebarFooter: { padding: '12px 16px', borderTop: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 10 },
    avatar: (size = 28, color = '#6366f1'): React.CSSProperties => ({ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.35, fontWeight: 700, color: '#fff', flexShrink: 0 }),
    content: { flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' },
    topbar: { height: 56, borderBottom: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 16, flexShrink: 0 },
    main: { flex: 1, overflowY: 'auto' as const, background: '#f8fafc' },
    pageInner: { maxWidth: 960, margin: '0 auto', padding: '32px 28px' },
    pageTitle: { fontSize: 22, fontWeight: 700, color: '#0f172a', letterSpacing: -0.5, marginBottom: 4 },
    pageSubtitle: { fontSize: 13, color: '#64748b', marginBottom: 28 },
    card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 12 },
    cardHeader: { padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    cardBody: { padding: '0' },
    badge: (color: string, bg: string): React.CSSProperties => ({ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 100, background: bg, color, fontSize: 11, fontWeight: 600, letterSpacing: 0.3 }),
    dot: (color: string, pulse = false): React.CSSProperties => ({ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0, animation: pulse ? 'pulse 2s infinite' : 'none' }),
    btn: (variant: 'primary' | 'secondary' | 'danger' | 'ghost' = 'secondary', size: 'sm' | 'md' = 'md'): React.CSSProperties => ({
      display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', border: 'none', borderRadius: 6, fontFamily: 'inherit', fontWeight: 600, transition: 'all 0.15s',
      ...(size === 'sm' ? { padding: '4px 10px', fontSize: 12 } : { padding: '7px 14px', fontSize: 13 }),
      ...(variant === 'primary' ? { background: '#6366f1', color: '#fff' } :
        variant === 'danger' ? { background: '#fee2e2', color: '#dc2626' } :
        variant === 'ghost' ? { background: 'transparent', color: '#64748b', border: '1px solid #e2e8f0' } :
        { background: '#f1f5f9', color: '#374151' }),
    }),
    input: { padding: '7px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, fontFamily: 'inherit', fontSize: 12, color: '#0f172a', outline: 'none', width: '100%' } as React.CSSProperties,
    tab: (active: boolean): React.CSSProperties => ({ padding: '8px 16px', cursor: 'pointer', border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 13, fontWeight: active ? 600 : 400, color: active ? '#6366f1' : '#64748b', borderBottom: active ? '2px solid #6366f1' : '2px solid transparent', transition: 'all 0.15s' }),
    table: { width: '100%', borderCollapse: 'collapse' as const },
    th: { padding: '10px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' as const, fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase' as const },
    td: { padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 13, color: '#374151', verticalAlign: 'middle' as const },
    mono: { fontFamily: 'inherit', fontSize: 12, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, color: '#374151' } as React.CSSProperties,
    tag: (color: string): React.CSSProperties => ({ display: 'inline-flex', padding: '1px 6px', borderRadius: 4, background: color + '22', color, fontSize: 11, fontWeight: 700 }),
  }

  // ── Service Row ──────────────────────────────────────────────────────────────
  const ServiceRow = ({ svc }: { svc: Service }) => (
    <div
      onClick={() => nav('service', svc)}
      style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.1s' }}
      onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, marginRight: 14, flexShrink: 0 }}>
        {kindIcon(svc.kind)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14, marginBottom: 2 }}>{svc.name}</div>
        <div style={{ color: '#64748b', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {kindLabel(svc.kind)} · {svc.region} · {svc.branch}
        </div>
      </div>
      <div style={{ flexShrink: 0, textAlign: 'right', marginLeft: 20 }}>
        <div style={{ ...S.badge(statusColor(svc.status), statusBg(svc.status)), marginBottom: 4, justifyContent: 'flex-end' }}>
          <div style={S.dot(statusColor(svc.status), svc.status === 'live')} />
          {svc.status === 'building' ? 'Building…' : svc.status.charAt(0).toUpperCase() + svc.status.slice(1)}
        </div>
        <div style={{ color: '#94a3b8', fontSize: 11 }}>{svc.lastDeploy}</div>
      </div>
      <div style={{ color: '#94a3b8', marginLeft: 12, fontSize: 16 }}>›</div>
    </div>
  )

  // ── Service Detail ───────────────────────────────────────────────────────────
  const ServiceDetail = () => {
    const svc = selectedService!
    return (
      <div style={S.pageInner}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 12, color: '#64748b' }}>
          <span style={{ cursor: 'pointer', color: '#6366f1' }} onClick={() => nav('dashboard')}>Services</span>
          <span>›</span>
          <span style={{ color: '#0f172a', fontWeight: 600 }}>{svc.name}</span>
        </div>

        {/* Service Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, border: '1px solid #e2e8f0' }}>
              {kindIcon(svc.kind)}
            </div>
            <div>
              <h1 style={{ ...S.pageTitle, marginBottom: 4, fontSize: 20 }}>{svc.name}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={S.badge(statusColor(svc.status), statusBg(svc.status))}>
                  <div style={S.dot(statusColor(svc.status), svc.status === 'live')} />
                  {svc.status === 'building' ? 'Building…' : svc.status.charAt(0).toUpperCase() + svc.status.slice(1)}
                </span>
                <span style={{ color: '#64748b', fontSize: 12 }}>{kindLabel(svc.kind)}</span>
                <span style={{ color: '#64748b', fontSize: 12 }}>·</span>
                <span style={{ color: '#64748b', fontSize: 12 }}>{svc.region}</span>
                {svc.url && (
                  <>
                    <span style={{ color: '#64748b', fontSize: 12 }}>·</span>
                    <a href="#" style={{ color: '#6366f1', fontSize: 12, textDecoration: 'none' }}>{svc.url} ↗</a>
                  </>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              style={S.btn('secondary')}
              onClick={() => handleDeploy(svc.id)}
              disabled={deployingId === svc.id || svc.status === 'building'}
            >
              {deployingId === svc.id ? '⟳ Deploying…' : '↑ Deploy'}
            </button>
            {svc.status === 'live' && <button style={S.btn('secondary')} onClick={() => {}}>⏸ Pause</button>}
            {svc.status === 'paused' && <button style={S.btn('primary')} onClick={() => {}}>▶ Resume</button>}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ borderBottom: '1px solid #e2e8f0', marginBottom: 24, display: 'flex' }}>
          {(['overview', 'logs', 'env', 'deploys', 'settings'] as ServiceTab[]).map(t => (
            <button key={t} style={S.tab(serviceTab === t)} onClick={() => setServiceTab(t)}>
              {t === 'overview' ? 'Overview' : t === 'logs' ? 'Logs' : t === 'env' ? 'Environment' : t === 'deploys' ? 'Deployments' : 'Settings'}
            </button>
          ))}
        </div>

        {/* Overview */}
        {serviceTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              ['Region', svc.region], ['Instance Type', svc.instanceType],
              ['Instances', svc.autoScaling ? `${svc.numInstances} (autoscaling)` : String(svc.numInstances)],
              ['Branch', svc.branch], ['Last Commit', svc.commitSha],
              ['Deployed', svc.lastDeploy],
            ].map(([k, v]) => (
              <div key={k} style={{ ...S.card, marginBottom: 0 }}>
                <div style={{ padding: '14px 18px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{k}</div>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontFamily: 'inherit', fontSize: 13 }}>{v}</div>
                </div>
              </div>
            ))}
            <div style={{ ...S.card, gridColumn: '1 / -1', marginBottom: 0 }}>
              <div style={{ padding: '14px 18px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Last Commit Message</div>
                <div style={{ fontWeight: 500, color: '#374151', fontSize: 13 }}>{svc.commitMessage}</div>
              </div>
            </div>
            {svc.url && (
              <div style={{ ...S.card, gridColumn: '1 / -1', marginBottom: 0 }}>
                <div style={{ padding: '14px 18px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Service URL</div>
                  <a href="#" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none', fontSize: 13 }}>{svc.url} ↗</a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Logs */}
        {serviceTab === 'logs' && (
          <div style={{ ...S.card, marginBottom: 0 }}>
            <div style={{ ...S.cardHeader, background: '#0f172a', borderBottom: '1px solid #1e293b' }}>
              <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>Live Logs — {svc.name}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {['DEBUG', 'INFO', 'WARN', 'ERROR'].map(l => (
                  <span key={l} style={S.tag(logColor(l))}>{l}</span>
                ))}
              </div>
            </div>
            <div ref={logsRef} style={{ background: '#0f172a', padding: 16, height: 420, overflowY: 'auto', fontFamily: 'inherit', fontSize: 12 }}>
              {svc.logs.length === 0 ? (
                <div style={{ color: '#475569', textAlign: 'center', paddingTop: 40 }}>No log entries yet.</div>
              ) : svc.logs.map(l => (
                <div key={l.id} style={{ display: 'flex', gap: 12, marginBottom: 6, lineHeight: 1.5 }}>
                  <span style={{ color: '#475569', flexShrink: 0, fontSize: 11 }}>{l.timestamp}</span>
                  <span style={{ ...S.tag(logColor(l.level)), flexShrink: 0, alignSelf: 'flex-start' }}>{l.level}</span>
                  <span style={{ color: l.level === 'ERROR' ? '#fca5a5' : l.level === 'WARN' ? '#fcd34d' : '#94a3b8', wordBreak: 'break-all' as const }}>{l.message}</span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4ade80', fontSize: 12, marginTop: 8 }}>
                <span style={{ animation: 'blink 1.2s step-end infinite' }}>█</span>
                <span style={{ color: '#475569' }}>Streaming live…</span>
              </div>
            </div>
          </div>
        )}

        {/* Environment Variables */}
        {serviceTab === 'env' && (
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>Environment Variables</div>
                <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>Changes take effect on next deploy.</div>
              </div>
            </div>
            <table style={S.table}>
              <thead>
                <tr><th style={S.th}>Key</th><th style={S.th}>Value</th><th style={S.th}>Type</th><th style={{ ...S.th, width: 80 }}></th></tr>
              </thead>
              <tbody>
                {svc.envVars.map(ev => (
                  <tr key={ev.id}>
                    <td style={S.td}><span style={S.mono}>{ev.key}</span></td>
                    <td style={S.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ ...S.mono, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 }}>
                          {ev.isSecret && !showEnvVal[ev.id] ? '••••••••••••' : ev.value}
                        </span>
                        {ev.isSecret && (
                          <button style={{ ...S.btn('ghost', 'sm'), padding: '2px 6px', fontSize: 11 }} onClick={() => setShowEnvVal(p => ({ ...p, [ev.id]: !p[ev.id] }))}>
                            {showEnvVal[ev.id] ? '🙈' : '👁'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={S.td}><span style={ev.isSecret ? S.tag('#f59e0b') : S.tag('#64748b')}>{ev.isSecret ? 'Secret' : 'Plain'}</span></td>
                    <td style={S.td}>
                      <button style={S.btn('danger', 'sm')} onClick={() => deleteEnvVar(ev.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={S.td}><input style={S.input} placeholder="KEY" value={newKey} onChange={e => setNewKey(e.target.value)} /></td>
                  <td style={S.td}><input style={S.input} placeholder="value" value={newVal} onChange={e => setNewVal(e.target.value)} type={newSecret ? 'password' : 'text'} /></td>
                  <td style={S.td}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: '#374151' }}>
                      <input type="checkbox" checked={newSecret} onChange={e => setNewSecret(e.target.checked)} /> Secret
                    </label>
                  </td>
                  <td style={S.td}><button style={S.btn('primary', 'sm')} onClick={addEnvVar}>Add</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Deployments */}
        {serviceTab === 'deploys' && (
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>Deployments</div>
              <button style={S.btn('primary', 'sm')} onClick={() => handleDeploy(svc.id)}>↑ Deploy Now</button>
            </div>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Status</th>
                  <th style={S.th}>Commit</th>
                  <th style={S.th}>Message</th>
                  <th style={S.th}>Triggered By</th>
                  <th style={S.th}>Created</th>
                  <th style={S.th}>Duration</th>
                  <th style={{ ...S.th, width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {svc.deployments.map(d => (
                  <tr key={d.id}>
                    <td style={S.td}>
                      <span style={S.badge(statusColor(d.status), statusBg(d.status))}>
                        <div style={S.dot(statusColor(d.status), d.status === 'building')} />
                        {d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                      </span>
                    </td>
                    <td style={S.td}><span style={S.mono}>{d.commitSha}</span></td>
                    <td style={{ ...S.td, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.commitMessage}</td>
                    <td style={{ ...S.td, color: '#64748b', fontSize: 12 }}>{d.triggeredBy}</td>
                    <td style={{ ...S.td, color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' }}>{d.createdAt}</td>
                    <td style={{ ...S.td, color: '#64748b', fontSize: 12 }}>{d.duration}</td>
                    <td style={S.td}>
                      {d.status === 'live' ? (
                        <button style={S.btn('secondary', 'sm')}>Rollback</button>
                      ) : d.status === 'building' ? (
                        <button style={S.btn('danger', 'sm')}>Cancel</button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Settings */}
        {serviceTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Build Command', key: 'buildCommand', placeholder: 'npm install && npm run build' },
              { label: 'Start Command', key: 'startCommand', placeholder: 'npm start' },
              { label: 'Health Check Path', key: 'healthCheckPath', placeholder: '/health' },
              { label: 'Port', key: 'port', placeholder: '3000' },
              { label: 'Branch', key: 'branch', placeholder: 'main' },
            ].map(({ label, key, placeholder }) => (
              <div key={key} style={S.card}>
                <div style={{ padding: '16px 20px' }}>
                  <label style={{ display: 'block', fontWeight: 700, color: '#374151', fontSize: 13, marginBottom: 8 }}>{label}</label>
                  <input style={S.input} defaultValue={String((svc as unknown as Record<string, unknown>)[key] ?? '')} placeholder={placeholder} />
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button style={S.btn('secondary')}>Cancel</button>
              <button style={S.btn('primary')}>Save Changes</button>
            </div>
            <div style={{ ...S.card, border: '1px solid #fecaca' }}>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 14, marginBottom: 8 }}>Danger Zone</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#374151', fontSize: 13 }}>Delete Service</div>
                    <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>This action cannot be undone.</div>
                  </div>
                  <button style={S.btn('danger')}>Delete Service</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────────
  const Dashboard = () => (
    <div style={S.pageInner}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={S.pageTitle}>Services</h1>
          <p style={S.pageSubtitle}>{services.length} services · {services.filter(s => s.status === 'live').length} live</p>
        </div>
        <button style={S.btn('primary')} onClick={() => nav('new-service')}>+ New Service</button>
      </div>

      {/* Status Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Live', count: services.filter(s => s.status === 'live').length, color: '#22c55e', bg: '#052e16' },
          { label: 'Building', count: services.filter(s => s.status === 'building').length, color: '#f59e0b', bg: '#1c1309' },
          { label: 'Failed', count: services.filter(s => s.status === 'failed').length, color: '#ef4444', bg: '#1a0505' },
          { label: 'Paused', count: services.filter(s => s.status === 'paused').length, color: '#64748b', bg: '#0f1623' },
        ].map(({ label, count, color, bg }) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>{label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{count}</span>
              <span style={S.badge(color, bg)}><div style={S.dot(color)} />{label}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={S.card}>
        {services.map(svc => <ServiceRow key={svc.id} svc={svc} />)}
      </div>
    </div>
  )

  // ── Databases ─────────────────────────────────────────────────────────────────
  const Databases = () => (
    <div style={S.pageInner}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={S.pageTitle}>Databases</h1>
          <p style={S.pageSubtitle}>Managed PostgreSQL and Key-Value stores</p>
        </div>
        <button style={S.btn('primary')}>+ New Database</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {databases.map(db => (
          <div key={db.id} style={S.card}>
            <div style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: db.kind === 'postgres' ? '#e0e7ff' : '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                    {kindIcon(db.kind)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>{db.name}</div>
                    <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                      {kindLabel(db.kind)} {db.version} · {db.instanceType} · {db.region}
                    </div>
                  </div>
                </div>
                <span style={S.badge(statusColor(db.status), statusBg(db.status))}>
                  <div style={S.dot(statusColor(db.status), db.status === 'available')} />
                  {db.status.charAt(0).toUpperCase() + db.status.slice(1)}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[['Storage', `${db.storageGb} GB`], ['Created', db.createdAt], ['Version', db.version]].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{k}</div>
                    <div style={{ fontWeight: 600, color: '#374151', fontSize: 13 }}>{v}</div>
                  </div>
                ))}
              </div>
              {db.connectionString && (
                <div>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Connection String</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ ...S.mono, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: 600 }}>
                      {showConnStr[db.id] ? db.connectionString : db.connectionString.replace(/:[^@]+@/, ':***@')}
                    </span>
                    <button style={S.btn('ghost', 'sm')} onClick={() => setShowConnStr(p => ({ ...p, [db.id]: !p[db.id] }))}>
                      {showConnStr[db.id] ? '🙈 Hide' : '👁 Show'}
                    </button>
                    <button style={S.btn('ghost', 'sm')} onClick={() => navigator.clipboard?.writeText(db.connectionString)}>
                      📋 Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // ── Team ──────────────────────────────────────────────────────────────────────
  const Team = () => (
    <div style={S.pageInner}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={S.pageTitle}>Team Members</h1>
          <p style={S.pageSubtitle}>Acme Corp · {team.length} members</p>
        </div>
        <button style={S.btn('primary')}>+ Invite Member</button>
      </div>
      <div style={S.card}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Member</th>
              <th style={S.th}>Email</th>
              <th style={S.th}>Role</th>
              <th style={S.th}>Joined</th>
              <th style={{ ...S.th, width: 100 }}></th>
            </tr>
          </thead>
          <tbody>
            {team.map(m => (
              <tr key={m.id}>
                <td style={S.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ ...S.avatar(32, roleColor(m.role) + '44'), color: roleColor(m.role), fontWeight: 800, fontSize: 11 }}>{m.avatar}</div>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{m.name}</span>
                  </div>
                </td>
                <td style={{ ...S.td, color: '#64748b', fontSize: 12 }}>{m.email}</td>
                <td style={S.td}>
                  <span style={{ ...S.badge(roleColor(m.role), roleColor(m.role) + '22') }}>
                    {m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                  </span>
                </td>
                <td style={{ ...S.td, color: '#64748b', fontSize: 12 }}>{m.joinedAt}</td>
                <td style={S.td}>
                  {m.role !== 'owner' && <button style={S.btn('ghost', 'sm')}>Edit</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ ...S.card, marginTop: 24 }}>
        <div style={{ ...S.cardHeader, borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>Role Permissions</div>
        </div>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Permission</th>
              {(['owner', 'admin', 'member', 'viewer'] as MemberRole[]).map(r => (
                <th key={r} style={{ ...S.th, textAlign: 'center' as const }}>
                  <span style={{ color: roleColor(r) }}>{r.charAt(0).toUpperCase() + r.slice(1)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['Create services', true, true, true, false],
              ['Delete services', true, true, false, false],
              ['Manage env vars', true, true, true, false],
              ['View deployments', true, true, true, true],
              ['Trigger deploys', true, true, true, false],
              ['Manage databases', true, true, false, false],
              ['Manage team', true, false, false, false],
              ['Billing access', true, false, false, false],
            ].map(([perm, ...vals]) => (
              <tr key={String(perm)}>
                <td style={S.td}>{perm}</td>
                {vals.map((v, i) => (
                  <td key={i} style={{ ...S.td, textAlign: 'center' as const }}>{v ? '✓' : '–'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  // ── New Service ───────────────────────────────────────────────────────────────
  const NewService = () => (
    <div style={S.pageInner}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 12, color: '#64748b' }}>
        <span style={{ cursor: 'pointer', color: '#6366f1' }} onClick={() => nav('dashboard')}>Services</span>
        <span>›</span>
        <span style={{ color: '#0f172a', fontWeight: 600 }}>New Service</span>
      </div>
      <h1 style={S.pageTitle}>Create a New Service</h1>
      <p style={{ ...S.pageSubtitle, marginBottom: 32 }}>Deploy from a Git repo or Docker image.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
        {[
          { kind: 'web', title: 'Web Service', desc: 'HTTP server with auto-TLS and zero-downtime deploys' },
          { kind: 'static', title: 'Static Site', desc: 'Fast CDN delivery for React, Next.js, Vue, and more' },
          { kind: 'worker', title: 'Background Worker', desc: 'Long-running async process with no public port' },
          { kind: 'cron', title: 'Cron Job', desc: 'Scheduled task execution on a recurring schedule' },
          { kind: 'private', title: 'Private Service', desc: 'Internal-only service accessible via private network' },
        ].map(({ kind, title, desc }) => (
          <div
            key={kind}
            style={{ background: '#fff', border: '2px solid #e2e8f0', borderRadius: 10, padding: '18px', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#6366f1'; (e.currentTarget as HTMLElement).style.background = '#fafaf9' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLElement).style.background = '#fff' }}
          >
            <div style={{ fontSize: 22, marginBottom: 10 }}>{kindIcon(kind)}</div>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14, marginBottom: 4 }}>{title}</div>
            <div style={{ color: '#64748b', fontSize: 12, lineHeight: 1.5 }}>{desc}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[
          { label: 'Service Name', placeholder: 'my-awesome-api' },
          { label: 'Repository URL', placeholder: 'https://github.com/org/repo' },
          { label: 'Branch', placeholder: 'main' },
          { label: 'Build Command', placeholder: 'npm install && npm run build' },
          { label: 'Start Command', placeholder: 'npm start' },
        ].map(({ label, placeholder }) => (
          <div key={label} style={S.card}>
            <div style={{ padding: '14px 20px' }}>
              <label style={{ display: 'block', fontWeight: 700, color: '#374151', fontSize: 13, marginBottom: 8 }}>{label}</label>
              <input style={S.input} placeholder={placeholder} />
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button style={S.btn('secondary')} onClick={() => nav('dashboard')}>Cancel</button>
          <button style={S.btn('primary')}>Create Service →</button>
        </div>
      </div>
    </div>
  )

  // ── Notifications Panel ───────────────────────────────────────────────────────
  const NotifPanel = () => (
    <div style={{ position: 'absolute' as const, top: 56, right: 0, width: 360, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0 0 10px 10px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', zIndex: 100 }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>Notifications</span>
        {unread > 0 && <button style={S.btn('ghost', 'sm')} onClick={() => setNotifs(notifs.map(n => ({ ...n, read: true })))}>Mark all read</button>}
      </div>
      {notifs.map(n => (
        <div key={n.id} onClick={() => setNotifs(notifs.map(x => x.id === n.id ? { ...x, read: true } : x))} style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: n.read ? '#fff' : '#f8f8ff', transition: 'background 0.1s' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            {!n.read && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', marginTop: 5, flexShrink: 0 }} />}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13, marginBottom: 2 }}>{n.title}</div>
              <div style={{ color: '#64748b', fontSize: 12, marginBottom: 4 }}>{n.body}</div>
              <div style={{ color: '#94a3b8', fontSize: 11 }}>{n.createdAt}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  // ── Main Render ───────────────────────────────────────────────────────────────
  const _isContentLight = view !== 'service' || true
  const topbarTitle = view === 'dashboard' ? 'Dashboard' : view === 'service' ? selectedService?.name ?? '' : view === 'databases' ? 'Databases' : view === 'team' ? 'Team' : 'New Service'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
        body { margin: 0; }
      `}</style>
      <div style={S.app}>
        {/* Sidebar */}
        <aside style={S.sidebar}>
          <div style={S.logo}>
            <div style={S.logoIcon}>R</div>
            <div>
              <div style={S.logoText}>Render</div>
              <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>acme-corp</div>
            </div>
          </div>
          <nav style={S.nav}>
            <div style={S.navSection}>Platform</div>
            {[
              { id: 'dashboard', label: 'Services', icon: '⬡' },
              { id: 'databases', label: 'Databases', icon: '◉' },
            ].map(item => (
              <button key={item.id} style={S.navItem(view === item.id)} onClick={() => nav(item.id as View)}>
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
            <div style={{ ...S.navSection, marginTop: 16 }}>Team</div>
            <button style={S.navItem(view === 'team')} onClick={() => nav('team')}>
              <span style={{ fontSize: 14 }}>◎</span>
              Members
            </button>
            <div style={{ ...S.navSection, marginTop: 16 }}>Account</div>
            <button style={S.navItem(false)} onClick={() => {}}>
              <span style={{ fontSize: 14 }}>⚙</span>
              Settings
            </button>
            <button style={S.navItem(false)} onClick={() => {}}>
              <span style={{ fontSize: 14 }}>💳</span>
              Billing
            </button>
            <button style={S.navItem(false)} onClick={() => {}}>
              <span style={{ fontSize: 14 }}>◻</span>
              Docs ↗
            </button>
          </nav>
          <div style={S.sidebarFooter}>
            <div style={S.avatar(30, '#6366f1')}>AC</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Alice Chen</div>
              <div style={{ fontSize: 10, color: '#475569' }}>Owner</div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div style={S.content}>
          {/* Topbar */}
          <div style={S.topbar}>
            <div style={{ flex: 1, fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{topbarTitle}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
              <button
                style={{ ...S.btn('ghost', 'sm'), position: 'relative', padding: '5px 10px', color: '#374151' }}
                onClick={() => setShowNotifs(p => !p)}
              >
                🔔
                {unread > 0 && (
                  <span style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, background: '#6366f1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff' }}>{unread}</span>
                )}
              </button>
              {showNotifs && <NotifPanel />}
              <div style={S.avatar(30)}>AC</div>
            </div>
          </div>

          {/* Page content */}
          <main style={S.main} onClick={() => showNotifs && setShowNotifs(false)}>
            {view === 'dashboard' && <Dashboard />}
            {view === 'service' && selectedService && <ServiceDetail />}
            {view === 'databases' && <Databases />}
            {view === 'team' && <Team />}
            {view === 'new-service' && <NewService />}
          </main>
        </div>
      </div>
    </>
  )
}
