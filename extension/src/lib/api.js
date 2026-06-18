// API client for the Sextant backend. Caches profile and jobs in chrome.storage.local
// as a fast-read fallback; Railway is always source of truth.

function storageGet(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (r) => resolve(r[key] ?? null))
  })
}

function storageSet(key, val) {
  return new Promise((resolve) => chrome.storage.local.set({ [key]: val }, resolve))
}

async function getConfig() {
  const config = await storageGet('apiConfig')
  return config || { baseUrl: '', apiKey: '' }
}

async function request(method, path, body) {
  const { baseUrl, apiKey } = await getConfig()
  if (!baseUrl || !apiKey) throw new Error('Sextant API not configured. Open the extension and set the API URL and key in Settings.')

  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  }
  if (body !== undefined) opts.body = JSON.stringify(body)

  const res = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, opts)
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`API ${res.status}: ${text}`)
  }
  return res.json()
}

// --- Profile ---

export async function getProfile() {
  try {
    const data = await request('GET', '/profile')
    await storageSet('cachedProfile', data)
    return data
  } catch {
    return (await storageGet('cachedProfile')) || null
  }
}

export async function putProfile(profile) {
  const data = await request('PUT', '/profile', profile)
  await storageSet('cachedProfile', data)
  return data
}

// --- CV ---

export async function uploadCV(file) {
  const { baseUrl, apiKey } = await getConfig()
  if (!baseUrl || !apiKey) throw new Error('API not configured')

  const form = new FormData()
  form.append('file', file)

  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/cv/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })
  if (!res.ok) throw new Error(`CV upload failed: ${res.status}`)
  return res.json()
}

// --- Jobs ---

export async function saveJob(job) {
  return request('POST', '/jobs', job)
}

export async function getJobs(status) {
  try {
    const url = status ? `/jobs?status=${encodeURIComponent(status)}` : '/jobs'
    const data = await request('GET', url)
    await storageSet('cachedJobs', data)
    return data
  } catch {
    return (await storageGet('cachedJobs')) || []
  }
}

export async function patchJob(id, updates) {
  return request('PATCH', `/jobs/${id}`, updates)
}

// --- Stats ---

export async function getStats() {
  return request('GET', '/stats')
}

// --- AI ---

export async function generateCoverLetter(jobId) {
  return request('POST', '/ai/cover-letter', { jobId })
}

export async function draftAnswer(payload) {
  return request('POST', '/ai/draft-answer', payload)
}

export async function bulletSuggestions(payload) {
  return request('POST', '/ai/bullet-suggestions', payload)
}

export async function getInsights() {
  return request('GET', '/ai/insights')
}

export async function refreshInsights() {
  return request('POST', '/ai/insights/refresh')
}

// --- Export / Import ---

export async function exportData() {
  return request('GET', '/export')
}

export async function importData(dump) {
  return request('POST', '/import', dump)
}

// --- Config ---

export async function getApiConfig() {
  return getConfig()
}

export async function setApiConfig(config) {
  await storageSet('apiConfig', config)
}
