import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPatch, apiPost } from '../api.js'

const TABS = ['Reports', 'System health', 'Users', 'Help guides', 'Alert rules', 'Activity', 'Data safety']
const STATUS_LABELS = { open: 'Open', in_progress: 'In progress', resolved: 'Resolved', closed: 'Closed' }
const ALERT_RULES = [
  { name: 'Missed planned workouts', behavior: 'Past planned sessions are marked missed when the runner dashboard is opened.', source: 'Training plan' },
  { name: 'Run reminders', behavior: 'Browser push reminders require Web Push to be configured and the runner to opt in on their device.', source: 'Notifications' },
  { name: 'Google Calendar sync', behavior: 'Calendar events sync only when a runner has connected Google Calendar and chooses Sync now.', source: 'Integrations' },
]
const HELP_GUIDES = [
  ['GPS run tracking', 'Open Start a Run, allow location access, wait for a GPS fix, then start and save the run. Keep the page open while tracking.'],
  ['Training calendar', 'Open a planned day to review the workout. If calendar sync is connected, use Sync now to update Google Calendar.'],
  ['Report an issue', 'Include the affected page, what you expected, what happened, and the exact error text. Never include passwords or tokens.'],
  ['Account recovery', 'A generic confirmation is shown to protect account privacy. Email delivery depends on the configured transactional mail provider.'],
]

function Metric({ label, value, hint }) {
  return <article className="support-metric"><span>{label}</span><strong>{value ?? '—'}</strong>{hint && <small>{hint}</small>}</article>
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

  return <form className="support-runner-password" onSubmit={submit}>
    <label>New temporary password
      <input type="password" autoComplete="new-password" minLength={8} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} required />
    </label>
    <label>Confirm password
      <input type="password" autoComplete="new-password" minLength={8} maxLength={72} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
    </label>
    <button className="btn" disabled={saving}>{saving ? 'Saving…' : 'Set password'}</button>
    {message && <p className={message.startsWith('Password changed') ? 'success' : 'error'} role="status">{message}</p>}
    <small>Give the temporary password to the runner privately and ask them to change it after signing in.</small>
  </form>
}

export default function SupportConsole() {
  const [tab, setTab] = useState('Reports')
  const [consoleData, setConsoleData] = useState(null)
  const [reports, setReports] = useState([])
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(null)
  const [selectedRunnerId, setSelectedRunnerId] = useState(null)
  const [runnerDetails, setRunnerDetails] = useState(null)
  const [runnerLoading, setRunnerLoading] = useState(false)
  const [backupRows, setBackupRows] = useState([])
  const [backupLoading, setBackupLoading] = useState(false)
  const [backupMessage, setBackupMessage] = useState('')

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

  const loadBackups = useCallback(async () => {
    setBackupLoading(true)
    try {
      const result = await apiGet('/support/backups')
      setBackupRows(result.data ?? [])
    } finally {
      setBackupLoading(false)
    }
  }, [])

  useEffect(() => {
    load().catch((err) => {
      setError(err.message || 'Could not load the Support Console.')
      setState('error')
    })
  }, [load])

  useEffect(() => {
    if (tab === 'Data safety') {
      loadBackups().catch((err) => setError(err.message || 'Could not load snapshots.'))
    }
  }, [tab, loadBackups])

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

  async function openRunner(id) {
    setSelectedRunnerId(id)
    setRunnerDetails(null)
    setRunnerLoading(true)
    setError('')
    try {
      const result = await apiGet(`/support/users/${id}`)
      setRunnerDetails(result.data)
    } catch (err) {
      setError(err.message || 'Could not load runner details.')
    } finally {
      setRunnerLoading(false)
    }
  }

  async function changeRunnerStatus(user) {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active'
    const action = nextStatus === 'suspended' ? 'suspend' : 'reactivate'
    if (!window.confirm(`Are you sure you want to ${action} ${user.email}?`)) return

    setSaving(`user-${user.id}`)
    setError('')
    try {
      await apiPatch(`/support/users/${user.id}/status`, { status: nextStatus })
      await load()
      await openRunner(user.id)
    } catch (err) {
      setError(err.message || `Could not ${action} the account.`)
    } finally {
      setSaving(null)
    }
  }

  async function setRunnerPassword(id, password, confirmation) {
    setSaving(`password-${id}`)
    try {
      await apiPatch(`/support/users/${id}/password`, {
        new_password: password,
        confirmation,
      })
    } finally {
      setSaving(null)
    }
  }

  async function createBackup() {
    setSaving('backup')
    setBackupMessage('')
    setError('')
    try {
      const result = await apiPost('/support/backups')
      setBackupMessage(`Snapshot created: ${result.data.filename}`)
      await loadBackups()
    } catch (err) {
      setError(err.message || 'Could not create a snapshot.')
    } finally {
      setSaving(null)
    }
  }

  async function downloadBackup(id) {
    setSaving(`download-${id}`)
    setError('')
    try {
      const result = await apiGet(`/support/backups/${id}`)
      const { filename, snapshot } = result.data
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message || 'Could not download the snapshot.')
    } finally {
      setSaving(null)
    }
  }

  if (state === 'loading') return <p role="status">Loading Support Console…</p>
  if (state === 'error') return <><p className="error" role="alert">{error}</p><button className="btn" onClick={() => { setState('loading'); load().catch((err) => { setError(err.message); setState('error') }) }}>Try again</button></>

  const { totals, system, users, activity, data_safety: safety } = consoleData
  const providerEntries = Object.entries(system?.providers ?? {})
  const selectedUser = users.find((user) => Number(user.id) === Number(selectedRunnerId))

  return <>
    <div className="support-page-heading">
      <div><p className="section-eyebrow">Administration</p><h1>Support Console</h1><p className="note">Review runner reports and monitor RunPlan operations. Account and training details are visible to admins only.</p></div>
      <button className="btn btn-secondary" onClick={() => { setState('loading'); load().catch((err) => { setError(err.message); setState('error') }) }}>Refresh</button>
    </div>

    <section className="support-kpi-grid support-console-metrics" aria-label="Support overview">
      <Metric label="Open reports" value={totals.open_reports} hint={`${totals.reports} total`} />
      <Metric label="Active runners" value={totals.active_runners} hint={`${totals.users} accounts total`} />
      <Metric label="Logged runs" value={totals.runs} />
      <Metric label="Training plans" value={totals.plans} />
    </section>

    <div className="support-tabs" role="tablist" aria-label="Support Console sections">
      {TABS.map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>)}
    </div>
    {error && <p className="error" role="alert">{error}</p>}

    {tab === 'Reports' && <section className="support-console-section" aria-label="Runner reports">
      <div className="panel-head"><h2>Runner reports</h2><span>{reports.length} reports</span></div>
      {reports.length === 0 ? <p className="note">No problem reports have been submitted yet.</p> : reports.map((report) => <article className="plan-card support-report-card" key={report.id}>
        <div className="support-report-top"><div><span className="pill pill-muted">{STATUS_LABELS[report.status] ?? report.status}</span><h3>{report.subject}</h3></div><small>{timestamp(report.created_at)}</small></div>
        <div className="support-report-meta"><span><strong>Runner:</strong> {report.email}</span><span><strong>Category:</strong> {report.category.replaceAll('_', ' ')}</span><span><strong>Page:</strong> {report.page_path || 'Not recorded'}</span><span><strong>Priority:</strong> {report.priority}</span></div>
        <p className="support-preserve-lines">{report.description}</p>
        <div className="support-report-controls">
          <label>Status <select value={report.status} disabled={saving === report.id} onChange={(e) => changeReport(report.id, { status: e.target.value })}>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Priority <select value={report.priority} disabled={saving === report.id} onChange={(e) => changeReport(report.id, { priority: e.target.value })}>{['low', 'normal', 'high'].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        </div>
        <details className="support-admin-note"><summary>Admin-only note</summary><AdminNote report={report} saving={saving === report.id} onSave={(admin_note) => changeReport(report.id, { admin_note })} /></details>
      </article>)}
    </section>}

    {tab === 'System health' && <section className="support-console-section">
      <div className="panel-head"><h2>System health</h2><span className="pill pill-ok">Checked {timestamp(system?.checked_at)}</span></div>
      <div className="support-health-list">
        <div><span>API service</span><span className={`pill ${system?.api?.status === 'ok' ? 'pill-ok' : 'pill-warn'}`}>{system?.api?.status === 'ok' ? 'Connected' : 'Unavailable'}</span></div>
        <div><span>Database</span><span className={`pill ${system?.database?.status === 'connected' ? 'pill-ok' : 'pill-warn'}`}>{system?.database?.status ?? 'Unavailable'}</span></div>
        <div><span>Core planner</span><span className={`pill ${system?.core_enabled ? 'pill-ok' : 'pill-warn'}`}>{system?.core_enabled ? 'Active' : 'Unavailable'}</span></div>
        {providerEntries.map(([key, provider]) => <div key={key}><span>{provider.label ?? key.replaceAll('_', ' ')}</span><span className={`pill ${provider.ready ? 'pill-ok' : provider.configured ? 'pill-warn' : 'pill-muted'}`}>{provider.ready ? 'Ready' : provider.configured ? 'Configured but disabled' : 'Not configured'}</span></div>)}
      </div>
      <p className="note">Secrets, access tokens, and individual runners’ calendar connections are not shown here.</p>
    </section>}

    {tab === 'Users' && <section className="support-console-section">
      <div className="panel-head"><h2>Accounts</h2><span>{users.length} shown · sign-in history is not stored</span></div>
      <div className="table-wrap"><table><thead><tr><th>Account</th><th>Role</th><th>Status</th><th>Joined</th><th>Details</th></tr></thead><tbody>
        {users.map((user) => <tr key={user.id}>
          <td>{user.email}</td><td>{user.role === 'admin' ? 'Administrator' : 'Runner'}</td>
          <td><span className={`pill ${user.status === 'active' ? 'pill-ok' : 'pill-warn'}`}>{user.status}</span></td>
          <td>{timestamp(user.created_at)}</td>
          <td>{user.role === 'runner' ? <button className="btn btn-secondary" type="button" onClick={() => openRunner(user.id)}>{Number(selectedRunnerId) === Number(user.id) ? 'Refresh details' : 'View details'}</button> : <span className="note">Admin</span>}</td>
        </tr>)}
      </tbody></table></div>

      {selectedRunnerId && <section className="support-runner-details" aria-label="Runner details">
        <div className="panel-head">
          <div><h2>{runnerDetails?.user?.email ?? 'Runner details'}</h2><span>Profile, training, runs, reports, and connected service status</span></div>
          <button className="btn btn-secondary" type="button" onClick={() => { setSelectedRunnerId(null); setRunnerDetails(null) }}>Close</button>
        </div>
        {runnerLoading && <p role="status">Loading runner data…</p>}
        {runnerDetails && selectedUser && <>
          <div className="support-detail-grid">
            <article><h3>Account</h3><dl>
              <dt>Email</dt><dd>{runnerDetails.user.email}</dd>
              <dt>Status</dt><dd>{runnerDetails.user.status}</dd>
              <dt>Joined</dt><dd>{timestamp(runnerDetails.user.created_at)}</dd>
              <dt>Updated</dt><dd>{timestamp(runnerDetails.user.updated_at)}</dd>
            </dl></article>
            <article><h3>Runner profile</h3><dl>
              {Object.entries(runnerDetails.profile ?? {}).filter(([key]) => !['id', 'user_id', 'created_at', 'updated_at'].includes(key)).map(([key, value]) => <div key={key}><dt>{key.replaceAll('_', ' ')}</dt><dd>{displayValue(value)}</dd></div>)}
              {!runnerDetails.profile && <dd>No profile has been saved.</dd>}
            </dl></article>
          </div>

          <article className="support-detail-card"><h3>Training plans and scheduled sessions</h3>
            {(runnerDetails.plans ?? []).length === 0 ? <p className="note">No training plans.</p> : runnerDetails.plans.map((plan) => <details key={plan.id} className="support-detail-plan" open={plan.status === 'active'}>
              <summary>Plan #{plan.id} · {plan.goal || 'Training'} · {plan.status} · {plan.sessions.length} sessions</summary>
              <p>{plan.start_date} to {plan.end_date || '—'} · version {plan.version ?? '—'}</p>
              {plan.sessions.length > 0 && <div className="table-wrap"><table><thead><tr><th>Date</th><th>Workout</th><th>Distance</th><th>Status</th><th>Start</th><th>Notes</th></tr></thead><tbody>{plan.sessions.map((session) => <tr key={session.id}><td>{session.scheduled_date}</td><td>{session.type}</td><td>{session.planned_distance_km ?? '—'} km</td><td>{session.status}</td><td>{session.planned_start_time || '—'}</td><td>{session.notes || '—'}</td></tr>)}</tbody></table></div>}
            </details>)}
          </article>

          <article className="support-detail-card"><h3>Logged runs ({runnerDetails.activities.length})</h3>
            {runnerDetails.activities.length === 0 ? <p className="note">No logged runs.</p> : <div className="table-wrap"><table><thead><tr><th>Date</th><th>Distance</th><th>Duration</th><th>Effort</th><th>Notes</th></tr></thead><tbody>{runnerDetails.activities.map((run) => <tr key={run.id}><td>{run.activity_date}</td><td>{run.distance_km} km</td><td>{run.duration_seconds}s</td><td>{run.effort ?? '—'}</td><td>{run.notes || '—'}</td></tr>)}</tbody></table></div>}
          </article>

          <div className="support-detail-grid">
            <article><h3>Connected services</h3>
              {runnerDetails.integrations.length === 0 ? <p className="note">No connected services.</p> : <ul>{runnerDetails.integrations.map((item) => <li key={item.provider}>{item.provider} · connected {timestamp(item.connected_at)}{item.scopes ? ` · scopes: ${item.scopes}` : ''}</li>)}</ul>}
              <small>OAuth credentials and tokens are deliberately hidden.</small>
            </article>
            <article><h3>Problem reports ({runnerDetails.reports.length})</h3>
              {runnerDetails.reports.length === 0 ? <p className="note">No reports.</p> : <ul>{runnerDetails.reports.map((item) => <li key={item.id}><strong>{item.subject}</strong> · {item.status} · {timestamp(item.created_at)}</li>)}</ul>}
            </article>
          </div>

          <div className="support-detail-grid support-account-actions">
            <article><h3>Account access</h3><p>This preserves the runner’s history. Suspending blocks protected API access and signs out refresh sessions.</p>
              <button className={selectedUser.status === 'active' ? 'btn btn-danger' : 'btn'} disabled={saving === `user-${selectedUser.id}`} onClick={() => changeRunnerStatus(selectedUser)}>
                {saving === `user-${selectedUser.id}` ? 'Saving…' : selectedUser.status === 'active' ? 'Suspend account' : 'Reactivate account'}
              </button>
            </article>
            <article><h3>Set a new password</h3><p>The new password is not shown again or emailed. Share it with the runner privately.</p>
              <RunnerPasswordForm saving={saving === `password-${selectedUser.id}`} onSave={(password, confirmation) => setRunnerPassword(selectedUser.id, password, confirmation)} />
            </article>
          </div>
        </>}
      </section>}
      <p className="note">Admin accounts cannot be managed from this screen. New runner accounts continue to use the existing registration page.</p>
    </section>}

    {tab === 'Help guides' && <section className="support-guide-grid">{HELP_GUIDES.map(([title, copy]) => <article className="plan-card" key={title}><h2>{title}</h2><p>{copy}</p></article>)}</section>}

    {tab === 'Alert rules' && <section className="support-console-section">
      <div className="panel-head"><h2>RunPlan notifications and rules</h2><span className="pill pill-muted">Read only</span></div>
      <div className="support-rule-list">{ALERT_RULES.map((rule) => <article key={rule.name}><div><h3>{rule.name}</h3><p>{rule.behavior}</p></div><span className="pill pill-muted">{rule.source}</span></article>)}</div>
      <p className="note">These are the current app behaviors, not editable per-user alert thresholds.</p>
    </section>}

    {tab === 'Activity' && <section className="support-console-section">
      <div className="panel-head"><h2>Recent support and security activity</h2><span>Latest records</span></div>
      {activity.length === 0 ? <p className="note">No recent activity records.</p> : <div className="table-wrap"><table><thead><tr><th>Time</th><th>Activity</th><th>Account</th><th>Details</th></tr></thead><tbody>{activity.map((item) => <tr key={`${item.kind}-${item.id}`}><td>{timestamp(item.created_at)}</td><td>{item.kind === 'report' ? 'Problem report' : (item.event_type ?? 'Security event').replaceAll('_', ' ')}</td><td>{item.email ?? 'Account removed'}</td><td>{item.subject ?? (Object.entries(item.metadata ?? {}).map(([key, value]) => `${key}: ${value}`).join(' · ') || '—')}</td></tr>)}</tbody></table></div>}
      <p className="note">This is an audit summary, not a full sign-in history.</p>
    </section>}

    {tab === 'Data safety' && <section className="support-console-section">
      <div className="panel-head"><div><h2>Data safety</h2><span>Snapshots contain app records, not login credentials.</span></div></div>
      <div className="support-kpi-grid"><Metric label="Runner profiles" value={safety.runner_profiles} /><Metric label="Training sessions" value={safety.sessions} /><Metric label="Support reports" value={safety.reports} /><Metric label="Security events" value={safety.security_events} /></div>
      <ul className="support-safety-list">
        <li>Snapshots include users without password hashes, profiles, plans, sessions, runs, reports, and selected operational records.</li>
        <li>Password hashes, refresh/reset tokens, OAuth tokens, Google identity subjects, and push subscription credentials are excluded.</li>
        <li>The newest 14 snapshots are retained in the same Aiven database. Download snapshots regularly for an off-database copy.</li>
      </ul>
      <Link to="/account">Open account and data controls</Link>
      <article className="support-backups-card">
        <div className="panel-head"><div><h3>Data snapshots</h3><span>Newest 14 are kept; older snapshots are removed automatically.</span></div>
          <button className="btn" disabled={saving === 'backup'} onClick={createBackup}>{saving === 'backup' ? 'Creating…' : 'Create snapshot now'}</button>
        </div>
        {backupMessage && <p className="success" role="status">{backupMessage}</p>}
        {backupLoading ? <p role="status">Loading snapshots…</p> : backupRows.length === 0 ? <p className="note">No snapshots yet.</p> : <div className="table-wrap"><table><thead><tr><th>Snapshot</th><th>Created</th><th>Size</th><th></th></tr></thead><tbody>
          {backupRows.map((backup) => <tr key={backup.id}><td>{backup.filename}</td><td>{timestamp(backup.created_at)}</td><td>{(Number(backup.size_bytes) / 1024).toFixed(1)} KB</td><td><button className="btn btn-secondary" disabled={saving === `download-${backup.id}`} onClick={() => downloadBackup(backup.id)}>{saving === `download-${backup.id}` ? 'Preparing…' : 'Download JSON'}</button></td></tr>)}
        </tbody></table></div>}
      </article>
    </section>}
  </>
}

function AdminNote({ report, saving, onSave }) {
  const [note, setNote] = useState(report.admin_note ?? '')
  return <form className="support-admin-note-form" onSubmit={(event) => { event.preventDefault(); onSave(note) }}>
    <textarea value={note} maxLength={2000} rows={3} onChange={(event) => setNote(event.target.value)} placeholder="Internal note visible only to admins" />
    <button className="btn btn-secondary" disabled={saving}>{saving ? 'Saving…' : 'Save note'}</button>
  </form>
}