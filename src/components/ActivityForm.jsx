import { useState } from 'react'
import { apiPost, apiPut } from '../api.js'
import { formatDuration } from '../format.js'

const today = () => new Date().toLocaleDateString('en-CA')

function parseDuration(text) {
  const parts = text.trim().split(':')
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d{1,2}$/.test(p))) return null
  const nums = parts.map(Number)
  const [h, m, s] = nums.length === 3 ? nums : [0, ...nums]
  if (m > 59 || s > 59) return null
  return h * 3600 + m * 60 + s
}

function Field({ id, label, error, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error && <p id={`${id}-error`} className="error" role="alert">{error}</p>}
    </div>
  )
}

export default function ActivityForm({ activity = null, sessionId = null, defaults = null, onSaved, onCancel }) {
  const editing = activity !== null
  const p = editing ? `edit-${activity.id}-` : 'new-' // keeps ids unique on the page

  const [form, setForm] = useState(
    editing
      ? {
          date: activity.activity_date,
          distance: String(activity.distance_km),
          duration: formatDuration(activity.duration_seconds),
          effort: activity.effort ?? '',
          notes: activity.notes ?? '',
        }
      : { date: defaults?.date ?? today(), distance: defaults?.distance ?? '', duration: '', effort: '', notes: '' },
  )
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const attrs = (id, key) => ({
    id: p + id,
    'aria-invalid': errors[key] ? 'true' : undefined,
    'aria-describedby': errors[key] ? `${p}${id}-error` : undefined,
  })

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')

    const seconds = parseDuration(form.duration)
    if (seconds === null) {
      setErrors({ duration_seconds: 'Use mm:ss or h:mm:ss, for example 32:15 or 1:05:30.' })
      return
    }

    setErrors({})
    setBusy(true)
    try {
      const payload = {
        activity_date: form.date,
        distance_km: form.distance.trim(),
        duration_seconds: seconds,
        effort: form.effort === '' ? null : form.effort,
        notes: form.notes,
        ...(sessionId ? { session_id: sessionId } : {}),
      }
      const body = editing
        ? await apiPut(`/activities/${activity.id}`, payload)
        : await apiPost('/activities', payload)

      if (!editing) setForm({ ...form, distance: '', duration: '', effort: '', notes: '' })
      onSaved(body.data)
    } catch (err) {
      if (err.fields) setErrors(err.fields)
      else setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <Field id={p + 'date'} label="Date" error={errors.activity_date}>
        <input {...attrs('date', 'activity_date')} type="date" max={today()}
          value={form.date} onChange={set('date')} autoFocus={editing} />
      </Field>
      <Field id={p + 'distance'} label="Distance (km)" error={errors.distance_km}>
        <input {...attrs('distance', 'distance_km')} inputMode="decimal" placeholder="5.0"
          value={form.distance} onChange={set('distance')} />
      </Field>
      <Field id={p + 'duration'} label="Duration (mm:ss or h:mm:ss)" error={errors.duration_seconds}>
        <input {...attrs('duration', 'duration_seconds')} placeholder="32:15"
          value={form.duration} onChange={set('duration')} />
      </Field>
      <Field id={p + 'effort'} label="Effort, 1 to 10 (optional)" error={errors.effort}>
        <input {...attrs('effort', 'effort')} inputMode="numeric"
          value={form.effort} onChange={set('effort')} />
      </Field>
      <Field id={p + 'notes'} label="Notes (optional)" error={errors.notes}>
        <textarea {...attrs('notes', 'notes')} rows="3"
          value={form.notes} onChange={set('notes')} />
      </Field>
      <small>Pace is calculated automatically when you save.</small>
      {errors.session_id && <p className="error" role="alert">{errors.session_id}</p>}
      {formError && <p className="error" role="alert">{formError}</p>}
      <div className="form-actions">
        <button type="submit" disabled={busy}>
          {busy ? 'Saving...' : editing ? 'Save changes' : 'Save run'}
        </button>
        {editing && (
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}