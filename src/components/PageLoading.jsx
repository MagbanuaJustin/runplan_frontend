import { createContext, useContext, useLayoutEffect } from 'react'

/**
 * One coherent loading view for a page.
 *
 * While a page is waiting on the data it needs, it renders <PageLoading />
 * instead of its content. PageLoading also tells the Layout that the page is
 * loading, so the contextual side cards are hidden in the same paint and the
 * runner never sees "Loading..." next to stale or unrelated sections.
 *
 * The skeleton fades in after a short CSS delay, so navigation that finishes
 * almost immediately never flashes a loading UI. Readiness is still decided by
 * the page itself - nothing here uses a timer to guess.
 */

export const PageLoadingContext = createContext(null)

export default function PageLoading({ label = 'Loading…', variant = 'page', rows = 3 }) {
  const ctx = useContext(PageLoadingContext)

  useLayoutEffect(() => {
    if (!ctx) return undefined
    ctx.begin()
    return () => ctx.end()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className={`page-loading page-loading-${variant}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{label}</span>

      <div className="page-loading-body" aria-hidden="true">
        <span className="skeleton skeleton-title" />
        <span className="skeleton skeleton-line" />
        <div className="skeleton-grid">
          {Array.from({ length: rows }, (_, index) => (
            <span key={index} className="skeleton skeleton-card" />
          ))}
        </div>
        <p className="page-loading-label">{label}</p>
      </div>
    </div>
  )
}
