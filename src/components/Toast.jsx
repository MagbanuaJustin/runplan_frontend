import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

/**
 * Reusable toast notifications for action outcomes (saved, deleted, failed).
 *
 * Use `const toast = useToast()` then `toast.success('Saved.')`,
 * `toast.error('Could not save.')` or `toast.warning('...')`.
 *
 * Field validation, page-load errors and persistent advisories stay inline in
 * their own components; toasts are only for the result of an action.
 */

const ToastContext = createContext(null)

const DURATIONS = { success: 4500, info: 4500, warning: 6500, error: 8000 }
const MAX_TOASTS = 4

const ICONS = {
  success: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m8 12.5 2.8 2.8L16 9.5" />
    </>
  ),
  warning: (
    <>
      <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  error: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v5M12 16.5h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 11v5M12 7.5h.01" />
    </>
  ),
}

const LEVEL_LABEL = {
  success: 'Success',
  warning: 'Warning',
  error: 'Error',
  info: 'Notice',
}

function ToastItem({ toast, onClose }) {
  const [paused, setPaused] = useState(false)
  const remaining = useRef(toast.duration)
  const startedAt = useRef(0)

  useEffect(() => {
    if (paused || !toast.duration) return undefined

    startedAt.current = Date.now()
    const timer = window.setTimeout(() => onClose(toast.id), remaining.current)

    return () => {
      window.clearTimeout(timer)
      remaining.current = Math.max(
        1200,
        remaining.current - (Date.now() - startedAt.current),
      )
    }
  }, [paused, toast.duration, toast.id, onClose])

  return (
    <div
      className={`toast toast-${toast.level}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <svg
        className="toast-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {ICONS[toast.level]}
      </svg>

      <p className="toast-message">
        <span className="sr-only">{LEVEL_LABEL[toast.level]}: </span>
        {toast.message}
      </p>

      <button
        type="button"
        className="toast-close"
        aria-label={`Dismiss ${LEVEL_LABEL[toast.level].toLowerCase()} notification`}
        onClick={() => onClose(toast.id)}
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(1)

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((item) => item.id !== id))
  }, [])

  const push = useCallback((level, message, options = {}) => {
    const text = String(message ?? '').trim()
    if (!text) return null

    const id = nextId.current++
    const duration = options.duration ?? DURATIONS[level]

    setToasts((current) => {
      // Collapse an identical message that is already showing.
      const rest = current.filter(
        (item) => !(item.level === level && item.message === text),
      )
      return [...rest, { id, level, message: text, duration }].slice(-MAX_TOASTS)
    })

    return id
  }, [])

  const api = useMemo(
    () => ({
      success: (message, options) => push('success', message, options),
      info: (message, options) => push('info', message, options),
      warning: (message, options) => push('warning', message, options),
      error: (message, options) => push('error', message, options),
      dismiss,
    }),
    [push, dismiss],
  )

  const polite = toasts.filter((item) => item.level !== 'error')
  const urgent = toasts.filter((item) => item.level === 'error')

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div className="toast-viewport">
        <div role="status" aria-live="polite" aria-relevant="additions" className="toast-stack">
          {polite.map((item) => (
            <ToastItem key={item.id} toast={item} onClose={dismiss} />
          ))}
        </div>
        <div role="alert" aria-live="assertive" aria-relevant="additions" className="toast-stack">
          {urgent.map((item) => (
            <ToastItem key={item.id} toast={item} onClose={dismiss} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  )
}

const FALLBACK = {
  success: () => null,
  info: () => null,
  warning: () => null,
  error: () => null,
  dismiss: () => {},
}

export function useToast() {
  return useContext(ToastContext) ?? FALLBACK
}

/**
 * Show a toast whenever `message` changes to a non-empty value. Lets a page keep
 * its existing `notice` state and simply surface it as a dismissible toast.
 */
export function useToastOnChange(message, level = 'success') {
  const toast = useToast()
  const show = toast[level]

  useEffect(() => {
    if (message) show(message)
    // Only a change of message should notify, not a new toast API identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message])
}
