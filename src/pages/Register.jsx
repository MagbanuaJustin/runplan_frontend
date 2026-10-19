import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { apiPost } from '../api.js'
import { useAuth } from '../auth/AuthContext.jsx'

export default function Register() {
  const { status, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  if (status === 'in') return <Navigate to="/dashboard" replace />

  const invalid = (key, id) => ({
    'aria-invalid': errors[key] ? 'true' : undefined,
    'aria-describedby': errors[key] ? `${id}-error` : undefined,
  })

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')

    if (password !== confirm) {
      setErrors({ confirm: 'The passwords do not match.' })
      return
    }

    setErrors({})
    setBusy(true)
    try {
      await apiPost('/auth/register', { email, password })
      try {
        await login(email, password)
        navigate('/dashboard', { replace: true })
      } catch {
        navigate('/login', { replace: true }) // account exists, just sign in manually
      }
    } catch (err) {
      if (err.fields) setErrors(err.fields)
      else if (err.status === 409) setErrors({ email: err.message })
      else setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="shell">
      <h1>Create your account</h1>
      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="reg-email">Email</label>
          <input id="reg-email" type="email" autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)} {...invalid('email', 'reg-email')} />
          {errors.email && <p id="reg-email-error" className="error" role="alert">{errors.email}</p>}
        </div>

        <div className="field">
          <label htmlFor="reg-password">Password</label>
          <input id="reg-password" type="password" autoComplete="new-password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby={errors.password ? 'reg-password-error' : 'reg-password-hint'}
            aria-invalid={errors.password ? 'true' : undefined} />
          <small id="reg-password-hint">At least 8 characters.</small>
          {errors.password && <p id="reg-password-error" className="error" role="alert">{errors.password}</p>}
        </div>

        <div className="field">
          <label htmlFor="reg-confirm">Confirm password</label>
          <input id="reg-confirm" type="password" autoComplete="new-password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} {...invalid('confirm', 'reg-confirm')} />
          {errors.confirm && <p id="reg-confirm-error" className="error" role="alert">{errors.confirm}</p>}
        </div>

        {formError && <p className="error" role="alert">{formError}</p>}
        <button type="submit" disabled={busy}>{busy ? 'Creating account...' : 'Create account'}</button>
      </form>
      <p>Already have an account? <Link to="/login">Log in</Link></p>
    </main>
  )
}