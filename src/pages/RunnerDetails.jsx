import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiGet, apiPatch } from '../api.js'
import PageLoading from '../components/PageLoading.jsx'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const RANGES = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: 'all', label: 'All Time' },
]

const SESSION_STATUS = {
  completed: { label: 'Completed', className: 'pill-ok', mark: '✓' },
  skipped: { label: 'Skipped', className: 'pill-warn', mark: '×' },
  missed: { label: 'Missed', className: 'pill-danger', mark: '!' },
  planned: { label: 'Planned', className: 'pill-muted', mark: '•' },
}

function timestamp(value) {
  if (!value) return '—'
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function displayValue(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function formatDuration(seconds = 0) {
  const value = Number(seconds) || 0
  const hours = Math.floor(value / 3600)
  const minutes = Math.floor((value % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes} min`
}

function formatPace(seconds) {
  if (seconds === null || seconds === undefined || !Number.isFinite(Number(seconds))) return '--'
  const value = Number(seconds)
  return `${Math.floor(value / 60)}:${String(Math.round(value % 60)).padStart(2, '0')}`
}

function SessionStatus({ status }) {
  const item = SESSION_STATUS[status] ?? {
    label: String(status || 'Unknown').replaceAll('_', ' '),
    className: 'pill-muted',
    mark: '•',
  }

  return (
    <span className={`pill ${item.className} support-session-status`}>
      <span aria-hidden="true">{item.mark}</span> {item.label}
    </span>
  )
}

function formatPeriodLabel(period, includeYear = false) {
  const value = String(period ?? '')
  const match = value.match(/^Week\s+(\d{1,2}),\s*(\d{4})$/i)

  if (!match) return value

  const week = Number(match[1])
  const year = Number(match[2])

  if (week < 1 || week > 53) return value

  // ISO weeks begin on Monday. January 4 always belongs to ISO week 1.
  const januaryFourth = new Date(Date.UTC(year, 0, 4))
  const weekday = januaryFourth.getUTCDay() || 7
  const monday = new Date(
    Date.UTC(year, 0, 4 - (weekday - 1) + (week - 1) * 7),
  )
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)

  const monthName = (date) =>
    new Intl.DateTimeFormat('en-US', {
      month: 'short',
      timeZone: 'UTC',
    }).format(date)
  const monthDay = (date) =>
    new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(date)

  const startMonth = monday.getUTCMonth()
  const endMonth = sunday.getUTCMonth()

  const label = startMonth === endMonth
    ? `${monthName(monday)} ${monday.getUTCDate()}–${sunday.getUTCDate()}`
    : `${monthDay(monday)}–${monthDay(sunday)}`

  return includeYear ? `${label}, ${year}` : label
}

function PerformanceMetricCard({ label, value, description }) {
  return (
    <article className="panel" style={{ margin: 0, minWidth: 0 }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 10px' }}>{label}</p>
      <h3 style={{ fontSize: 25, margin: 0, color: 'var(--text)' }}>{value}</h3>
      <small>{description}</small>
    </article>
  )
}

function PerformanceChartPanel({ title, description, children }) {
  return (
    <section className="panel" style={{ marginTop: 20 }}>
      <div style={{ marginBottom: 18 }}>
        <h3 style={{ fontSize: 17, margin: '0 0 6px' }}>{title}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>{description}</p>
      </div>
      {children}
    </section>
  )
}

function ChartTooltip({ active, payload, label, valueLabel = 'Distance' }) {
  if (!active || !payload?.length) return null

  const item = payload[0]?.payload || {}
  const value = Number(payload[0]?.value || 0)

  return (
    <div className="pmx-tooltip">
      <strong>{formatPeriodLabel(label, true)}</strong>
      <span>{value.toFixed(2)} km {valueLabel.toLowerCase()}</span>
      {item.runs !== undefined && (
        <small>{Number(item.runs || 0)} {Number(item.runs || 0) === 1 ? 'run' : 'runs'}</small>
      )}
      {item.pace_seconds_per_km != null && (
        <small>{formatPace(item.pace_seconds_per_km)} /km average pace</small>
      )}
    </div>
  )
}

function ChartPanel({ title, description, children, accent = 'blue', className = '' }) {
  return (
    <section className={`panel pmx-panel pmx-accent-${accent} ${className}`}>
      <div className="pmx-panel-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span className="pmx-chart-indicator" aria-hidden="true">
          <span />
          LIVE DATA
        </span>
      </div>
      {children}
    </section>
  )
}

function DistanceAnalysis({ data = [] }) {
  const hasData = data.some((item) => Number(item.distance_km) > 0)

  return (
    <ChartPanel
      title="Distance Analysis"
      description="Your running distance by week or month."
      accent="blue"
      className="pmx-main-chart"
    >
      <div className="pmx-chart-wrap pmx-chart-large">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 14, right: 12, left: -12, bottom: 4 }}>
            <defs>
              <linearGradient id="pmxDistanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#69b5ff" stopOpacity={1} />
                <stop offset="100%" stopColor="#3978f6" stopOpacity={0.35} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(148,163,184,0.13)" strokeDasharray="4 5" vertical={false} />
            <XAxis
              dataKey="period"
              tickFormatter={(value) => formatPeriodLabel(value)}
              tick={{ fill: '#9aa9c0', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(148,163,184,0.18)' }}
              tickLine={false}
              minTickGap={18}
            />
            <YAxis
              tick={{ fill: '#9aa9c0', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={48}
              allowDecimals
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(96,165,250,0.08)' }} />
            <Bar
              dataKey="distance_km"
              name="Distance"
              fill="url(#pmxDistanceGradient)"
              radius={[7, 7, 0, 0]}
              maxBarSize={52}
              activeBar={{ fill: '#91caff', stroke: '#d8edff', strokeWidth: 1 }}
            />
          </BarChart>
        </ResponsiveContainer>
        {!hasData && (
          <div className="pmx-chart-empty">
            <span className="pmx-empty-icon">↗</span>
            <span>No distance recorded in this period yet</span>
          </div>
        )}
      </div>
    </ChartPanel>
  )
}

function PaceAnalysis({ data = [] }) {
  const validData = data.filter((item) => item.pace_seconds_per_km != null)
  const hasData = validData.length > 0

  return (
    <ChartPanel
      title="Pace Analysis"
      description="Track how your average running pace changes over time."
      accent="violet"
    >
      <div className="pmx-chart-wrap pmx-chart-large">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 16, right: 18, left: -8, bottom: 4 }}>
            <defs>
              <linearGradient id="pmxPaceGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#8b9cff" />
                <stop offset="100%" stopColor="#d19aff" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(148,163,184,0.13)" strokeDasharray="4 5" vertical={false} />
            <XAxis
              dataKey="period"
              tickFormatter={(value) => formatPeriodLabel(value)}
              tick={{ fill: '#9aa9c0', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(148,163,184,0.18)' }}
              tickLine={false}
              minTickGap={18}
            />
            <YAxis
              reversed
              tickFormatter={formatPace}
              tick={{ fill: '#9aa9c0', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length || payload[0]?.value == null) return null
                return (
                  <div className="pmx-tooltip">
                    <strong>{formatPeriodLabel(label, true)}</strong>
                    <span>{formatPace(payload[0].value)} /km</span>
                    <small>Average pace</small>
                  </div>
                )
              }}
            />
            <Line
              type="monotone"
              dataKey="pace_seconds_per_km"
              name="Average Pace"
              stroke="url(#pmxPaceGradient)"
              strokeWidth={3}
              dot={{ r: 4, fill: '#b99aff', stroke: '#211b3c', strokeWidth: 2 }}
              activeDot={{ r: 7, fill: '#e0c7ff', stroke: '#9b78ff', strokeWidth: 3 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
        {!hasData && (
          <div className="pmx-chart-empty">
            <span className="pmx-empty-icon">⌁</span>
            <span>Pace trends will appear after you record a run</span>
          </div>
        )}
      </div>
    </ChartPanel>
  )
}

function WorkoutCategoryAnalysis({
  title,
  description,
  data = [],
  accent = 'cyan',
}) {
  const totalDistance = data.reduce(
    (total, item) => total + Number(item.distance_km || 0),
    0,
  )
  const totalRuns = data.reduce(
    (total, item) => total + Number(item.runs || 0),
    0,
  )
  const hasData = totalRuns > 0 || totalDistance > 0
  const chartData = data.length ? data : [{ period: 'No data', distance_km: 0, runs: 0 }]
  const gradientId = `pmx-${accent}-gradient`

  const colors = {
    cyan: ['#4de1d2', '#168fba'],
    orange: ['#ffbd69', '#ef6b55'],
    green: ['#86efac', '#16a878'],
  }
  const [topColor, bottomColor] = colors[accent] || colors.cyan

  return (
    <section className={`panel pmx-panel pmx-category-card pmx-accent-${accent}`}>
      <div className="pmx-panel-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span className="pmx-category-orb" aria-hidden="true" />
      </div>

      <div className="pmx-category-stats">
        <div className="pmx-category-stat">
          <small>Total Distance</small>
          <strong>{totalDistance.toFixed(2)} <span>km</span></strong>
        </div>
        <div className="pmx-category-stat">
          <small>Total Runs</small>
          <strong>{totalRuns}</strong>
        </div>
        <div className="pmx-category-stat">
          <small>Average per run</small>
          <strong>{totalRuns ? `${(totalDistance / totalRuns).toFixed(2)} <span>km</span>` : '--'}</strong>
        </div>
      </div>

      <div className="pmx-chart-wrap pmx-category-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 12, right: 10, left: -16, bottom: 2 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={topColor} stopOpacity={1} />
                <stop offset="100%" stopColor={bottomColor} stopOpacity={0.42} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(148,163,184,0.12)" strokeDasharray="4 5" vertical={false} />
            <XAxis
              dataKey="period"
              tickFormatter={(value) => formatPeriodLabel(value)}
              tick={{ fill: '#9aa9c0', fontSize: 10 }}
              axisLine={{ stroke: 'rgba(148,163,184,0.18)' }}
              tickLine={false}
              minTickGap={16}
            />
            <YAxis
              tick={{ fill: '#9aa9c0', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={42}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: `${topColor}12` }} />
            <Bar
              dataKey="distance_km"
              name="Distance"
              fill={`url(#${gradientId})`}
              radius={[6, 6, 0, 0]}
              maxBarSize={42}
              activeBar={{ fill: topColor, stroke: '#ffffff', strokeOpacity: 0.55, strokeWidth: 1 }}
            />
          </BarChart>
        </ResponsiveContainer>
        {!hasData && (
          <div className="pmx-chart-empty pmx-chart-empty-compact">
            <span className="pmx-empty-icon">✦</span>
            <span>Your {title.toLowerCase()} graph will grow as you log workouts</span>
          </div>
        )}
      </div>
    </section>
  )
}

function RunnerPasswordForm({ saving, onSave }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')

  async function submit(event) {
    event.preventDefault()
    setMessage('')

    if (password !== confirm) {
      setMessage('The passwords do not match.')
      return
    }

    try {
      await onSave(password, confirm)
      setPassword('')
      setConfirm('')
      setMessage('Password changed. The runner has been signed out of other sessions.')
    } catch (err) {
      setMessage(err.message || 'Could not change the password.')
    }
  }

  return (
    <form className="support-runner-password" onSubmit={submit}>
      <label>
        New temporary password
        <input type="password" autoComplete="new-password" minLength={8} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} required />
      </label>
      <label>
        Confirm password
        <input type="password" autoComplete="new-password" minLength={8} maxLength={72} value={confirm} onChange={(event) => setConfirm(event.target.value)} required />
      </label>
      <button className="btn" disabled={saving}>{saving ? 'Saving…' : 'Set password'}</button>
      {message && <p className={message.startsWith('Password changed') ? 'success' : 'error'} role="status">{message}</p>}
      <small>Give the temporary password to the runner privately and ask them to change it after signing in.</small>
    </form>
  )
}

const PERFORMANCE_STYLES = `
  .pmx-page { position: relative; isolation: isolate; }
  .pmx-page::before {
    content: ""; position: absolute; z-index: -1; pointer-events: none;
    inset: -28px -18px auto; height: 440px;
    background:
      radial-gradient(ellipse at 12% 15%, rgba(59,130,246,.13), transparent 48%),
      radial-gradient(ellipse at 86% 8%, rgba(139,92,246,.12), transparent 42%);
  }
  .pmx-page .pmx-panel, .pmx-page .panel {
    border: 1px solid rgba(148,163,184,.13);
    background: linear-gradient(145deg, rgba(23,29,42,.97), rgba(17,23,34,.97));
    box-shadow: 0 12px 34px rgba(0,0,0,.16), inset 0 1px 0 rgba(255,255,255,.025);
    transition: transform .22s ease, border-color .22s ease, box-shadow .22s ease;
  }
  .pmx-page .pmx-panel:hover, .pmx-page .panel:hover {
    transform: translateY(-3px);
    border-color: rgba(96,165,250,.32);
    box-shadow: 0 16px 42px rgba(0,0,0,.22), 0 0 24px rgba(59,130,246,.075);
  }
  .pmx-panel { position: relative; overflow: hidden; margin-top: 22px; padding: 22px; }
  .pmx-panel::before {
    content: ""; position: absolute; pointer-events: none; width: 210px; height: 210px;
    right: -100px; top: -120px; border-radius: 50%; filter: blur(32px); opacity: .15;
  }
  .pmx-accent-blue::before { background: #3b82f6; }
  .pmx-accent-violet::before { background: #a78bfa; }
  .pmx-accent-cyan::before { background: #22d3ee; }
  .pmx-accent-orange::before { background: #fb923c; }
  .pmx-accent-green::before { background: #34d399; }
  .pmx-panel-heading { position: relative; display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:18px; }
  .pmx-panel-heading h2 { margin:0 0 6px; font-size:17px; letter-spacing:-.02em; color:var(--text); }
  .pmx-panel-heading p { margin:0; color:var(--text-secondary); font-size:13px; line-height:1.55; }
  .pmx-chart-indicator { display:flex; align-items:center; gap:7px; flex-shrink:0; color:#9bb8e9; font-size:9px; letter-spacing:.12em; font-weight:800; }
  .pmx-chart-indicator span { width:7px; height:7px; border-radius:50%; background:#60a5fa; box-shadow:0 0 10px #60a5fa; animation:pmxPulse 2s ease-in-out infinite; }
  .pmx-chart-wrap { position:relative; width:100%; min-width:0; }
  .pmx-chart-large { height:300px; }
  .pmx-category-chart { height:220px; }
  .pmx-chart-empty { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:9px; pointer-events:none; color:#8291a9; font-size:12px; text-align:center; padding:20px; background:linear-gradient(180deg, transparent 35%, rgba(17,23,34,.12)); }
  .pmx-chart-empty-compact { font-size:11px; }
  .pmx-empty-icon { display:grid; place-items:center; width:30px; height:30px; border-radius:10px; color:#a9c9ff; font-size:18px; background:rgba(96,165,250,.1); border:1px solid rgba(96,165,250,.2); box-shadow:0 0 20px rgba(96,165,250,.12); }
  .pmx-tooltip { min-width:130px; display:grid; gap:5px; padding:11px 13px; border:1px solid rgba(125,164,230,.3); border-radius:12px; background:rgba(13,19,31,.96); color:#e7efff; box-shadow:0 10px 30px rgba(0,0,0,.35), 0 0 18px rgba(96,165,250,.12); backdrop-filter:blur(12px); font-size:12px; }
  .pmx-tooltip span { color:#9ec5ff; font-weight:700; }
  .pmx-tooltip small { color:#9aa9c0; }
  .pmx-category-card { margin-top:16px; }
  .pmx-category-stats { position:relative; display:flex; flex-wrap:wrap; gap:clamp(18px,4vw,42px); margin:4px 0 8px; }
  .pmx-category-stat { display:grid; gap:5px; min-width:75px; }
  .pmx-category-stat small { color:var(--text-muted); font-size:11px; }
  .pmx-category-stat strong { color:var(--text); font-size:20px; letter-spacing:-.03em; }
  .pmx-category-stat strong span { font-size:12px; color:var(--text-secondary); }
  .pmx-category-orb { flex:0 0 auto; width:13px; height:13px; border-radius:50%; background:#4de1d2; box-shadow:0 0 8px currentColor, 0 0 22px currentColor; margin:5px 5px 0 0; animation:pmxPulse 2.8s ease-in-out infinite; }
  .pmx-accent-orange .pmx-category-orb { background:#ffad65; }
  .pmx-accent-green .pmx-category-orb { background:#6ee7a8; }
  .pmx-range-select { outline:none; box-shadow:0 0 0 0 rgba(96,165,250,0); transition:box-shadow .2s ease,border-color .2s ease; }
  .pmx-range-select:focus { border-color:#60a5fa !important; box-shadow:0 0 0 3px rgba(96,165,250,.16); }
  .pmx-metric-card { position:relative; overflow:hidden; }
  .pmx-metric-card::after { content:""; position:absolute; width:100px; height:100px; right:-55px; top:-58px; border-radius:50%; background:rgba(96,165,250,.10); filter:blur(18px); pointer-events:none; }
  @keyframes pmxPulse { 0%,100% { opacity:.72; transform:scale(.92); } 50% { opacity:1; transform:scale(1.12); } }
  @media (max-width: 680px) {
    .pmx-panel { padding:16px; margin-top:16px; border-radius:14px; }
    .pmx-panel-heading { gap:10px; }
    .pmx-panel-heading h2 { font-size:15px; }
    .pmx-panel-heading p { font-size:12px; }
    .pmx-chart-large { height:250px; }
    .pmx-category-chart { height:205px; }
    .pmx-chart-indicator { font-size:8px; }
    .pmx-category-stat strong { font-size:18px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .pmx-page *, .pmx-page *::before, .pmx-page *::after { animation:none !important; transition:none !important; scroll-behavior:auto !important; }
  }
`

export default function RunnerDetails() {
  const { userId } = useParams()
  const [runnerDetails, setRunnerDetails] = useState(null)
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(null)
  const [metricsRange, setMetricsRange] = useState('30d')
  const [metrics, setMetrics] = useState(null)
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [metricsError, setMetricsError] = useState('')

  const loadRunner = useCallback(async () => {
    setError('')
    setState('loading')

    try {
      const result = await apiGet(`/support/users/${userId}`)
      setRunnerDetails(result.data)
      setState('ready')
    } catch (err) {
      setError(err.message || 'Could not load runner details.')
      setState('error')
    }
  }, [userId])

  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true)
    setMetricsError('')

    try {
      const result = await apiGet(`/support/users/${userId}/performance-metrics?range=${metricsRange}`)
      setMetrics(result.data)
    } catch (err) {
      setMetricsError(err.message || 'Could not load this runner’s performance metrics.')
      setMetrics(null)
    } finally {
      setMetricsLoading(false)
    }
  }, [userId, metricsRange])

  useEffect(() => {
    loadRunner()
  }, [loadRunner])

  useEffect(() => {
    loadMetrics()
  }, [loadMetrics])

  async function changeRunnerStatus() {
    const user = runnerDetails?.user
    if (!user) return

    const nextStatus = user.status === 'active' ? 'suspended' : 'active'
    const action = nextStatus === 'suspended' ? 'suspend' : 'reactivate'

    if (!window.confirm(`Are you sure you want to ${action} ${user.email}?`)) return

    setSaving('status')
    setError('')

    try {
      await apiPatch(`/support/users/${user.id}/status`, { status: nextStatus })
      await loadRunner()
    } catch (err) {
      setError(err.message || `Could not ${action} the account.`)
    } finally {
      setSaving(null)
    }
  }

  async function setRunnerPassword(password, confirmation) {
    const id = runnerDetails.user.id
    setSaving('password')

    try {
      await apiPatch(`/support/users/${id}/password`, {
        new_password: password,
        confirmation,
      })
    } finally {
      setSaving(null)
    }
  }

  const plans = runnerDetails?.plans ?? []
  const integrations = runnerDetails?.integrations ?? []
  const reports = runnerDetails?.reports ?? []

  const orderedPlans = useMemo(() => plans.map((plan) => ({
    ...plan,
    sessions: [...(plan.sessions ?? [])].sort((a, b) => {
      const dateCompare = String(a.scheduled_date ?? '').localeCompare(String(b.scheduled_date ?? ''))
      if (dateCompare !== 0) return dateCompare

      const timeCompare = String(a.planned_start_time ?? '').localeCompare(String(b.planned_start_time ?? ''))
      if (timeCompare !== 0) return timeCompare

      return Number(a.id ?? 0) - Number(b.id ?? 0)
    }),
  })), [plans])

  if (state === 'loading') {
    return <PageLoading label="Loading runner details…" rows={4} />
  }

  if (state === 'error') {
    return (
      <section className="support-runner-page">
        <p className="error" role="alert">{error}</p>
        <div className="btn-row">
          <button className="btn" type="button" onClick={loadRunner}>Try again</button>
          <Link className="btn btn-secondary" to="/support">Back to Support Console</Link>
        </div>
      </section>
    )
  }

  const user = runnerDetails.user
  const profile = runnerDetails.profile
  const totals = metrics?.totals
  const consistency = metrics?.consistency
  const adherence = metrics?.adherence

  return (
    <section className="shell pmx-page support-runner-page">
      <style>{PERFORMANCE_STYLES}</style>
      <div className="support-page-heading">
        <div>
          <p className="section-eyebrow">Administration · Runner account</p>
          <h1>Runner Details</h1>
          <p className="note">Account, profile, performance, training history, and support information for this runner.</p>
        </div>
        <div className="btn-row support-runner-page-actions">
          <Link className="btn btn-secondary" to="/support">Back to Support Console</Link>
          <button className="btn btn-secondary" type="button" onClick={() => { loadRunner(); loadMetrics() }}>Refresh details</button>
        </div>
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      <article className="support-runner-identity">
        <div>
          <span className="section-eyebrow">Runner account</span>
          <h2>{user.email}</h2>
        </div>
        <span className={`pill ${user.status === 'active' ? 'pill-ok' : 'pill-warn'}`}>{user.status}</span>
      </article>

      <div className="support-detail-grid">
        <article>
          <h3>Account</h3>
          <dl>
            <dt>Email</dt><dd>{user.email}</dd>
            <dt>Status</dt><dd>{user.status}</dd>
            <dt>Joined</dt><dd>{timestamp(user.created_at)}</dd>
            <dt>Updated</dt><dd>{timestamp(user.updated_at)}</dd>
          </dl>
        </article>
        <article>
          <h3>Runner profile</h3>
          {profile ? (
            <dl>
              {Object.entries(profile)
                .filter(([key]) => !['id', 'user_id', 'created_at', 'updated_at'].includes(key))
                .map(([key, value]) => (
                  <div className="support-detail-dl-row" key={key}>
                    <dt>{key.replaceAll('_', ' ')}</dt>
                    <dd>{displayValue(value)}</dd>
                  </div>
                ))}
            </dl>
          ) : <p className="note">No profile has been saved.</p>}
        </article>
      </div>

      <section className="support-detail-card" aria-label="Runner performance metrics">
        <div className="panel-head" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2>Performance Metrics</h2>
            <span>Performance data belonging to this runner</span>
          </div>
          <select
            value={metricsRange}
            onChange={(event) => setMetricsRange(event.target.value)}
            disabled={metricsLoading}
            aria-label="Runner performance date range"
            style={{
              minHeight: 40,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              color: 'var(--text)',
            }}
          >
            {RANGES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>

        {metricsLoading && <p className="note" role="status">Loading runner performance metrics…</p>}

        {!metricsLoading && metricsError && (
          <div className="panel">
            <p className="error" role="alert">{metricsError}</p>
            <button className="btn btn-secondary" type="button" onClick={loadMetrics}>Try again</button>
          </div>
        )}

        {!metricsLoading && !metricsError && metrics && (
          <>
            <p className="note" style={{ fontSize: 12, marginBottom: 16 }}>
              {metrics.period?.start
                ? `${metrics.period.start} to ${metrics.period.end}`
                : 'No recorded activity in this period'}
            </p>

            <h3 style={{ marginBottom: 14 }}>Performance Overview</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 14 }}>
              <PerformanceMetricCard
                label="Total Distance"
                value={`${totals?.total_distance_km ?? 0} km`}
                description="Total eligible running distance"
              />
              <PerformanceMetricCard
                label="Total Runs"
                value={totals?.total_runs ?? 0}
                description="Recorded activities"
              />
              <PerformanceMetricCard
                label="Average Pace"
                value={totals?.average_pace_label ? `${totals.average_pace_label} /km` : '--'}
                description="Average pace across runs"
              />
              <PerformanceMetricCard
                label="Total Running Time"
                value={formatDuration(totals?.total_duration_seconds)}
                description="Combined activity duration"
              />
            </div>

            <DistanceAnalysis data={metrics.distance_trends ?? []} />
            <PaceAnalysis data={metrics.pace_trends ?? []} />

            <h3 style={{ fontSize: 17, margin: '32px 0 14px' }}>
              Training Category Analysis
            </h3>

            <WorkoutCategoryAnalysis
              title="Endurance Training"
              description="Track the runner's long-distance running progress."
              data={metrics.endurance_trends ?? []}
              accent="cyan"
            />

            <WorkoutCategoryAnalysis
              title="Speed Training"
              description="Track tempo, threshold, and interval workouts."
              data={metrics.speed_trends ?? []}
              accent="orange"
            />

            <WorkoutCategoryAnalysis
              title="Recovery Training"
              description="Track easy and recovery runs."
              data={metrics.recovery_trends ?? []}
              accent="green"
            />

            <h3 style={{ fontSize: 17, margin: '28px 0 14px' }}>Running Consistency</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 14 }}>
              <PerformanceMetricCard
                label="Active Days"
                value={consistency?.active_days ?? 0}
                description="Days with recorded runs"
              />
              <PerformanceMetricCard
                label="Average Runs per Week"
                value={consistency?.average_runs_per_week ?? 0}
                description="Running frequency"
              />
              <PerformanceMetricCard
                label="Longest Run"
                value={`${totals?.longest_run_km ?? 0} km`}
                description="Longest recorded activity"
              />
              <PerformanceMetricCard
                label="Average Effort"
                value={totals?.average_effort ?? '--'}
                description="Recorded effort rating"
              />
              <PerformanceMetricCard
                label="Unclassified Runs"
                value={metrics.unclassified_workout_runs ?? 0}
                description="Activities without an assigned training category"
              />
            </div>

            <div className="panel" style={{ marginTop: 18 }}>
              <h3 style={{ marginTop: 0 }}>Training Plan Adherence</h3>
              {!adherence?.has_active_plan ? (
                <p className="note">This runner has no active training plan for adherence tracking.</p>
              ) : (
                <>
                  <p className="note">{adherence.goal || 'Active training plan'} · {adherence.scheduled_due ?? 0} scheduled sessions due in this period</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                    <PerformanceMetricCard label="Completion Rate" value={adherence.completion_rate == null ? '—' : `${adherence.completion_rate}%`} description="Completed / due sessions" />
                    <PerformanceMetricCard label="Completed" value={adherence.completed ?? 0} description="Completed sessions" />
                    <PerformanceMetricCard label="Skipped" value={adherence.skipped ?? 0} description="Skipped sessions" />
                    <PerformanceMetricCard label="Missed" value={adherence.missed ?? 0} description="Missed sessions" />
                  </div>
                </>
              )}
            </div>
            <p className="note" style={{ marginTop: 12 }}>
              Metrics use the same eligible activity source and calculations as the runner’s Performance Metrics page.
            </p>
          </>
        )}
      </section>

      <article className="support-detail-card">
        <div className="panel-head">
          <div>
            <h2>Training plans and scheduled sessions</h2>
            <span>{orderedPlans.length} training plans</span>
          </div>
        </div>
        {orderedPlans.length === 0 ? <p className="note">No training plans.</p> : orderedPlans.map((plan) => {
          const sessions = plan.sessions ?? []

          return (
            <details key={plan.id} className="support-detail-plan" open={plan.status === 'active'}>
              <summary>
                Plan #{plan.id} · {plan.goal || 'Training'} · {plan.status} · {sessions.length} sessions
              </summary>
              <p>{plan.start_date} to {plan.end_date || '—'} · version {plan.version ?? '—'}</p>
              {sessions.length > 0 ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Workout</th>
                        <th>Distance</th>
                        <th>Status</th>
                        <th>Start</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((session) => (
                        <tr key={session.id}>
                          <td>{session.scheduled_date}</td>
                          <td>{session.type}</td>
                          <td>{session.planned_distance_km ?? '—'} km</td>
                          <td><SessionStatus status={session.status} /></td>
                          <td>{session.planned_start_time || '—'}</td>
                          <td>{session.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="note">No scheduled sessions in this plan.</p>}
            </details>
          )
        })}
      </article>

      <div className="support-detail-grid">
        <article>
          <h3>Connected services</h3>
          {integrations.length === 0 ? <p className="note">No connected services.</p> : (
            <ul>
              {integrations.map((item) => (
                <li key={item.provider}>
                  {item.provider} · connected {timestamp(item.connected_at)}
                  {item.scopes ? ` · scopes: ${item.scopes}` : ''}
                </li>
              ))}
            </ul>
          )}
          <small>OAuth credentials and tokens are deliberately hidden.</small>
        </article>
        <article>
          <h3>Problem reports ({reports.length})</h3>
          {reports.length === 0 ? <p className="note">No reports.</p> : (
            <ul>
              {reports.map((item) => (
                <li key={item.id}>
                  <strong>{item.subject}</strong> · {item.status} · {timestamp(item.created_at)}
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>

      <div className="support-detail-grid support-account-actions">
        <article>
          <h3>Account access</h3>
          <p>This preserves the runner’s history. Suspending blocks protected API access and signs out refresh sessions.</p>
          <button
            className={user.status === 'active' ? 'btn btn-danger' : 'btn'}
            type="button"
            disabled={saving === 'status'}
            onClick={changeRunnerStatus}
          >
            {saving === 'status' ? 'Saving…' : user.status === 'active' ? 'Suspend account' : 'Reactivate account'}
          </button>
        </article>
        <article>
          <h3>Set a new password</h3>
          <p>The new password is not shown again or emailed. Share it with the runner privately.</p>
          <RunnerPasswordForm saving={saving === 'password'} onSave={setRunnerPassword} />
        </article>
      </div>
    </section>
  )
}
