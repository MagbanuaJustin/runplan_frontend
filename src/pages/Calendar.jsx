import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPatch } from '../api.js'
import { useWeather, WeatherDayNotes } from '../components/WeatherPanel.jsx'
import CalendarSyncCard from '../components/CalendarSyncCard.jsx'
import {
  STATUS_LABELS, TYPE_LABELS, TYPE_SHORT,
  formatDuration, formatLongDate, monthGrid, paceLabel,
} from '../format.js'
import PageLoading from '../components/PageLoading.jsx'
import { useToast, useToastOnChange } from '../components/Toast.jsx'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MARKS = { completed: '\u2713', skipped: '\u2715', missed: '!' }

const STATUS_PILL = {
  completed: 'pill-ok',
  skipped: 'pill-warn',
  missed: 'pill-danger',
  planned: '',
}

const monthOf = (iso) => {
  const [y, m] = iso.split('-').map(Number)
  return { y, m: m - 1 }
}

const monthIndex = ({ y, m }) => y * 12 + m

const monthTitle = ({ y, m }) =>
  new Date(Date.UTC(y, m, 1)).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

function formatStartTime(hhmmss) {
  if (!hhmmss) return 'Flexible'

  const [hStr, mStr] = hhmmss.split(':')
  const h = Number(hStr)
  const m = Number(mStr)

  if (Number.isNaN(h) || Number.isNaN(m)) return hhmmss

  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12

  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}


function CalendarGuidance() {
  return (
    <section className="calendar-guidance" aria-labelledby="calendar-guidance-title">
      <style>{`
        .calendar-guidance {
          position: relative;
          display: grid;
          grid-template-columns: 38px minmax(0, 1fr);
          gap: 14px;
          align-items: start;
          margin: 14px 0 18px;
          padding: 17px 19px;
          overflow: hidden;
          border: 1px solid rgba(96, 165, 250, .28);
          border-radius: 14px;
          background:
            radial-gradient(circle at 0% 0%, rgba(59, 130, 246, .16), transparent 42%),
            linear-gradient(135deg, rgba(25, 39, 61, .96), rgba(18, 26, 40, .96));
          box-shadow: 0 8px 28px rgba(0, 0, 0, .14), inset 0 1px 0 rgba(255,255,255,.035);
        }

        .calendar-guidance-icon {
          display: grid;
          place-items: center;
          width: 38px;
          height: 38px;
          border: 1px solid rgba(125, 175, 255, .32);
          border-radius: 11px;
          color: #a8ccff;
          background: rgba(96, 165, 250, .12);
          box-shadow: 0 0 20px rgba(59, 130, 246, .13);
          font-size: 19px;
          font-weight: 800;
        }

        .calendar-guidance h2 {
          margin: 0 0 6px;
          color: var(--text, #f3f6fb);
          font-size: 15px;
          line-height: 1.4;
        }

        .calendar-guidance p {
          margin: 0;
          color: var(--text-secondary, #aab6c8);
          font-size: 12px;
          line-height: 1.6;
        }

        .calendar-guidance-points {
          display: flex;
          flex-wrap: wrap;
          gap: 7px 16px;
          margin-top: 11px;
        }

        .calendar-guidance-points span {
          color: #c4d8f7;
          font-size: 11px;
          line-height: 1.5;
        }

        .calendar-guidance-points span::before {
          content: "✓";
          margin-right: 6px;
          color: #7db4ff;
          font-weight: 800;
        }

        .calendar-guidance-note {
          margin-top: 10px !important;
          color: #8fa4c2 !important;
          font-size: 11px !important;
        }

        @media (max-width: 600px) {
          .calendar-guidance {
            grid-template-columns: 1fr;
            gap: 10px;
            padding: 15px;
          }

          .calendar-guidance-icon {
            width: 34px;
            height: 34px;
          }
        }
      `}</style>

      <div className="calendar-guidance-icon" aria-hidden="true">
        i
      </div>

      <div>
        <h2 id="calendar-guidance-title">
          Your training plan is a guide — you are in control
        </h2>

        <p>
          Your workouts are recommendations generated from your runner profile
          and goals, not mandatory sessions. Review the schedule and make it fit
          your preferences, availability, experience, and recovery needs.
        </p>

        <div className="calendar-guidance-points">
          <span>
            Customize workout type, distance, duration, start time, and notes
            using Edit workout.
          </span>
          <span>Use Move date when another day works better.</span>
          <span>Skip a session when needed; you can return to your plan later.</span>
        </div>

        <p className="calendar-guidance-note">
          Listen to your body. Do not force a workout through pain, illness, or
          unusual fatigue. If you are unsure about a change, choose a comfortable
          option and consider guidance from a qualified running or healthcare
          professional.
        </p>
      </div>
    </section>
  )
}

export default function Calendar() {
  const [data, setData] = useState(null)
  const [runs, setRuns] = useState([])
  const [state, setState] = useState('loading')
  const [month, setMonth] = useState(null)
  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const toast = useToast()
  useToastOnChange(notice)

  const [moving, setMoving] = useState(false)
  const [moveDate, setMoveDate] = useState('')
  const [skipping, setSkipping] = useState(false)
  const [skipReason, setSkipReason] = useState('')

  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState(null)

  const today = new Date().toLocaleDateString('en-CA')
  const { byDate: weatherByDate } = useWeather()

  useEffect(() => {
    Promise.all([
      apiGet('/plans/current'),
      apiGet('/activities'),
    ])
      .then(([plans, acts]) => {
        const active = plans.data.active

        setData(active)
        setRuns(acts.data)

        if (active) {
          const { start_date, end_date } = active.plan

          const initial =
            today < start_date
              ? start_date
              : today > end_date
                ? end_date
                : today

          const first = active.sessions.find(
            (s) => s.scheduled_date >= initial
          )

          const pick = active.sessions.some(
            (s) => s.scheduled_date === initial
          )
            ? initial
            : first?.scheduled_date ?? initial

          setSelected(pick)
          setMonth(monthOf(pick))
        }

        setState('ready')
      })
      .catch(() => setState('error'))

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const byDate = useMemo(
    () => new Map(
      (data?.sessions ?? []).map((s) => [s.scheduled_date, s])
    ),
    [data],
  )

  const runBySession = useMemo(
    () => new Map(
      runs
        .filter((r) => r.session_id)
        .map((r) => [r.session_id, r])
    ),
    [runs],
  )

  function selectDay(date) {
    setSelected(date)
    setMoving(false)
    setSkipping(false)
    setEditing(false)
    setEditForm(null)
    setSkipReason('')
    setError('')
    setNotice('')
  }

  async function changeStatus(session, status, reasonText = null) {
    setBusy(true)
    setError('')
    setNotice('')

    try {
      const payload = status === 'skipped'
        ? {
            status,
            skip_reason: reasonText?.trim() || null,
          }
        : { status }

      const body = await apiPatch(
        `/sessions/${session.id}`,
        payload
      )

      setData((d) => ({
        ...d,
        sessions: d.sessions.map((s) =>
          s.id === session.id ? body.data : s
        ),
      }))

      setSkipping(false)
      setSkipReason('')

      setNotice(
        status === 'skipped'
          ? 'Run marked as skipped.'
          : 'Run restored to planned.'
      )
    } catch (err) {
      if (err.fields?.skip_reason) {
        setError(err.fields.skip_reason)
      } else {
        toast.error(err.message || 'Could not update this run.')
      }
    } finally {
      setBusy(false)
    }
  }

  function handleSkipSubmit(e, session) {
    e.preventDefault()
    changeStatus(session, 'skipped', skipReason)
  }

  async function submitMove(e, session) {
    e.preventDefault()

    if (!moveDate) {
      setError('Choose a new date for this run.')
      return
    }

    setBusy(true)
    setError('')
    setNotice('')

    try {
      const body = await apiPatch(
        `/sessions/${session.id}`,
        { scheduled_date: moveDate }
      )

      const updated = body.data

      setData((d) => ({
        ...d,
        sessions: d.sessions
          .map((s) =>
            s.id === session.id ? updated : s
          )
          .sort((a, b) =>
            a.scheduled_date.localeCompare(b.scheduled_date)
          ),
      }))

      setMoving(false)
      setSelected(updated.scheduled_date)
      setMonth(monthOf(updated.scheduled_date))

      setNotice(
        `Moved ${TYPE_LABELS[updated.type].toLowerCase()} to ${formatLongDate(updated.scheduled_date)}.`
      )
    } catch (err) {
      if (err.fields?.scheduled_date) {
        setError(err.fields.scheduled_date)
      } else {
        toast.error(err.message || 'Could not move this run.')
      }
    } finally {
      setBusy(false)
    }
  }

  function startEditing(session) {
    setEditing(true)
    setMoving(false)
    setSkipping(false)
    setError('')

    setEditForm({
      type: session.type,
      planned_distance_km: session.planned_distance_km ?? '',
      duration_minutes:
        session.planned_duration_seconds != null
          ? String(
              Math.round(session.planned_duration_seconds / 60)
            )
          : '',
      planned_start_time:
        session.planned_start_time?.slice(0, 5) ?? '',
      notes: session.notes ?? '',
    })
  }

  async function submitEdit(e, session) {
    e.preventDefault()

    if (!editForm) return

    const distance = Number(editForm.planned_distance_km)
    const durationMinutes = Number(editForm.duration_minutes)

    if (
      !Number.isFinite(distance) ||
      distance < 0.1 ||
      distance > 100
    ) {
      setError('Distance must be between 0.1 and 100 km.')
      return
    }

    if (
      !Number.isFinite(durationMinutes) ||
      durationMinutes < 1 ||
      durationMinutes > 1440
    ) {
      setError('Duration must be between 1 and 1440 minutes.')
      return
    }

    if (editForm.notes.length > 1000) {
      setError('Workout notes cannot exceed 1,000 characters.')
      return
    }

    setBusy(true)
    setError('')
    setNotice('')

    try {
      const payload = {
        planned_distance_km: distance,
        planned_duration_seconds: Math.round(
          durationMinutes * 60
        ),
        planned_start_time:
          editForm.planned_start_time || null,
        notes: editForm.notes.trim(),
      }

      if (editForm.type !== 'recovery') {
        payload.type = editForm.type
      }

      const body = await apiPatch(
        `/sessions/${session.id}`,
        payload
      )

      const updated = body.data

      setData((d) => ({
        ...d,
        sessions: d.sessions.map((s) =>
          s.id === session.id ? updated : s
        ),
      }))

      setEditing(false)
      setEditForm(null)
      setNotice('Workout updated successfully.')
    } catch (err) {
      if (err.fields?.workout) {
        setError(err.fields.workout)
      } else {
        toast.error(
          err.message || 'Could not update this workout.'
        )
      }
    } finally {
      setBusy(false)
    }
  }

  if (state === 'loading') {
    return <PageLoading label="Loading calendar…" />
  }

  if (state === 'error') {
    return <p role="alert">Could not load your calendar.</p>
  }

  if (!data) {
    return (
      <>
        <h1>Calendar</h1>

        <CalendarGuidance />

        <CalendarSyncCard />

        <section className="plan-card">
          <h2>No active training plan</h2>

          <p className="note">
            Generate and approve a plan first to view and
            reschedule workouts on your calendar.
          </p>

          <div className="btn-row">
            <Link className="btn btn-primary" to="/plan">
              Create your plan
            </Link>
          </div>
        </section>
      </>
    )
  }

  const { start_date, end_date } = data.plan
  const cells = monthGrid(month.y, month.m)
  const weekRows = Array.from(
    { length: Math.ceil(cells.length / 7) },
    (_, index) => cells.slice(index * 7, index * 7 + 7)
  )
  const session = byDate.get(selected)
  const run = session
    ? runBySession.get(session.id)
    : null

  const canMove =
    session &&
    session.status !== 'completed' &&
    session.type !== 'race'

  const canEdit =
    session &&
    session.status !== 'completed' &&
    session.type !== 'race'

  function goToday() {
    const day =
      today < start_date
        ? start_date
        : today > end_date
          ? end_date
          : today

    selectDay(day)
    setMonth(monthOf(day))
  }

  const shift = (delta) => {
    const i = monthIndex(month) + delta

    setMonth({
      y: Math.floor(i / 12),
      m: i % 12,
    })
  }

  return (
    <>
      <h1>Calendar</h1>

      <CalendarGuidance />

      <CalendarSyncCard />

      <section className="runplan-calendar-board" aria-label="Monthly training calendar">
        <style>{`
          .runplan-calendar-board {
            margin-top: 18px;
            padding: 18px;
            border: 1px solid var(--border, #303b4b);
            border-radius: 16px;
            background: var(--surface, #111923);
            box-shadow: 0 12px 32px rgba(0, 0, 0, .12);
            min-width: 0;
          }

          .runplan-calendar-board .cal-nav {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 20px;
          }

          .runplan-calendar-board .cal-nav h2 {
            margin: 0 8px;
            min-width: 150px;
            font-size: 21px;
            font-weight: 750;
          }

          .runplan-calendar-board .cal-nav .cal-today {
            margin-left: auto;
          }

          .runplan-calendar-grid {
            display: grid;
            grid-template-columns: repeat(7, minmax(0, 1fr)) minmax(112px, .72fr);
            gap: 4px;
            min-width: 0;
          }

          .runplan-calendar-weekday {
            min-height: 38px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-secondary, #91a0b5);
            font-size: 13px;
            font-weight: 700;
            letter-spacing: .02em;
          }

          .runplan-calendar-weekday.total {
            color: var(--accent-bright, #78aaff);
          }

          .runplan-calendar-day {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: stretch;
            justify-content: flex-start;
            gap: 10px;
            min-width: 0;
            min-height: 112px;
            padding: 10px;
            border: 1px solid var(--border, #303b4b);
            border-radius: 7px;
            background: var(--bg, #080d14);
            color: var(--text, #f3f6fb);
            text-align: left;
            cursor: pointer;
            transition: border-color .16s ease, background .16s ease, transform .16s ease;
          }

          .runplan-calendar-day:hover {
            border-color: var(--accent, #4f8cff);
            background: var(--surface-2, #1b2635);
            transform: translateY(-1px);
          }

          .runplan-calendar-day[aria-pressed="true"] {
            border: 1px solid var(--accent-bright, #78aaff);
            box-shadow: inset 0 0 0 1px var(--accent-bright, #78aaff), 0 0 0 2px rgba(79, 140, 255, .10);
            background: var(--surface-2, #1b2635);
          }

          .runplan-calendar-day.outside-month {
            opacity: .42;
            background: var(--surface-2, #1b2635);
          }

          .runplan-calendar-day.today .runplan-calendar-date {
            color: var(--accent-bright, #78aaff);
            font-weight: 850;
          }

          .runplan-calendar-date {
            align-self: flex-end;
            color: var(--text-secondary, #aab6c8);
            font-size: 12px;
            font-weight: 700;
          }

          .runplan-calendar-session {
            display: block;
            width: 100%;
            padding: 7px 8px;
            border-radius: 6px;
            background: rgba(79, 140, 255, .13);
            border-left: 3px solid var(--accent-bright, #78aaff);
            color: var(--text, #e8eef8);
            font-size: 11px;
            line-height: 1.45;
            overflow-wrap: anywhere;
          }

          .runplan-calendar-session.status-completed {
            border-left-color: #34c995;
            background: rgba(52, 201, 149, .12);
          }

          .runplan-calendar-session.status-skipped {
            border-left-color: #e5a642;
            background: rgba(229, 166, 66, .12);
          }

          .runplan-calendar-session.status-missed {
            border-left-color: #ef6b75;
            background: rgba(239, 107, 117, .12);
          }

          .runplan-calendar-rest {
            color: var(--text-muted, #738198);
            font-size: 11px;
          }

          .runplan-calendar-week-total {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 8px;
            min-width: 0;
            min-height: 112px;
            padding: 10px;
            border: 1px solid var(--border, #303b4b);
            border-radius: 7px;
            background: var(--surface-2, #1b2635);
          }

          .runplan-calendar-week-total strong {
            font-size: 12px;
            color: var(--text, #f3f6fb);
          }

          .runplan-calendar-week-total span {
            color: var(--text-secondary, #aab6c8);
            font-size: 11px;
            line-height: 1.5;
          }

          .runplan-calendar-legend {
            display: flex;
            flex-wrap: wrap;
            gap: 8px 18px;
            margin: 16px 0 0;
            color: var(--text-secondary, #aab6c8);
            font-size: 12px;
          }

          .runplan-calendar-legend strong {
            color: var(--text, #f3f6fb);
          }

          .split-workspace {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 18px;
            margin-top: 18px;
          }

          @media (max-width: 900px) {
            .runplan-calendar-board {
              padding: 12px;
              overflow-x: auto;
            }

            .runplan-calendar-grid {
              min-width: 760px;
              grid-template-columns: repeat(7, minmax(76px, 1fr)) minmax(104px, .72fr);
            }

            .runplan-calendar-day,
            .runplan-calendar-week-total {
              min-height: 96px;
              padding: 8px;
            }
          }
        `}</style>

        <div className="cal-nav">
          <button
            type="button"
            className="cal-btn"
            aria-label="Previous month"
            disabled={
              monthIndex(month) <=
              monthIndex(monthOf(start_date))
            }
            onClick={() => shift(-1)}
          >
            &lsaquo;
          </button>

          <h2 aria-live="polite">
            {monthTitle(month)}
          </h2>

          <button
            type="button"
            className="cal-btn"
            aria-label="Next month"
            disabled={
              monthIndex(month) >=
              monthIndex(monthOf(end_date))
            }
            onClick={() => shift(1)}
          >
            &rsaquo;
          </button>

          <button
            type="button"
            className="cal-btn cal-today"
            onClick={goToday}
          >
            Today
          </button>
        </div>

        <div className="runplan-calendar-grid">
          {WEEKDAYS.map((day) => (
            <div className="runplan-calendar-weekday" key={day}>
              {day}
            </div>
          ))}
          <div className="runplan-calendar-weekday total">Week total</div>

          {weekRows.map((week, weekIndex) => {
            const weekSessions = week
              .filter(Boolean)
              .map((date) => byDate.get(date))
              .filter(Boolean)
            const weekDistance = weekSessions.reduce(
              (total, item) => total + Number(item.planned_distance_km || 0),
              0
            )

            return (
              <div className="runplan-calendar-week-fragment" key={`week-${weekIndex}`} style={{ display: "contents" }}>
                {week.map((date, dayIndex) => {
                  if (!date) {
                    return (
                      <div
                        key={`empty-${weekIndex}-${dayIndex}`}
                        className="runplan-calendar-day outside-month"
                        aria-hidden="true"
                      />
                    )
                  }

                  const daySession = byDate.get(date)
                  const isOutsideMonth = date.slice(0, 7) !==
                    `${month.y}-${String(month.m + 1).padStart(2, '0')}`

                  const label = daySession
                    ? `${formatLongDate(date)}: ${TYPE_LABELS[daySession.type]}, ${daySession.planned_distance_km} km, ${STATUS_LABELS[daySession.status]}`
                    : `${formatLongDate(date)}: rest day`

                  return (
                    <button
                      key={date}
                      type="button"
                      className={`runplan-calendar-day status-${daySession?.status ?? 'none'}${date === today ? ' today' : ''}${isOutsideMonth ? ' outside-month' : ''}`}
                      aria-pressed={date === selected}
                      aria-current={date === today ? 'date' : undefined}
                      aria-label={label}
                      onClick={() => selectDay(date)}
                    >
                      <span className="runplan-calendar-date">
                        {Number(date.slice(8))}
                      </span>

                      {daySession ? (
                        <span className={`runplan-calendar-session status-${daySession.status}`}>
                          <strong>{TYPE_SHORT[daySession.type]}</strong>
                          {' · '}
                          {daySession.planned_distance_km} km
                          {MARKS[daySession.status]
                            ? ` ${MARKS[daySession.status]}`
                            : ''}
                        </span>
                      ) : (
                        <span className="runplan-calendar-rest">Rest day</span>
                      )}
                    </button>
                  )
                })}

                <div className="runplan-calendar-week-total" aria-label={`Week ${weekIndex + 1} summary`}>
                  <strong>Week {weekIndex + 1}</strong>
                  <span>{weekSessions.length} {weekSessions.length === 1 ? 'workout' : 'workouts'}</span>
                  <strong>{Math.round(weekDistance * 10) / 10} km</strong>
                </div>
              </div>
            )
          })}
        </div>

        <div className="runplan-calendar-legend">
          <span><strong>E</strong> Easy</span>
          <span><strong>L</strong> Long</span>
          <span><strong>T</strong> Tempo</span>
          <span><strong>I</strong> Intervals</span>
          <span><strong>TH</strong> Threshold</span>
          <span><strong>RACE</strong> Race day</span>
          <span><strong>✓</strong> Completed</span>
          <span><strong>✕</strong> Skipped</span>
          <span><strong>!</strong> Missed</span>
        </div>
      </section>

      <div className="split-workspace">
        {/* SELECTED WORKOUT DETAILS */}

        <section
          className="plan-card"
          aria-labelledby="day-title"
          aria-live="polite"
        >
          <div className="panel-head">
            <h2 id="day-title">
              {formatLongDate(selected)}
            </h2>

            {session && (
              <span
                className={`pill ${STATUS_PILL[session.status] ?? ''}`}
              >
                {STATUS_LABELS[session.status]}
              </span>
            )}
          </div>

          {!session ? (
            <p className="note">
              Rest day — no scheduled workout on this date.
            </p>
          ) : (
            <>
              <p
                style={{
                  margin: '0 0 12px',
                  fontWeight: 600,
                  fontSize: 15,
                }}
              >
                {TYPE_LABELS[session.type]}
              </p>

              <dl className="stats">
                <div>
                  <dt>Planned Distance</dt>
                  <dd>{session.planned_distance_km} km</dd>
                </div>

                <div>
                  <dt>Estimated Time</dt>
                  <dd>
                    {formatDuration(
                      session.planned_duration_seconds
                    )}
                  </dd>
                </div>

                <div>
                  <dt>Target Pace</dt>
                  <dd>
                    {paceLabel(
                      session.planned_duration_seconds,
                      session.planned_distance_km
                    )}
                  </dd>
                </div>

                <div>
                  <dt>Planned Start</dt>
                  <dd>
                    {formatStartTime(
                      session.planned_start_time
                    )}
                  </dd>
                </div>
              </dl>

              <WeatherDayNotes
                day={weatherByDate[selected]}
              />

              {session.notes && (
                <p className="note">{session.notes}</p>
              )}

              {session.status === 'skipped' &&
                session.skip_reason && (
                  <p
                    className="note"
                    style={{ marginTop: 0 }}
                  >
                    <strong>Skip reason:</strong>{' '}
                    {session.skip_reason}
                  </p>
                )}

              {run && (
                <div
                  className="success"
                  role="status"
                  style={{ marginBottom: 0 }}
                >
                  <strong>Logged run:</strong>{' '}

                  <span className="mono">
                    {run.distance_km} km in{' '}
                    {formatDuration(run.duration_seconds)} (
                    {run.pace_label} /km)
                  </span>

                  {run.effort
                    ? ` · Effort ${run.effort}/10`
                    : ''}
                </div>
              )}

              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}

              {/* WORKOUT ACTIONS */}

              {session.status !== 'completed' && (
                <div
                  className="btn-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: '10px',
                    width: '100%',
                  }}
                >
                  <Link
                    className="btn btn-primary"
                    to={`/run?session=${session.id}`}
                  >
                    Start a run
                  </Link>

                  <Link
                    className="btn btn-secondary"
                    to={`/activities?session=${session.id}`}
                  >
                    Log manually
                  </Link>

                  {canEdit && !editing && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={busy}
                      onClick={() => startEditing(session)}
                    >
                      Edit workout
                    </button>
                  )}

                  {canMove && !moving && !editing && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={busy}
                      onClick={() => {
                        setMoving(true)
                        setSkipping(false)
                        setMoveDate(session.scheduled_date)
                        setError('')
                      }}
                    >
                      Move date
                    </button>
                  )}

                  {!editing &&
                    (session.status === 'skipped' ? (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={busy}
                        onClick={() =>
                          changeStatus(session, 'planned')
                        }
                      >
                        Undo skip
                      </button>
                    ) : (
                      !skipping && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={busy}
                          onClick={() => {
                            setSkipping(true)
                            setMoving(false)
                            setSkipReason('')
                            setError('')
                          }}
                        >
                          {session.status === 'missed'
                            ? 'Mark as skipped'
                            : 'Skip run'}
                        </button>
                      )
                    ))}
                </div>
              )}

              {/* EDIT WORKOUT FORM */}

              {editing && canEdit && editForm && (
                <form
                  className="inline-reschedule"
                  onSubmit={(e) => submitEdit(e, session)}
                >
                  <style>{`
                    .workout-edit-select-wrap {
                      position: relative;
                    }

                    .workout-edit-select {
                      appearance: none;
                      width: 100%;
                      min-height: 46px;
                      padding: 11px 42px 11px 13px;
                      border: 1px solid var(--border, #3a4658);
                      border-radius: 10px;
                      background: var(--surface-2, #202938);
                      color: var(--text, #f3f6fb);
                      font: inherit;
                      font-weight: 600;
                      cursor: pointer;
                      transition: border-color .18s, box-shadow .18s;
                    }

                    .workout-edit-select:focus {
                      outline: none;
                      border-color: var(--accent, #4f8cff);
                      box-shadow: 0 0 0 3px rgba(79,140,255,.18);
                    }

                    .workout-edit-select-wrap::after {
                      content: '';
                      position: absolute;
                      right: 16px;
                      top: 50%;
                      width: 8px;
                      height: 8px;
                      border-right: 2px solid currentColor;
                      border-bottom: 2px solid currentColor;
                      transform: translateY(-70%) rotate(45deg);
                      pointer-events: none;
                      opacity: .8;
                    }

                    .workout-edit-select option {
                      background: #202938;
                      color: #f3f6fb;
                    }

                    .workout-notes-wrap {
                      padding: 12px;
                      border: 1px solid var(--border, #3a4658);
                      border-radius: 12px;
                      background: var(--surface-2, #202938);
                    }

                    .workout-notes-textarea {
                      display: block;
                      width: 100%;
                      min-height: 112px;
                      padding: 12px;
                      border: 1px solid var(--border, #3a4658);
                      border-radius: 9px;
                      background: var(--surface, #151c27);
                      color: var(--text, #f3f6fb);
                      font: inherit;
                      line-height: 1.5;
                      resize: vertical;
                      box-sizing: border-box;
                      transition: border-color .18s, box-shadow .18s;
                    }

                    .workout-notes-textarea:focus {
                      outline: none;
                      border-color: var(--accent, #4f8cff);
                      box-shadow: 0 0 0 3px rgba(79,140,255,.18);
                    }

                    .workout-notes-meta {
                      display: flex;
                      justify-content: space-between;
                      gap: 12px;
                      margin-top: 8px;
                      color: var(--muted, #9aa8ba);
                      font-size: 12px;
                    }
                  `}</style>

                  <label
                    className="field"
                    htmlFor="edit-workout-type"
                  >
                    <span>Workout type</span>

                    <div className="workout-edit-select-wrap">
                      <select
                        className="workout-edit-select"
                        id="edit-workout-type"
                        value={editForm.type}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            type: e.target.value,
                          }))
                        }
                      >
                        {editForm.type === 'recovery' && (
                          <option value="recovery" disabled>
                            Recovery run (existing type)
                          </option>
                        )}

                        <option value="easy">Easy run</option>
                        <option value="long">Long run</option>
                        <option value="tempo">Tempo run</option>
                        <option value="threshold">Threshold run</option>
                        <option value="interval">Interval training</option>
                      </select>
                    </div>
                  </label>

                  <label
                    className="field"
                    htmlFor="edit-workout-distance"
                  >
                    <span>Distance (km)</span>

                    <input
                      id="edit-workout-distance"
                      type="number"
                      min="0.1"
                      max="100"
                      step="0.1"
                      required
                      value={editForm.planned_distance_km}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          planned_distance_km: e.target.value,
                        }))
                      }
                    />
                  </label>

                  <label
                    className="field"
                    htmlFor="edit-workout-duration"
                  >
                    <span>Estimated duration (minutes)</span>

                    <input
                      id="edit-workout-duration"
                      type="number"
                      min="1"
                      max="1440"
                      step="1"
                      required
                      value={editForm.duration_minutes}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          duration_minutes: e.target.value,
                        }))
                      }
                    />
                  </label>

                  <label
                    className="field"
                    htmlFor="edit-workout-time"
                  >
                    <span>Planned start time (optional)</span>

                    <input
                      id="edit-workout-time"
                      type="time"
                      value={editForm.planned_start_time}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          planned_start_time: e.target.value,
                        }))
                      }
                    />
                  </label>

                  <label
                    className="field"
                    htmlFor="edit-workout-notes"
                  >
                    <span>
                      Workout notes{' '}
                      <span
                        style={{
                          color: 'var(--muted, #9aa8ba)',
                          fontWeight: 400,
                        }}
                      >
                        (optional)
                      </span>
                    </span>

                    <div className="workout-notes-wrap">
                      <textarea
                        className="workout-notes-textarea"
                        id="edit-workout-notes"
                        rows={4}
                        maxLength={1000}
                        placeholder="Add guidance for this workout — pace, intervals, recovery, or reminders..."
                        value={editForm.notes}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            notes: e.target.value,
                          }))
                        }
                      />

                      <div className="workout-notes-meta">
                        <span>
                          Keep notes clear and useful for your run.
                        </span>

                        <span>
                          {editForm.notes.length}/1000
                        </span>
                      </div>
                    </div>
                  </label>

                  <div className="btn-row">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={busy}
                    >
                      {busy ? 'Saving...' : 'Save workout'}
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={busy}
                      onClick={() => {
                        setEditing(false)
                        setEditForm(null)
                        setError('')
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* SKIP WORKOUT FORM */}

              {!editing &&
                skipping &&
                session.status !== 'completed' &&
                session.status !== 'skipped' && (
                  <form
                    className="inline-reschedule"
                    onSubmit={(e) =>
                      handleSkipSubmit(e, session)
                    }
                  >
                    <label
                      className="field"
                      htmlFor="skip-reason"
                    >
                      <span>
                        Reason for skipping this workout (optional)
                      </span>

                      <input
                        id="skip-reason"
                        type="text"
                        maxLength={255}
                        placeholder="e.g., Sore calf, work shift, heavy rain"
                        value={skipReason}
                        onChange={(e) =>
                          setSkipReason(e.target.value)
                        }
                      />
                    </label>

                    <div className="btn-row">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={busy}
                      >
                        {busy ? 'Saving...' : 'Confirm skip'}
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={busy}
                        onClick={() => {
                          setSkipping(false)
                          setSkipReason('')
                          setError('')
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

              {/* MOVE WORKOUT FORM */}

              {!editing && canMove && moving && (
                <form
                  className="inline-reschedule"
                  onSubmit={(e) => submitMove(e, session)}
                >
                  <label
                    className="field"
                    htmlFor="move-date"
                  >
                    <span>
                      Move workout to an open date ({start_date} to {end_date})
                    </span>

                    <input
                      id="move-date"
                      type="date"
                      min={start_date}
                      max={end_date}
                      value={moveDate}
                      onChange={(e) =>
                        setMoveDate(e.target.value)
                      }
                    />
                  </label>

                  <div className="btn-row">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={busy}
                    >
                      {busy ? 'Moving...' : 'Save new date'}
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={busy}
                      onClick={() => {
                        setMoving(false)
                        setError('')
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </section>
      </div>
    </>
  )
}