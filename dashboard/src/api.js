const BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const KEY  = import.meta.env.VITE_API_KEY || ''

async function request(method, path, body) {
  if (!BASE || !KEY) throw new Error('Set VITE_API_BASE_URL and VITE_API_KEY in Netlify env vars.')
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text().catch(() => res.statusText)}`)
  return res.json()
}

export const getStats    = () => request('GET', '/stats')
export const getInsights = () => request('GET', '/ai/insights')
export const refreshInsights = () => request('POST', '/ai/insights/refresh')
export const getJobs     = (status) => request('GET', status ? `/jobs?status=${status}` : '/jobs')
export const getProfile  = () => request('GET', '/profile')
