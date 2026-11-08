
const ALERT_RULES = [
  {
    name: 'Missed planned workouts',
    behavior:
      'Past planned sessions are marked missed when the runner dashboard is opened.',
    source: 'Training plan',
  },
  {
    name: 'Run reminders',
    behavior:
      'Browser push reminders require Web Push to be configured and the runner to opt in on their device.',
    source: 'Notifications',
  },
  {
    name: 'Google Calendar sync',
    behavior:
      'Calendar events sync only when a runner has connected Google Calendar and chooses Sync now.',
    source: 'Integrations',
  },
]

export default function AlertRules() {
  return (
    <>
      <div className="support-page-heading">
        <div>
          <p className="section-eyebrow">Help & Support</p>
          <h1>Alert Rules</h1>
          <p className="note">
            Understand how RunPlan notifications, reminders, and
            integrations currently work.
          </p>
        </div>
      </div>

      <section className="support-console-section">
        <div className="panel-head">
          <h2>RunPlan notifications and rules</h2>
          <span className="pill pill-muted">Read only</span>
        </div>

        <div className="support-rule-list">
          {ALERT_RULES.map((rule) => (
            <article key={rule.name}>
              <div>
                <h3>{rule.name}</h3>
                <p>{rule.behavior}</p>
              </div>
              <span className="pill pill-muted">{rule.source}</span>
            </article>
          ))}
        </div>

        <p className="note">
          These are the current app behaviors, not editable
          per-user alert thresholds.
        </p>
      </section>
    </>
  )
}
