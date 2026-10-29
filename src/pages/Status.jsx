import { useEffect, useState } from 'react'
import { apiGet } from '../api.js'
import { useAuth } from '../auth/AuthContext.jsx'

const PROVIDER_LABELS = {
  gemini: 'Google Gemini (AI plan & feedback)',
  weather: 'OpenWeatherMap (weather advisories)',
  google_calendar: 'Google Calendar (workout sync)',
  push: 'Push reminders (Web Push / FCM)',
  google_identity: 'Google Identity Services (Sign-In)',
  recaptcha: 'Google reCAPTCHA (abuse protection)',
}

function calendarStatus(connection, provider) {
  if (!connection) return null

  if (connection.status === 'connected') {
    return connection.sync_enabled
      ? { className: 'pill-ok', text: 'Connected · sync enabled' }
      : { className: 'pill-warn', text: 'Connected · paused' }
  }
  if (connection.status === 'needs_reconnect') {
    return { className: 'pill-warn', text: 'Reconnect required' }
  }
  if (connection.status === 'disconnected') {
    return provider?.ready
      ? { className: 'pill-muted', text: 'Ready · not connected' }
      : { className: 'pill-muted', text: 'Not configured' }
  }
  if (connection.status === 'not_configured') {
    return { className: 'pill-muted', text: 'Not configured' }
  }
  return { className: 'pill-warn', text: 'Temporarily unavailable' }
}

export default function Status() {
  const { user } = useAuth()
  const [health, setHealth] = useState(null)
  const [integrations, setIntegrations] = useState(null)
  const [state, setState] = useState('loading')
  const [browserLocation, setBrowserLocation] = useState({
    className: 'pill-muted',
    text: 'Checking browser location...',
    title: '',
  })

  useEffect(() => {
    Promise.all([apiGet('/health'), apiGet('/integrations/status')])
      .then(([h, i]) => {
        setHealth(h)
        setIntegrations(i.data)
        setState('ready')
      })
      .catch(() => setState('error'))
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return undefined

    if (!window.isSecureContext) {
      setBrowserLocation({
        className: 'pill-warn',
        text: 'Unavailable · requires HTTPS or localhost',
        title: 'Browser location requires a secure connection.',
      })
      return undefined
    }

    if (!navigator.geolocation) {
      setBrowserLocation({
        className: 'pill-warn',
        text: 'Unavailable in this browser',
        title: 'This browser does not provide the location feature needed for run tracking.',
      })
      return undefined
    }

    let active = true
    let permissionStatus = null

    function updateLocationPermission(permission) {
      if (!active) return

      if (permission === 'granted') {
        setBrowserLocation({
          className: 'pill-ok',
          text: '✓ Permission granted',
          title: 'Permission is granted. Press Find GPS on Start a Run to request a location fix.',
        })
      } else if (permission === 'denied') {
        setBrowserLocation({
          className: 'pill-warn',
          text: 'Blocked · check browser settings',
          title: 'Allow location access for this site in your browser settings.',
        })
      } else {
        setBrowserLocation({
          className: 'pill-warn',
          text: 'Permission needed',
          title: 'Press Find GPS on Start a Run; your browser should ask for location permission.',
        })
      }
    }

    if (!navigator.permissions?.query) {
      setBrowserLocation({
        className: 'pill-muted',
        text: 'Available · checked when run starts',
        title: 'This browser cannot report location permission status here. RunPlan will check when you press Find GPS.',
      })
      return undefined
    }

    navigator.permissions
      .query({ name: 'geolocation' })
      .then((permission) => {
        if (!active) return

        permissionStatus = permission
        updateLocationPermission(permission.state)
        permissionStatus.onchange = () => updateLocationPermission(permissionStatus.state)
      })
      .catch(() => {
        if (!active) return

        setBrowserLocation({
          className: 'pill-muted',
          text: 'Available · checked when run starts',
          title: 'RunPlan will check browser location permission when you press Find GPS.',
        })
      })

    return () => {
      active = false
      if (permissionStatus) permissionStatus.onchange = null
    }
  }, [])

  if (state === 'loading') return <p role="status">Checking system status...</p>
  if (state === 'error') return <p role="alert">Could not load system status.</p>

  const providers = integrations?.providers ?? {}
  const calendarConnection = integrations?.google_calendar_connection
  const apiConnected = health?.status === 'ok'

  return (
    <>
      <h1>System status</h1>

      <section className="status-strip" aria-label="Core service health">
        <div className="strip-item">
          <span className="strip-label">API server</span>
          <span className="strip-value">
            <span className={`dot ${apiConnected ? 'dot-ok' : 'dot-warn'}`} />
            {apiConnected ? 'Connected' : 'Degraded'}
          </span>
        </div>

        <div className="strip-item">
          <span className="strip-label">Core planner</span>
          <span className="strip-value">
            <span className={`dot ${integrations?.core_enabled ? 'dot-blue' : ''}`} />
            {integrations?.core_enabled ? 'Active' : 'Offline'}
          </span>
        </div>

        <div className="strip-item">
          <span className="strip-label">Analytics boundary</span>
          <span className="strip-value">Manual runs only</span>
        </div>

        <div className="strip-item">
          <span className="strip-label">Operator / Runner</span>
          <span className="strip-value mono">{user?.email}</span>
        </div>
      </section>

      <section className="plan-card" aria-labelledby="providers-title">
        <div className="panel-head">
          <h2 id="providers-title">External integration modules</h2>
          <span className="pill pill-muted">Optional integrations</span>
        </div>

        <p className="note">
          Provider readiness reflects server configuration. Google Calendar also shows this runner&apos;s connection state.
          Core training features remain available when a provider is disabled or unavailable.
        </p>

        <p className="note">
          Browser location shows this device&apos;s permission status. A live location fix is checked when you press Find GPS on Start a Run.
        </p>

        <div className="table-wrap">
          <table>
            <caption className="sr-only">Readiness of external integration modules</caption>
            <thead>
              <tr>
                <th scope="col">Integration</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(PROVIDER_LABELS).map(([key, label]) => {
                const provider = providers[key]
                let pillClass = 'pill-muted'
                let statusText = '— Not configured'
                let statusTitle

                if (key === 'google_calendar' && calendarConnection) {
                  const calendar = calendarStatus(calendarConnection, provider)
                  pillClass = calendar.className
                  statusText = calendar.text
                  statusTitle = calendarConnection.message
                } else if (provider?.ready) {
                  pillClass = 'pill-ok'
                  statusText = '✓ Ready'
                } else if (provider?.configured) {
                  pillClass = 'pill-warn'
                  statusText = '• Configured (disabled)'
                }

                return (
                  <tr key={key}>
                    <th scope="row" className="wrap-cell">{label}</th>
                    <td>
                      <span className={`pill ${pillClass}`} title={statusTitle}>
                        {statusText}
                      </span>
                    </td>
                  </tr>
                )
              })}

              <tr>
                <th scope="row" className="wrap-cell">Browser location (live run tracking)</th>
                <td>
                  <span className={`pill ${browserLocation.className}`} title={browserLocation.title}>
                    {browserLocation.text}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}