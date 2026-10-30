import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { apiGet, apiPost } from '../api.js'
import { TYPE_LABELS, formatLongDate } from '../format.js'
import { watchLocation } from '../location.js'

const DEFAULT_CENTER = [12.8797, 121.774]
const MAX_GPS_ACCURACY_METERS = 25
const MAX_START_ACCURACY_METERS = 150
const MIN_PACE_DISTANCE_KM = 0.1
const MAX_GPS_SPEED_METERS_PER_SECOND = 8

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
  if (!Number.isFinite(distanceKm) || distanceKm < MIN_PACE_DISTANCE_KM) {
    return '--:--'
  }

  const secondsPerKm = Math.round(totalSeconds / distanceKm)

  // Hide readings outside the pace limits accepted by the activity API.
  if (secondsPerKm < 120 || secondsPerKm > 1500) {
    return '--:--'
  }

  const minutes = Math.floor(secondsPerKm / 60)
  const seconds = secondsPerKm % 60

  return `${minutes}:${String(seconds).padStart(2, '0')} /km`
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
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session')
  const [linkedSession, setLinkedSession] = useState(null)
  const [sessionState, setSessionState] = useState(sessionId ? 'loading' : 'none')
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

  const statusRef = useRef('idle')
  const currentPositionRef = useRef(null)
  const routeSegmentsRef = useRef([])
  const distanceRef = useRef(0)
  const elapsedRef = useRef(0)
  const lastPointRef = useRef(null)
  const segmentStartedAtRef = useRef(null)
  const stopWatchingRef = useRef(null)
  const pendingResumeRef = useRef(false)

  const plannedDistanceKm = linkedSession
    ? Number(linkedSession.planned_distance_km)
    : null
  const hasPlannedDistance =
    Number.isFinite(plannedDistanceKm) && plannedDistanceKm > 0
  const linkedWorkoutComplete =
    Boolean(linkedSession && hasPlannedDistance) &&
    distanceRef.current >= plannedDistanceKm - 0.000001

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

    if (seconds > 20) {
      startNewRouteSegment(point)
      return
    }

    const averageAccuracy =
      ((Number(previous.accuracy) || 0) + (Number(point.accuracy) || 0)) / 2
    const minimumMovementMeters = Math.max(
      1.5,
      Math.min(averageAccuracy * 0.25, 5),
    )

    if (meters < minimumMovementMeters) {
      lastPointRef.current = point
      return
    }

    if (meters / seconds > MAX_GPS_SPEED_METERS_PER_SECOND) return

    if (hasPlannedDistance) {
      const remainingMeters =
        (plannedDistanceKm - distanceRef.current) * 1000

      if (remainingMeters <= 0.01) {
        distanceRef.current = plannedDistanceKm
        setDistanceKm(plannedDistanceKm)
        stopRecordingSegment('finished')
        return
      }

      const acceptedMeters = Math.min(meters, remainingMeters)
      const reachesTarget =
        distanceRef.current + acceptedMeters / 1000 >=
        plannedDistanceKm - 0.000001
      const ratio = acceptedMeters / meters

      const recordedPoint =
        ratio < 1
          ? {
              ...point,
              latitude:
                previous.latitude +
                (point.latitude - previous.latitude) * ratio,
              longitude:
                previous.longitude +
                (point.longitude - previous.longitude) * ratio,
              timestamp:
                previous.timestamp +
                (point.timestamp - previous.timestamp) * ratio,
            }
          : point

      distanceRef.current = reachesTarget
        ? plannedDistanceKm
        : distanceRef.current + acceptedMeters / 1000
      lastPointRef.current = recordedPoint
      setDistanceKm(distanceRef.current)

      const nextSegments = [...routeSegmentsRef.current]
      const lastIndex = nextSegments.length - 1

      if (lastIndex >= 0) {
        nextSegments[lastIndex] = [
          ...nextSegments[lastIndex],
          recordedPoint,
        ]
        routeSegmentsRef.current = nextSegments
        setRouteSegments(nextSegments)
      }

      if (reachesTarget) {
        setResumeMode(false)
        pendingResumeRef.current = false
        setError('')
        stopRecordingSegment('finished')
      }

      return
    }

    lastPointRef.current = point
    distanceRef.current += meters / 1000
    setDistanceKm(distanceRef.current)

    const nextSegments = [...routeSegmentsRef.current]
    const lastIndex = nextSegments.length - 1

    if (lastIndex >= 0) {
      nextSegments[lastIndex] = [...nextSegments[lastIndex], point]
      routeSegmentsRef.current = nextSegments
      setRouteSegments(nextSegments)
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
      accuracy <= MAX_GPS_ACCURACY_METERS
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
      setError('Wait for a usable GPS signal before starting.')
      return
    }

    setError('')
    setSaved(false)

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
    const distanceToSaveKm =
      Math.round((distanceRef.current + Number.EPSILON) * 100) / 100
    const durationToSaveSeconds = Math.max(
      1,
      Math.floor(elapsedRef.current),
    )

    if (distanceToSaveKm < 0.01 || elapsedRef.current <= 0) {
      setError(
        'GPS has not recorded enough reliable distance to save yet. Wait for a stronger GPS track and record at least 0.01 km.',
      )
      return
    }

    const paceSecondsPerKm =
      durationToSaveSeconds / distanceToSaveKm

    if (paceSecondsPerKm < 120 || paceSecondsPerKm > 1500) {
      setError(
        'The GPS distance and time do not produce a valid running pace yet. Wait for a more reliable GPS track before saving.',
      )
      return
    }

    setSaving(true)
    setError('')

    try {
      await apiPost('/activities', {
        activity_date: localDate(),
        distance_km: distanceToSaveKm.toFixed(2),
        duration_seconds: durationToSaveSeconds,
        effort: null,
        notes: linkedSession && !linkedWorkoutComplete
          ? 'Recorded with the RunPlan GPS tracker. Planned workout was not completed.'
          : 'Recorded with the RunPlan GPS tracker.',
        ...(linkedWorkoutComplete
          ? { session_id: linkedSession.id }
          : {}),
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
      : linkedWorkoutComplete
        ? 'Planned distance reached'
        : 'Run finished',
  }[status]

  const displayedElapsedSeconds =
    status === 'idle' || status === 'locating' || status === 'ready'
      ? 0
      : elapsedSeconds

  if (sessionState === 'loading') {
    return <p role="status">Loading planned workout…</p>
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
    <>
      {linkedSession && (
        <section className="plan-card" aria-label="Planned workout linked to this run">
          <div className="panel-head">
            <h2>{TYPE_LABELS[linkedSession.type] ?? linkedSession.type} workout</h2>
            <span className="pill">Linked to calendar</span>
          </div>
          <p className="note" style={{ marginBottom: 0 }}>
            {formatLongDate(linkedSession.scheduled_date)} · Planned distance:{' '}
            {plannedDistanceKm} km · Recording stops automatically at this distance.
          </p>
        </section>
      )}

      <style>{`
        .run-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }

        .run-toolbar-copy {
          flex: 1 1 280px;
          min-width: 0;
        }

        .run-toolbar-copy .note {
          margin: 0;
        }

        .run-controls {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .run-action {
          min-height: 44px;
          padding: 0 16px;
          border: 1px solid rgba(59, 130, 246, .28);
          border-radius: 11px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          color: inherit;
          background: rgba(59, 130, 246, .08);
          font: inherit;
          font-weight: 700;
          line-height: 1.2;
          text-decoration: none;
          white-space: nowrap;
          cursor: pointer;
          transition: transform .16s ease, box-shadow .16s ease, background .16s ease, border-color .16s ease;
        }

        .run-action:hover:not(:disabled) {
          transform: translateY(-1px);
          border-color: rgba(59, 130, 246, .58);
          box-shadow: 0 7px 18px rgba(37, 99, 235, .14);
        }

        .run-action:focus-visible {
          outline: 3px solid rgba(59, 130, 246, .38);
          outline-offset: 2px;
        }

        .run-action:disabled {
          opacity: .52;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .run-action--primary {
          color: #fff;
          border-color: #3478ed;
          background: linear-gradient(135deg, #4c93ff, #2563eb);
          box-shadow: 0 5px 14px rgba(37, 99, 235, .22);
        }

        .run-action--primary:hover:not(:disabled) {
          border-color: #1d4ed8;
          background: linear-gradient(135deg, #3985f5, #1d4ed8);
          box-shadow: 0 8px 20px rgba(37, 99, 235, .3);
        }

        .run-action--location {
          color: #2563eb;
          border-color: rgba(59, 130, 246, .42);
          background: linear-gradient(135deg, rgba(59, 130, 246, .14), rgba(59, 130, 246, .06));
        }

        .run-action--secondary {
          border-color: rgba(148, 163, 184, .28);
          background: rgba(148, 163, 184, .08);
        }

        .run-action--danger {
          color: #dc2626;
          border-color: rgba(239, 68, 68, .34);
          background: rgba(239, 68, 68, .08);
        }

        .run-action--quiet {
          min-height: 42px;
          padding-inline: 13px;
          background: transparent;
        }

        .run-action-icon {
          display: inline-flex;
          flex: 0 0 auto;
        }

        .run-gps-spinner {
          width: 17px;
          height: 17px;
          border: 2px solid currentColor;
          border-right-color: transparent;
          border-radius: 50%;
          animation: run-gps-spin .75s linear infinite;
        }

        .run-location-note {
          margin-top: 7px !important;
          font-size: .88em;
        }

        @keyframes run-gps-spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 600px) {
          .run-toolbar {
            align-items: stretch;
          }

          .run-controls {
            width: 100%;
          }

          .run-action {
            flex: 1 1 auto;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .run-action,
          .run-gps-spinner {
            transition: none;
            animation-duration: 1.5s;
          }
        }
      `}</style>

      <div className="run-toolbar">
        <div className="run-toolbar-copy">
          <p className="note">
            Find your GPS location first. The timer starts only when you press Start run.
          </p>

          {currentPosition && gpsAccuracy !== null && (
            <p className="note run-location-note" role="status">
              {gpsAccuracy <= MAX_GPS_ACCURACY_METERS
                ? `GPS ready · accuracy about ${Math.round(gpsAccuracy)} m`
                : gpsAccuracy <= MAX_START_ACCURACY_METERS
                  ? `Approximate location · ${Math.round(gpsAccuracy)} m accuracy. Start is available; distance tracking waits for a more accurate fix.`
                  : `Location found · improving accuracy (${Math.round(gpsAccuracy)} m)`}
            </p>
          )}
        </div>

        <div className="run-controls">
          <Link to="/activities" className="run-action run-action--quiet">
            <span className="run-action-icon"><ActionIcon name="history" /></span>
            Log a past run
          </Link>

          {status === 'idle' && (
            <button
              type="button"
              className="run-action run-action--location"
              onClick={() => requestGps(false)}
              aria-label="Find GPS location"
            >
              <span className="run-action-icon"><ActionIcon name="gps" /></span>
              Find GPS
            </button>
          )}

          {status === 'locating' && (
            <>
              <button type="button" className="run-action run-action--location" disabled>
                <span className="run-gps-spinner" aria-hidden="true" />
                Finding GPS...
              </button>
              <button
                type="button"
                className="run-action run-action--secondary"
                onClick={cancelGpsSearch}
              >
                Cancel
              </button>
            </>
          )}

          {status === 'ready' && (
            <button
              type="button"
              className="run-action run-action--primary"
              onClick={startRun}
            >
              <span className="run-action-icon"><ActionIcon name="play" /></span>
              {resumeMode ? 'Resume run' : 'Start run'}
            </button>
          )}

          {status === 'recording' && (
            <>
              <button
                type="button"
                className="run-action run-action--secondary"
                onClick={pauseRun}
              >
                <span className="run-action-icon"><ActionIcon name="pause" /></span>
                Pause
              </button>
              <button
                type="button"
                className="run-action run-action--danger"
                onClick={finishRun}
                disabled={distanceKm <= 0}
                title={distanceKm <= 0 ? 'Record some reliable distance before finishing.' : undefined}
              >
                <span className="run-action-icon"><ActionIcon name="finish" /></span>
                Finish run
              </button>
            </>
          )}

          {status === 'paused' && (
            <button
              type="button"
              className="run-action run-action--primary"
              onClick={() => requestGps(true)}
            >
              <span className="run-action-icon"><ActionIcon name="gps" /></span>
              Find GPS to resume
            </button>
          )}

          {status === 'finished' && !saved && (
            <button
              type="button"
              className="run-action run-action--primary"
              onClick={saveRun}
              disabled={saving}
            >
              <span className="run-action-icon"><ActionIcon name="save" /></span>
              {saving ? 'Saving...' : 'Save run'}
            </button>
          )}

          {status === 'finished' && saved && (
            linkedSession ? (
              <Link to="/calendar" className="run-action run-action--primary">View calendar</Link>
            ) : (
              <button
                type="button"
                className="run-action run-action--primary"
                onClick={startAnotherRun}
              >
                <span className="run-action-icon"><ActionIcon name="again" /></span>
                Start another run
              </button>
            )
          )}
        </div>
      </div>

      <section className="plan-card" aria-label="Live run map">
        <div
          style={{
            height: 'min(50vh, 460px)',
            minHeight: '300px',
            width: '100%',
            overflow: 'hidden',
            borderRadius: '12px',
          }}
        >
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={11}
            scrollWheelZoom
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
                  pathOptions={{ color: '#3b82f6', weight: 5 }}
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
                      : '#3b82f6',
                  fillOpacity: 1,
                }}
              />
            )}
          </MapContainer>
        </div>
      </section>

      <section className="status-strip" aria-label="Current run statistics">
        <div className="strip-item">
          <span className="strip-label">Run status</span>
          <span className="strip-value" role="status">{statusText}</span>
        </div>
        <div className="strip-item">
          <span className="strip-label">Time</span>
          <span className="strip-value mono">{formatElapsed(displayedElapsedSeconds)}</span>
        </div>
        <div className="strip-item">
          <span className="strip-label">Distance</span>
          <span className="strip-value mono">{distanceKm.toFixed(2)} km</span>
        </div>
        <div className="strip-item">
          <span className="strip-label">Average pace</span>
          <span className="strip-value mono">{formatPace(displayedElapsedSeconds, distanceKm)}</span>
        </div>
      </section>

      {error && <p className="error" role="alert">{error}</p>}
      {saved && (
        <p className="note" role="status">
          {linkedWorkoutComplete
            ? 'Run saved and linked to this calendar workout. The workout is now marked complete.'
            : linkedSession
              ? 'Run saved to your activity history. The planned workout remains open because its target distance was not reached.'
              : 'Run saved to your activity history.'}
        </p>
      )}

      <p className="note">
        Keep this page open while recording. Map tiles © OpenStreetMap contributors.
      </p>
    </>
  )
}