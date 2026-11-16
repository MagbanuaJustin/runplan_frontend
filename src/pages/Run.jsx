import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { apiGet, apiPost } from '../api.js'
import { TYPE_LABELS, formatLongDate } from '../format.js'
import { watchLocation } from '../location.js'
import PageLoading from '../components/PageLoading.jsx'

const DEFAULT_CENTER = [12.8797, 121.774]
const MAX_GPS_ACCURACY_METERS = 25
const MAX_START_ACCURACY_METERS = MAX_GPS_ACCURACY_METERS
const MAX_RECORDING_ACCURACY_METERS = 50
const MAX_RECORDING_GAP_SECONDS = 60
const MAX_RECORDING_SPEED_METERS_PER_SECOND = 12
const MIN_TRACKED_MOVEMENT_METERS = 1.5
const MAX_TRACKED_NOISE_METERS = 8

function distanceBetween(a, b) {
  const earthRadiusMeters = 6371000
  const toRadians = (degrees) => (degrees * Math.PI) / 180

  const latitudeDifference = toRadians(b.latitude - a.latitude)
  const longitudeDifference = toRadians(b.longitude - a.longitude)
  const latitudeA = toRadians(a.latitude)
  const latitudeB = toRadians(b.latitude)

  const value =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(latitudeA) *
      Math.cos(latitudeB) *
      Math.sin(longitudeDifference / 2) ** 2

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}

function formatElapsed(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60

  return [hours, minutes, remainder].map((part) => String(part).padStart(2, '0')).join(':')
}

function formatPace(totalSeconds, distanceKm) {
  if (distanceKm <= 0) return '--:--'

  const secondsPerKm = Math.round(totalSeconds / distanceKm)
  const minutes = Math.floor(secondsPerKm / 60)
  const seconds = secondsPerKm % 60

  return `${minutes}:${String(seconds).padStart(2, '0')} /km`
}

function formatDuration(totalSeconds) {
    if (totalSeconds === null || totalSeconds === undefined) {
        return 'Not specified'
    }

    const seconds = Math.max(0, Math.floor(Number(totalSeconds)))

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainder = seconds % 60

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    }

    return `${minutes}:${String(remainder).padStart(2, '0')}`
}

function formatPlannedStartTime(time) {
    if (!time) {
        return 'Flexible'
    }

    const [hours, minutes] = time.split(':').map(Number)

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
        return time
    }

    const suffix = hours >= 12 ? 'PM' : 'AM'
    const hour12 = hours % 12 || 12

    return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`
}

function localDate() {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 10)
}

function locationErrorMessage(error) {
  if (error?.code === 1) return 'Location permission was denied. Allow location access and try again.'
  if (error?.code === 2) return 'Your current location is unavailable. Check that location services are enabled.'
  if (error?.code === 3) return 'Getting your location took too long. Try again in an open area.'
  return error?.message || 'Could not get your location.'
}

function ActionIcon({ name }) {
  const shared = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    focusable: 'false',
  }

  if (name === 'gps') {
    return (
      <svg {...shared}>
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="1.5" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      </svg>
    )
  }

  if (name === 'play') {
    return (
      <svg {...shared} fill="currentColor" stroke="none">
        <path d="M8 5.5v13l11-6.5-11-6.5Z" />
      </svg>
    )
  }

  if (name === 'pause') {
    return (
      <svg {...shared} fill="currentColor" stroke="none">
        <path d="M7 5h4v14H7zM15 5h4v14h-4z" />
      </svg>
    )
  }

  if (name === 'finish') {
    return (
      <svg {...shared}>
        <rect x="5" y="5" width="14" height="14" rx="2" />
      </svg>
    )
  }

  if (name === 'save') {
    return (
      <svg {...shared}>
        <path d="M5 3h12l3 3v15H4V3h1Z" />
        <path d="M8 3v6h8V3M8 21v-8h8v8" />
      </svg>
    )
  }

  if (name === 'again') {
    return (
      <svg {...shared}>
        <path d="M20 7v5h-5M4 17v-5h5" />
        <path d="M5.5 9A7 7 0 0 1 18 6l2 2M4 16l2 2a7 7 0 0 0 12.5-3" />
      </svg>
    )
  }

  if (name === 'history') {
    return (
      <svg {...shared}>
        <path d="M4 6h16M4 12h16M4 18h16" />
        <circle cx="2" cy="6" r=".5" fill="currentColor" />
        <circle cx="2" cy="12" r=".5" fill="currentColor" />
        <circle cx="2" cy="18" r=".5" fill="currentColor" />
      </svg>
    )
  }

  return null
}

function FollowRunner({ center }) {
  const map = useMap()

  useEffect(() => {
    if (!center) return

    const accuracy = center.accuracy ?? 100
    const zoom = accuracy <= MAX_GPS_ACCURACY_METERS ? 16 : accuracy <= 250 ? 14 : 11

    map.setView(center.coordinates, zoom, { animate: false })
  }, [center, map])

  return null
}

export default function Run() {
  useEffect(() => {
    document.body.classList.add('is-run-tracking')

    return () => {
      document.body.classList.remove('is-run-tracking')
    }
  }, [])

  const [searchParams] = useSearchParams()
const location = useLocation()

  const sessionId = searchParams.get('session')

  const manualWorkout = location.state?.manualWorkout ?? null

  const [linkedSession, setLinkedSession] = useState(null)

  const [sessionState, setSessionState] = useState(
    sessionId ? 'loading' : 'none',
  )

  const targetDistanceKm = linkedSession
    ? Number(linkedSession.planned_distance_km)
    : Number(manualWorkout?.distance) || 0

  const hasLoadedWorkout = Boolean(linkedSession || manualWorkout)
  const [status, setStatus] = useState('idle')
  const [currentPosition, setCurrentPosition] = useState(null)
  const [gpsAccuracy, setGpsAccuracy] = useState(null)
  const [routeSegments, setRouteSegments] = useState([])
  const [distanceKm, setDistanceKm] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [resumeMode, setResumeMode] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [plannedDistanceReached, setPlannedDistanceReached] = useState(false)

  const statusRef = useRef('idle')
  const currentPositionRef = useRef(null)
  const routeSegmentsRef = useRef([])
  const distanceRef = useRef(0)
  const elapsedRef = useRef(0)
  const lastPointRef = useRef(null)
  const segmentStartedAtRef = useRef(null)
  const stopWatchingRef = useRef(null)
  const pendingResumeRef = useRef(false)

  useEffect(() => {
    if (!sessionId) {
      setLinkedSession(null)
      setSessionState('none')
      return
    }

    setSessionState('loading')
    apiGet('/plans/current')
      .then((body) => {
        const session = body.data.active?.sessions.find((item) => String(item.id) === sessionId)
        if (!session || session.status === 'completed') {
          setSessionState('invalid')
          return
        }
        setLinkedSession(session)
        setSessionState('ready')
      })
      .catch(() => setSessionState('invalid'))
  }, [sessionId])

  const mapCenter = useMemo(() => {
    if (!currentPosition) return null

    return {
      coordinates: [currentPosition.latitude, currentPosition.longitude],
      accuracy: currentPosition.accuracy,
    }
  }, [currentPosition])

  const mapSegments = useMemo(
    () =>
      routeSegments.map((segment) =>
        segment.map((point) => [point.latitude, point.longitude]),
      ),
    [routeSegments],
  )

  function changeStatus(nextStatus) {
    statusRef.current = nextStatus
    setStatus(nextStatus)
  }

  function stopWatching() {
    stopWatchingRef.current?.()
    stopWatchingRef.current = null
  }

  function stopRecordingSegment(nextStatus) {
    if (segmentStartedAtRef.current !== null) {
      elapsedRef.current += (Date.now() - segmentStartedAtRef.current) / 1000
      segmentStartedAtRef.current = null
    }

    stopWatching()
    setElapsedSeconds(Math.floor(elapsedRef.current))
    changeStatus(nextStatus)
  }

  function startNewRouteSegment(point) {
    lastPointRef.current = point

    const nextSegments = [...routeSegmentsRef.current, [point]]
    routeSegmentsRef.current = nextSegments
    setRouteSegments(nextSegments)
  }

    function addRecordingPoint(point) {
    const previous = lastPointRef.current

    if (!previous) {
      startNewRouteSegment(point)
      return
    }

    const meters = distanceBetween(previous, point)
    const seconds = (point.timestamp - previous.timestamp) / 1000

    if (seconds <= 0) return

    if (seconds > MAX_RECORDING_GAP_SECONDS) {
      startNewRouteSegment(point)
      return
    }

    if (meters / seconds > MAX_RECORDING_SPEED_METERS_PER_SECOND) {
      startNewRouteSegment(point)
      return
    }

    // Keep the previous point as the anchor when movement is tiny,
    // so several small GPS updates can add up to real progress.
    const combinedAccuracy =
      (Number(previous.accuracy) || 0) + (Number(point.accuracy) || 0)
    const movementThreshold = Math.max(
      MIN_TRACKED_MOVEMENT_METERS,
      Math.min(MAX_TRACKED_NOISE_METERS, combinedAccuracy * 0.08),
    )

    if (meters < movementThreshold) return

    const plannedDistanceKm = targetDistanceKm

    const hasPlannedDistance =
    Number.isFinite(plannedDistanceKm) && plannedDistanceKm > 0
    const plannedDistanceMeters = hasPlannedDistance
      ? plannedDistanceKm * 1000
      : Infinity
    const remainingMeters =
      plannedDistanceMeters - distanceRef.current * 1000

    if (hasPlannedDistance && remainingMeters <= 0) {
      distanceRef.current = plannedDistanceKm
      setDistanceKm(plannedDistanceKm)
      setPlannedDistanceReached(true)
      pendingResumeRef.current = false
      setResumeMode(false)
      stopRecordingSegment('finished')
      setError('')
      return
    }

    const reachedTarget =
      hasPlannedDistance && meters >= remainingMeters
    const fraction = reachedTarget ? remainingMeters / meters : 1
    const recordedPoint = reachedTarget
      ? {
          ...point,
          latitude:
            previous.latitude +
            (point.latitude - previous.latitude) * fraction,
          longitude:
            previous.longitude +
            (point.longitude - previous.longitude) * fraction,
          timestamp:
            previous.timestamp +
            (point.timestamp - previous.timestamp) * fraction,
        }
      : point
    const acceptedMeters = reachedTarget ? remainingMeters : meters

    lastPointRef.current = recordedPoint
    distanceRef.current = reachedTarget
      ? plannedDistanceKm
      : distanceRef.current + acceptedMeters / 1000
    setDistanceKm(distanceRef.current)

    const nextSegments = [...routeSegmentsRef.current]
    const lastIndex = nextSegments.length - 1

    if (lastIndex >= 0) {
      nextSegments[lastIndex] = [...nextSegments[lastIndex], recordedPoint]
      routeSegmentsRef.current = nextSegments
      setRouteSegments(nextSegments)
    }

    if (reachedTarget) {
      setPlannedDistanceReached(true)
      pendingResumeRef.current = false
      setResumeMode(false)
      stopRecordingSegment('finished')
      setError('')
    }
  }

  function handleLocation(location) {
    if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) return

    const accuracy = Number.isFinite(Number(location.accuracy))
      ? Number(location.accuracy)
      : null

    const point = {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy,
      timestamp: Number(location.timestamp) || Date.now(),
    }

    currentPositionRef.current = point
    setCurrentPosition(point)
    setGpsAccuracy(accuracy)

    if (accuracy === null) return

    if (
      statusRef.current === 'locating' &&
      accuracy <= MAX_START_ACCURACY_METERS
    ) {
      setError('')
      setResumeMode(pendingResumeRef.current)
      pendingResumeRef.current = false
      changeStatus('ready')
      return
    }

    if (
      statusRef.current === 'recording' &&
      accuracy <= MAX_RECORDING_ACCURACY_METERS
    ) {
      addRecordingPoint(point)
    }
  }

  function handleLocationError(locationError) {
    const currentStatus = statusRef.current
    const wasResuming = pendingResumeRef.current || currentStatus === 'recording'

    if (currentStatus === 'recording') {
      stopRecordingSegment('paused')
    } else {
      stopWatching()
      changeStatus(wasResuming ? 'paused' : 'idle')
    }

    pendingResumeRef.current = false
    setResumeMode(false)
    setError(locationErrorMessage(locationError))
  }

  function resetRunData() {
    routeSegmentsRef.current = []
    distanceRef.current = 0
    elapsedRef.current = 0
    lastPointRef.current = null
    segmentStartedAtRef.current = null
    setRouteSegments([])
    setDistanceKm(0)
    setElapsedSeconds(0)
    setSaved(false)
    setPlannedDistanceReached(false)
  }

  function requestGps(isResume = false) {
    if (statusRef.current === 'locating') return

    if (!isResume && statusRef.current === 'idle') {
      resetRunData()
    }

    setError('')
    pendingResumeRef.current = isResume
    setResumeMode(isResume)
    changeStatus('locating')

    try {
      stopWatching()
      stopWatchingRef.current = watchLocation(handleLocation, handleLocationError)
    } catch (locationError) {
      pendingResumeRef.current = false
      setResumeMode(false)
      changeStatus(isResume ? 'paused' : 'idle')
      setError(locationErrorMessage(locationError))
    }
  }

  function cancelGpsSearch() {
    const wasResuming = pendingResumeRef.current
    stopWatching()
    pendingResumeRef.current = false
    setResumeMode(false)
    changeStatus(wasResuming ? 'paused' : 'idle')
    setError('')
  }

  function startRun() {
    const position = currentPositionRef.current

    if (
      !position ||
      position.accuracy === null ||
      position.accuracy > MAX_START_ACCURACY_METERS
    ) {
      setError('Wait until GPS accuracy is 25 m or better before starting.')
      return
    }

    setError('')
    setSaved(false)
    setPlannedDistanceReached(false)

    if (resumeMode) {
      if (position.accuracy <= MAX_GPS_ACCURACY_METERS) {
        startNewRouteSegment({ ...position, timestamp: Date.now() })
      } else {
        lastPointRef.current = null
      }

      setResumeMode(false)
    } else {
      distanceRef.current = 0
      elapsedRef.current = 0
      setDistanceKm(0)
      setElapsedSeconds(0)

      if (position.accuracy <= MAX_GPS_ACCURACY_METERS) {
        const startPoint = { ...position, timestamp: Date.now() }
        routeSegmentsRef.current = [[startPoint]]
        setRouteSegments([[startPoint]])
        lastPointRef.current = startPoint
      } else {
        routeSegmentsRef.current = []
        setRouteSegments([])
        lastPointRef.current = null
      }
    }

    segmentStartedAtRef.current = Date.now()
    changeStatus('recording')
  }

  function pauseRun() {
    setResumeMode(false)
    pendingResumeRef.current = false
    stopRecordingSegment('paused')
  }

  function finishRun() {
    setResumeMode(false)
    pendingResumeRef.current = false
    stopRecordingSegment('finished')
    setError('')
  }

  function startAnotherRun() {
    stopWatching()
    resetRunData()
    currentPositionRef.current = null
    setCurrentPosition(null)
    setGpsAccuracy(null)
    setResumeMode(false)
    pendingResumeRef.current = false
    setError('')
    changeStatus('idle')
  }

  async function saveRun() {
    if (distanceRef.current <= 0 || elapsedRef.current <= 0) {
      setError('Record some reliable distance before saving this run.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const routeSegments = routeSegmentsRef.current
        .filter((segment) => Array.isArray(segment) && segment.length > 0)
        .map((segment) =>
          segment.map((point) => ({
            latitude: point.latitude,
            longitude: point.longitude,
            accuracy: point.accuracy ?? null,
            timestamp: point.timestamp,
          })),
        )

      await apiPost('/activities', {
        activity_date: manualWorkout?.date ?? localDate(),
        distance_km: distanceRef.current.toFixed(3),
        duration_seconds: Math.max(1, Math.floor(elapsedRef.current)),
        effort: null,
        workout_type: linkedSession?.type ?? manualWorkout?.workoutType ?? null,
        notes: manualWorkout?.notes
          ? `${manualWorkout.notes}
             Recorded with the RunPlan GPS tracker.`
          : 'Recorded with the RunPlan GPS tracker.',
        route_data: routeSegments.length > 0
          ? { segments: routeSegments }
          : null,
        ...(linkedSession ? { session_id: linkedSession.id } : {}),
      })
      setSaved(true)
    } catch (saveError) {
      setError(
        saveError.fields
          ? Object.values(saveError.fields).join(' ')
          : saveError.message || 'Could not save this run.',
      )
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (status !== 'recording') return undefined

    const timer = window.setInterval(() => {
      if (segmentStartedAtRef.current === null) return

      const currentSegmentSeconds = (Date.now() - segmentStartedAtRef.current) / 1000
      setElapsedSeconds(Math.floor(elapsedRef.current + currentSegmentSeconds))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [status])

  useEffect(
    () => () => {
      stopWatchingRef.current?.()
    },
    [],
  )

  const statusText = {
    idle: 'Ready to find GPS',
    locating: 'Finding GPS signal',
    ready:
      gpsAccuracy !== null && gpsAccuracy > MAX_GPS_ACCURACY_METERS
        ? 'GPS found · approximate location'
        : resumeMode
          ? 'GPS ready to resume'
          : 'GPS ready — start when you are ready',
    recording:
      gpsAccuracy !== null && gpsAccuracy > MAX_GPS_ACCURACY_METERS
        ? 'Recording — waiting for more accurate GPS'
        : 'Recording GPS',
    paused: 'Paused',
    finished: saved
      ? 'Run saved'
      : plannedDistanceReached
        ? 'Planned distance complete'
        : 'Run finished',
  }[status]

  const displayedElapsedSeconds =
    status === 'idle' || status === 'locating' || status === 'ready'
      ? 0
      : elapsedSeconds

  if (sessionState === 'loading') {
    return <PageLoading label="Loading planned workout…" />
  }

  if (sessionState === 'invalid') {
    return (
      <section className="plan-card">
        <h2>Planned workout unavailable</h2>
        <p className="note">This workout may already be completed or is no longer in your active plan.</p>
        <Link className="btn btn-primary" to="/calendar">Back to calendar</Link>
      </section>
    )
  }

  return (
    <main className="run-screen" aria-label="Run tracker">
      <div className="run-map-layer" aria-label="Live GPS map">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={11}
          scrollWheelZoom
          zoomControl={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FollowRunner center={mapCenter} />

          {mapSegments.map((segment, index) =>
            segment.length > 1 ? (
              <Polyline
                key={`route-segment-${index}`}
                positions={segment}
                pathOptions={{ color: '#2563eb', weight: 6, lineCap: 'round' }}
              />
            ) : null,
          )}

          {mapCenter && (
            <CircleMarker
              center={mapCenter.coordinates}
              radius={9}
              pathOptions={{
                color: '#ffffff',
                weight: 3,
                fillColor:
                  gpsAccuracy !== null && gpsAccuracy > MAX_GPS_ACCURACY_METERS
                    ? '#f59e0b'
                    : '#2563eb',
                fillOpacity: 1,
              }}
            />
          )}
        </MapContainer>
      </div>

      <div className="run-top-overlay">
        <Link to="/dashboard" className="run-back-button" aria-label="Back to dashboard">
          <span aria-hidden="true">‹</span>
        </Link>

        <div className="run-workout-chip">
          <span className="run-workout-chip-icon" aria-hidden="true">
            {linkedSession ? '▣' : manualWorkout ? '✎' : '⌁'}
          </span>
          <span>
            <strong>
              {linkedSession
                ? TYPE_LABELS[linkedSession.type] ?? linkedSession.type
                : manualWorkout
                  ? 'Manual workout'
                  : 'Free run'}
            </strong>
            {targetDistanceKm > 0 && (
              <small>Target {targetDistanceKm.toFixed(2)} km</small>
            )}
          </span>
        </div>

        <span className={`run-status-chip run-status-${status}`} role="status">
          <span className="run-status-dot" />
          {status === 'idle' && 'Ready'}
          {status === 'locating' && 'Finding GPS'}
          {status === 'ready' && 'GPS ready'}
          {status === 'recording' && 'Recording'}
          {status === 'paused' && 'Paused'}
          {status === 'finished' && (saved ? 'Saved' : 'Finished')}
        </span>
      </div>

      {currentPosition && gpsAccuracy !== null && (
        <div className="run-gps-indicator" role="status">
          <span className="run-gps-indicator-dot" />
          GPS accuracy · {Math.round(gpsAccuracy)} m
        </div>
      )}

      <section className="run-bottom-panel" aria-label="Run controls and statistics">
        <div className="run-live-stats">
          <div className="run-live-stat run-live-stat-time">
            <span>TIME</span>
            <strong>{formatElapsed(displayedElapsedSeconds)}</strong>
          </div>
          <div className="run-live-stat">
            <span>DISTANCE</span>
            <strong>{distanceKm.toFixed(2)} <small>km</small></strong>
          </div>
          <div className="run-live-stat">
            <span>AVG. PACE</span>
            <strong>{formatPace(displayedElapsedSeconds, distanceKm).replace(' /km', '')} <small>/km</small></strong>
          </div>
        </div>

        {targetDistanceKm > 0 && (
          <div className="run-target-progress">
            <div>
              <span>Workout progress</span>
              <strong>{distanceKm.toFixed(2)} / {targetDistanceKm.toFixed(2)} km</strong>
            </div>
            <div className="run-target-track">
              <span
                style={{
                  width: `${Math.min(100, (distanceKm / targetDistanceKm) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {error && <p className="run-error" role="alert">{error}</p>}

        {plannedDistanceReached && !saved && (
          <p className="run-feedback" role="status">
            Target distance reached. Your run is ready to save.
          </p>
        )}

        {saved && (
          <p className="run-feedback run-feedback-success" role="status">
            {linkedSession
              ? 'Run saved and linked to your calendar workout.'
              : manualWorkout
                ? 'Manual workout saved to your activity history.'
                : 'Run saved to your activity history.'}
          </p>
        )}

        <div className="run-bottom-actions">
          {status === 'idle' && (
            <button
              type="button"
              className="run-main-action run-main-action-blue"
              onClick={() => requestGps(false)}
            >
              <ActionIcon name="gps" />
              Find GPS
            </button>
          )}

          {status === 'locating' && (
            <div className="run-action-pair">
              <button type="button" className="run-main-action run-main-action-blue" disabled>
                <span className="run-gps-spinner" aria-hidden="true" />
                Finding GPS…
              </button>
              <button
                type="button"
                className="run-small-action"
                onClick={cancelGpsSearch}
              >
                Cancel
              </button>
            </div>
          )}

          {status === 'ready' && (
            <button
              type="button"
              className="run-main-action run-main-action-green"
              onClick={startRun}
              disabled={gpsAccuracy === null || gpsAccuracy > MAX_START_ACCURACY_METERS}
            >
              <ActionIcon name="play" />
              {resumeMode ? 'Resume run' : 'Start run'}
            </button>
          )}

          {status === 'recording' && (
            <div className="run-action-pair">
              <button
                type="button"
                className="run-main-action run-main-action-orange"
                onClick={pauseRun}
              >
                <ActionIcon name="pause" />
                Pause
              </button>
              <button
                type="button"
                className="run-main-action run-main-action-finish"
                onClick={finishRun}
                disabled={distanceKm <= 0}
                title={distanceKm <= 0 ? 'Record some distance before finishing.' : 'Finish run'}
              >
                <ActionIcon name="finish" />
                Finish
              </button>
            </div>
          )}

          {status === 'paused' && (
            <div className="run-action-pair">
              <button
                type="button"
                className="run-main-action run-main-action-green"
                onClick={() => requestGps(true)}
              >
                <ActionIcon name="gps" />
                Resume
              </button>
              <button
                type="button"
                className="run-main-action run-main-action-finish"
                onClick={finishRun}
              >
                <ActionIcon name="finish" />
                Finish
              </button>
            </div>
          )}

          {status === 'finished' && !saved && (
            <div className="run-action-pair">
              <button
                type="button"
                className="run-main-action run-main-action-green"
                onClick={saveRun}
                disabled={saving}
              >
                <ActionIcon name="save" />
                {saving ? 'Saving run…' : 'Save run'}
              </button>
              <button
                type="button"
                className="run-small-action"
                onClick={startAnotherRun}
                disabled={saving}
              >
                Discard
              </button>
            </div>
          )}

          {status === 'finished' && saved && (
            <div className="run-action-pair">
              {linkedSession ? (
                <Link to="/calendar" className="run-main-action run-main-action-green">
                  View calendar
                </Link>
              ) : (
                <button
                  type="button"
                  className="run-main-action run-main-action-green"
                  onClick={startAnotherRun}
                >
                  <ActionIcon name="again" />
                  Start another run
                </button>
              )}
              <Link to="/activities" className="run-small-action">Activity history</Link>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
