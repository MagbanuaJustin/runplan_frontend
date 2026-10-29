import { useState } from 'react'
import { apiPost, apiPut } from '../api.js'
import { formatDuration } from '../format.js'

const today = () => {
  const now = new Date()
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 10)
}

function parseDuration(text) {
  const parts = text.trim().split(':')

  if (
    parts.length < 2 ||
    parts.length > 3 ||
    parts.some((part) => !/^\d{1,2}$/.test(part))
  ) {
    return null
  }

  const nums = parts.map(Number)
  const [hours, minutes, seconds] = nums.length === 3 ? nums : [0, ...nums]

  if (minutes > 59 || seconds > 59) return null

  return hours * 3600 + minutes * 60 + seconds
}

function formatPace(durationSeconds, distanceKm) {
  const distance = Number(distanceKm)

  if (
    durationSeconds === null ||
    durationSeconds <= 0 ||
    !Number.isFinite(distance) ||
    distance <= 0
  ) {
    return null
  }

  const paceSeconds = Math.round(durationSeconds / distance)
  if (paceSeconds <= 0) return null

  const minutes = Math.floor(paceSeconds / 60)
  const seconds = paceSeconds % 60

  return `${minutes}:${String(seconds).padStart(2, '0')} min/km`
}

function Field({ id, label, error, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error && (
        <p id={`${id}-error`} className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export default function ActivityForm({
  activity = null,
  sessionId = null,
  defaults = null,
  onSaved,
  onCancel,
}) {
  const editing = activity !== null
  const prefix = editing ? `edit-${activity.id}-` : 'new-'

  const [form, setForm] = useState(
    editing
      ? {
          date: activity.activity_date,
          distance: String(activity.distance_km),
          duration: formatDuration(activity.duration_seconds),
          effort: activity.effort ?? '',
          notes: activity.notes ?? '',
        }
      : {
          date: defaults?.date ?? today(),
          distance: defaults?.distance ?? '',
          duration: '',
          effort: '',
          notes: '',
        },
  )

  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (key) => (event) => {
    const value = event.target.value

    setForm((current) => ({ ...current, [key]: value }))
    setFormError('')

    const errorKey = {
      date: 'activity_date',
      distance: 'distance_km',
      duration: 'duration_seconds',
      effort: 'effort',
      notes: 'notes',
    }[key]

    if (errorKey) {
      setErrors((current) => {
        const next = { ...current }
        delete next[errorKey]
        return next
      })
    }
  }

  const attrs = (id, key) => ({
    id: prefix + id,
    'aria-invalid': errors[key] ? 'true' : undefined,
    'aria-describedby': errors[key] ? `${prefix}${id}-error` : undefined,
  })

  const durationSeconds = parseDuration(form.duration)
  const pace = formatPace(durationSeconds, form.distance)

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    const nextErrors = {}
    const currentDate = today()
    const distance = Number(form.distance.trim())
    const seconds = parseDuration(form.duration)
    const effortText = String(form.effort).trim()
    const effort = Number(effortText)

    if (!form.date) {
      nextErrors.activity_date = 'Choose the date of your run.'
    } else if (form.date > currentDate) {
      nextErrors.activity_date = 'The run date cannot be in the future.'
    }

    if (
      !form.distance.trim() ||
      !Number.isFinite(distance) ||
      distance <= 0
    ) {
      nextErrors.distance_km = 'Enter a distance greater than zero.'
    }

    if (seconds === null || seconds <= 0) {
      nextErrors.duration_seconds =
        'Use mm:ss or h:mm:ss, for example 32:15 or 1:05:30.'
    }

    if (
      effortText !== '' &&
      (!Number.isInteger(effort) || effort < 1 || effort > 10)
    ) {
      nextErrors.effort = 'Enter a whole number from 1 to 10.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
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

      if (!editing) {
        setForm((current) => ({
          ...current,
          distance: '',
          duration: '',
          effort: '',
          notes: '',
        }))
      }

      onSaved(body.data)
    } catch (err) {
      if (err.fields) {
        setErrors(err.fields)
      } else {
        setFormError(err.message)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <Field
        id={`${prefix}date`}
        label="Date"
        error={errors.activity_date}
      >
        <input
          {...attrs('date', 'activity_date')}
          type="date"
          max={today()}
          value={form.date}
          onChange={set('date')}
          autoFocus={editing}
        />
      </Field>

      <Field
        id={`${prefix}distance`}
        label="Distance (km)"
        error={errors.distance_km}
      >
        <input
          {...attrs('distance', 'distance_km')}
          inputMode="decimal"
          placeholder="5.0"
          value={form.distance}
          onChange={set('distance')}
        />
      </Field>

      <Field
        id={`${prefix}duration`}
        label="Duration (mm:ss or h:mm:ss)"
        error={errors.duration_seconds}
      >
        <input
          {...attrs('duration', 'duration_seconds')}
          placeholder="32:15"
          value={form.duration}
          onChange={set('duration')}
        />
      </Field>

      {pace && (
        <p className="note" aria-live="polite">
          Estimated pace: <strong>{pace}</strong>
        </p>
      )}

      <Field
        id={`${prefix}effort`}
        label="Effort, 1 to 10 (optional)"
        error={errors.effort}
      >
        <input
          {...attrs('effort', 'effort')}
          inputMode="numeric"
          value={form.effort}
          onChange={set('effort')}
        />
      </Field>

      <Field
        id={`${prefix}notes`}
        label="Notes (optional)"
        error={errors.notes}
      >
        <textarea
          {...attrs('notes', 'notes')}
          rows="3"
          value={form.notes}
          onChange={set('notes')}
        />
      </Field>

      <small>Pace is estimated as you enter the run and saved automatically.</small>

      {errors.session_id && (
        <p className="error" role="alert">{errors.session_id}</p>
      )}

      {formError && (
        <p className="error" role="alert">{formError}</p>
      )}

      <div className="form-actions">
        <button type="submit" disabled={busy}>
          {busy ? 'Saving...' : editing ? 'Save changes' : 'Save run'}
        </button>

        {editing && (
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}