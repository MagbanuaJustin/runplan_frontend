import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet'
import { apiGet, apiDelete } from '../api.js'
import { formatDuration } from '../format.js'
import ActivityForm from './ActivityForm.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'
import { useToast } from './Toast.jsx'

const TYPE_LABELS = {
  easy: 'Easy Run',
  long: 'Long Run',
  tempo: 'Tempo Run',
  threshold: 'Threshold Run',
  interval: 'Interval Run',
  recovery: 'Recovery Run',
  race: 'Race',
}

const newestFirst = (a, b) =>
  b.activity_date.localeCompare(a.activity_date) || Number(b.id) - Number(a.id)

const sameId = (a, b) => String(a) === String(b)

function normalizeRoute(routeData) {
  let route = routeData

  if (typeof route === 'string') {
    try {
      route = JSON.parse(route)
    } catch {
      return []
    }
  }

  if (!route || !Array.isArray(route.segments)) return []

  return route.segments
    .filter(Array.isArray)
    .map((segment) =>
      segment
        .filter((point) =>
          point &&
          Number.isFinite(Number(point.latitude)) &&
          Number.isFinite(Number(point.longitude)) &&
          Math.abs(Number(point.latitude)) <= 90 &&
          Math.abs(Number(point.longitude)) <= 180,
        )
        .map((point) => [Number(point.latitude), Number(point.longitude)]),
    )
    .filter((segment) => segment.length > 0)
}

function FitRouteBounds({ positions }) {
  const map = useMap()

  useEffect(() => {
    if (!positions.length) return
    if (positions.length === 1) {
      map.setView(positions[0], 16)
      return
    }
    map.fitBounds(positions, { padding: [22, 22], maxZoom: 16 })
  }, [map, positions])

  return null
}

function RouteMap({ segments, className = '' }) {
  const allPositions = useMemo(() => segments.flat(), [segments])
  const start = segments.find((segment) => segment.length)?.[0]
  const end = [...segments].reverse().find((segment) => segment.length)?.slice(-1)[0]

  if (!allPositions.length) return null

  return (
    <div className={`activity-route-map ${className}`}>
      <MapContainer
        center={allPositions[0]}
        zoom={14}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        touchZoom={false}
        zoomControl={false}
        attributionControl
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {segments.map((segment, index) => (
          <Polyline
            key={index}
            positions={segment}
            pathOptions={{ color: '#3d8bff', weight: 5, opacity: 0.9, lineCap: 'round' }}
          />
        ))}
        {start && (
          <CircleMarker
            center={start}
            radius={7}
            pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#16a36a', fillOpacity: 1 }}
          />
        )}
        {end && (
          <CircleMarker
            center={end}
            radius={7}
            pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#e05252', fillOpacity: 1 }}
          />
        )}
        <FitRouteBounds positions={allPositions} />
      </MapContainer>
      <div className="activity-map-legend" aria-label="Map markers">
        <span><i className="activity-map-dot activity-map-start" /> Start</span>
        <span><i className="activity-map-dot activity-map-finish" /> Finish</span>
      </div>
    </div>
  )
}

function formatActivityDate(value) {
  if (!value) return 'Date not available'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function formatPace(value) {
  if (!value) return '--:--'
  return `${value} /km`
}

function ActivityStats({ activity, detailed = false }) {
  return (
    <div className={`activity-stat-grid${detailed ? ' is-detailed' : ''}`}>
      <div className="activity-stat">
        <span>Distance</span>
        <strong>{Number(activity.distance_km || 0).toFixed(2)} <small>km</small></strong>
      </div>
      <div className="activity-stat">
        <span>Duration</span>
        <strong>{formatDuration(activity.duration_seconds)}</strong>
      </div>
      <div className="activity-stat">
        <span>Avg. pace</span>
        <strong>{formatPace(activity.pace_label)}</strong>
      </div>
      <div className="activity-stat">
        <span>Effort</span>
        <strong>{activity.effort ? `${activity.effort}/10` : '—'}</strong>
      </div>
    </div>
  )
}

export default function ActivityList() {
  const [activities, setActivities] = useState([])
  const [state, setState] = useState('loading') // loading | ready | error
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const toast = useToast()

  useEffect(() => {
    const qs = new URLSearchParams()
    if (fromDate) qs.set('from', fromDate)
    if (toDate) qs.set('to', toDate)
    const suffix = qs.toString() ? `?${qs.toString()}` : ''

    setState('loading')
    apiGet(`/activities${suffix}`)
      .then((body) => {
        setActivities(Array.isArray(body.data) ? body.data : [])
        setState('ready')
      })
      .catch(() => setState('error'))
  }, [fromDate, toDate])

  function handleSaved(row) {
    const matchesDateRange =
      (!fromDate || row.activity_date >= fromDate) &&
      (!toDate || row.activity_date <= toDate)

    setActivities((list) => {
      const exists = list.some((activity) => sameId(activity.id, row.id))

      if (!matchesDateRange) {
        return list.filter((activity) => !sameId(activity.id, row.id))
      }

      const updated = exists
        ? list.map((activity) => (
            sameId(activity.id, row.id) ? row : activity
          ))
        : [...list, row]

      return updated.sort(newestFirst)
    })

    setEditingId(null)
    setDeleteError('')
  }

  async function confirmDelete() {
    if (!toDelete) return

    const deletedId = toDelete.id
    setBusy(true)
    setDeleteError('')

    try {
      await apiDelete(`/activities/${deletedId}`)
      setActivities((list) =>
        list.filter((activity) => !sameId(activity.id, deletedId)),
      )
      if (sameId(expandedId, deletedId)) setExpandedId(null)
      setToDelete(null)
      toast.success('Run deleted.')
    } catch (err) {
      setDeleteError(err.message)
      toast.error(err.message || 'Could not delete this run.')
    } finally {
      setBusy(false)
    }
  }

  const hasFilter = fromDate !== '' || toDate !== ''

  return (
    <>
      <div className="filter-bar" role="region" aria-label="Filter runs by date">
        <label className="field">
          <span>From</span>
          <input
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </label>

        <label className="field">
          <span>To</span>
          <input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(event) => setToDate(event.target.value)}
          />
        </label>

        {hasFilter && (
          <button
            type="button"
            className="card-action filter-clear"
            onClick={() => {
              setFromDate('')
              setToDate('')
            }}
          >
            Clear
          </button>
        )}
      </div>

      {state === 'loading' && <p role="status">Loading runs...</p>}
      {state === 'error' && <p role="alert">Could not load your runs.</p>}

      {state === 'ready' && activities.length === 0 && (
        <p>
          {hasFilter
            ? 'No runs match that date range.'
            : 'No runs logged yet.'}
        </p>
      )}

      {state === 'ready' && activities.length > 0 && (
        <>
          <p className="note activity-results-note">
            Showing {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
            {hasFilter ? ' in selected range' : ''}.
          </p>

          <ul className="runs activity-history-list">
            {activities.map((activity) => {
              const routeSegments = normalizeRoute(activity.route_data)
              const hasRoute = routeSegments.some((segment) => segment.length > 0)
              const isExpanded = sameId(expandedId, activity.id)

              if (sameId(activity.id, editingId)) {
                return (
                  <li key={activity.id} className="card card-edit">
                    <ActivityForm
                      activity={activity}
                      onSaved={handleSaved}
                      onCancel={() => setEditingId(null)}
                    />
                  </li>
                )
              }

              return (
                <li key={activity.id} className="activity-history-card">
                  <div className="activity-card-topline">
                    <div className="activity-card-date">
                      <span className="activity-date-icon" aria-hidden="true">◷</span>
                      <div>
                        <strong>{formatActivityDate(activity.activity_date)}</strong>
                        <small>Run #{activity.id}</small>
                      </div>
                    </div>
                    <div className="activity-card-tags">
                      <span className={`pill ${hasRoute ? 'pill-ok' : 'pill-muted'}`}>
                        {hasRoute ? 'GPS recorded' : 'Manual entry'}
                      </span>
                      {activity.workout_type && (
                        <span className="pill">
                          {TYPE_LABELS[activity.workout_type] || activity.workout_type}
                        </span>
                      )}
                    </div>
                  </div>

                  {hasRoute ? (
                    <RouteMap segments={routeSegments} />
                  ) : (
                    <div className="activity-no-route">
                      <div className="activity-no-route-icon" aria-hidden="true">⌁</div>
                      <div>
                        <strong>Route not available</strong>
                        <span>This activity was logged without GPS route data.</span>
                      </div>
                    </div>
                  )}

                  <ActivityStats activity={activity} />

                  {activity.notes && (
                    <p className="activity-card-notes">{activity.notes}</p>
                  )}

                  <div className="activity-card-footer">
                    <button
                      type="button"
                      className="activity-details-toggle"
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedId(isExpanded ? null : activity.id)}
                    >
                      {isExpanded ? 'Hide details' : 'View activity details'}
                      <span aria-hidden="true">{isExpanded ? '−' : '+'}</span>
                    </button>
                    <div className="activity-card-actions">
                      <button
                        type="button"
                        className="card-action"
                        onClick={() => {
                          setExpandedId(null)
                          setEditingId(activity.id)
                        }}
                        aria-label={`Edit run on ${activity.activity_date}`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="card-action"
                        onClick={() => {
                          setDeleteError('')
                          setToDelete(activity)
                        }}
                        aria-label={`Delete run on ${activity.activity_date}`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="activity-expanded-details">
                      {hasRoute && <RouteMap segments={routeSegments} className="activity-route-map-large" />}
                      <ActivityStats activity={activity} detailed />
                      <dl className="activity-detail-list">
                        <div>
                          <dt>Workout type</dt>
                          <dd>{activity.workout_type ? (TYPE_LABELS[activity.workout_type] || activity.workout_type) : 'Not specified'}</dd>
                        </div>
                        <div>
                          <dt>Activity source</dt>
                          <dd>{hasRoute ? 'GPS tracker' : 'Manual logging'}</dd>
                        </div>
                        <div>
                          <dt>Linked calendar session</dt>
                          <dd>{activity.session_id ? `Session #${activity.session_id}` : 'Not linked'}</dd>
                        </div>
                        <div>
                          <dt>Perceived effort</dt>
                          <dd>{activity.effort ? `${activity.effort}/10` : 'Not specified'}</dd>
                        </div>
                      </dl>
                      {activity.notes && (
                        <div className="activity-expanded-notes">
                          <span>Runner's notes</span>
                          <p>{activity.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        danger
        title="Delete this run?"
        message={
          toDelete
            ? `${toDelete.activity_date}, ${toDelete.distance_km} km. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!busy) {
            setToDelete(null)
            setDeleteError('')
          }
        }}
      />
    </>
  )
}
