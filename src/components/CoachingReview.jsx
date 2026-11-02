import { Link } from 'react-router-dom'
import { formatDate } from '../format.js'

/* ---------------------------------------------------------------------------
 * Weekly coaching review card.
 * A highlighted, AI-branded card that turns the coach's plain text into
 * readable sections (headings, bullets) with icons, so runners can tell at a
 * glance what it is, where it came from and what to do next.
 * ------------------------------------------------------------------------- */

const ICONS = {
  sparkles: (
    <>
      <path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z" />
      <path d="M19 15l.8 1.9 1.9.8-1.9.8L19 20.5l-.8-1.9-1.9-.8 1.9-.8L19 15z" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.7 2.7L16.5 9.5" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.5l9.5 16.5h-19L12 3.5z" />
      <path d="M12 10v4.5M12 17.5v.01" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-14.6-4.4L3.5 8.5" />
      <path d="M3.5 4v4.5H8" />
      <path d="M4 13a8 8 0 0 0 14.6 4.4l1.9-1.9" />
      <path d="M20.5 20v-4.5H16" />
    </>
  ),
  activity: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8v.01" />
    </>
  ),
  status: (
    <>
      <rect x="3.5" y="4" width="17" height="6" rx="2" />
      <rect x="3.5" y="14" width="17" height="6" rx="2" />
      <path d="M7 7h.01M7 17h.01" />
    </>
  ),
}

function Icon({ name, size = 18 }) {
  return (
    <svg
      className="coach-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name] || ICONS.sparkles}
    </svg>
  )
}

function iconForHeading(title) {
  const t = title.toLowerCase()
  if (/(focus|next|goal|plan|target|recommend)/.test(t)) return 'target'
  if (/(well|strength|good|highlight|positive|win|great)/.test(t)) return 'check'
  if (/(watch|caution|risk|warning|rest|recover|injur|careful|concern|missing)/.test(t)) return 'alert'
  if (/(summary|overview|week)/.test(t)) return 'activity'
  return 'sparkles'
}

/** Render **bold** spans without using innerHTML. */
function Inline({ text }) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part,
  )
}

/**
 * Turn the coach's text into { intro: [paragraphs], sections: [{title, items, paras}] }.
 * Understands "**Heading**" lines, "- " / "• " bullets and blank-line paragraphs.
 */
export function parseCoachText(raw) {
  const lines = String(raw || '').replace(/\r/g, '').split('\n')
  const intro = []
  const sections = []
  let current = null
  let para = []

  const flushPara = () => {
    if (!para.length) return
    const text = para.join(' ')
    if (current) current.paras.push(text)
    else intro.push(text)
    para = []
  }

  for (const line of lines) {
    const trimmed = line.trim()
    const heading = trimmed.match(/^\*\*(.+?)\*\*:?$/) || trimmed.match(/^#{1,4}\s+(.+?):?$/)
    const bullet = trimmed.match(/^(?:[-•*]|\d+[.)])\s+(.+)$/)

    if (!trimmed) {
      flushPara()
    } else if (heading) {
      flushPara()
      current = { title: heading[1].trim(), items: [], paras: [] }
      sections.push(current)
    } else if (bullet) {
      flushPara()
      if (!current) {
        current = { title: 'Key points', items: [], paras: [] }
        sections.push(current)
      }
      current.items.push(bullet[1].trim())
    } else {
      para.push(trimmed)
    }
  }
  flushPara()

  return { intro, sections }
}

export default function CoachingReview({
  feedback,
  groqReady,
  isLiveGroq,
  busy,
  error,
  onRefresh,
}) {
  const parsed = feedback ? parseCoachText(feedback.feedback_text) : null

  const badge = isLiveGroq
    ? { label: 'Powered by Groq AI', tone: 'live' }
    : groqReady
      ? { label: 'Groq AI ready', tone: 'ready' }
      : { label: 'Rule-based coach', tone: 'muted' }

  const fallbackNote =
    feedback?.provider_status === 'cap_reached'
      ? 'Monthly AI limit reached, so this review uses the built-in rule-based coach.'
      : feedback?.provider_status === 'fallback'
        ? 'The AI was unreachable, so this review uses the built-in rule-based coach.'
        : ''

  return (
    <section className="coach-card" aria-labelledby="coach-title" aria-busy={busy}>
      <style>{COACH_CSS}</style>

      <header className="coach-head">
        <span className="coach-badge-icon" aria-hidden="true">
          <Icon name="sparkles" size={24} />
        </span>
        <div className="coach-head-text">
          <p className="coach-kicker">AI coach</p>
          <h2 id="coach-title">Weekly coaching review</h2>
          <p className="coach-sub">
            A plain-language summary of your last 7 days of runs and plan progress,
            with what to focus on next.
          </p>
        </div>
        <span className={`coach-status coach-status-${badge.tone}`}>
          <span className="coach-status-dot" aria-hidden="true" />
          {badge.label}
        </span>
      </header>

      {!feedback ? (
        <div className="coach-empty">
          <span className="coach-empty-icon" aria-hidden="true">
            <Icon name="sparkles" size={28} />
          </span>
          <div>
            <h3>Get your first weekly review</h3>
            <p>
              Generate a 7-day conditioning review from your manual runs and active plan adherence.
              {!groqReady &&
                ' Groq AI is not set up on the server, so RunPlan will use its built-in rule-based coach.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="coach-body">
          <p className="coach-window">
            <Icon name="calendar" size={15} />
            <span>
              {formatDate(feedback.period_start)} &ndash; {formatDate(feedback.period_end)}
            </span>
          </p>

          {fallbackNote && (
            <p className="coach-notice" role="note">
              <Icon name="info" size={16} />
              <span>{fallbackNote}</span>
            </p>
          )}

          {parsed.intro.length > 0 && (
            <div className="coach-intro">
              {parsed.intro.map((p, i) => (
                <p key={i}><Inline text={p} /></p>
              ))}
            </div>
          )}

          {parsed.sections.length > 0 && (
            <div className="coach-sections">
              {parsed.sections.map((section) => {
                const icon = iconForHeading(section.title)
                return (
                  <article className={`coach-section coach-section-${icon}`} key={section.title}>
                    <h3>
                      <span className="coach-section-icon" aria-hidden="true">
                        <Icon name={icon} size={17} />
                      </span>
                      {section.title}
                    </h3>
                    {section.paras.map((p, i) => (
                      <p key={i}><Inline text={p} /></p>
                    ))}
                    {section.items.length > 0 && (
                      <ul>
                        {section.items.map((item, i) => (
                          <li key={i}><Inline text={item} /></li>
                        ))}
                      </ul>
                    )}
                  </article>
                )
              })}
            </div>
          )}

          {feedback.persisted === false && (
            <p className="coach-notice coach-notice-warn" role="note">
              <Icon name="alert" size={16} />
              <span>
                This review was generated but could not be saved to your history, so it will be
                recomputed next time.
                {feedback.persist_error ? ` (${feedback.persist_error})` : ''}
              </span>
            </p>
          )}
        </div>
      )}

      {error && <p className="error coach-error" role="alert">{error}</p>}

      <footer className="coach-foot">
        <div className="coach-actions">
          <button
            type="button"
            className="btn btn-primary coach-btn"
            disabled={busy}
            onClick={onRefresh}
          >
            <span className={busy ? 'coach-spin' : ''}>
              <Icon name="refresh" size={17} />
            </span>
            {busy
              ? 'Analyzing your week…'
              : feedback
                ? 'Refresh weekly review'
                : 'Generate weekly review'}
          </button>
          <Link className="btn btn-secondary coach-btn" to="/status">
            <Icon name="status" size={17} />
            Provider status
          </Link>
        </div>
        <p className="coach-disclaimer">
          Training guidance only — not medical advice.
        </p>
      </footer>
    </section>
  )
}

const COACH_CSS = `
.coach-card {
  --coach-a: 110, 150, 230;
  --coach-b: 150, 130, 226;
  position: relative;
  margin-top: 18px;
  overflow: hidden;
  border: 1px solid rgba(var(--coach-a), .5);
  border-radius: 18px;
  background:
    linear-gradient(135deg, rgba(var(--coach-a), .16), rgba(var(--coach-b), .09) 55%, transparent 90%),
    var(--bg-surface);
  box-shadow: 0 0 0 1px rgba(var(--coach-a), .08), 0 16px 48px rgba(var(--coach-a), .16);
}

.coach-card::before {
  content: "";
  display: block;
  height: 4px;
  background: linear-gradient(90deg, #5b8def, #9a7cf0 55%, #3fc6b4);
}

.coach-head {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 16px;
  align-items: start;
  padding: 22px 24px 8px;
}

.coach-badge-icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  color: #fff;
  background: linear-gradient(135deg, #4f86f0, #8b6cf0);
  box-shadow: 0 8px 22px rgba(var(--coach-a), .4);
}

.coach-kicker {
  margin: 0 0 2px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--accent-bright, #7aa2eb);
}

.coach-card h2 {
  display: block;
  margin: 0;
  font-size: 22px;
  line-height: 1.2;
  letter-spacing: -.01em;
  color: var(--text);
}

.coach-sub {
  margin: 6px 0 0;
  max-width: 560px;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--text-secondary, var(--text-muted));
}

.coach-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  color: var(--text-secondary, var(--text-muted));
  background: var(--bg-input, transparent);
}

.coach-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
}

.coach-status-live {
  color: var(--success, #4ade80);
  border-color: rgba(74, 222, 128, .45);
  background: rgba(74, 222, 128, .1);
}
.coach-status-live .coach-status-dot {
  background: var(--success, #4ade80);
  box-shadow: 0 0 0 0 rgba(74, 222, 128, .6);
  animation: coach-pulse 2.2s ease-out infinite;
}
.coach-status-ready .coach-status-dot { background: var(--accent-bright, #7aa2eb); }

.coach-body,
.coach-empty,
.coach-error {
  margin: 0 24px;
}

.coach-body { padding-top: 14px; }

.coach-window {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 14px;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-secondary, var(--text-muted));
  border: 1px solid var(--border);
  background: var(--bg-input, transparent);
}

.coach-notice {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin: 0 0 14px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary, var(--text-muted));
  border: 1px solid var(--border);
  background: var(--bg-input, transparent);
}
.coach-notice .coach-icon { flex: none; margin-top: 2px; }
.coach-notice-warn {
  color: var(--warning, #f59e0b);
  border-color: rgba(245, 158, 11, .4);
  background: rgba(245, 158, 11, .08);
}

.coach-intro p {
  margin: 0 0 12px;
  font-size: 15.5px;
  line-height: 1.7;
  color: var(--text);
}

.coach-sections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
  margin-top: 6px;
}

.coach-section {
  padding: 16px 18px;
  border: 1px solid var(--border);
  border-left: 3px solid rgb(var(--coach-a));
  border-radius: 12px;
  background: var(--bg-input, rgba(255, 255, 255, .03));
}
.coach-section-target { border-left-color: #5b8def; }
.coach-section-check { border-left-color: #3fc6b4; }
.coach-section-alert { border-left-color: #f59e0b; }
.coach-section-activity { border-left-color: #9a7cf0; }

.coach-section h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 10px;
  font-size: 14.5px;
  color: var(--text);
}

.coach-section-icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  color: #5b8def;
  background: rgba(91, 141, 239, .16);
}
.coach-section-check .coach-section-icon { color: #3fc6b4; background: rgba(63, 198, 180, .16); }
.coach-section-alert .coach-section-icon { color: #f59e0b; background: rgba(245, 158, 11, .16); }
.coach-section-activity .coach-section-icon { color: #9a7cf0; background: rgba(154, 124, 240, .16); }

.coach-section p {
  margin: 0 0 8px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-secondary, var(--text));
}

.coach-section ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.coach-section li {
  position: relative;
  padding-left: 20px;
  font-size: 14px;
  line-height: 1.55;
  color: var(--text);
}

.coach-section li::before {
  content: "";
  position: absolute;
  left: 2px;
  top: .55em;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgb(var(--coach-a));
}
.coach-section-check li::before { background: #3fc6b4; }
.coach-section-alert li::before { background: #f59e0b; }
.coach-section-activity li::before { background: #9a7cf0; }

.coach-empty {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-top: 16px;
  padding: 18px;
  border: 1px dashed rgba(var(--coach-a), .5);
  border-radius: 14px;
  background: var(--bg-input, transparent);
}
.coach-empty h3 { margin: 0 0 4px; font-size: 16px; color: var(--text); }
.coach-empty p { margin: 0; font-size: 13.5px; line-height: 1.6; color: var(--text-secondary, var(--text-muted)); }
.coach-empty-icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  color: var(--accent-bright, #7aa2eb);
  background: rgba(var(--coach-a), .18);
}

.coach-error { margin-top: 12px; }

.coach-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  align-items: center;
  justify-content: space-between;
  margin-top: 20px;
  padding: 16px 24px 20px;
  border-top: 1px solid var(--border);
  background: rgba(var(--coach-a), .06);
}

.coach-actions { display: flex; flex-wrap: wrap; gap: 10px; }

.coach-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.coach-disclaimer {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}

.coach-spin { display: inline-flex; animation: coach-rotate 1s linear infinite; }

@keyframes coach-rotate { to { transform: rotate(360deg); } }
@keyframes coach-pulse {
  0% { box-shadow: 0 0 0 0 rgba(74, 222, 128, .55); }
  70%, 100% { box-shadow: 0 0 0 8px rgba(74, 222, 128, 0); }
}

@media (max-width: 720px) {
  .coach-head { grid-template-columns: auto 1fr; padding: 18px 16px 6px; }
  .coach-status { grid-column: 1 / -1; justify-self: start; }
  .coach-body, .coach-empty, .coach-error { margin: 0 16px; }
  .coach-foot { padding: 14px 16px 18px; }
  .coach-actions { width: 100%; }
  .coach-btn { flex: 1 1 100%; justify-content: center; }
  .coach-sections { grid-template-columns: 1fr; }
  .coach-empty { flex-direction: column; text-align: center; }
}

@media (prefers-reduced-motion: reduce) {
  .coach-status-live .coach-status-dot,
  .coach-spin { animation: none; }
}
`