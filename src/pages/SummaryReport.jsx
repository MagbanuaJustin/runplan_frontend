import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../api.js'
import { formatDuration } from '../format.js'

function paceLabel(seconds) {
  if (!Number.isFinite(Number(seconds)) || Number(seconds) <= 0) return '—'
  const value = Math.round(Number(seconds))
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`
}

export default function SummaryReport() {
  const [summary, setSummary] = useState(null)
  const [state, setState] = useState('loading')

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA')
    apiGet(`/dashboard?today=${today}`)
      .then((response) => {
        setSummary(response.data)
        setState('ready')
      })
      .catch(() => setState('error'))
  }, [])

  if (state === 'loading') return <p role="status">Preparing your summary...</p>
  if (state === 'error') return <p role="alert">Could not load your training summary.</p>

  const { last7, previous7, plan, recent = [] } = summary
  const rate = plan?.completion_rate

  return (
    <>
      <div className="support-page-heading">
        <div>
          <p className="section-eyebrow">Your training at a glance</p>
          <h1>Summary Report</h1>
          <p className="note">This report contains only your own logged runs and training plan.</p>
        </div>
        <Link className="btn" to="/activities">View run log</Link>
      </div>

      <section className="support-kpi-grid" aria-label="Your last seven days">
        <article className="kpi-card">
          <span className="kpi-label">Distance · last 7 days</span>
          <strong className="support-stat">{last7.distance_km} km</strong>
          <small>Previous 7 days: {previous7.distance_km} km</small>
        </article>
        <article className="kpi-card">
          <span className="kpi-label">Runs · last 7 days</span>
          <strong className="support-stat">{last7.runs}</strong>
          <small>Previous 7 days: {previous7.runs}</small>
        </article>
        <article className="kpi-card">
          <span className="kpi-label">Moving time · last 7 days</span>
          <strong className="support-stat">{formatDuration(last7.duration_seconds)}</strong>
          <small>Calculated from your logged runs</small>
        </article>
        <article className="kpi-card">
          <span className="kpi-label">Average pace · last 7 days</span>
          <strong className="support-stat">
            {last7.pace_label ? `${last7.pace_label} /km` : '—'}
          </strong>
          <small>
            {last7.pace_label
              ? 'Based on logged distance and time'
              : 'Log a run to build pace history'}
          </small>
        </article>
      </section>

      <section className="plan-card support-section">
        <div className="panel-head">
          <h2>Training plan</h2>
          <Link to="/plan">Open plan</Link>
        </div>
        {plan ? (
          <div className="support-detail-grid">
            <div>
              <span className="strip-label">Goal</span>
              <strong>{plan.goal.replaceAll('_', ' ')}</strong>
            </div>
            <div>
              <span className="strip-label">Plan progress</span>
              <strong>{plan.completed} of {plan.due} due sessions completed</strong>
            </div>
            <div>
              <span className="strip-label">Completion</span>
              <strong>{rate === null ? 'No completed weeks yet' : `${rate}%`}</strong>
            </div>
            <div>
              <span className="strip-label">Next run</span>
              <strong>
                {plan.next_session
                  ? `${plan.next_session.scheduled_date} · ${plan.next_session.planned_distance_km} km`
                  : 'No upcoming planned run'}
              </strong>
            </div>
          </div>
        ) : (
          <p className="note">No active training plan yet. Create or approve a plan to see progress here.</p>
        )}
      </section>

      <section className="plan-card support-section">
        <div className="panel-head">
          <h2>Recent runs</h2>
          <Link to="/activities">See all</Link>
        </div>
        {recent.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Distance</th>
                  <th>Time</th>
                  <th>Pace</th>
                  <th>Plan session</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((run) => (
                  <tr key={run.id}>
                    <td>{run.activity_date}</td>
                    <td>{run.distance_km} km</td>
                    <td>{formatDuration(run.duration_seconds)}</td>
                    <td>{paceLabel(run.duration_seconds / run.distance_km)} /km</td>
                    <td>{run.from_plan ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="note">No runs logged yet. When you record a run it will appear in this report.</p>
        )}
        <p className="note">This is a training summary, not medical advice.</p>
      </section>
    </>
  )
}