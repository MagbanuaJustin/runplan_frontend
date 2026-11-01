import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { apiGet, apiPost } from '../api.js'
import {
  PROFILE_AVATAR_EVENT,
  readProfileAvatar,
} from '../profileAvatar.js'
import ConfirmDialog from './ConfirmDialog.jsx'
import LiveBackground from './LiveBackground.jsx'
import PageContext from './PageContext.jsx'
import { PageLoadingContext } from './PageLoading.jsx'

const isNativeApp = Capacitor.isNativePlatform()
const MOBILE_NAV_QUERY = '(max-width: 920px)'

const AI_MIN_WIDTH = 300
const AI_MAX_WIDTH = 560
const AI_DESKTOP_QUERY = '(min-width: 921px)'
const AI_MOBILE_QUERY = '(max-width: 920px)'

const AI_SUGGESTIONS = [
  'Summarize my recent runs',
  'How has my pace changed?',
  'Am I training consistently?',
  'Did I complete my planned workouts?',
  'How hard were my runs this week?',
  'Was my longest run too long?',
  'Do I need a rest day?',
  'Am I on track for my goal?',
]

export function BrandLogo() {
  return (
    <span className="brand">
      <span className="brand-icon" aria-hidden="true">
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 12h4l3-7 4 14 3-7h4" />
        </svg>
      </span>
      <span>RunPlan</span>
    </span>
  )
}

export function ThemeToggle() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('rp_theme') || 'dark',
  )

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('rp_theme', theme)
  }, [theme])

  const next = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      className="theme-btn"
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      onClick={() => setTheme(next)}
    >
      {theme === 'dark' ? (
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  )
}

const NAV_GROUPS = [
  {
    label: null,
    items: [
      {
        to: '/dashboard',
        core: true,
        label: 'Dashboard',
        icon: (
          <svg
            className="nav-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Training',
    items: [
      {
        to: '/calendar',
        core: true,
        label: 'Calendar',
        icon: (
          <svg
            className="nav-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        ),
      },
      {
        to: '/run',
        core: true,
        label: 'Start a Run',
        icon: (
          <svg
            className="nav-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        ),
      },
      {
        to: '/activities',
        label: 'Log a Past Run',
        icon: (
          <svg
            className="nav-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 6h13M8 12h13M8 18h13" />
            <path d="M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Planning',
    items: [
      {
        to: '/plan',
        core: true,
        label: 'Training Plan',
        icon: (
          <svg
            className="nav-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        ),
      },
      {
        to: '/profile',
        core: true,
        label: 'Runner Profile',
        icon: (
          <svg
            className="nav-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        to: '/account',
        label: 'Account & Security',
        icon: (
          <svg
            className="nav-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        ),
      },
      {
        to: '/summary',
        label: 'Summary',
        icon: (
          <svg
            className="nav-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
            <path d="M14 3v6h6M8 13h8M8 17h5" />
          </svg>
        ),
      },
      ...(isNativeApp
        ? []
        : [
            {
              to: '/download',
              label: 'Download',
              icon: (
                <svg
                  className="nav-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <path d="M7 10l5 5 5-5M12 15V3" />
                </svg>
              ),
            },
          ]),
    ],
  },
  {
    label: 'Help & Support',
    items: [
      {
        to: '/support/report',
        label: 'Report a Problem',
        icon: (
          <svg
            className="nav-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0z" />
          </svg>
        ),
      },
      {
        to: '/support/reports',
        label: 'My Reports',
        icon: (
          <svg
            className="nav-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 6h13M8 12h13M8 18h13" />
            <path d="M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
        ),
      },
    ],
  },
]

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/calendar': 'Training Calendar',
  '/run': 'Start a Run',
  '/activities': 'Log a Past Run',
  '/plan': 'Training Plan',
  '/profile': 'Runner Profile',
  '/account': 'Account & Security',
  '/status': 'System Status',
  '/support': 'Support Console',
  '/support/report': 'Report a Problem',
  '/support/reports': 'My Reports',
  '/summary': 'Summary',
}

// The five core destinations shown in the mobile bottom navigation.
const TAB_ICON = {
  className: 'tab-icon',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
  focusable: 'false',
}

const CORE_TABS = [
  {
    to: '/dashboard',
    label: 'Home',
    icon: (
      <svg {...TAB_ICON}>
        <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
      </svg>
    ),
  },
  {
    to: '/calendar',
    label: 'Calendar',
    icon: (
      <svg {...TAB_ICON}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    to: '/run',
    label: 'Record',
    icon: (
      <svg {...TAB_ICON}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    to: '/plan',
    label: 'Plan',
    icon: (
      <svg {...TAB_ICON}>
        <path d="M12 2 2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: (
      <svg {...TAB_ICON}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
]

function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Core navigation">
      <ul>
        {CORE_TABS.map((tab) => (
          <li key={tab.to}>
            <NavLink to={tab.to} className="bottom-nav-link">
              {tab.icon}
              <span>{tab.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )

  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])

  return matches
}

function AdminNavigation({ onNavigate }) {
  return (
    <div className="nav-group">
      <span className="nav-group-label">Administration</span>

      <NavLink
        to="/status"
        className="nav-link"
        onClick={onNavigate}
      >
        <svg
          className="nav-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="3" width="20" height="7" rx="2" />
          <rect x="2" y="14" width="20" height="7" rx="2" />
          <path d="M6 6.5h.01M6 17.5h.01" />
        </svg>
        <span>System Status</span>
      </NavLink>

      <NavLink
        to="/support"
        className="nav-link"
        onClick={onNavigate}
      >
        <svg
          className="nav-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
          <path d="M8 10h8M8 14h5" />
        </svg>
        <span>Support Console</span>
      </NavLink>
    </div>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [confirming, setConfirming] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const isMobile = useMediaQuery(MOBILE_NAV_QUERY)
  const [loadingCount, setLoadingCount] = useState(0)
  const menuButtonRef = useRef(null)
  const sidebarRef = useRef(null)

  const pageLoading = useMemo(
    () => ({
      begin: () => setLoadingCount((count) => count + 1),
      end: () => setLoadingCount((count) => Math.max(0, count - 1)),
    }),
    [],
  )
  const [profileAvatar, setProfileAvatar] = useState(() => readProfileAvatar(user))

  const [aiOpen, setAiOpen] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(AI_DESKTOP_QUERY).matches
  )
  const [aiWidth, setAiWidth] = useState(() => {
    const saved = Number(localStorage.getItem('rp_ai_width'))
    return Number.isFinite(saved) && saved >= AI_MIN_WIDTH && saved <= AI_MAX_WIDTH
      ? saved
      : 360
  })

  const [aiReady, setAiReady] = useState(false)
  const [aiStatus, setAiStatus] = useState('Checking connection...')
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([])
  const [chatBusy, setChatBusy] = useState(false)
  const [chatError, setChatError] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    const refreshAvatar = () => setProfileAvatar(readProfileAvatar(user))

    refreshAvatar()
    window.addEventListener(PROFILE_AVATAR_EVENT, refreshAvatar)

    return () => window.removeEventListener(PROFILE_AVATAR_EVENT, refreshAvatar)
  }, [user?.id, user?.email])

  // The secondary menu closes whenever the route changes or the layout grows
  // back to desktop, and Escape always closes it.
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!isMobile) setMenuOpen(false)
  }, [isMobile])

  useEffect(() => {
    if (!menuOpen) return undefined

    function closeMenu(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }

    sidebarRef.current?.querySelector('a, button')?.focus()
    window.addEventListener('keydown', closeMenu)
    return () => window.removeEventListener('keydown', closeMenu)
  }, [menuOpen])

  // Lets toasts and other fixed UI clear the mobile bottom navigation.
  useEffect(() => {
    document.body.classList.add('has-bottom-nav')
    return () => document.body.classList.remove('has-bottom-nav')
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('rp_theme') || 'dark'
    document.documentElement.dataset.theme = saved
  }, [])

  useEffect(() => {
    localStorage.setItem('rp_ai_width', String(aiWidth))
  }, [aiWidth])

  useEffect(() => {
    let active = true

    apiGet('/ai/feedback')
      .then((body) => {
        if (!active) return

        const ready = Boolean(body?.data?.groq?.ready)
        setAiReady(ready)
        setAiStatus(ready ? 'Connected' : 'Not configured')
      })
      .catch(() => {
        if (!active) return

        setAiReady(false)
        setAiStatus('Unavailable')
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const media = window.matchMedia(AI_MOBILE_QUERY)
    const handleChange = (event) => setAiOpen(!event.matches)

    if (media.addEventListener) {
      media.addEventListener('change', handleChange)
      return () => media.removeEventListener('change', handleChange)
    }

    media.addListener(handleChange)
    return () => media.removeListener(handleChange)
  }, [])

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape' && window.matchMedia(AI_MOBILE_QUERY).matches) {
        setAiOpen(false)
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, chatBusy])

  function startAiResize(event) {
    if (window.matchMedia(AI_MOBILE_QUERY).matches) return

    event.preventDefault()
    const startX = event.clientX
    const startWidth = aiWidth

    function resize(moveEvent) {
      const nextWidth = startWidth + (startX - moveEvent.clientX)
      setAiWidth(Math.min(AI_MAX_WIDTH, Math.max(AI_MIN_WIDTH, nextWidth)))
    }

    function stopResize() {
      window.removeEventListener('pointermove', resize)
      window.removeEventListener('pointerup', stopResize)
      window.removeEventListener('pointercancel', stopResize)
    }

    window.addEventListener('pointermove', resize)
    window.addEventListener('pointerup', stopResize)
    window.addEventListener('pointercancel', stopResize)
  }

  function handleAiResizeKeys(event) {
    let nextWidth = aiWidth

    if (event.key === 'ArrowLeft') nextWidth += 16
    else if (event.key === 'ArrowRight') nextWidth -= 16
    else if (event.key === 'Home') nextWidth = AI_MIN_WIDTH
    else if (event.key === 'End') nextWidth = AI_MAX_WIDTH
    else return

    event.preventDefault()
    setAiWidth(Math.min(AI_MAX_WIDTH, Math.max(AI_MIN_WIDTH, nextWidth)))
  }

  async function handleLogout() {
    setBusy(true)
    try {
      await logout()
    } catch {
      /* session cleared locally */
    }
  }

  async function sendAiQuestion(value) {
    const text = String(value ?? '').trim()

    if (!aiReady || chatBusy || text === '') {
      return
    }

    if (text.length > 1000) {
      setChatError('Keep your question under 1000 characters.')
      return
    }

    setChatError('')
    setQuestion('')
    setMessages((current) => [...current, { role: 'user', content: text }])
    setChatBusy(true)

    try {
      const body = await apiPost('/ai/chat', { message: text })
      const answer = body?.data?.answer

      if (typeof answer !== 'string' || answer.trim() === '') {
        throw new Error('The AI coach returned an empty response.')
      }

      setMessages((current) => [
        ...current,
        { role: 'assistant', content: answer },
      ])
    } catch (error) {
      setChatError(error?.message || 'Could not send your question. Please try again.')
    } finally {
      setChatBusy(false)
    }
  }

  function handleAiSubmit(event) {
    event.preventDefault()
    sendAiQuestion(question)
  }

  const initial = (user?.email?.[0] ?? 'R').toUpperCase()
  const pageTitle = PAGE_TITLES[location.pathname] ?? 'RunPlan AI'
  const isAdmin = user?.role === 'admin'

  return (
    <div
      className={`app-frame ai-layout${aiOpen ? ' ai-open' : ' ai-closed'}`}
      style={{ '--rp-ai-width': `${aiWidth}px` }}
    >
      <LiveBackground />

      {menuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        id="rp-sidebar"
        ref={sidebarRef}
        className={`sidebar${menuOpen ? ' open' : ''}`}
        aria-label={isMobile ? 'More' : 'Sidebar'}
        inert={isMobile && !menuOpen ? true : undefined}
      >
        <div className="sidebar-brand">
          <BrandLogo />
        </div>

        <nav className="sidebar-nav" aria-label={isMobile ? 'More pages' : 'Main'}>
          {isMobile && (
            <span className="nav-group-label sidebar-more-title">More</span>
          )}

          {NAV_GROUPS.map((group) => ({
            ...group,
            // On mobile the five core pages live in the bottom bar.
            items: isMobile ? group.items.filter((item) => !item.core) : group.items,
          }))
            .filter((group) => group.items.length > 0)
            .map((group, idx) => (
            <div key={group.label ?? idx} className="nav-group">
              {group.label && (
                <span className="nav-group-label">{group.label}</span>
              )}

              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="nav-link"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}

          {isAdmin && (
            <AdminNavigation onNavigate={() => setMenuOpen(false)} />
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-pill">
            <span className="user-avatar" aria-hidden="true">
              {profileAvatar ? <img src={profileAvatar} alt="" /> : initial}
            </span>

            <div className="user-meta">
              <span className="user-email" title={user?.email}>
                {user?.email}
              </span>
              <span className="user-role">{user?.role ?? 'runner'}</span>
            </div>
          </div>

          <button
            type="button"
            className="logout-btn"
            onClick={() => setConfirming(true)}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <div className="workspace">
        <header className="workspace-header">
          <div className="rp-header-left">
            <button
              type="button"
              ref={menuButtonRef}
              className="theme-btn mobile-menu-btn"
              aria-label={menuOpen ? 'Close More menu' : 'Open More menu'}
              aria-expanded={menuOpen}
              aria-controls="rp-sidebar"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <h1 className="workspace-title">{pageTitle}</h1>
          </div>

          <div className="rp-header-actions">
            <ThemeToggle />

            <button
              type="button"
              className={`theme-btn rp-ai-toggle${aiOpen ? ' is-active' : ''}`}
              aria-label={aiOpen ? 'Close AI assistant' : 'Open AI assistant'}
              title={aiOpen ? 'Close AI assistant' : 'Open AI assistant'}
              aria-expanded={aiOpen}
              aria-controls="rp-ai-panel"
              onClick={() => setAiOpen((open) => !open)}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 11.5a8.5 8.5 0 0 1-12.2 7.6L3 21l1.9-5.8A8.5 8.5 0 1 1 21 11.5z" />
                <path d="M8 11h8M8 15h5" />
              </svg>
            </button>
          </div>
        </header>

        <div
          className={`workspace-content${loadingCount > 0 ? ' is-page-loading' : ''}`}
        >
          <main className="shell" id="main-content" aria-busy={loadingCount > 0}>
            <PageLoadingContext.Provider value={pageLoading}>
              <Outlet />
            </PageLoadingContext.Provider>
          </main>

          {loadingCount === 0 && (
            <aside
              className="page-context-column page-context-right"
              aria-label="Page guidance and related actions"
            >
              <PageContext pathname={location.pathname} side="left" />
              <PageContext pathname={location.pathname} side="right" />
            </aside>
          )}
        </div>
      </div>

      <BottomNav />

      {aiOpen && (
        <button
          type="button"
          className="rp-ai-backdrop"
          aria-label="Close AI assistant"
          onClick={() => setAiOpen(false)}
        />
      )}

      <aside
        id="rp-ai-panel"
        className="rp-ai-panel"
        aria-label="RunPlan AI assistant"
        aria-hidden={!aiOpen}
      >
        <div
          className="rp-ai-resize-handle"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize AI assistant panel"
          aria-valuemin={AI_MIN_WIDTH}
          aria-valuemax={AI_MAX_WIDTH}
          aria-valuenow={aiWidth}
          tabIndex={aiOpen ? 0 : -1}
          onPointerDown={startAiResize}
          onKeyDown={handleAiResizeKeys}
        />

        <header className="rp-ai-header">
          <div>
            <h2>RunPlan AI</h2>
            <span className="rp-ai-provider-status">{aiStatus}</span>
          </div>

          <button
            type="button"
            className="theme-btn rp-ai-close"
            aria-label="Close AI assistant"
            onClick={() => setAiOpen(false)}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="rp-ai-body">
          <div className="rp-ai-welcome">
            <span className="rp-ai-mark" aria-hidden="true">AI</span>
            <h3>Run smarter with your training data</h3>
            <p>
              Ask about your recent runs, pace trends, consistency, or training plan.
            </p>
          </div>

          <div className="rp-ai-suggestions" aria-label="Example questions">
            {AI_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={!aiReady || chatBusy}
                onClick={() => sendAiQuestion(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>

          {!aiReady && (
            <p className="rp-ai-setup-note" role="status">
              The AI coach is unavailable until Groq is configured and enabled.
            </p>
          )}

          <div
            className="rp-ai-messages"
            aria-live="polite"
            aria-relevant="additions"
          >
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rp-ai-message rp-ai-message-${message.role}`}
              >
                <strong>
                  {message.role === 'user' ? 'You' : 'RunPlan AI'}
                </strong>
                <p>{message.content}</p>
              </div>
            ))}

            {chatBusy && (
              <p className="rp-ai-setup-note" role="status">
                RunPlan AI is preparing an answer...
              </p>
            )}

            {chatError && (
              <p className="error" role="alert">
                {chatError}
              </p>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <form className="rp-ai-composer" onSubmit={handleAiSubmit}>
          <label className="sr-only" htmlFor="rp-ai-question">
            Ask RunPlan AI
          </label>

          <textarea
            id="rp-ai-question"
            rows="3"
            placeholder={
              aiReady
                ? 'Ask a question about your training'
                : 'AI chat is unavailable until setup'
            }
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={1000}
            disabled={!aiReady || chatBusy}
          />

          <div className="rp-ai-composer-footer">
            <small>
              Your question and selected training metrics are sent to Groq;
              chat messages are not saved in RunPlan.
            </small>

            <button
              type="submit"
              className="btn"
              disabled={!aiReady || chatBusy || !question.trim()}
            >
              {chatBusy ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </aside>

      <ConfirmDialog
        open={confirming}
        title="Log out?"
        message="You will need to sign in again to access your training dashboard."
        confirmLabel="Log out"
        busy={busy}
        onConfirm={handleLogout}
        onCancel={() => setConfirming(false)}
      />
    </div>
  )
}