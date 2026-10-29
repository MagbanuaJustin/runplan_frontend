import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { apiGet } from '../api.js'
import ActivityForm from '../components/ActivityForm.jsx'
import ActivityList from '../components/ActivityList.jsx'
import { TYPE_LABELS, formatLongDate } from '../format.js'

export default function Activities() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const sessionId = params.get('session')

  const [version, setVersion] = useState(0)
  const [session, setSession] = useState(null)
  const [state, setState] = useState(sessionId ? 'loading' : 'none')
  const [resolvedSessionId, setResolvedSessionId] = useState(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!sessionId) {
      setSession(null)
      setState('none')
      setResolvedSessionId(null)
      return
    }

    let cancelled = false

    setSession(null)
    setState('loading')
    setResolvedSessionId(null)

    apiGet('/plans/current')
      .then((body) => {
        if (cancelled) return

        const sessions = body.data?.active?.sessions
        const found = Array.isArray(sessions)
          ? sessions.find((item) => String(item.id) === sessionId)
          : null

        setResolvedSessionId(sessionId)

        if (found && found.status !== 'completed') {
          setSession(found)
          setState('ready')
        } else {
          setSession(null)
          setState('invalid')
        }
      })
      .catch(() => {
        if (cancelled) return
        setSession(null)
        setState('invalid')
        setResolvedSessionId(sessionId)
      })

    return () => {
      cancelled = true
    }
  }, [sessionId])

  const selectedSession =
    sessionId && session && String(session.id) === sessionId
      ? session
      : null

  if (sessionId && resolvedSessionId !== sessionId) {
    return <p role="status">Loading session...</p>
  }

  const today = new Date().toLocaleDateString('en-CA')
  const defaults = selectedSession
    ? {
        date: selectedSession.scheduled_date <= today
          ? selectedSession.scheduled_date
          : today,
        distance: String(selectedSession.planned_distance_km),
      }
    : null

  function handleSaved(row) {
    setVersion((current) => current + 1)

    if (selectedSession) {
      const workout = TYPE_LABELS[selectedSession.type] ?? 'workout'
      setNotice(
        `Run saved and linked to your ${workout} session on ${formatLongDate(selectedSession.scheduled_date)}.`,
      )
      navigate('/activities', { replace: true })
      return
    }

    setNotice(
      row?.activity_date
        ? `Run saved successfully for ${formatLongDate(row.activity_date)}.`
        : 'Run saved successfully.',
    )
  }

  return (
    <>
      <h1>Log a run</h1>

      <div className="split-workspace">
        <section className="plan-card" aria-labelledby="log-form-title">
          <div className="panel-head">
            <h2 id="log-form-title">Record manual workout</h2>
            {selectedSession && <span className="pill">Linked session</span>}
          </div>

          {notice && <p className="success" role="status">{notice}</p>}

          {state === 'invalid' && sessionId && (
            <p className="error" role="alert">
              That session cannot be logged — it may already be completed.{' '}
              <Link to="/calendar">Back to calendar</Link>
            </p>
          )}

          {selectedSession && (
            <div className="advisory-banner" role="status">
              Logging your <strong>{TYPE_LABELS[selectedSession.type]}</strong>{' '}
              planned for {formatLongDate(selectedSession.scheduled_date)} (
              {selectedSession.planned_distance_km} km).{' '}
              <Link to="/activities">Log an unlinked run instead</Link>
            </div>
          )}

          <ActivityForm
            key={selectedSession ? `s${selectedSession.id}` : 'free'}
            sessionId={selectedSession?.id ?? null}
            defaults={defaults}
            onSaved={handleSaved}
          />
        </section>

        <section className="plan-card" aria-labelledby="history-title">
          <div className="panel-head">
            <h2 id="history-title">Activity history</h2>
            <span className="pill pill-muted">Manual runs</span>
          </div>
          <ActivityList key={version} />
        </section>
      </div>
    </>
  )
}