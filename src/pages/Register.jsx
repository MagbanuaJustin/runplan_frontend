import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { apiPost } from '../api.js'
import { useAuth } from '../auth/AuthContext.jsx'
import useRecaptcha from '../auth/useRecaptcha.js'
import { BrandLogo, ThemeToggle } from '../components/Layout.jsx'

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'
const TERMS_VERSION = '2026-10-30'
const DOWNLOAD_PATH = '/download'

export default function Register() {
  const { status, loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  const googleButtonRef = useRef(null)
  const googleCallbackRef = useRef(null)
  const recaptcha = useRecaptcha()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  useEffect(() => {
    document.documentElement.dataset.theme =
      localStorage.getItem('rp_theme') || 'dark'
  }, [])

  useEffect(() => {
    if (!googleClientId) return undefined

    let cancelled = false
    let script = document.querySelector(
      `script[src="${GOOGLE_SCRIPT_SRC}"]`,
    )

    const renderGoogleButton = () => {
      if (cancelled || !googleButtonRef.current || !window.google?.accounts?.id) {
        return
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => googleCallbackRef.current?.(response),
      })

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'signup_with',
        shape: 'rectangular',
        width: 280,
      })
    }

    const handleScriptError = () => {
      if (!cancelled) {
        setFormError('Google sign-up could not load. Please use email and password.')
      }
    }

    if (window.google?.accounts?.id) {
      renderGoogleButton()
    } else {
      if (!script) {
        script = document.createElement('script')
        script.src = GOOGLE_SCRIPT_SRC
        script.async = true
        script.defer = true
        document.head.appendChild(script)
      }

      script.addEventListener('load', renderGoogleButton)
      script.addEventListener('error', handleScriptError)
    }

    return () => {
      cancelled = true
      script?.removeEventListener('load', renderGoogleButton)
      script?.removeEventListener('error', handleScriptError)
    }
  }, [googleClientId])

  googleCallbackRef.current = async (response) => {
    if (busy) return

    if (!response?.credential) {
      setFormError('Google did not return a sign-in credential. Please try again.')
      return
    }

    if (!acceptedTerms) {
      setErrors({ terms: 'Please accept the Terms of Use and Privacy Notice.' })
      return
    }

    setFormError('')
    setErrors({})
    setBusy(true)

    let recaptchaToken = ''
    try {
      recaptchaToken = recaptcha.getToken()
      await loginWithGoogle(
        response.credential,
        recaptchaToken,
        true,
        TERMS_VERSION,
      )
      navigate(DOWNLOAD_PATH, { replace: true })
    } catch (err) {
      setFormError(err.message || 'Google sign-up failed. Please try again.')
    } finally {
      if (recaptchaToken) recaptcha.reset()
      setBusy(false)
    }
  }

  if (status === 'in') {
    return <Navigate to={DOWNLOAD_PATH} replace />
  }

  const invalid = (key, id) => ({
    'aria-invalid': errors[key] ? 'true' : undefined,
    'aria-describedby': errors[key] ? `${id}-error` : undefined,
  })

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')

    const nextErrors = {}

    if (password !== confirm) {
      nextErrors.confirm = 'The passwords do not match.'
    }
    if (!acceptedTerms) {
      nextErrors.terms = 'Please accept the Terms of Use and Privacy Notice.'
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    setErrors({})
    setBusy(true)

    try {
      const recaptchaToken = recaptcha.getToken()

      await apiPost('/auth/register', {
        email,
        password,
        recaptcha_token: recaptchaToken,
        terms_accepted: true,
        terms_version: TERMS_VERSION,
      })

      navigate('/login', {
        replace: true,
        state: {
          from: { pathname: DOWNLOAD_PATH },
          notice: 'Your account was created. Sign in to download RunPlan.',
        },
      })
    } catch (err) {
      if (err.fields) setErrors(err.fields)
      else if (err.status === 409) setErrors({ email: err.message })
      else setFormError(err.message || 'Account creation failed. Please try again.')
    } finally {
      recaptcha.reset()
      setBusy(false)
    }
  }

  return (
    <div className="auth-split">
      <section className="auth-hero" aria-label="About RunPlan AI">
        <div>
          <BrandLogo />
        </div>

        <div className="auth-hero-body">
          <p className="auth-eyebrow">Adaptive Marathon Training Planner</p>
          <h2 className="auth-hero-title">
            Build a smarter path to your next finish line.
          </h2>
          <p className="auth-hero-copy">
            Set your experience level, target distance, and preferred training days.
            RunPlan structures weekly mileage safely and adapts as you log runs.
          </p>
          <svg
            className="auth-sparkline"
            viewBox="0 0 340 46"
            fill="none"
            aria-hidden="true"
          >
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
        <div className="auth-panel-top">
          <ThemeToggle />
        </div>

        <div className="auth-card">
          <h1>Create account</h1>
          <p className="auth-subtitle">
            Create a RunPlan account to continue to the Android download.
          </p>

          <form className="form" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="reg-email">Email</label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                {...invalid('email', 'reg-email')}
              />
              {errors.email && (
                <p id="reg-email-error" className="error" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="field">
              <label htmlFor="reg-password">Password</label>
              <div className="pw-wrap">
                <input
                  id="reg-password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-describedby={
                    errors.password ? 'reg-password-error' : 'reg-password-hint'
                  }
                  aria-invalid={errors.password ? 'true' : undefined}
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
              <small id="reg-password-hint">Use at least 8 characters.</small>
              {errors.password && (
                <p id="reg-password-error" className="error" role="alert">
                  {errors.password}
                </p>
              )}
            </div>

            <div className="field">
              <label htmlFor="reg-confirm">Confirm password</label>
              <input
                id="reg-confirm"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                {...invalid('confirm', 'reg-confirm')}
              />
              {errors.confirm && (
                <p id="reg-confirm-error" className="error" role="alert">
                  {errors.confirm}
                </p>
              )}
            </div>

            <div className="field">
              <label
                htmlFor="reg-terms"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '9px',
                  cursor: 'pointer',
                  lineHeight: 1.5,
                }}
              >
                <input
                  id="reg-terms"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => {
                    setAcceptedTerms(e.target.checked)
                    if (e.target.checked) {
                      setErrors((current) => ({ ...current, terms: undefined }))
                    }
                  }}
                  aria-invalid={errors.terms ? 'true' : undefined}
                  aria-describedby={errors.terms ? 'reg-terms-error' : undefined}
                  style={{
                    width: '16px',
                    height: '16px',
                    flex: '0 0 16px',
                    margin: '2px 0 0',
                    padding: 0,
                  }}
                />
                <span>
                  I have read and agree to the{' '}
                  <Link to="/terms">Terms of Use</Link> and{' '}
                  <Link to="/privacy">Privacy Notice</Link>.
                </span>
              </label>

              {errors.terms && (
                <p id="reg-terms-error" className="error" role="alert">
                  {errors.terms}
                </p>
              )}
            </div>

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

            {formError && (
              <p className="error" role="alert">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || !recaptcha.verified || !acceptedTerms}
            >
              {busy ? 'Creating account...' : 'Create account'}
            </button>

            <div className="recaptcha-disclosure">
              <small>
                This site is protected by reCAPTCHA and the Google{' '}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>{' '}
                and <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer">Terms of Service</a> apply.
              </small>
            </div>
          </form>

          <div className="auth-divider" role="separator">
            <span>Or continue with</span>
          </div>

          {googleClientId ? (
            <div
              ref={googleButtonRef}
              aria-label="Sign up with Google"
              aria-busy={busy}
              style={{
                display: 'flex',
                justifyContent: 'center',
                minHeight: '44px',
                pointerEvents:
                  busy || !recaptcha.verified || !acceptedTerms ? 'none' : undefined,
                opacity:
                  busy || !recaptcha.verified || !acceptedTerms ? 0.6 : 1,
              }}
            />
          ) : (
            <p className="error" role="status">
              Google sign-up is not configured. You can create an account with
              email and password.
            </p>
          )}

          {busy && (
            <p className="auth-subtitle" role="status">
              Creating your account...
            </p>
          )}

          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  )
}