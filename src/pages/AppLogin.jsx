import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { SocialLogin } from '@capgo/capacitor-social-login'
import { useAuth } from '../auth/AuthContext.jsx'
import { BrandLogo, ThemeToggle } from '../components/Layout.jsx'

const PUBLIC_SITE_URL =
  import.meta.env.VITE_PUBLIC_SITE_URL || 'https://runplan-frontend-livid.vercel.app'

export default function AppLogin() {
  const { status, login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const googleBusy = useRef(false)
  const googleInitialization = useRef(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()
  const isAndroid = Capacitor.getPlatform() === 'android'
  const destination = location.state?.from?.pathname || '/dashboard'

  useEffect(() => {
    document.documentElement.dataset.theme =
      localStorage.getItem('rp_theme') || 'dark'
  }, [])

  if (status === 'in') {
    return <Navigate to={destination} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (busy) return

    setBusy(true)
    setError('')

    try {
      await login(email, password)
      navigate(destination, { replace: true })
    } catch (err) {
      setError(err.message || 'Sign-in failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleGoogleSignIn() {
    if (busy || googleBusy.current) return

    if (!isAndroid) {
      setError('Google sign-in is configured for the Android app.')
      return
    }

    if (!clientId) {
      setError('Google sign-in is not configured.')
      return
    }

    googleBusy.current = true
    setBusy(true)
    setError('')

    try {
      let initialization = googleInitialization.current

      if (!initialization) {
        initialization = SocialLogin.initialize({
          google: {
            webClientId: clientId,
            mode: 'online',
          },
        })
        googleInitialization.current = initialization
      }

      try {
        await initialization
      } catch (err) {
        googleInitialization.current = null
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

      await loginWithGoogle(idToken)
      navigate(destination, { replace: true })
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.')
    } finally {
      googleBusy.current = false
      setBusy(false)
    }
  }

  return (
    <div className="auth-split">
      <section className="auth-hero" aria-label="About RunPlan">
        <div><BrandLogo /></div>
        <div className="auth-hero-body">
          <p className="auth-eyebrow">RunPlan for Android</p>
          <h2 className="auth-hero-title">Your training, ready when you are.</h2>
          <p className="auth-hero-copy">
            Sign in to open your RunPlan training dashboard.
          </p>
        </div>
        <div className="auth-hero-foot">Plan &middot; Train &middot; Adapt</div>
      </section>

      <main className="auth-panel">
        <div className="auth-panel-top">
          <Link to="/login">RunPlan</Link>
          <ThemeToggle />
        </div>

        <div className="auth-card" aria-busy={busy}>
          <h1>Sign in</h1>
          <p className="auth-subtitle">
            Sign in with your RunPlan account to open the app.
          </p>

          <form className="form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="app-login-email">Email</label>
              <input
                id="app-login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={busy}
                required
              />
            </div>

            <div className="field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <label htmlFor="app-login-password">Password</label>
                <Link to="/forgot-password">Forgot password?</Link>
              </div>
              <div className="pw-wrap">
                <input
                  id="app-login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={busy}
                  required
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowPassword((shown) => !shown)}
                  disabled={busy}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && <p className="error" role="alert">{error}</p>}

            <button type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {isAndroid && (
            <div style={{ marginTop: '18px' }}>
              <p style={{ textAlign: 'center' }}>Or continue with</p>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={busy || !clientId}
                style={{ width: '100%' }}
              >
                Continue with Google
              </button>
            </div>
          )}

          <p className="auth-footer">
            Need an account?{' '}
            <a href={`${PUBLIC_SITE_URL}/register`} target="_blank" rel="noreferrer">
              Create one on the RunPlan website
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}