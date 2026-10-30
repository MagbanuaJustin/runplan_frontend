import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPatch } from '../api.js'

const TABS = [
  'Reports',
  'System health',
  'Users',
  'Help guides',
  'Alert rules',
  'Activity',
  'Data safety',
]
const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
}
const ALERT_RULES = [
  {
    name: 'Missed planned workouts',
    behavior: 'Past planned sessions are marked missed when the runner dashboard is opened.',
    source: 'Training plan',
  },
  {
    name: 'Run reminders',
    behavior: 'Browser push reminders require Web Push to be configured and the runner to opt in on their device.',
    source: 'Notifications',
  },
  {
    name: 'Google Calendar sync',
    behavior: 'Calendar events sync only when a runner has connected Google Calendar and chooses Sync now.',
    source: 'Integrations',
  },
]
const HELP_GUIDES = [
  [
    'GPS run tracking',
    'Open Start a Run, allow location access, wait for a GPS fix, then start and save the run. Keep the page open while tracking.',
  ],
  [
    'Training calendar',
    'Open a planned day to review the workout. If calendar sync is connected, use Sync now to update Google Calendar.',
  ],
  [
    'Report an issue',
    'Ask runners to include the affected page, what they expected, what happened, and the exact error text. They should not include passwords or tokens.',
  ],
  [
    'Account recovery',
    'A generic confirmation is shown to protect account privacy. Email delivery depends on the configured transactional mail provider.',
  ],
]

function Metric({ label, value, hint }) {
  return (
    <article className="support-metric">
      <span>{label}</span>
      <strong>{value ?? '—'}</strong>
      {hint && <small>{hint}</small>}
    </article>
  )
}

function timestamp(value) {
  if (!value) return '—'
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export default function SupportConsole() {
  const [tab, setTab] = useState('Reports')
  const [consoleData, setConsoleData] = useState(null)
  const [reports, setReports] = useState([])
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(null)

  const load = useCallback(async () => {
    setError('')
    const [overview, reportList] = await Promise.all([
      apiGet('/support/console'),
      apiGet('/support/reports'),
    ])
    setConsoleData(overview.data)
    setReports(reportList.data ?? [])
    setState('ready')
  }, [])

  useEffect(() => {
    load().catch((err) => {
      setError(err.message || 'Could not load the Support Console.')
      setState('error')
    })
  }, [load])

  async function changeReport(id, patch) {
    setSaving(id)
    setError('')
    try {
      await apiPatch(`/support/reports/${id}`, patch)
      await load()
    } catch (err) {
      setError(err.message || 'Could not update the report.')
    } finally {
      setSaving(null)
    }
  }

  if (state === 'loading') return <p role="status">Loading Support Console...</p>

  if (state === 'error') {
    return (
      <>
        <p className="error" role="alert">{error}</p>
        <button
          className="btn"
          onClick={() => {
            setState('loading')
            load().catch((err) => {
              setError(err.message)
              setState('error')
            })
          }}
        >
          Try again
        </button>
      </>
    )
  }

  const { totals, system, users, activity, data_safety: safety } = consoleData
  const providerEntries = Object.entries(system?.providers ?? {})

  return (
    <>
      <div className="support-page-heading">
        <div>
          <p className="section-eyebrow">Administration</p>
          <h1>Support Console</h1>
          <p className="note">
            Review runner reports and monitor RunPlan operations. Account data is available to admins only.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => {
            setState('loading')
            load().catch((err) => {
              setError(err.message)
              setState('error')
            })
          }}
        >
          Refresh
        </button>
      </div>

      <section className="support-kpi-grid support-console-metrics" aria-label="Support overview">
        <Metric label="Open reports" value={totals.open_reports} hint={`${totals.reports} total`} />
        <Metric label="Active runners" value={totals.active_runners} hint={`${totals.users} accounts total`} />
        <Metric label="Logged runs" value={totals.runs} />
        <Metric label="Training plans" value={totals.plans} />
      </section>

      <div className="support-tabs" role="tablist" aria-label="Support Console sections">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            className={tab === item ? 'active' : ''}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {error && <p className="error" role="alert">{error}</p>}

      {tab === 'Reports' && (
        <section className="support-console-section" aria-label="Runner reports">
          <div className="panel-head">
            <h2>Runner reports</h2>
            <span>{reports.length} reports</span>
          </div>
          {reports.length === 0 ? (
            <p className="note">No problem reports have been submitted yet.</p>
          ) : reports.map((report) => (
            <article className="plan-card support-report-card" key={report.id}>
              <div className="support-report-top">
                <div>
                  <span className="pill pill-muted">
                    {STATUS_LABELS[report.status] ?? report.status}
                  </span>
                  <h3>{report.subject}</h3>
                </div>
                <small>{timestamp(report.created_at)}</small>
              </div>
              <div className="support-report-meta">
                <span><strong>Runner:</strong> {report.email}</span>
                <span><strong>Category:</strong> {report.category.replaceAll('_', ' ')}</span>
                <span><strong>Page:</strong> {report.page_path || 'Not recorded'}</span>
                <span><strong>Priority:</strong> {report.priority}</span>
              </div>
              <p className="support-preserve-lines">{report.description}</p>
              <div className="support-report-controls">
                <label>
                  Status
                  <select
                    value={report.status}
                    disabled={saving === report.id}
                    onChange={(event) => changeReport(report.id, { status: event.target.value })}
                  >
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Priority
                  <select
                    value={report.priority}
                    disabled={saving === report.id}
                    onChange={(event) => changeReport(report.id, { priority: event.target.value })}
                  >
                    {['low', 'normal', 'high'].map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </label>
              </div>
              <details className="support-admin-note">
                <summary>Admin-only note</summary>
                <AdminNote
                  report={report}
                  saving={saving === report.id}
                  onSave={(admin_note) => changeReport(report.id, { admin_note })}
                />
              </details>
            </article>
          ))}
        </section>
      )}

      {tab === 'System health' && (
        <section className="support-console-section">
          <div className="panel-head">
            <h2>System health</h2>
            <span className="pill pill-ok">Checked {timestamp(system?.checked_at)}</span>
          </div>
          <div className="support-health-list">
            <div>
              <span>API service</span>
              <span className={`pill ${system?.api?.status === 'ok' ? 'pill-ok' : 'pill-warn'}`}>
                {system?.api?.status === 'ok' ? 'Connected' : 'Unavailable'}
              </span>
            </div>
            <div>
              <span>Database</span>
              <span className={`pill ${system?.database?.status === 'connected' ? 'pill-ok' : 'pill-warn'}`}>
                {system?.database?.status ?? 'Unavailable'}
              </span>
            </div>
            <div>
              <span>Core planner</span>
              <span className={`pill ${system?.core_enabled ? 'pill-ok' : 'pill-warn'}`}>
                {system?.core_enabled ? 'Active' : 'Unavailable'}
              </span>
            </div>
            {providerEntries.map(([key, provider]) => (
              <div key={key}>
                <span>{provider.label ?? key.replaceAll('_', ' ')}</span>
                <span className={`pill ${provider.ready ? 'pill-ok' : provider.configured ? 'pill-warn' : 'pill-muted'}`}>
                  {provider.ready
                    ? 'Ready'
                    : provider.configured
                      ? 'Configured but disabled'
                      : 'Not configured'}
                </span>
              </div>
            ))}
          </div>
          <p className="note">
            Secrets, access tokens, and individual runners’ calendar connections are not shown here.
          </p>
        </section>
      )}

      {tab === 'Users' && (
        <section className="support-console-section">
          <div className="panel-head">
            <h2>Accounts</h2>
            <span>{users.length} shown · no last sign-in tracking is stored yet</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Account</th><th>Role</th><th>Status</th><th>Joined</th></tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>{user.role === 'admin' ? 'Administrator' : 'Runner'}</td>
                    <td>
                      <span className={`pill ${user.status === 'active' ? 'pill-ok' : 'pill-warn'}`}>
                        {user.status}
                      </span>
                    </td>
                    <td>{timestamp(user.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="note">
            New runner accounts continue to use the existing registration page. Account creation and role changes are not exposed from this console.
          </p>
        </section>
      )}

      {tab === 'Help guides' && (
        <section className="support-guide-grid">
          {HELP_GUIDES.map(([title, copy]) => (
            <article className="plan-card" key={title}>
              <h2>{title}</h2>
              <p>{copy}</p>
            </article>
          ))}
        </section>
      )}

      {tab === 'Alert rules' && (
        <section className="support-console-section">
          <div className="panel-head">
            <h2>RunPlan notifications and rules</h2>
            <span className="pill pill-muted">Read only</span>
          </div>
          <div className="support-rule-list">
            {ALERT_RULES.map((rule) => (
              <article key={rule.name}>
                <div><h3>{rule.name}</h3><p>{rule.behavior}</p></div>
                <span className="pill pill-muted">{rule.source}</span>
              </article>
            ))}
          </div>
          <p className="note">These are the current app behaviors, not editable per-user alert thresholds.</p>
        </section>
      )}

      {tab === 'Activity' && (
        <section className="support-console-section">
          <div className="panel-head">
            <h2>Recent support and security activity</h2>
            <span>Latest records</span>
          </div>
          {activity.length === 0 ? (
            <p className="note">No recent activity records.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Time</th><th>Activity</th><th>Account</th><th>Details</th></tr>
                </thead>
                <tbody>
                  {activity.map((item) => (
                    <tr key={`${item.kind}-${item.id}`}>
                      <td>{timestamp(item.created_at)}</td>
                      <td>
                        {item.kind === 'report'
                          ? 'Problem report'
                          : (item.event_type ?? 'Security event').replaceAll('_', ' ')}
                      </td>
                      <td>{item.email ?? 'Account removed'}</td>
                      <td>
                        {item.subject ?? (
                          Object.entries(item.metadata ?? {})
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(' · ') || '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="note">
            Security activity uses the existing privacy-filtered audit log. It is not a full user sign-in history.
          </p>
        </section>
      )}

      {tab === 'Data safety' && (
        <section className="support-console-section">
          <div className="panel-head">
            <h2>Stored RunPlan data</h2>
            <span className="pill pill-muted">Counts only</span>
          </div>
          <div className="support-kpi-grid">
            <Metric label="Runner profiles" value={safety.runner_profiles} />
            <Metric label="Training sessions" value={safety.sessions} />
            <Metric label="Support reports" value={safety.reports} />
            <Metric label="Security events" value={safety.security_events} />
          </div>
          <ul className="support-safety-list">
            <li>Runners can view their own training data and their own problem reports.</li>
            <li>Administrators can review reports, account status, and operational counts.</li>
            <li>Support reports are removed when the account that submitted them is permanently deleted.</li>
            <li>Do not include passwords, API keys, OAuth tokens, or other secrets in a problem report.</li>
          </ul>
          <Link to="/account">Open account and data controls</Link>
        </section>
      )}
    </>
  )
}

function AdminNote({ report, saving, onSave }) {
  const [note, setNote] = useState(report.admin_note ?? '')

  return (
    <form
      className="support-admin-note-form"
      onSubmit={(event) => {
        event.preventDefault()
        onSave(note)
      }}
    >
      <textarea
        value={note}
        maxLength={2000}
        rows={3}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Internal note visible only to admins"
      />
      <button className="btn btn-secondary" disabled={saving}>
        {saving ? 'Saving...' : 'Save note'}
      </button>
    </form>
  )
}