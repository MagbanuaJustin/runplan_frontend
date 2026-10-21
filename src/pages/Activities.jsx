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
  const [state, setState] = useState(sessionId ? 'loading' : 'none') // none | loading | ready | invalid

  useEffect(() => {
    if (!sessionId) return
    apiGet('/plans/current')
      .then((body) => {
        const s = body.data.active?.sessions.find((x) => String(x.id) === sessionId)
        if (s && s.status !== 'completed') {
          setSession(s)
          setState('ready')
        } else {
          setState('invalid')
        }
      })
      .catch(() => setState('invalid'))
  }, [sessionId])

  if (state === 'loading') return <p role="status">Loading session...</p>

  const today = new Date().toLocaleDateString('en-CA')
  const defaults = session
    ? {
        date: session.scheduled_date <= today ? session.scheduled_date : today,
        distance: String(session.planned_distance_km),
      }
    : null

  return (
    <>
      <h1>Log a run</h1>

      {state === 'invalid' && (
        <p className="error" role="alert">
          That session cannot be logged. It may already be completed. <Link to="/calendar">Back to calendar</Link>
        </p>
      )}

      {session && (
        <p className="note" role="status">
          Logging your <strong>{TYPE_LABELS[session.type]}</strong> planned for{' '}
          {formatLongDate(session.scheduled_date)} ({session.planned_distance_km} km).{' '}
          <Link to="/activities">Log a different run instead</Link>
        </p>
      )}

      <ActivityForm
        key={session ? `s${session.id}` : 'free'}
        sessionId={session?.id ?? null}
        defaults={defaults}
        onSaved={() => (session ? navigate('/calendar') : setVersion((v) => v + 1))}
      />

      <h2>Your runs</h2>
      <ActivityList key={version} />
    </>
  )
}