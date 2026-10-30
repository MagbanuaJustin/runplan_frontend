import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { BrandLogo, ThemeToggle } from '../components/Layout.jsx'

const GOOGLE_SCRIPT_ID = 'runplan-google-identity-services'
const GOOGLE_SCRIPT_URL = 'https://accounts.google.com/gsi/client'

export default function Login() {
  const { status, login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const googleButtonRef = useRef(null)
  const googleBusyRef = useRef(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [googleLoadError, setGoogleLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [googleSigningIn, setGoogleSigningIn] = useState(false)

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()
  const from = location.state?.from?.pathname ?? '/dashboard'
  const notice = location.state?.notice ?? ''

  useEffect(() => {
    document.documentElement.dataset.theme =
      localStorage.getItem('rp_theme') || 'dark'
  }, [])

  const handleGoogleCredential = useCallback(async (idToken) => {
    if (!idToken || googleBusyRef.current) return

    googleBusyRef.current = true
    setError('')
    setGoogleLoadError('')
    setGoogleSigningIn(true)
    setBusy(true)

    try {
      await loginWithGoogle(idToken)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.')
    } finally {
      googleBusyRef.current = false
      setGoogleSigningIn(false)
      setBusy(false)
    }
  }, [loginWithGoogle, navigate, from])

  useEffect(() => {
    if (!clientId) {
      setGoogleLoadError(
        'Google sign-in is not configured. Check VITE_GOOGLE_CLIENT_ID in the frontend .env file.',
      )
      return undefined
    }

    let cancelled = false
    let script = document.getElementById(GOOGLE_SCRIPT_ID)

    const handleScriptError = () => {
      if (!cancelled) {
        setGoogleLoadError(
          'Google sign-in could not load. Check your internet connection and try again.',
        )
      }
    }

    const renderGoogleButton = () => {
      if (cancelled || !googleButtonRef.current) return

      const googleId = window.google?.accounts?.id
      if (!googleId) {
        handleScriptError()
        return
      }

      setGoogleLoadError('')
      googleButtonRef.current.replaceChildren()

      googleId.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response?.credential) {
            void handleGoogleCredential(response.credential)
          } else {
            setError('Google did not return a sign-in credential. Please try again.')
          }
        },
        auto_select: false,
      })

      const buttonWidth = Math.min(
        400,
        Math.max(180, googleButtonRef.current.clientWidth || 320),
      )

      googleId.renderButton(googleButtonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: buttonWidth,
      })
    }

    if (window.google?.accounts?.id) {
      renderGoogleButton()
    } else {
      if (!script) {
        script = document.createElement('script')
        script.id = GOOGLE_SCRIPT_ID
        script.src = GOOGLE_SCRIPT_URL
        script.async = true
        script.defer = true
      }

      script.addEventListener('load', renderGoogleButton)
      script.addEventListener('error', handleScriptError)

      if (!script.isConnected) {
        document.head.appendChild(script)
      }
    }

    return () => {
      cancelled = true
      script?.removeEventListener('load', renderGoogleButton)
      script?.removeEventListener('error', handleScriptError)
    }
  }, [clientId, handleGoogleCredential])

  if (status === 'in') return <Navigate to={from} replace />

  async function handleSubmit(e) {
    e.preventDefault()
    if (busy) return

    setError('')
    setGoogleSigningIn(false)
    setBusy(true)

    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Sign-in failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-split">
      <style>
        {`
          @keyframes runplan-login-spin {
            to { transform: rotate(360deg); }
          }

          .runplan-login-spinner {
            width: 18px;
            height: 18px;
            flex: 0 0 18px;
            border: 2px solid currentColor;
            border-top-color: transparent;
            border-radius: 50%;
            animation: runplan-login-spin 0.8s linear infinite;
          }

          @media (prefers-reduced-motion: reduce) {
            .runplan-login-spinner {
              animation-duration: 1.8s;
            }
          }
        `}
      </style>

      <section className="auth-hero" aria-label="About RunPlan AI">
        <div>
          <BrandLogo />
        </div>

        <div className="auth-hero-body">
          <p className="auth-eyebrow">Adaptive Marathon Training Planner</p>
          <h2 className="auth-hero-title">
            See how every stride shapes race day.
          </h2>
          <p className="auth-hero-copy">
            RunPlan builds validated weekly schedules around your goal and available days,
            turning logged manual runs into pace history, adherence metrics, and safe plan revisions.
          </p>
          <svg className="auth-sparkline" viewBox="0 0 340 46" fill="none" aria-hidden="true">
            <polyline
              points="4,36 52,32 96,26 140,30 186,18 232,22 282,10 336,14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="auth-hero-foot">Plan &middot; Train &middot; Adapt</div>
      </section>

      <main className="auth-panel">
        <div
          className="auth-panel-top"
          style={{
            left: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <Link
            to="/"
            style={{
              color: 'var(--accent-bright)',
              fontSize: '13px',
              fontWeight: 650,
              textDecoration: 'none',
            }}
          >
            ← Back to RunPlan
          </Link>
          <ThemeToggle />
        </div>

        <div className="auth-card" aria-busy={busy}>
          <h1>Sign in</h1>
          <p className="auth-subtitle">
            Enter your runner account to open your training dashboard.
          </p>

          {notice && <p className="success" role="status">{notice}</p>}

          {busy && (
            <div
              role="status"
              aria-live="polite"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                margin: '12px 0',
                padding: '12px',
                border: '1px solid rgba(59, 130, 246, 0.35)',
                borderRadius: '10px',
                background: 'rgba(59, 130, 246, 0.08)',
              }}
            >
              <span className="runplan-login-spinner" aria-hidden="true" />
              <span>
                {googleSigningIn
                  ? 'Signing in with Google… Please wait.'
                  : 'Signing in… Please wait.'}
              </span>
            </div>
          )}

          <form className="form" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
                required
              />
            </div>

            <div className="field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <label htmlFor="password">Password</label>
                <Link to="/forgot-password" style={{ fontSize: '12px', fontWeight: 600 }}>
                  Forgot password?
                </Link>
              </div>

              <div className="pw-wrap">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                  required
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  disabled={busy}
                >
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && <p className="error" role="alert">{error}</p>}

            <button type="submit" disabled={busy}>
              {busy
                ? googleSigningIn
                  ? 'Google sign-in in progress…'
                  : 'Signing in…'
                : 'Sign in'}
            </button>
          </form>

          <div style={{ marginTop: '18px' }} aria-busy={googleSigningIn}>
            <p
              style={{
                textAlign: 'center',
                fontSize: '12px',
                margin: '0 0 12px',
                opacity: 0.75,
              }}
            >
              Or continue with
            </p>

            <div
              ref={googleButtonRef}
              style={{
                display: busy ? 'none' : 'flex',
                justifyContent: 'center',
                minHeight: '40px',
                pointerEvents: busy ? 'none' : 'auto',
              }}
            />

            {googleLoadError && (
              <p className="error" role="status" style={{ marginTop: '10px' }}>
                {googleLoadError}
              </p>
            )}
          </div>

          <p className="auth-footer">
            New here? <Link to="/register">Create an account</Link>
          </p>
        </div>
      </main>
    </div>
  )
}