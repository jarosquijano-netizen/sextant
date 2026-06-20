import React, { useState, useEffect } from 'react'

function sendMsg(msg) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(msg, (res) => {
        if (chrome.runtime.lastError) resolve(null)
        else resolve(res)
      })
    } catch { resolve(null) }
    // Safety timeout — service worker may be asleep
    setTimeout(() => resolve(null), 5000)
  })
}

const STAGES = ['saved', 'applied', 'screening', 'interview', 'offer', 'rejected']
const STAGE_COLOR = {
  saved:      { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
  applied:    { bg: '#eff6ff', text: '#1d4ed8', border: '#93c5fd' },
  screening:  { bg: '#fefce8', text: '#854d0e', border: '#fde047' },
  interview:  { bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
  offer:      { bg: '#f0fdf4', text: '#15803d', border: '#4ade80' },
  rejected:   { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5' },
}

const TONES = [
  { value: 'professional', label: 'Professional', desc: 'Polished & formal' },
  { value: 'enthusiastic', label: 'Enthusiastic', desc: 'Energetic & passionate' },
  { value: 'concise', label: 'Concise', desc: 'Short & punchy' },
]

function daysSince(dateStr) {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr)) / 86400000)
}

function FollowUpBadge({ job }) {
  if (!['applied', 'screening'].includes(job.status)) return null
  const days = daysSince(job.status_updated_at)
  if (days === null) return null
  if (days < 7) return null
  const urgent = days >= 14
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999,
      background: urgent ? '#fef2f2' : '#fefce8',
      color: urgent ? '#b91c1c' : '#854d0e',
      border: `1px solid ${urgent ? '#fca5a5' : '#fde047'}`,
    }}>
      {urgent ? `⚠ ${days}d — follow up now` : `⏰ ${days}d — consider following up`}
    </span>
  )
}

function ScoreBadge({ score }) {
  if (score == null) return null
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444'
  return (
    <span title="Match score" style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 30, height: 30, borderRadius: '50%',
      background: `${color}15`, border: `2px solid ${color}`,
      color, fontSize: 11, fontWeight: 700, flexShrink: 0,
    }}>{score}</span>
  )
}

// ─── Add Job Modal ────────────────────────────────────────────────────────────
function AddJobModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', company: '', url: '', description: '', status: 'saved' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    chrome.tabs?.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab) return
      setForm((f) => ({ ...f, url: tab.url || '', title: f.title || '' }))
    })
  }, [])

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })) }

  async function save() {
    if (!form.title.trim() || !form.company.trim()) { setError('Title and company are required.'); return }
    setSaving(true); setError('')
    const res = await sendMsg({ type: 'SAVE_JOB', job: { ...form, status: form.status } })
    if (!res || res.error) { setError(res?.error || 'Could not save — check Settings tab for API config.'); setSaving(false); return }
    onSaved(res.job)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 12, overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.25)', marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 0' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>+ Add Job to Pipeline</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>×</button>
        </div>
        <div style={{ padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 3, textTransform: 'uppercase' }}>Job Title *</div>
              <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="VP of Product"
                style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 3, textTransform: 'uppercase' }}>Company *</div>
              <input value={form.company} onChange={(e) => set('company', e.target.value)} placeholder="Acme Corp"
                style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 3, textTransform: 'uppercase' }}>Job URL</div>
            <input value={form.url} onChange={(e) => set('url', e.target.value)} placeholder="https://…"
              style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 3, textTransform: 'uppercase' }}>Initial Status</div>
            <select value={form.status} onChange={(e) => set('status', e.target.value)}
              style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, fontFamily: 'inherit' }}>
              {STAGES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 3, textTransform: 'uppercase' }}>Job Description <span style={{ fontWeight: 400 }}>(paste for AI features)</span></div>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={4}
              placeholder="Paste the job description to enable cover letters, match scoring, and AI answers…"
              style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
          {error && <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 7, padding: '8px 10px', fontSize: 12, color: '#dc2626' }}>{error}</div>}
          <button onClick={save} disabled={saving}
            style={{ padding: '10px 0', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
            {saving ? 'Saving…' : 'Save to Pipeline'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Cover Letter Modal ───────────────────────────────────────────────────────
function CoverLetterModal({ jobId, initialJobTitle, initialCompany, onClose }) {
  const [tone, setTone] = useState('professional')
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [inserted, setInserted] = useState(false)
  const [jobTitle, setJobTitle] = useState(initialJobTitle || '')
  const [company, setCompany] = useState(initialCompany || '')
  const [jobDesc, setJobDesc] = useState('')
  const [error, setError] = useState('')

  async function generate(regenerate = false) {
    setLoading(true); setError(''); setDraft('')
    const config = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_API_CONFIG' }, (r) => resolve(r?.config || {}))
    })
    if (!config.baseUrl || !config.apiKey) { setError('API not configured — go to Settings tab.'); setLoading(false); return }
    try {
      const body = { tone, regenerate, ...(jobId ? { jobId } : { jobTitle, company, jobDescription: jobDesc }) }
      const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}/ai/cover-letter`, {
        method: 'POST', headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
      setDraft(data.draft || '')
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  function copy() { navigator.clipboard.writeText(draft).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }) }

  async function insertIntoPage() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab) return
    chrome.tabs.sendMessage(tab.id, { type: 'INSERT_COVER_LETTER', text: draft }, () => {
      setInserted(true); setTimeout(() => setInserted(false), 2000)
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 12, overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.25)', marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 0' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>✉ Cover Letter</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>×</button>
        </div>
        <div style={{ padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!jobId && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 3, textTransform: 'uppercase' }}>Job Title</div>
                  <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="VP Product"
                    style={{ width: '100%', padding: '6px 9px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 3, textTransform: 'uppercase' }}>Company</div>
                  <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Corp"
                    style={{ width: '100%', padding: '6px 9px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 3, textTransform: 'uppercase' }}>Job Description</div>
                <textarea value={jobDesc} onChange={(e) => setJobDesc(e.target.value)} rows={3} placeholder="Paste job description…"
                  style={{ width: '100%', padding: '6px 9px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
            </>
          )}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>Tone</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {TONES.map((t) => (
                <button key={t.value} onClick={() => setTone(t.value)} style={{
                  flex: 1, padding: '6px 4px', border: `1.5px solid ${tone === t.value ? '#1e3a5f' : '#e2e8f0'}`,
                  borderRadius: 8, background: tone === t.value ? '#1e3a5f' : '#fff',
                  color: tone === t.value ? '#fff' : '#64748b', fontSize: 10, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1.3,
                }}>
                  <div>{t.label}</div>
                  <div style={{ fontSize: 9, opacity: 0.75, marginTop: 2 }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>
          {!draft && (
            <button onClick={() => generate(false)} disabled={loading}
              style={{ padding: '9px 0', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {loading ? 'Generating…' : 'Generate Cover Letter'}
            </button>
          )}
          {error && <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 7, padding: '8px 10px', fontSize: 12, color: '#dc2626' }}>{error}</div>}
          {draft && (
            <>
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={10}
                style={{ width: '100%', resize: 'vertical', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: 10, fontSize: 12, fontFamily: 'inherit', lineHeight: 1.6, outline: 'none', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={copy} style={{ flex: 1, padding: '8px 0', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {copied ? '✓ Copied!' : '📋 Copy'}
                </button>
                <button onClick={insertIntoPage} style={{ flex: 1, padding: '8px 0', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {inserted ? '✓ Inserted!' : '⬇ Insert into form'}
                </button>
                <button onClick={() => generate(true)} disabled={loading} style={{ flex: 1, padding: '8px 0', background: '#f1f5f9', color: '#1e3a5f', border: '1.5px solid #1e3a5f', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {loading ? '…' : '↺ Redo'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Job Card ─────────────────────────────────────────────────────────────────
function JobCard({ job, onStatusChange, onCoverLetter }) {
  const status = (job.status || 'saved').toLowerCase()
  const sc = STAGE_COLOR[status] || STAGE_COLOR.saved
  const appliedDays = daysSince(job.status_updated_at)
  const createdDays = daysSince(job.created_at)

  return (
    <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {job.url
              ? <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1e293b', textDecoration: 'none' }}>{job.title || '(no title)'}</a>
              : (job.title || '(no title)')}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{job.company || ''}</div>
        </div>
        <ScoreBadge score={job.match_score} />
      </div>

      {/* Status + dates */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        <select value={status} onChange={(e) => onStatusChange(job.id, e.target.value)}
          style={{ padding: '3px 8px', borderRadius: 6, border: `1.5px solid ${sc.border}`, color: sc.text, fontSize: 11, fontWeight: 700, background: sc.bg, fontFamily: 'inherit', cursor: 'pointer' }}>
          {STAGES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>

        {createdDays !== null && (
          <span style={{ fontSize: 10, color: '#94a3b8' }}>Added {createdDays}d ago</span>
        )}
        {['applied', 'screening', 'interview'].includes(status) && appliedDays !== null && (
          <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>· {appliedDays}d since status change</span>
        )}
      </div>

      {/* Follow-up badge */}
      <FollowUpBadge job={job} />

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <button onClick={() => onCoverLetter(job)}
          style={{ flex: 1, padding: '5px 0', background: '#f8fafc', color: '#1e3a5f', border: '1.5px solid #1e3a5f', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          ✉ Cover Letter
        </button>
        {job.url && (
          <a href={job.url} target="_blank" rel="noopener noreferrer"
            style={{ padding: '5px 10px', background: '#f8fafc', color: '#3b82f6', border: '1.5px solid #bfdbfe', borderRadius: 7, fontSize: 11, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            View →
          </a>
        )}
      </div>

      {/* Matched skills */}
      {job.matched_skills?.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {job.matched_skills.slice(0, 8).map((kw) => (
            <span key={kw} style={{ background: '#f1f5f9', color: '#475569', fontSize: 10, padding: '2px 6px', borderRadius: 999 }}>{kw}</span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────
export default function Pipeline() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [coverLetterJob, setCoverLetterJob] = useState(null)
  const [showNewCoverLetter, setShowNewCoverLetter] = useState(false)
  const [showAddJob, setShowAddJob] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    sendMsg({ type: 'GET_JOBS' }).then((res) => {
      setJobs([...(res?.jobs || [])].reverse())
      setLoading(false)
    })
  }, [])

  function handleStatusChange(id, status) {
    sendMsg({ type: 'PATCH_JOB', id, updates: { status } })
    setJobs((prev) => prev.map((j) => j.id === id ? { ...j, status, status_updated_at: new Date().toISOString() } : j))
  }

  function handleJobSaved(job) { setJobs((prev) => [job, ...prev]) }

  const filtered = filter === 'all' ? jobs : jobs.filter((j) => j.status === filter)

  // Summary counts
  const counts = {}
  for (const s of STAGES) counts[s] = jobs.filter((j) => j.status === s).length

  if (loading) return <div style={{ color: '#94a3b8', fontSize: 13, padding: 8 }}>Loading pipeline…</div>

  return (
    <div>
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
          style={{ flex: 1, padding: '9px 0', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          + Add Job
        </button>
        <button onClick={() => setShowNewCoverLetter(true)}
          style={{ flex: 1, padding: '9px 0', background: '#f0f9ff', color: '#0369a1', border: '1.5px solid #bae6fd', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          ✉ Cover Letter
        </button>
      </div>

      {/* Stage summary strip */}
      {jobs.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 12, overflowX: 'auto', paddingBottom: 2 }}>
          {[['all', 'All', '#1e3a5f'], ...STAGES.map((s) => [s, s.charAt(0).toUpperCase() + s.slice(1), STAGE_COLOR[s].text])].map(([val, label, color]) => {
            const cnt = val === 'all' ? jobs.length : counts[val] || 0
            if (val !== 'all' && cnt === 0) return null
            return (
              <button key={val} onClick={() => setFilter(val)} style={{
                padding: '3px 10px', borderRadius: 999, border: `1.5px solid ${filter === val ? color : '#e2e8f0'}`,
                background: filter === val ? color : '#fff', color: filter === val ? '#fff' : '#64748b',
                fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                {label} {cnt}
              </button>
            )
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🧭</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>
            {jobs.length === 0 ? 'No jobs saved yet' : `No jobs with status "${filter}"`}
          </div>
          <div style={{ fontSize: 11, lineHeight: 1.5 }}>
            {jobs.length === 0
              ? 'Click "+ Add Job" to start tracking applications, or browse LinkedIn to score and save jobs.'
              : 'Change the filter above to see other stages.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((job) => (
            <JobCard key={job.id} job={job} onStatusChange={handleStatusChange} onCoverLetter={setCoverLetterJob} />
          ))}
        </div>
      )}
    </div>
  )
}
