import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../api.js'
import { formatDate } from '../format.js'

/**
 * Weather advisory UI (Phase 4 / spec 5.2).
 *
 * Two deliberate choices:
 *
 *   1. The component fetches its own data. Adding weather to a page is then a
 *      one-line change, and a weather outage can never break the page it sits
 *      on: every failure is caught here and rendered as a sentence.
 *   2. Everything is advisory. Nothing on this screen changes a workout; the
 *      buttons link to Calendar / Profile and the runner decides.
 */

const STATE_TONE = {
  ok: 'pill-ok',
  stale_cache: 'pill-warn',
  not_configured: 'pill-muted',
  no_location: 'pill-muted',
  unresolved_location: 'pill-warn',
  unavailable: 'pill-danger',
}

const STATE_LABEL = {
  ok: 'Live forecast',
  stale_cache: 'Last known forecast',
  not_configured: 'Weather off',
  no_location: 'No location set',
  unresolved_location: 'Location not found',
  unavailable: 'Weather unavailable',
}

/** Fetch the advisory forecast once per page. */
export function useWeather() {
  const [state, setState] = useState({ loading: true, data: null, error: '' })

  const reload = useCallback(() => {
    const today = new Date().toLocaleDateString('en-CA')
    setState((s) => ({ ...s, loading: true, error: '' }))
    apiGet(`/weather/forecast?today=${today}`)
      .then((body) => setState({ loading: false, data: body?.data ?? null, error: '' }))
      .catch((err) => setState({ loading: false, data: null, error: err.message || 'Weather is unavailable.' }))
  }, [])

  useEffect(() => { reload() }, [reload])

  // date -> day, so Calendar can look up exactly the day it is showing
  const byDate = {}
  for (const day of state.data?.days ?? []) byDate[day.date] = day

  return { ...state, byDate, reload }
}

/* ---------------------------------------------------------------------
   Presentation helpers. Icons are chosen from the condition text the API
   already returns; when the text is not recognised a neutral thermometer is
   shown, so no condition is ever invented.
--------------------------------------------------------------------- */

function Icon({ children, className = 'wx-icon' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

const CLOUD = 'M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 10.5a3.75 3.75 0 0 1-.25 7.5z'

const GLYPHS = {
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </>
  ),
  partly: (
    <>
      <path d="M8 5.2V3.5M3.6 7.6 2.4 6.4M2.5 12h1.7M13.2 6.6l1.2-1.2" />
      <path d="M6.2 13.2a3.2 3.2 0 0 1 5.4-3.3" />
      <path d="M9 20a3.6 3.6 0 0 1-.4-7.18A5 5 0 0 1 18.2 14a3 3 0 0 1-.2 6z" />
    </>
  ),
  cloud: <path d={CLOUD} />,
  rain: (
    <>
      <path d="M7 15a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 7.5 3.75 3.75 0 0 1 17.75 15" />
      <path d="M8 18l-1 2.5M12 18l-1 2.5M16 18l-1 2.5" />
    </>
  ),
  storm: (
    <>
      <path d="M7 15a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 7.5 3.75 3.75 0 0 1 17.75 15" />
      <path d="m12.5 12-2.5 4h3l-2 4.5" />
    </>
  ),
  snow: (
    <>
      <path d="M7 15a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 7.5 3.75 3.75 0 0 1 17.75 15" />
      <path d="M8 18.5h.01M12 20h.01M16 18.5h.01" />
    </>
  ),
  fog: (
    <>
      <path d="M7 13a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 5.5 3.75 3.75 0 0 1 17.75 13" />
      <path d="M4 17h16M7 20.5h10" />
    </>
  ),
  temp: (
    <>
      <path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z" />
      <path d="M12 9v7" />
    </>
  ),
  drop: <path d="M12 3s6 6.1 6 10.5a6 6 0 0 1-12 0C6 9.1 12 3 12 3z" />,
  wind: (
    <>
      <path d="M3 8h10a2.5 2.5 0 1 0-2.5-2.5" />
      <path d="M3 12h15a2.5 2.5 0 1 1-2.5 2.5" />
      <path d="M3 16h7a2 2 0 1 1-2 2" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  caution: (
    <>
      <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
}

function conditionKind(day) {
  const label = String(day.condition_label ?? '').toLowerCase()

  if (/thunder|storm/.test(label)) return 'storm'
  if (/rain|drizzle|shower/.test(label)) return 'rain'
  if (/snow|sleet|hail/.test(label)) return 'snow'
  if (/fog|mist|haze/.test(label)) return 'fog'
  if (/partly|mainly clear|mostly clear|few clouds/.test(label)) return 'partly'
  if (/cloud|overcast/.test(label)) return 'cloud'
  if (/clear|sun/.test(label)) return 'sun'
  return 'temp'
}

function advisoryKind(note) {
  const text = `${note.kind ?? ''} ${note.title ?? ''}`.toLowerCase()

  if (/rain|storm|wet|shower/.test(text)) return 'rain'
  if (/heat|warm|hot|temperature/.test(text)) return 'heat'
  if (/wind|gust/.test(text)) return 'wind'
  return 'general'
}

const ADVISORY_GLYPH = { rain: 'rain', heat: 'temp', wind: 'wind', general: 'caution' }

function Advisory({ note }) {
  const kind = advisoryKind(note)

  return (
    <p
      className={`weather-adv weather-adv-${kind}${note.level === 'caution' ? ' caution' : ''}`}
    >
      <Icon className="wx-icon wx-adv-icon">{GLYPHS[ADVISORY_GLYPH[kind]]}</Icon>
      <span>
        <strong>{note.title}.</strong> {note.detail}
      </span>
    </p>
  )
}

/** One forecast day: date, temperature, condition, and its worst advisory. */
export function WeatherDay({ day, compact = false }) {
  const worst = day.advisories?.[0]
  const tone = worst?.level === 'warning' ? ' is-warn' : worst?.level === 'caution' ? ' is-caution' : ''
  const kind = conditionKind(day)
  const rainy = day.rain_probability > 0

  return (
    <div className={`weather-day wx-${kind}${tone}`}>
      <div className="weather-day-top">
        <span className="weather-date">{formatDate(day.date)}</span>
        <Icon className="wx-icon weather-cond-icon">{GLYPHS[kind]}</Icon>
      </div>

      <div className="weather-temp">
        {day.temp_max_c === null ? '—' : `${Math.round(day.temp_max_c)}°`}
        {day.temp_min_c !== null && (
          <span className="weather-min"> / {Math.round(day.temp_min_c)}°</span>
        )}
      </div>

      <span className="weather-cond">{day.condition_label}</span>

      <div className="weather-facts">
        <span className={`weather-fact${rainy ? ' weather-fact-rain' : ''}`}>
          <Icon className="wx-icon wx-fact-icon">{GLYPHS.drop}</Icon>
          <span className="mono">
            {rainy ? `${day.rain_probability}% rain` : 'No rain'}
          </span>
        </span>

        {day.wind_max_kmh !== null && (
          <span className="weather-fact weather-fact-wind">
            <Icon className="wx-icon wx-fact-icon">{GLYPHS.wind}</Icon>
            <span className="mono">{Math.round(day.wind_max_kmh)} km/h</span>
          </span>
        )}
      </div>

      {!compact && worst && <Advisory note={worst} />}
    </div>
  )
}

/**
 * Calendar: notes for the one day the runner has selected.
 * Renders nothing when that date is outside the forecast horizon.
 */
export function WeatherDayNotes({ day }) {
  if (!day) return null

  return (
    <div className="weather-inline">
      <strong className="weather-inline-title">
        <Icon className="wx-icon wx-fact-icon">{GLYPHS[conditionKind(day)]}</Icon>
        Weather advisory
      </strong>
      <span className="mono weather-inline-summary">{day.summary}</span>
      {day.advisories?.length
        ? day.advisories.map((note) => <Advisory key={note.kind + note.level} note={note} />)
        : <span className="weather-meta"> · No heat, rain or wind concerns for this day.</span>}
    </div>
  )
}

function WeatherSkeleton() {
  return (
    <div className="weather-strip" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <span key={index} className="skeleton weather-skeleton-card" />
      ))}
    </div>
  )
}

/** Dashboard: the 5-day advisory strip, or a sentence explaining why there is none. */
export default function WeatherPanel() {
  const { loading, data, error } = useWeather()

  if (loading && !data) {
    return (
      <section className="plan-card weather-panel" aria-labelledby="weather-title" aria-busy="true">
        <div className="panel-head">
          <h2 id="weather-title">
            <Icon className="wx-icon wx-title-icon">{GLYPHS.partly}</Icon>
            Weather advisory
          </h2>
        </div>
        <p className="sr-only" role="status">Loading forecast…</p>
        <WeatherSkeleton />
      </section>
    )
  }

  if (error) {
    return (
      <section className="plan-card weather-panel" aria-labelledby="weather-title">
        <div className="panel-head">
          <h2 id="weather-title">
            <Icon className="wx-icon wx-title-icon">{GLYPHS.partly}</Icon>
            Weather advisory
          </h2>
          <span className="pill pill-warn">Unavailable</span>
        </div>
        <p className="note" style={{ margin: 0 }}>
          {error} Your schedule is unaffected — weather is advisory only.
        </p>
      </section>
    )
  }

  const status = data?.status ?? 'unavailable'
  const days = data?.days ?? []
  const hasDays = days.length > 0

  return (
    <section className="plan-card weather-panel" aria-labelledby="weather-title">
      <div className="panel-head">
        <h2 id="weather-title">
          <Icon className="wx-icon wx-title-icon">{GLYPHS.partly}</Icon>
          Weather advisory
        </h2>
        <span className={`pill weather-status ${STATE_TONE[status] ?? 'pill-muted'}`}>
          <span className={`pill-dot${status === 'ok' ? ' is-live' : ''}`} aria-hidden="true" />
          {STATE_LABEL[status] ?? 'Weather'}
        </span>
      </div>

      {data?.location?.label ? (
        <p className="weather-location">
          <Icon className="wx-icon wx-fact-icon">{GLYPHS.pin}</Icon>
          <span className="sr-only">Advisory conditions for </span>
          <strong>{data.location.label}</strong>
        </p>
      ) : null}

      <p className="note weather-note">
        Weather never changes your schedule; it only tells you what to expect.
      </p>

      {hasDays ? (
        <div className="weather-strip">
          {days.map((day) => <WeatherDay key={day.date} day={day} />)}
        </div>
      ) : (
        <p className="note" style={{ marginBottom: 0 }}>{data?.message}</p>
      )}

      <div className="btn-row" style={{ marginBottom: 0 }}>
        {status === 'no_location' || status === 'unresolved_location' ? (
          <Link className="btn btn-secondary" to="/profile">Set training location</Link>
        ) : (
          <Link className="btn btn-secondary" to="/calendar">Open calendar</Link>
        )}
        {status === 'stale_cache' && (
          <span className="weather-meta">Showing the last forecast we received.</span>
        )}
      </div>
    </section>
  )
}
