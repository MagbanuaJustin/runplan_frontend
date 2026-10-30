import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiPost } from '../api.js'

const CATEGORIES = [
  ['bug', 'Something is broken'],
  ['run_tracking', 'GPS or run tracking'],
  ['calendar', 'Calendar connection'],
  ['training_plan', 'Training plan'],
  ['account', 'Account or sign-in'],
  ['other', 'Other'],
]

export default function ReportProblem() {
  const navigate = useNavigate()
  const [category, setCategory] = useState('bug')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [pagePath, setPagePath] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await apiPost('/support/reports', {
        category,
        subject: subject.trim(),
        description: description.trim(),
        page_path: pagePath.trim(),
      })
      navigate('/support/reports', { state: { submitted: true } })
    } catch (err) {
      setError(err.message || 'Your report could not be submitted. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="support-page-heading">
        <div>
          <p className="section-eyebrow">RunPlan help</p>
          <h1>Report a Problem</h1>
          <p className="note">
            Tell us what happened. Please leave out passwords, access codes, and payment details.
          </p>
        </div>
        <Link to="/support/reports">View my reports</Link>
      </div>
      <section className="plan-card support-form-card">
        <form className="support-form" onSubmit={submit}>
          <label>
            What area is affected?
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {CATEGORIES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            Short title
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              maxLength={160}
              required
              placeholder="For example: Run will not save"
            />
          </label>
          <label>
            Page with the problem (optional)
            <input
              value={pagePath}
              onChange={(event) => setPagePath(event.target.value)}
              maxLength={255}
              placeholder="For example: /calendar or /run"
            />
          </label>
          <label>
            What happened?
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={4000}
              required
              rows={7}
              placeholder="Include the page, what you expected, what happened, and any error shown."
            />
            <small>{description.length}/4000</small>
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="support-form-actions">
            <button className="btn" type="submit" disabled={busy}>
              {busy ? 'Submitting...' : 'Submit report'}
            </button>
            <Link className="btn btn-secondary" to="/dashboard">Cancel</Link>
          </div>
        </form>
      </section>
    </>
  )
}