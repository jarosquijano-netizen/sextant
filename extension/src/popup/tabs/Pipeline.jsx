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

function ScoreBadge({ score }) {
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: `${color}18`, border: `2px solid ${color}`, color, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
      {score ?? '—'}
    </span>
  )
}

function CoverLetterPanel({ jobId, onClose }) {
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    sendMsg({ type: 'COVER_LETTER', jobId }).then((res) => {
      setDraft(res?.draft || res?.error || 'No draft returned.')
      setLoading(false)
    })
  }, [jobId])

  function copy() {
    navigator.clipboard.writeText(draft).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Cover Letter Draft</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}>×</button>
        </div>
        {loading
          ? <div style={{ color: '#94a3b8', fontSize: 13, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Generating…</div>
          : <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={12} style={{ flex: 1, resize: 'none', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: 10, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
        }
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={copy} disabled={loading} style={{ flex: 1, padding: '8px 0', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {copied ? '✓ Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Pipeline() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [coverLetterJobId, setCoverLetterJobId] = useState(null)

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

  if (loading) return <div style={{ color: '#94a3b8', fontSize: 13 }}>Loading pipeline…</div>

  if (!jobs.length) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🧭</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>No jobs saved yet</div>
        <div style={{ fontSize: 12, lineHeight: 1.5 }}>Browse LinkedIn job postings to start scoring matches and saving them to your pipeline.</div>
      </div>
    )
  }

  return (
    <div>
      {coverLetterJobId && <CoverLetterPanel jobId={coverLetterJobId} onClose={() => setCoverLetterJobId(null)} />}

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

              <button onClick={() => setCoverLetterJobId(job.id)}
                style={{ width: '100%', padding: '6px 0', background: '#f1f5f9', color: '#1e3a5f', border: '1.5px solid #1e3a5f', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                ✉ Generate Cover Letter
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
    </div>
  )
}
