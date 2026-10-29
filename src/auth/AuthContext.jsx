import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { apiGet, apiPost, setAccessToken, setRefreshHandler } from '../api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading')
  const started = useRef(false)
  const refreshing = useRef(null)

  const startSession = useCallback((data) => {
    setAccessToken(data.access_token)
    setUser(data.user)
    setStatus('in')
  }, [])

  const endSession = useCallback(() => {
    setAccessToken(null)
    setUser(null)
    setStatus('out')
  }, [])

  async function refreshUser() {
    const body = await apiGet('/auth/me')
    if (body?.data) setUser(body.data)
    return body?.data ?? null
  }

  useEffect(() => {
    setRefreshHandler(() => {
      if (!refreshing.current) {
        refreshing.current = apiPost('/auth/refresh')
          .then((body) => {
            startSession(body.data)
            return true
          })
          .catch(() => {
            endSession()
            return false
          })
          .finally(() => {
            refreshing.current = null
          })
      }

      return refreshing.current
    })
  }, [startSession, endSession])

  useEffect(() => {
    if (started.current) return
    started.current = true

    apiPost('/auth/refresh')
      .then((body) => {
        startSession(body.data)
        return apiGet('/auth/me')
          .then((me) => {
            if (me?.data) setUser(me.data)
          })
          .catch(() => {})
      })
      .catch(() => setStatus('out'))
  }, [startSession])

  async function login(email, password, recaptchaToken) {
    const body = await apiPost('/auth/login', {
      email,
      password,
      recaptcha_token: recaptchaToken,
    })

    startSession(body.data)
  }

  async function loginWithGoogle(idToken, recaptchaToken) {
    const body = await apiPost('/auth/google', {
      credential: idToken,
      recaptcha_token: recaptchaToken,
    })

    startSession(body.data)
  }

  async function logout() {
    try {
      await apiPost('/auth/logout')
    } finally {
      endSession()
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        login,
        loginWithGoogle,
        logout,
        refreshUser,
        clearSession: endSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}