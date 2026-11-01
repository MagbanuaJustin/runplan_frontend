import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { SocialLogin } from '@capgo/capacitor-social-login'
import { useAuth } from '../auth/AuthContext.jsx'
import useRecaptcha from '../auth/useRecaptcha.js'
import { BrandLogo, ThemeToggle } from '../components/Layout.jsx'

const GOOGLE_SCRIPT_ID = 'runplan-google-identity-services'
const GOOGLE_SCRIPT_URL = 'https://accounts.google.com/gsi/client'
const DOWNLOAD_PATH = '/download'
const PUBLIC_SITE_URL =
  import.meta.env.VITE_PUBLIC_SITE_URL || 'https://runplan-frontend-livid.vercel.app'

export default function Login() {
  const { status, login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const googleButtonRef = useRef(null)
  const googleBusyRef = useRef(false)
  const nativeGoogleInitRef = useRef(null)
  const recaptcha = useRecaptcha()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [googleLoadError, setGoogleLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [googleSigningIn, setGoogleSigningIn] = useState(false)

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()
  const isNative = Capacitor.isNativePlatform()
  const isAndroid = Capacitor.getPlatform() === 'android'
  const from = location.state?.from?.pathname ??
    (isNative ? '/dashboard' : DOWNLOAD_PATH)
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

    let recaptchaToken = ''

    try {
      if (!isNative) {
        recaptchaToken = recaptcha.getToken()
      }

      await loginWithGoogle(idToken, recaptchaToken || undefined)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.')
    } finally {
      if (recaptchaToken) recaptcha.reset()
      googleBusyRef.current = false
      setGoogleSigningIn(false)
      setBusy(false)
    }
  }, [loginWithGoogle, navigate, from, isNative, recaptcha])

  const handleNativeGoogleSignIn = useCallback(async () => {
    if (googleBusyRef.current) return

    if (!isAndroid) {
      setError('Native Google sign-in is configured for Android only.')
      return
    }

    if (!clientId) {
      setError('Google sign-in is not configured. Check VITE_GOOGLE_CLIENT_ID.')
      return
    }

    googleBusyRef.current = true
    setError('')
    setGoogleLoadError('')
    setGoogleSigningIn(true)
    setBusy(true)

    try {
      let initialization = nativeGoogleInitRef.current

      if (!initialization) {
        initialization = SocialLogin.initialize({
          google: {
            webClientId: clientId,
            mode: 'online',
          },
        })
        nativeGoogleInitRef.current = initialization
      }

      try {
        await initialization
      } catch (err) {
        if (nativeGoogleInitRef.current === initialization) {
          nativeGoogleInitRef.current = null
        }
        throw err
      }

      const response = await SocialLogin.login({
        provider: 'google',
        options: {},
      })

      const idToken = response?.result?.idToken
      if (!idToken) {
        throw new Error('Google did not return an ID token. Please try again.')
      }

      // Native app sign-in does not use reCAPTCHA.
      await loginWithGoogle(idToken)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.')
    } finally {
      googleBusyRef.current = false
      setGoogleSigningIn(false)
      setBusy(false)
    }
  }, [clientId, isAndroid, loginWithGoogle, navigate, from])

  useEffect(() => {
    if (isNative) {
      setGoogleLoadError(
        isAndroid ? '' : 'Native Google sign-in is not configured for this platform.',
      )
      return undefined
    }

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
  }, [clientId, handleGoogleCredential, isNative, isAndroid])

  if (status === 'in') return <Navigate to={from} replace />

  async function handleSubmit(e) {
    e.preventDefault()
    if (busy) return

    setError('')
    setGoogleSigningIn(false)
    setBusy(true)

    let recaptchaToken = ''

    try {
      if (!isNative) {
        if (!recaptcha.verified) {
          throw new Error('Complete the human verification before signing in.')
        }
        recaptchaToken = recaptcha.getToken()
      }

      await login(email, password, recaptchaToken || undefined)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Sign-in failed. Please try again.')
    } finally {
      if (recaptchaToken) recaptcha.reset()
      setBusy(false)
    }
  }

  return (
    <div className="auth-split auth-focused">
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
          {isNative ? (
            <span aria-hidden="true" />
          ) : (
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
          )}
          <ThemeToggle />
        </div>

        <div className="auth-brand">
          <BrandLogo />
        </div>

        <div className="auth-card" aria-busy={busy}>
          <h1>Sign in</h1>
          <p className="auth-subtitle">
            {isNative
              ? 'Sign in with your RunPlan account to open the app.'
              : 'Sign in to access the RunPlan APK download.'}
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

            {!isNative && (
              <div className="field recaptcha-field">
                <label>Human verification</label>
                <div className="recaptcha-widget" ref={recaptcha.containerRef} />
                {recaptcha.error ? (
                  <p className="error" role="alert">{recaptcha.error}</p>
                ) : (
                  <small role="status">
                    {!recaptcha.ready
                      ? 'Loading secure verification…'
                      : recaptcha.verified
                        ? 'Verification complete.'
                        : recaptcha.enabled
                          ? 'Complete the checkbox to continue.'
                          : 'Human verification is turned off (development).'}
                  </small>
                )}
              </div>
            )}

            {error && <p className="error" role="alert">{error}</p>}

            <button
              type="submit"
              disabled={busy || (!isNative && !recaptcha.verified)}
            >
              {busy
                ? googleSigningIn
                  ? 'Google sign-in in progress…'
                  : 'Signing in…'
                : 'Sign in'}
            </button>

            {!isNative && (
              <div className="recaptcha-disclosure">
                <small>
                  This site is protected by reCAPTCHA and the Google{' '}
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>{' '}
                  and <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer">Terms of Service</a> apply.
                </small>
              </div>
            )}
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

            {isAndroid ? (
              <button
                type="button"
                onClick={handleNativeGoogleSignIn}
                disabled={busy || !clientId}
                aria-label="Continue with Google"
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  margin: '0 auto',
                  padding: '0 16px',
                  border: '1px solid #dadce0',
                  borderRadius: '4px',
                  color: '#3c4043',
                  background: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: busy || !clientId ? 'not-allowed' : 'pointer',
                  opacity: busy || !clientId ? 0.6 : 1,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{ color: '#4285f4', fontSize: '18px', fontWeight: 800 }}
                >
                  G
                </span>
                Continue with Google
              </button>
            ) : isNative ? (
              <p className="error" role="status">
                Native Google sign-in is not configured for this platform.
              </p>
            ) : (
              <div
                ref={googleButtonRef}
                style={{
                  display: busy ? 'none' : 'flex',
                  justifyContent: 'center',
                  minHeight: '40px',
                  pointerEvents:
                    busy || !recaptcha.verified ? 'none' : 'auto',
                  opacity: busy || !recaptcha.verified ? 0.6 : 1,
                }}
              />
            )}

            {googleLoadError && (
              <p className="error" role="status" style={{ marginTop: '10px' }}>
                {googleLoadError}
              </p>
            )}
          </div>

          {isNative ? (
            <p className="auth-footer">
              Need an account?{' '}
              <a href={`${PUBLIC_SITE_URL}/register`} target="_blank" rel="noreferrer">
                Create one on the RunPlan website
              </a>
            </p>
          ) : (
            <p className="auth-footer">
              New here? <Link to="/register">Create an account</Link>
            </p>
          )}
        </div>
      </main>
    </div>
  )
}