import { useCallback, useEffect, useRef, useState } from 'react'

const SCRIPT_ID = 'runplan-recaptcha-enterprise-checkbox'
const SCRIPT_BASE = 'https://www.google.com/recaptcha/enterprise.js'
let loadPromise = null

function loadEnterpriseRecaptcha() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('Human verification is unavailable in this environment.'))
  }

  const existingApi = window.grecaptcha?.enterprise
  if (
    typeof existingApi?.render === 'function' &&
    typeof existingApi?.ready === 'function' &&
    typeof existingApi?.getResponse === 'function'
  ) {
    return Promise.resolve(existingApi)
  }

  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    let settled = false
    let timeoutId
    let script = document.getElementById(SCRIPT_ID)

    const finish = (error, api) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeoutId)
      script?.removeEventListener('load', handleLoad)
      script?.removeEventListener('error', handleError)
      if (error) reject(error)
      else resolve(api)
    }

    const handleError = () => {
      finish(new Error('Google reCAPTCHA could not load. Check your connection and reload the page.'))
    }

    const handleLoad = () => {
      const api = window.grecaptcha?.enterprise
      if (typeof api?.ready !== 'function') {
        finish(new Error('Google reCAPTCHA loaded without its Enterprise API.'))
        return
      }

      api.ready(() => {
        const readyApi = window.grecaptcha?.enterprise
        if (
          typeof readyApi?.render !== 'function' ||
          typeof readyApi?.getResponse !== 'function' ||
          typeof readyApi?.reset !== 'function'
        ) {
          finish(new Error('The configured reCAPTCHA checkbox key could not be initialized.'))
          return
        }
        finish(null, readyApi)
      })
    }

    timeoutId = window.setTimeout(() => {
      finish(new Error('Google reCAPTCHA is taking too long to load. Reload the page and try again.'))
    }, 15000)

    if (!script) {
      script = document.createElement('script')
      script.id = SCRIPT_ID
      script.src = `${SCRIPT_BASE}?render=explicit`
      script.async = true
      script.defer = true
    } else if (!script.src.startsWith(SCRIPT_BASE) || !script.src.includes('render=explicit')) {
      finish(new Error('A different reCAPTCHA script is already loaded. Refresh the page to use the checkbox key.'))
      return
    }

    script.addEventListener('load', handleLoad)
    script.addEventListener('error', handleError)

    if (script.isConnected && typeof window.grecaptcha?.enterprise?.render === 'function') {
      handleLoad()
    } else if (!script.isConnected) {
      document.head.appendChild(script)
    }
  }).catch((error) => {
    loadPromise = null
    throw error
  })

  return loadPromise
}

export default function useRecaptcha() {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY?.trim() || ''
  const enabled = import.meta.env.VITE_RECAPTCHA_ENABLED?.trim().toLowerCase() !== 'false'
  const widgetIdRef = useRef(null)
  const apiRef = useRef(null)
  const tokenRef = useRef('')
  const [container, setContainer] = useState(null)
  const [ready, setReady] = useState(false)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState('')

  const containerRef = useCallback((node) => {
    setContainer(node)
  }, [])

  useEffect(() => {
    let active = true
    widgetIdRef.current = null
    apiRef.current = null
    tokenRef.current = ''
    setReady(false)
    setVerified(false)
    setError('')

    if (!enabled) {
      setReady(true)
      return () => { active = false }
    }

    if (!siteKey) {
      setError('Human verification is not configured. Add VITE_RECAPTCHA_SITE_KEY to the frontend .env file.')
      return () => { active = false }
    }

    if (!container) return () => { active = false }

    loadEnterpriseRecaptcha()
      .then((api) => {
        if (!active || !container) return

        // React Strict Mode can mount effects twice in development. Clear any
        // first-pass iframe before rendering the checkbox into this same node.
        container.replaceChildren()
        apiRef.current = api
        const isLightTheme = document.documentElement.dataset.theme === 'light'
        widgetIdRef.current = api.render(container, {
          sitekey: siteKey,
          theme: isLightTheme ? 'light' : 'dark',
          size: window.innerWidth < 360 ? 'compact' : 'normal',
          callback: (token) => {
            if (!active) return
            tokenRef.current = typeof token === 'string' ? token : ''
            setVerified(Boolean(tokenRef.current))
            setError('')
          },
          'expired-callback': () => {
            if (!active) return
            tokenRef.current = ''
            setVerified(false)
            setError('The verification expired. Complete the checkbox again.')
          },
          'error-callback': () => {
            if (!active) return
            tokenRef.current = ''
            setVerified(false)
            setError('The verification could not load. Check your connection and try again.')
          },
        })

        setReady(true)
      })
      .catch((loadError) => {
        if (active) setError(loadError.message)
      })

    return () => {
      active = false
      if (widgetIdRef.current !== null && apiRef.current?.reset) {
        try {
          apiRef.current.reset(widgetIdRef.current)
        } catch {
          // The widget container may already have been removed during routing.
        }
      }
      widgetIdRef.current = null
      apiRef.current = null
      tokenRef.current = ''
    }
  }, [container, enabled, siteKey])

  const getToken = useCallback(() => {
    if (!enabled) return 'captcha-disabled'

    const api = apiRef.current
    const widgetId = widgetIdRef.current
    const token = api && widgetId !== null ? api.getResponse(widgetId) : ''
    tokenRef.current = typeof token === 'string' ? token : ''
    setVerified(Boolean(tokenRef.current))

    if (!tokenRef.current) {
      throw new Error('Complete the reCAPTCHA checkbox before continuing.')
    }
    return tokenRef.current
  }, [enabled])

  const reset = useCallback(() => {
    tokenRef.current = ''
    setVerified(false)
    setError('')
    if (widgetIdRef.current !== null && apiRef.current?.reset) {
      try {
        apiRef.current.reset(widgetIdRef.current)
      } catch {
        // A route change may have removed the widget just before reset.
      }
    }
  }, [])

  return {
    enabled,
    ready,
    verified: enabled ? verified : ready,
    error,
    containerRef,
    getToken,
    reset,
  }
}
