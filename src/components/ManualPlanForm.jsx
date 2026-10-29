import { useState } from 'react'
import { apiPost } from '../api.js'

const emptySession = () => ({
  scheduled_date: '',
  type: 'easy',
  planned_distance_km: '',
  target_pace: '',
  planned_start_time: '',
  notes: '',
})

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

export default function ManualPlanForm({ onSaved }) {
  const [plan, setPlan] = useState({
    goal: '',
    start_date: '',
    end_date: '',
    sessions_per_week: '4',
  })
  const [sessions, setSessions] = useState([emptySession(), emptySession()])
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  function setPlanField(key, value) {
    setPlan((current) => ({ ...current, [key]: value }))
  }

  function setSessionField(index, key, value) {
    setSessions((current) =>
      current.map((session, sessionIndex) =>
        sessionIndex === index ? { ...session, [key]: value } : session,
      ),
    )
  }

  function addSession() {
    setSessions((current) => [...current, emptySession()])
  }

  function removeSession(index) {
    setSessions((current) => current.filter((_, sessionIndex) => sessionIndex !== index))
  }

  function fieldProps(id, errorKey) {
    const hasError = Boolean(errors[errorKey])

    return {
      id,
      'aria-invalid': hasError ? 'true' : undefined,
      'aria-describedby': hasError ? `${id}-error` : undefined,
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    setErrors({})

    if (sessions.length < 2) {
      setErrors({ sessions: 'Add at least two sessions to the plan.' })
      return
    }

    setBusy(true)

    try {
      const body = await apiPost('/plans/manual', {
        goal: plan.goal.trim(),
        start_date: plan.start_date,
        end_date: plan.end_date,
        sessions_per_week: Number(plan.sessions_per_week),
        sessions: sessions.map((session) => ({
          ...session,
          planned_distance_km: session.planned_distance_km.trim(),
          target_pace: session.target_pace.trim(),
          notes: session.notes.trim(),
        })),
      })

      onSaved?.(body.data)
    } catch (err) {
      if (err.fields) {
        setErrors(err.fields)
      } else {
        setFormError(err.message || 'Could not save the manual plan.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="plan-card">
        <h2>Manual plan details</h2>

        <Field id="manual-goal" label="Training goal" error={errors.goal}>
          <input
            {...fieldProps('manual-goal', 'goal')}
            value={plan.goal}
            onChange={(event) => setPlanField('goal', event.target.value)}
            placeholder="For example, Half marathon"
            maxLength={80}
          />
        </Field>

        <Field id="manual-start-date" label="Plan start date" error={errors.start_date}>
          <input
            {...fieldProps('manual-start-date', 'start_date')}
            type="date"
            value={plan.start_date}
            onChange={(event) => setPlanField('start_date', event.target.value)}
          />
        </Field>

        <Field id="manual-end-date" label="Plan end date" error={errors.end_date}>
          <input
            {...fieldProps('manual-end-date', 'end_date')}
            type="date"
            min={plan.start_date || undefined}
            value={plan.end_date}
            onChange={(event) => setPlanField('end_date', event.target.value)}
          />
        </Field>

        <Field
          id="manual-sessions-per-week"
          label="Maximum sessions per week"
          error={errors.sessions_per_week}
        >
          <select
            {...fieldProps('manual-sessions-per-week', 'sessions_per_week')}
            value={plan.sessions_per_week}
            onChange={(event) => setPlanField('sessions_per_week', event.target.value)}
          >
            {[2, 3, 4, 5, 6, 7].map((count) => (
              <option key={count} value={count}>
                {count} sessions
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="panel-head">
        <h2>Weekly schedule</h2>
      </div>

      <p className="note">
        Enter each workout date, distance, and target pace. Pace uses minutes and seconds per
        kilometer, such as 7:30.
      </p>

      <ol className="runs">
        {sessions.map((session, index) => {
          const prefix = `manual-session-${index}`
          const errorKey = (field) => `sessions.${index}.${field}`

          return (
            <li key={index} className="card card-edit">
              <div className="panel-head">
                <h3>Session {index + 1}</h3>
                <button
                  type="button"
                  className="card-action"
                  onClick={() => removeSession(index)}
                  aria-label={`Remove session ${index + 1}`}
                >
                  Remove
                </button>
              </div>

              <Field
                id={`${prefix}-date`}
                label="Date"
                error={errors[errorKey('scheduled_date')]}
              >
                <input
                  {...fieldProps(`${prefix}-date`, errorKey('scheduled_date'))}
                  type="date"
                  value={session.scheduled_date}
                  onChange={(event) =>
                    setSessionField(index, 'scheduled_date', event.target.value)
                  }
                />
              </Field>

              <Field
                id={`${prefix}-type`}
                label="Workout type"
                error={errors[errorKey('type')]}
              >
                <select
                  {...fieldProps(`${prefix}-type`, errorKey('type'))}
                  value={session.type}
                  onChange={(event) => setSessionField(index, 'type', event.target.value)}
                >
                  <option value="easy">Easy</option>
                  <option value="tempo">Tempo</option>
                  <option value="interval">Interval</option>
                  <option value="long">Long run</option>
                  <option value="race">Race</option>
                  <option value="recovery">Recovery</option>
                </select>
              </Field>

              <Field
                id={`${prefix}-distance`}
                label="Distance (km)"
                error={errors[errorKey('planned_distance_km')]}
              >
                <input
                  {...fieldProps(`${prefix}-distance`, errorKey('planned_distance_km'))}
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  value={session.planned_distance_km}
                  onChange={(event) =>
                    setSessionField(index, 'planned_distance_km', event.target.value)
                  }
                  placeholder="5"
                />
              </Field>

              <Field
                id={`${prefix}-pace`}
                label="Target pace (mm:ss per km)"
                error={errors[errorKey('target_pace')]}
              >
                <input
                  {...fieldProps(`${prefix}-pace`, errorKey('target_pace'))}
                  value={session.target_pace}
                  onChange={(event) =>
                    setSessionField(index, 'target_pace', event.target.value)
                  }
                  placeholder="7:30"
                />
              </Field>

              <Field
                id={`${prefix}-time`}
                label="Preferred start time (optional)"
                error={errors[errorKey('planned_start_time')]}
              >
                <input
                  {...fieldProps(`${prefix}-time`, errorKey('planned_start_time'))}
                  type="time"
                  value={session.planned_start_time}
                  onChange={(event) =>
                    setSessionField(index, 'planned_start_time', event.target.value)
                  }
                />
              </Field>

              <Field
                id={`${prefix}-notes`}
                label="Notes (optional)"
                error={errors[errorKey('notes')]}
              >
                <textarea
                  {...fieldProps(`${prefix}-notes`, errorKey('notes'))}
                  rows="2"
                  value={session.notes}
                  onChange={(event) => setSessionField(index, 'notes', event.target.value)}
                />
              </Field>
            </li>
          )
        })}
      </ol>

      <div className="btn-row">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={addSession}
        >
          Add session
        </button>
      </div>

      {errors.sessions && (
        <p className="error" role="alert">
          {errors.sessions}
        </p>
      )}

      {formError && (
        <p className="error" role="alert">
          {formError}
        </p>
      )}

      <div className="form-actions">
        <button type="submit" disabled={busy}>
          {busy ? 'Saving plan...' : 'Save manual plan'}
        </button>
        <small>The schedule will be saved as a draft for review.</small>
      </div>
    </form>
  )
}