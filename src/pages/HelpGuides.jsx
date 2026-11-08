
const HELP_GUIDES = [
  [
    'GPS run tracking',
    'Open Start a Run, allow location access, wait for a GPS fix, then start and save the run. Keep the page open while tracking.',
  ],
  [
    'Training calendar',
    'Open a planned day to review the workout. If calendar sync is connected, use Sync now to update Google Calendar.',
  ],
  [
    'Report an issue',
    'Include the affected page, what you expected, what happened, and the exact error text. Never include passwords or tokens.',
  ],
  [
    'Account recovery',
    'A generic confirmation is shown to protect account privacy. Email delivery depends on the configured transactional mail provider.',
  ],
]

export default function HelpGuides() {
  return (
    <>
      <div className="support-page-heading">
        <div>
          <p className="section-eyebrow">Help & Support</p>
          <h1>Help Guides</h1>
          <p className="note">
            Learn how to use RunPlan's features and resolve common issues.
          </p>
        </div>
      </div>

      <section className="support-guide-grid">
        {HELP_GUIDES.map(([title, copy]) => (
          <article className="plan-card" key={title}>
            <h2>{title}</h2>
            <p>{copy}</p>
          </article>
        ))}
      </section>
    </>
  )
}
