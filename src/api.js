const API_URL = import.meta.env.VITE_API_URL ?? '/api'

let accessToken = null
let refreshHandler = null

export function setAccessToken(token) {
  accessToken = token
}

export function setRefreshHandler(fn) {
  refreshHandler = fn
}

function snippet(text, limit = 220) {
  return String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

function makeResponseError(data, status, text = '') {
  if (!data || typeof data !== 'object') {
    console.error(
      'Unexpected reply from API, status',
      status,
      'body starts with:',
      text.slice(0, 300),
    )

    const detail = snippet(text)
    const error = new Error(
      detail
        ? `The server sent an unexpected reply (status ${status}). Server said: ${detail}`
        : `The server sent an unexpected reply (status ${status}) with an empty body.`,
    )
    error.status = status
    error.body = detail
    return error
  }

  const error = new Error(data.error || `Request failed (${status})`)
  error.status = status
  error.fields = data.fields
  return error
}

async function request(path, options = {}, retried = false) {
  const { method = 'GET', body } = options
  const headers = {}

  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (
    res.status === 401
    && !retried
    && refreshHandler
    && !path.startsWith('/auth/')
  ) {
    if (await refreshHandler()) return request(path, options, true)
  }

  const text = await res.text()
  let data = null

  try {
    data = JSON.parse(text)
  } catch {
    data = null
  }

  if (!res.ok) {
    throw makeResponseError(data, res.status, text)
  }

  if (data === null || typeof data !== 'object') {
    throw makeResponseError(null, res.status, text)
  }

  return data
}

async function downloadFile(path, retried = false) {
  const headers = {}
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  const res = await fetch(`${API_URL}${path}`, {
    method: 'GET',
    headers,
    credentials: 'include',
  })

  if (
    res.status === 401
    && !retried
    && refreshHandler
    && !path.startsWith('/auth/')
  ) {
    if (await refreshHandler()) return downloadFile(path, true)
  }

  if (!res.ok) {
    const text = await res.text()
    let data = null

    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }

    throw makeResponseError(data, res.status, text)
  }

  return res.blob()
}

export const apiGet = (path) => request(path)
export const apiPost = (path, body = {}) => request(path, { method: 'POST', body })
export const apiDelete = (path) => request(path, { method: 'DELETE' })
export const apiPut = (path, body = {}) => request(path, { method: 'PUT', body })
export const apiPatch = (path, body = {}) => request(path, { method: 'PATCH', body })
export const apiDownload = (path) => downloadFile(path)