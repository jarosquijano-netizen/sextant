import React, { useState, useEffect } from 'react'

function sendMsg(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (res) => {
      if (chrome.runtime.lastError) resolve(null)
      else resolve(res)
    })
  })
}

const STATUS_OPTIONS = ['saved', 'applied', 'screening', 'rejected', 'offer']
const STATUS_COLORS = { saved: '#64748b', applied: '#3b82f6', screening: '#f59e0b', rejected: '#ef4444', offer: '#22c55e' }
const TONES = [
  { value: 'professional', label: 'Professional', desc: 'Polished & formal' },
  { value: 'enthusiastic', label: 'Enthusiastic', desc: 'Energetic & passionate' },
  { value: 'concise', label: 'Concise', desc: 'Short & punchy' },
]

function ScoreBadge({ score }) {
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: `${color}18`, border: `2px solid ${color}`, color, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
      {score ?? '—'}
    </span>
  )
}

function CoverLetterModal({ jobId, initialJobTitle, initialCompany, initialDesc, onClose }) {
  const [tone, setTone] = useState('professional')
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [inserted, setInserted] = useState(false)
  const [jobTitle, setJobTitle] = useState(initialJobTitle || '')
  const [company, setCompany] = useState(initialCompany || '')
  const [jobDesc, setJobDesc] = useState(initialDesc || '')
  const [error, setError] = useState('')

  async function generate(regenerate = false) {
    setLoading(true)
    setError('')
    setDraft('')

    const config = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_API_CONFIG' }, (r) => resolve(r?.config || {}))
    })
    if (!config.baseUrl || !config.apiKey) {
      setError('API not configured — go to Settings tab.')
      setLoading(false)
      return
    }

    try {
      const body = { tone, regenerate }
      if (jobId) {
        body.jobId = jobId
      } else {
        body.jobTitle = jobTitle
        body.company = company
        body.jobDescription = jobDesc
      }

      const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}/ai/cover-letter`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
      setDraft(data.draft || '')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function copy() {
    navigator.clipboard.writeText(draft).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  async function insertIntoPage() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab) return
    chrome.tabs.sendMessage(tab.id, { type: 'INSERT_COVER_LETTER', text: draft }, () => {
      setInserted(true)
      setTimeout(() => setInserted(false), 2000)
    })
  }

  const canGenerate = jobId || (jobTitle && company)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 12, overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(0,0,0,0.25)', marginTop: 8 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 0' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>✉ Cover Letter</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Job info (only shown when no jobId) */}
          {!jobId && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 3, textTransform: 'uppercase' }}>Job Title</div>
                  <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="VP Product" style={{ width: '100%', padding: '6px 9px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 3, textTransform: 'uppercase' }}>Company</div>
                  <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Corp" style={{ width: '100%', padding: '6px 9px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 3, textTransform: 'uppercase' }}>Job Description (paste here)</div>
                <textarea value={jobDesc} onChange={(e) => setJobDesc(e.target.value)} rows={4} placeholder="Paste the job description…" style={{ width: '100%', padding: '6px 9px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
            </div>
          )}

          {/* Tone selector */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>Tone</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {TONES.map((t) => (
                <button key={t.value} onClick={() => setTone(t.value)} style={{
                  flex: 1, padding: '6px 4px', border: `1.5px solid ${tone === t.value ? '#1e3a5f' : '#e2e8f0'}`,
                  borderRadius: 8, background: tone === t.value ? '#1e3a5f' : '#fff',
                  color: tone === t.value ? '#fff' : '#64748b', fontSize: 10, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', lineHeight: 1.3
                }}>
                  <div>{t.label}</div>
                  <div style={{ fontSize: 9, opacity: 0.75, marginTop: 2 }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          {!draft && (
            <button onClick={() => generate(false)} disabled={loading || !canGenerate}
              style={{ padding: '9px 0', background: canGenerate ? '#1e3a5f' : '#e2e8f0', color: canGenerate ? '#fff' : '#94a3b8', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: canGenerate ? 'pointer' : 'default', fontFamily: 'inherit' }}>
              {loading ? 'Generating…' : 'Generate Cover Letter'}
            </button>
          )}

          {error && <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 7, padding: '8px 10px', fontSize: 12, color: '#dc2626' }}>{error}</div>}

          {/* Draft area */}
          {draft && (
            <>
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={10}
                style={{ width: '100%', resize: 'vertical', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '10px', fontSize: 12, fontFamily: 'inherit', lineHeight: 1.6, outline: 'none', boxSizing: 'border-box' }} />

              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={copy} style={{ flex: 1, padding: '8px 0', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {copied ? '✓ Copied!' : '📋 Copy'}
                </button>
                <button onClick={insertIntoPage} style={{ flex: 1, padding: '8px 0', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {inserted ? '✓ Inserted!' : '⬇ Insert into form'}
                </button>
                <button onClick={() => generate(true)} disabled={loading} style={{ flex: 1, padding: '8px 0', background: '#f1f5f9', color: '#1e3a5f', border: '1.5px solid #1e3a5f', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {loading ? '…' : '↺ Regenerate'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function AddJobModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', company: '', url: '', description: '', status: 'saved' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Pre-fill URL and title from current tab
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab) return
      setForm((f) => ({ ...f, url: tab.url || '', title: f.title || tab.title || '' }))
    })
  }, [])

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })) }

  async function save() {
    if (!form.title || !form.company) { setError('Title and company are required.'); return }
    setSaving(true)
    setError('')
    const res = await sendMsg({ type: 'SAVE_JOB', job: form })
    if (res?.error) { setError(res.error); setSaving(false); return }
    onSaved(res.job)
    onClose()
  }

  const inp = (placeholder, k, opts = {}) => (
    <input value={form[k]} onChange={(e) => set(k, e.target.value)} placeholder={placeholder}
      style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box', ...opts.style }} />
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 12, overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.25)', marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 0' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>+ Add Job</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 3, textTransform: 'uppercase' }}>Job Title *</div>
              {inp('VP Product', 'title')}
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 3, textTransform: 'uppercase' }}>Company *</div>
              {inp('Acme Corp', 'company')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 3, textTransform: 'uppercase' }}>URL</div>
            {inp('https://…', 'url')}
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 3, textTransform: 'uppercase' }}>Status</div>
            <select value={form.status} onChange={(e) => set('status', e.target.value)}
              style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, fontFamily: 'inherit' }}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 3, textTransform: 'uppercase' }}>Job Description (paste for AI features)</div>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={4}
              placeholder="Paste the job description here to enable cover letters, match scoring, and AI answers…"
              style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
          {error && <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 7, padding: '8px 10px', fontSize: 12, color: '#dc2626' }}>{error}</div>}
          <button onClick={save} disabled={saving}
            style={{ padding: '9px 0', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
            {saving ? 'Saving…' : 'Save to Pipeline'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Pipeline() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [coverLetterJob, setCoverLetterJob] = useState(null)
  const [showNewCoverLetter, setShowNewCoverLetter] = useState(false)
  const [showAddJob, setShowAddJob] = useState(false)

  useEffect(() => {
    sendMsg({ type: 'GET_JOBS' }).then((res) => {
      setJobs([...(res?.jobs || [])].reverse())
      setLoading(false)
    })
  }, [])

  async function handleStatusChange(id, status) {
    await sendMsg({ type: 'PATCH_JOB', id, updates: { status } })
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status } : j)))
  }

  function handleJobSaved(job) {
    setJobs((prev) => [job, ...prev])
  }

  if (loading) return <div style={{ color: '#94a3b8', fontSize: 13 }}>Loading pipeline…</div>

  return (
    <div>
      {/* Modals */}
      {showAddJob && <AddJobModal onClose={() => setShowAddJob(false)} onSaved={handleJobSaved} />}
      {(coverLetterJob || showNewCoverLetter) && (
        <CoverLetterModal
          jobId={coverLetterJob?.id}
          initialJobTitle={coverLetterJob?.title}
          initialCompany={coverLetterJob?.company}
          onClose={() => { setCoverLetterJob(null); setShowNewCoverLetter(false) }}
        />
      )}

      {/* Action bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => setShowAddJob(true)}
          style={{ flex: 1, padding: '9px 0', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          + Add Job
        </button>
        <button onClick={() => setShowNewCoverLetter(true)}
          style={{ flex: 1, padding: '9px 0', background: '#f0f9ff', color: '#0369a1', border: '1.5px solid #bae6fd', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          ✉ Cover Letter
        </button>
      </div>

      {!jobs.length ? (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🧭</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>No jobs saved yet</div>
          <div style={{ fontSize: 12, lineHeight: 1.5 }}>Browse LinkedIn job postings to start scoring matches and saving them to your pipeline.</div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>{jobs.length} job{jobs.length !== 1 ? 's' : ''} in pipeline</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {jobs.map((job) => {
              const status = (job.status || 'saved').toLowerCase()
              const color = STATUS_COLORS[status] || '#64748b'
              return (
                <div key={job.id} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.title || '(no title)'}</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{job.company || ''}</div>
                    </div>
                    <ScoreBadge score={job.match_score} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                    <select value={status} onChange={(e) => handleStatusChange(job.id, e.target.value)}
                      style={{ padding: '4px 8px', borderRadius: 6, border: `1.5px solid ${color}`, color, fontSize: 11, fontWeight: 600, background: `${color}10`, fontFamily: 'inherit', cursor: 'pointer' }}>
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>{job.created_at ? new Date(job.created_at).toLocaleDateString() : ''}</span>
                      {job.url && <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: '#3b82f6', textDecoration: 'none' }}>View →</a>}
                    </div>
                  </div>

                  <button onClick={() => setCoverLetterJob(job)}
                    style={{ width: '100%', padding: '6px 0', background: '#f1f5f9', color: '#1e3a5f', border: '1.5px solid #1e3a5f', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    ✉ Cover Letter
                  </button>

                  {(job.matched_skills?.length > 0) && (
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {job.matched_skills.map((kw) => (
                        <span key={kw} style={{ background: '#f1f5f9', color: '#475569', fontSize: 10, padding: '2px 6px', borderRadius: 999 }}>{kw}</span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
