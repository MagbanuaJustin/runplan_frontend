import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiDownload } from '../api.js'
import { useAuth } from '../auth/AuthContext.jsx'
import LiveBackground from '../components/LiveBackground.jsx'
import { useToastOnChange } from '../components/Toast.jsx'

const APK_NAME = 'RunPlan-Android.apk'

const INSTALL_STEPS = [
  {
    title: 'Download the installer',
    body: `Tap the download button above. Your phone saves ${APK_NAME} to its Downloads folder.`,
  },
  {
    title: 'Open the file',
    body: 'Open it from the download notification or your Files app, then choose Install.',
  },
  {
    title: 'Allow the install if asked',
    body: 'Android may ask you to allow installs from your browser or file manager. Turn it on for this one install, then go back and tap Install.',
  },
  {
    title: 'Sign in and run',
    body: 'Open RunPlan and sign in with your RunPlan account to see your plan, runs and schedule.',
  },
]

const GOOD_TO_KNOW = [
  {
    title: 'Install blocked or warned?',
    body: 'Android and Google Play Protect may warn about apps installed outside the Play Store. RunPlan is installed from this page, so choose to install anyway only if you downloaded it here.',
  },
  {
    title: 'Can’t install over an older version?',
    body: 'If Android says the app can’t be installed over your existing debug version, uninstall that version first, then open the downloaded APK again.',
  },
  {
    title: 'Download didn’t start?',
    body: 'Check your connection and try again. If it keeps failing, make sure your phone has free storage and that your browser is allowed to download files.',
  },
  {
    title: 'Your account stays private',
    body: 'The download is only offered to signed-in RunPlan users. Never share the APK file or your password with anyone.',
  },
]

export default function DownloadPage() {
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  useToastOnChange(message)
  useToastOnChange(error, 'error')

  async function handleDownload() {
    if (busy) return

    setBusy(true)
    setError('')
    setMessage('')

    try {
      const blob = await apiDownload('/downloads/android')

      if (!blob || blob.size === 0) {
        throw new Error('The Android package was empty. Please try again later.')
      }

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = APK_NAME
      document.body.appendChild(link)
      link.click()
      link.remove()

      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      setMessage('Download started. Open the APK from your phone’s Downloads.')
    } catch (err) {
      setError(err.message || 'Download failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="shell dl-page">
      <LiveBackground />
      <style>{`
        .dl-page {
          max-width: 760px;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding-top: clamp(32px, 8vh, 80px);
        }

        .dl-page > h1:first-child,
        .dl-page > h1 {
          display: block;
        }

        .dl-title {
          margin: 0 0 10px;
          font-size: clamp(28px, 5vw, 40px);
          line-height: 1.12;
          letter-spacing: -0.025em;
          color: var(--text);
        }

        .dl-lead {
          margin: 0 auto 28px;
          max-width: 520px;
          font-size: 15px;
          line-height: 1.6;
          color: var(--text-secondary, var(--text-muted));
        }

        .dl-lead strong { color: var(--text); }

        .dl-card,
        .dl-section {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid var(--border);
          border-radius: 16px;
          background: var(--bg-surface);
          box-shadow: 0 12px 40px rgba(0, 0, 0, .18);
        }

        .dl-card {
          padding: 32px 28px 28px;
          margin-bottom: 20px;
        }

        .dl-app-icon {
          display: grid;
          place-items: center;
          width: 56px;
          height: 56px;
          margin: 0 auto 14px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: var(--bg-active, rgba(59, 130, 246, .14));
          color: var(--accent-bright, #7aa2eb);
        }

        .dl-card h2 {
          display: block;
          margin: 0 0 8px;
          font-size: 20px;
          color: var(--text);
        }

        .dl-card p {
          margin: 0 auto 20px;
          max-width: 480px;
          font-size: 14px;
          line-height: 1.6;
          color: var(--text-secondary, var(--text-muted));
        }

        .dl-chips {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
          margin: 0 0 22px;
          padding: 0;
          list-style: none;
        }

        .dl-chips li {
          padding: 4px 12px;
          border: 1px solid var(--border);
          border-radius: 999px;
          font-size: 12px;
          color: var(--text-muted);
          background: var(--bg-input, transparent);
        }

        .dl-button {
          min-width: 240px;
          min-height: 48px;
          font-size: 15px;
        }

        .dl-status {
          min-height: 20px;
          margin: 14px 0 0;
          font-size: 13px;
        }

        .dl-status.is-ok { color: var(--success, #4ade80); }
        .dl-status.is-error { color: var(--danger, #f87171); }

        .dl-section {
          padding: 26px 24px;
          margin-bottom: 20px;
          text-align: left;
        }

        .dl-section h2 {
          display: block;
          margin: 0 0 4px;
          font-size: 17px;
          text-align: center;
          color: var(--text);
        }

        .dl-section-sub {
          margin: 0 0 20px;
          text-align: center;
          font-size: 13px;
          color: var(--text-muted);
        }

        .dl-steps {
          display: grid;
          gap: 14px;
          margin: 0;
          padding: 0;
          list-style: none;
          counter-reset: dl-step;
        }

        .dl-steps li {
          display: grid;
          grid-template-columns: 32px 1fr;
          gap: 14px;
          align-items: start;
          counter-increment: dl-step;
        }

        .dl-steps li::before {
          content: counter(dl-step);
          display: grid;
          place-items: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          font-size: 13px;
          font-weight: 700;
          color: var(--accent-bright, #7aa2eb);
          background: var(--bg-active, rgba(59, 130, 246, .14));
          border: 1px solid var(--border);
        }

        .dl-steps strong,
        .dl-info strong {
          display: block;
          margin-bottom: 2px;
          font-size: 14px;
          color: var(--text);
        }

        .dl-steps span,
        .dl-info span {
          font-size: 13px;
          line-height: 1.55;
          color: var(--text-secondary, var(--text-muted));
        }

        .dl-info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .dl-info {
          padding: 14px 16px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--bg-input, transparent);
        }

        .dl-links {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px 22px;
          margin: 4px 0 0;
          font-size: 14px;
        }

        @media (max-width: 640px) {
          .dl-info-grid { grid-template-columns: 1fr; }
          .dl-card { padding: 26px 18px 22px; }
          .dl-section { padding: 22px 16px; }
          .dl-button { width: 100%; min-width: 0; }
        }
      `}</style>

      <p className="section-eyebrow">RunPlan for Android</p>
      <h1 className="dl-title">Download the app</h1>
      <p className="dl-lead">
        You’re signed in as <strong>{user?.email || 'your RunPlan account'}</strong>.
        Install RunPlan on your Android phone to follow your plan and log runs on the go.
      </p>

      <section className="dl-card" aria-busy={busy} aria-labelledby="dl-card-title">
        <div className="dl-app-icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h4l3-8 4 16 3-8h4" />
          </svg>
        </div>
        <h2 id="dl-card-title">RunPlan for Android</h2>
        <p>
          The APK download is available to signed-in RunPlan users. After it
          downloads, open the file on your phone and follow Android’s install prompts.
        </p>

        <ul className="dl-chips" aria-label="Download details">
          <li>Android installer (.apk)</li>
          <li>File: {APK_NAME}</li>
          <li>Signed-in users only</li>
        </ul>

        <button
          className="btn btn-primary dl-button"
          type="button"
          onClick={handleDownload}
          disabled={busy}
        >
          {busy ? 'Preparing download…' : 'Download RunPlan APK'}
        </button>

        <p
          className={`dl-status${message ? ' is-ok' : ''}${error ? ' is-error' : ''}`}
          role="status"
          aria-live="polite"
        >
          {error || message}
        </p>
      </section>

      <section className="dl-section" aria-labelledby="dl-steps-title">
        <h2 id="dl-steps-title">How to install</h2>
        <p className="dl-section-sub">Four quick steps on your phone.</p>
        <ol className="dl-steps">
          {INSTALL_STEPS.map((step) => (
            <li key={step.title}>
              <div>
                <strong>{step.title}</strong>
                <span>{step.body}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="dl-section" aria-labelledby="dl-help-title">
        <h2 id="dl-help-title">Good to know</h2>
        <p className="dl-section-sub">Answers to the most common install questions.</p>
        <div className="dl-info-grid">
          {GOOD_TO_KNOW.map((item) => (
            <div className="dl-info" key={item.title}>
              <strong>{item.title}</strong>
              <span>{item.body}</span>
            </div>
          ))}
        </div>
      </section>

      <nav className="dl-links" aria-label="More">
        <Link to="/dashboard">Back to your dashboard</Link>
        <Link to="/support/report">Having a problem? Report it</Link>
      </nav>
    </div>
  )
}