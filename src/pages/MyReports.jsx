import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { apiGet } from '../api.js'

const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
}

export default function MyReports() {
  const location = useLocation()
  const [reports, setReports] = useState([])
  const [state, setState] = useState('loading')

  useEffect(() => {
    apiGet('/support/reports')
      .then((response) => {
        setReports(response.data ?? [])
        setState('ready')
      })
      .catch(() => setState('error'))
  }, [])

  return (
    <>
      <div className="support-page-heading">
        <div>
          <p className="section-eyebrow">RunPlan help</p>
          <h1>My Reports</h1>
          <p className="note">Only you and RunPlan administrators can view your submitted reports.</p>
        </div>
        <Link className="btn" to="/support/report">Report a problem</Link>
      </div>

      {location.state?.submitted && (
        <p className="success-banner" role="status">Your report was submitted.</p>
      )}
      {state === 'loading' && <p role="status">Loading your reports...</p>}
      {state === 'error' && <p className="error" role="alert">Could not load your reports.</p>}

      {state === 'ready' && reports.length === 0 && (
        <section className="plan-card">
          <p>You have not submitted a report yet.</p>
          <Link to="/support/report">Report a problem</Link>
        </section>
      )}

      {state === 'ready' && reports.map((report) => (
        <article className="plan-card support-report-card" key={report.id}>
          <div className="support-report-top">
            <div>
              <span className="pill pill-muted">
                {STATUS_LABELS[report.status] ?? report.status}
              </span>
              <h2>{report.subject}</h2>
            </div>
            <small>{report.created_at}</small>
          </div>
          <p className="support-category">
            {report.category.replaceAll('_', ' ')}
            {report.page_path ? ` · ${report.page_path}` : ''}
          </p>
          <p className="support-preserve-lines">{report.description}</p>
          {report.updated_at && report.updated_at !== report.created_at && (
            <small>Updated {report.updated_at}</small>
          )}
        </article>
      ))}
    </>
  )
}