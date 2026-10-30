import { Link } from 'react-router-dom'

const effectiveDate = 'October 30, 2026'
const downloadAfterLogin = { from: { pathname: '/download' } }

function PublicHeader() {
  return (
    <header className="public-header">
      <Link className="public-brand" to="/" aria-label="RunPlan home">
        <span className="public-brand-icon" aria-hidden="true">R</span>
        <span>RunPlan</span>
      </Link>

      <nav className="public-nav" aria-label="Main navigation">
        <Link to="/#features">Features</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/privacy">Privacy</Link>
        <Link
          className="public-nav-signin"
          to="/login"
          state={downloadAfterLogin}
        >
          Sign in
        </Link>
      </nav>
    </header>
  )
}

function PublicFooter() {
  return (
    <footer className="public-footer">
      <span>© {new Date().getFullYear()} RunPlan</span>
      <nav aria-label="Legal links">
        <Link to="/terms">Terms of Use</Link>
        <Link to="/privacy">Privacy Notice</Link>
        <Link to="/login" state={downloadAfterLogin}>Sign in</Link>
      </nav>
    </footer>
  )
}

function PublicShell({ children }) {
  return (
    <div className="public-site">
      <style>{`
        .public-site {
          min-height: 100vh;
          color: var(--text, #edf2fb);
          background:
            radial-gradient(ellipse 70% 50% at 50% 0%, rgba(59, 130, 246, .16), transparent 72%),
            var(--bg-canvas, #060a12);
          font-family: var(--font-sans, Inter, system-ui, sans-serif);
        }

        .public-site *,
        .public-site *::before,
        .public-site *::after {
          box-sizing: border-box;
        }

        .public-header {
          width: min(1180px, calc(100% - 40px));
          min-height: 76px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          border-bottom: 1px solid var(--border, #192841);
        }

        .public-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: var(--text, #edf2fb);
          font-size: 18px;
          font-weight: 750;
          letter-spacing: -.03em;
          text-decoration: none;
        }

        .public-brand:hover,
        .public-footer a:hover {
          text-decoration: none;
        }

        .public-brand-icon {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border: 1px solid var(--border-accent, rgba(96,165,250,.38));
          border-radius: 11px;
          color: var(--accent-bright, #60a5fa);
          background: var(--bg-active, rgba(59,130,246,.14));
          font-size: 16px;
          font-weight: 800;
        }

        .public-nav,
        .public-footer nav {
          display: flex;
          align-items: center;
          gap: 22px;
        }

        .public-nav a,
        .public-footer a {
          color: var(--text-secondary, #9fb0cc);
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
        }

        .public-nav a:hover,
        .public-footer a:hover {
          color: var(--text, #edf2fb);
        }

        .public-nav .public-nav-signin {
          padding: 9px 14px;
          color: var(--text, #edf2fb);
          border: 1px solid var(--border-strong, #253b5e);
          border-radius: 9px;
          background: var(--bg-surface, #0c1424);
        }

        .public-main {
          width: min(1080px, calc(100% - 40px));
          margin: 0 auto;
        }

        .public-hero {
          min-height: 520px;
          display: grid;
          align-content: center;
          justify-items: center;
          padding: 72px 0 64px;
          text-align: center;
        }

        .public-eyebrow {
          margin: 0 0 18px;
          color: var(--accent-bright, #60a5fa);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        .public-hero h1 {
          max-width: 850px;
          margin: 0;
          font-size: clamp(40px, 7vw, 76px);
          line-height: 1.02;
          letter-spacing: -.055em;
        }

        .public-hero-copy {
          max-width: 650px;
          margin: 22px 0 0;
          color: var(--text-secondary, #9fb0cc);
          font-size: clamp(16px, 2vw, 19px);
          line-height: 1.7;
        }

        .public-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 12px;
          margin-top: 30px;
        }

        .public-button {
          min-height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 19px;
          border: 1px solid var(--border-strong, #253b5e);
          border-radius: 10px;
          color: var(--text, #edf2fb);
          background: var(--bg-surface, #0c1424);
          font: inherit;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
          transition: transform .15s ease, border-color .15s ease, background .15s ease;
        }

        .public-button:hover {
          transform: translateY(-1px);
          border-color: var(--accent-bright, #60a5fa);
          text-decoration: none;
        }

        .public-button-primary {
          color: var(--accent-fg, #fff);
          border-color: var(--accent, #3b82f6);
          background: var(--accent, #3b82f6);
        }

        .public-button-primary:hover {
          border-color: var(--accent-hover, #2563eb);
          background: var(--accent-hover, #2563eb);
        }

        .public-section {
          padding: 30px 0 72px;
          scroll-margin-top: 30px;
        }

        .public-section-heading {
          max-width: 650px;
          margin: 0 auto 28px;
          text-align: center;
        }

        .public-section-heading h2 {
          margin: 0;
          font-size: clamp(25px, 4vw, 38px);
          letter-spacing: -.035em;
        }

        .public-section-heading p {
          margin: 12px 0 0;
          color: var(--text-secondary, #9fb0cc);
          line-height: 1.7;
        }

        .public-feature-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .public-feature {
          min-height: 160px;
          padding: 22px;
          border: 1px solid var(--border, #192841);
          border-radius: 14px;
          background: linear-gradient(145deg, var(--bg-elevated, #101b30), var(--bg-surface, #0c1424));
        }

        .public-feature-mark {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          margin-bottom: 14px;
          border: 1px solid var(--border-accent, rgba(96,165,250,.38));
          border-radius: 10px;
          color: var(--accent-bright, #60a5fa);
          background: var(--bg-active, rgba(59,130,246,.14));
          font-weight: 800;
        }

        .public-feature h3 {
          margin: 0 0 8px;
          font-size: 16px;
        }

        .public-feature p {
          margin: 0;
          color: var(--text-secondary, #9fb0cc);
          font-size: 13px;
          line-height: 1.65;
        }

        .public-safety {
          margin: 0 0 70px;
          padding: 20px 22px;
          border: 1px solid var(--warning-border, rgba(251,191,36,.34));
          border-radius: 12px;
          color: var(--text-secondary, #9fb0cc);
          background: var(--warning-bg, rgba(245,158,11,.12));
          line-height: 1.7;
        }

        .public-safety strong {
          color: var(--warning, #fbbf24);
        }

        .public-steps {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .public-step {
          padding: 20px;
          border: 1px solid var(--border, #192841);
          border-radius: 12px;
          background: var(--bg-surface, #0c1424);
        }

        .public-step-number {
          display: block;
          margin-bottom: 12px;
          color: var(--accent-bright, #60a5fa);
          font-family: var(--font-mono, monospace);
          font-size: 12px;
          font-weight: 800;
        }

        .public-step h3 {
          margin: 0 0 8px;
          font-size: 15px;
        }

        .public-step p {
          margin: 0;
          color: var(--text-secondary, #9fb0cc);
          font-size: 13px;
          line-height: 1.6;
        }

        .public-legal-wrap {
          width: min(820px, calc(100% - 40px));
          margin: 0 auto;
          padding: 60px 0 80px;
        }

        .public-legal-wrap h1 {
          margin: 0;
          font-size: clamp(32px, 5vw, 48px);
          letter-spacing: -.04em;
        }

        .public-legal-date {
          margin: 10px 0 30px;
          color: var(--text-muted, #667896);
          font-size: 13px;
        }

        .public-legal-content {
          padding: 28px;
          border: 1px solid var(--border, #192841);
          border-radius: 14px;
          background: var(--bg-surface, #0c1424);
        }

        .public-legal-content h2 {
          margin: 26px 0 8px;
          font-size: 17px;
        }

        .public-legal-content h2:first-child {
          margin-top: 0;
        }

        .public-legal-content p,
        .public-legal-content li {
          color: var(--text-secondary, #9fb0cc);
          font-size: 14px;
          line-height: 1.75;
        }

        .public-legal-content ul {
          padding-left: 22px;
        }

        .public-back-link {
          display: inline-block;
          margin-bottom: 20px;
          font-size: 13px;
          font-weight: 650;
        }

        .public-footer {
          width: min(1180px, calc(100% - 40px));
          min-height: 76px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin: 0 auto;
          border-top: 1px solid var(--border, #192841);
          color: var(--text-muted, #667896);
          font-size: 12px;
        }

        @media (max-width: 700px) {
          .public-header {
            width: min(100% - 28px, 1180px);
            min-height: 64px;
          }

          .public-nav {
            gap: 12px;
          }

          .public-nav a {
            font-size: 12px;
          }

          .public-nav a:nth-child(1) {
            display: none;
          }

          .public-main {
            width: min(100% - 28px, 1080px);
          }

          .public-hero {
            min-height: auto;
            padding: 84px 0 72px;
          }

          .public-feature-grid,
          .public-steps {
            grid-template-columns: 1fr;
          }

          .public-footer {
            width: min(100% - 28px, 1180px);
            align-items: flex-start;
            flex-direction: column;
            padding: 20px 0;
          }

          .public-footer nav {
            flex-wrap: wrap;
            gap: 14px;
          }

          .public-legal-wrap {
            width: min(100% - 28px, 820px);
            padding-top: 38px;
          }

          .public-legal-content {
            padding: 20px;
          }
        }

        @media (max-width: 420px) {
          .public-nav {
            gap: 9px;
          }

          .public-nav a:nth-child(2) {
            display: none;
          }

          .public-button {
            width: 100%;
          }

          .public-actions {
            width: 100%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .public-button {
            transition: none;
          }
        }
      `}</style>

      <PublicHeader />
      {children}
      <PublicFooter />
    </div>
  )
}

export function LandingPage() {
  return (
    <PublicShell>
      <main className="public-main">
        <section className="public-hero">
          <p className="public-eyebrow">Your running, with a plan</p>
          <h1>Make every run part of your progress.</h1>
          <p className="public-hero-copy">
            Plan training around your goal and schedule, record runs, and follow
            your progress in one place.
          </p>
          <div className="public-actions">
            <Link
              className="public-button public-button-primary"
              to="/register"
              state={{ next: '/download' }}
            >
              Create a RunPlan account
            </Link>
            <Link
              className="public-button"
              to="/login"
              state={downloadAfterLogin}
            >
              I already have an account
            </Link>
          </div>
        </section>

        <section className="public-section" id="features">
          <div className="public-section-heading">
            <p className="public-eyebrow">RunPlan features</p>
            <h2>A clearer way to train</h2>
            <p>
              Keep your training plan, run history, and schedule together as
              you work toward your next running goal.
            </p>
          </div>

          <div className="public-feature-grid">
            <article className="public-feature">
              <span className="public-feature-mark" aria-hidden="true">01</span>
              <h3>Training plans</h3>
              <p>
                Build a schedule around your goal, experience, and available
                training days.
              </p>
            </article>

            <article className="public-feature">
              <span className="public-feature-mark" aria-hidden="true">02</span>
              <h3>Run recording</h3>
              <p>
                Record a run with your phone’s location services and review
                distance, time, pace, and route.
              </p>
            </article>

            <article className="public-feature">
              <span className="public-feature-mark" aria-hidden="true">03</span>
              <h3>Calendar and history</h3>
              <p>
                See planned workouts alongside completed runs and follow how
                your training changes over time.
              </p>
            </article>

            <article className="public-feature">
              <span className="public-feature-mark" aria-hidden="true">04</span>
              <h3>One account across devices</h3>
              <p>
                Sign in to RunPlan on the web or in the installed Android app
                with any valid RunPlan account.
              </p>
            </article>
          </div>
        </section>

        <aside className="public-safety">
          <strong>Running and location note:</strong> GPS accuracy depends on
          your phone, permissions, signal, and surroundings. RunPlan’s training
          suggestions are general guidance, not medical advice. Choose a safe
          route and stop if you feel unwell or injured.
        </aside>

        <section className="public-section">
          <div className="public-section-heading">
            <p className="public-eyebrow">Getting started</p>
            <h2>Three steps to RunPlan</h2>
          </div>

          <div className="public-steps">
            <article className="public-step">
              <span className="public-step-number">STEP 01</span>
              <h3>Create your account</h3>
              <p>
                Register on this website and complete the human verification
                check.
              </p>
            </article>

            <article className="public-step">
              <span className="public-step-number">STEP 02</span>
              <h3>Review the policies</h3>
              <p>
                Read the Terms of Use and Privacy Notice before creating an
                account.
              </p>
            </article>

            <article className="public-step">
              <span className="public-step-number">STEP 03</span>
              <h3>Get the Android app</h3>
              <p>
                Sign in with a RunPlan account to access the Android app
                download.
              </p>
            </article>
          </div>

          <div className="public-actions">
            <Link
              className="public-button public-button-primary"
              to="/register"
              state={{ next: '/download' }}
            >
              Get started
            </Link>
          </div>
        </section>
      </main>
    </PublicShell>
  )
}

export function TermsPage() {
  return (
    <PublicShell>
      <main className="public-legal-wrap">
        <Link className="public-back-link" to="/">← Back to RunPlan</Link>
        <h1>Terms of Use</h1>
        <p className="public-legal-date">Effective {effectiveDate}</p>

        <article className="public-legal-content">
          <p>
            These Terms explain the basic rules for using RunPlan’s website,
            Android app, and training features. By creating an account or using
            RunPlan, you agree to these Terms.
          </p>

          <h2>Using RunPlan</h2>
          <p>
            RunPlan provides tools for planning training, recording runs, and
            reviewing running activity. You must provide accurate account
            information, keep your sign-in details secure, and use the service
            lawfully.
          </p>

          <h2>Training and safety</h2>
          <p>
            RunPlan’s plans, pace estimates, GPS measurements, and other
            guidance are informational. They are not medical advice and do not
            replace advice from a qualified health professional. Training
            carries risk. You are responsible for deciding whether a workout
            and route are suitable for you.
          </p>
          <p>
            GPS and phone sensors can be delayed or inaccurate, especially
            indoors, near tall buildings, under cover, or when the phone has a
            weak signal. Check your surroundings and do not rely on RunPlan as
            an emergency or navigation service.
          </p>

          <h2>Accounts and access</h2>
          <p>
            You are responsible for activity performed through your account.
            We may suspend access when needed to protect users, the service, or
            its security. You can request account deletion through the account
            controls available in RunPlan.
          </p>

          <h2>Third-party services</h2>
          <p>
            Some features may depend on third-party services, such as Google
            sign-in, calendar connections, maps, human verification, or
            optional AI features. Those services may have their own terms and
            privacy practices.
          </p>

          <h2>Changes and availability</h2>
          <p>
            Features may change as RunPlan is maintained and improved. We may
            update these Terms; the effective date above will show the latest
            version. Continued use after an update means you accept the revised
            Terms.
          </p>

          <h2>Contact</h2>
          <p>
            For help with your account or a problem using RunPlan, use the
            support and reporting options available in the app.
          </p>
        </article>
      </main>
    </PublicShell>
  )
}

export function PrivacyPage() {
  return (
    <PublicShell>
      <main className="public-legal-wrap">
        <Link className="public-back-link" to="/">← Back to RunPlan</Link>
        <h1>Privacy Notice</h1>
        <p className="public-legal-date">Effective {effectiveDate}</p>

        <article className="public-legal-content">
          <p>
            This notice describes the information RunPlan uses to provide
            accounts, training plans, run recording, and related features.
          </p>

          <h2>Information you provide</h2>
          <ul>
            <li>Account details such as your email address and sign-in method.</li>
            <li>Profile and training preferences you choose to provide.</li>
            <li>Training plans, run records, and support reports you submit.</li>
            <li>Location and route data when you use GPS run recording.</li>
          </ul>

          <h2>Information from connected features</h2>
          <p>
            If you choose to use an optional connected feature, RunPlan may
            process the information needed for that feature, such as a Google
            sign-in credential or calendar information for calendar sync.
            Human verification on website registration is processed by
            Google’s reCAPTCHA service.
          </p>

          <h2>How information is used</h2>
          <p>
            RunPlan uses information to operate your account, create and
            display training plans, record and summarize runs, provide
            requested integrations, respond to support requests, and protect
            the service from misuse. If you use an AI feature, the information
            submitted for that request may be sent to the AI service that
            provides the response.
          </p>

          <h2>Location controls</h2>
          <p>
            GPS recording needs location permission on your device. You can
            deny or revoke that permission in your device settings. Without
            location access, GPS run recording may not work, but other account
            features may remain available.
          </p>

          <h2>Service providers</h2>
          <p>
            RunPlan uses service providers to host the service and provide
            features you choose, such as sign-in, maps, calendar sync, human
            verification, or AI responses. Information sent to those providers
            is subject to their own privacy notices.
          </p>

          <h2>Retention and account choices</h2>
          <p>
            RunPlan keeps information for as long as needed to provide the
            service, maintain security, and meet applicable obligations.
            Account deletion can be requested through the account controls in
            RunPlan. Some records may remain temporarily in backups or where
            retention is required.
          </p>

          <h2>Security and updates</h2>
          <p>
            RunPlan uses measures intended to protect account and training
            information. No internet service can guarantee absolute security.
            This Notice may be updated as RunPlan’s features or data handling
            change; the effective date above will show the latest version.
          </p>

          <h2>Contact</h2>
          <p>
            For privacy questions or requests, use the support and reporting
            options available in the app.
          </p>
        </article>
      </main>
    </PublicShell>
  )
}