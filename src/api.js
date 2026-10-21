const API_URL = import.meta.env.VITE_API_URL ?? '/api'

let accessToken = null // in memory only
let refreshHandler = null

export function setAccessToken(token) {
  accessToken = token
}
export function setRefreshHandler(fn) {
  refreshHandler = fn
}

async function request(path, options = {}, retried = false) {
  const { method = 'GET', body } = options
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // Access token expired: refresh once, then retry the same request once
  if (res.status === 401 && !retried && refreshHandler && !path.startsWith('/auth/')) {
    if (await refreshHandler()) return request(path, options, true)
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`)
    err.status = res.status
    err.fields = data.fields
    throw err
  }
  return data
}

export const apiGet = (path) => request(path)
export const apiPost = (path, body = {}) => request(path, { method: 'POST', body })
export const apiDelete = (path) => request(path, { method: 'DELETE' })
export const apiPut = (path, body = {}) => request(path, { method: 'PUT', body })
export const apiPatch = (path, body = {}) => request(path, { method: 'PATCH', body })