import React, { useState, useEffect } from 'react'

function sendMsg(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (res) => {
      if (chrome.runtime.lastError) resolve(null)
      else resolve(res)
    })
  })
}

const STATUS_OPTIONS = ['Saved', 'Applied', 'Screening', 'Rejected', 'Offer']

const STATUS_COLORS = {
  Saved: '#64748b',
  Applied: '#3b82f6',
  Screening: '#f59e0b',
  Rejected: '#ef4444',
  Offer: '#22c55e',
}

function ScoreBadge({ score }) {
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: `${color}18`, border: `2px solid ${color}`, color, fontSize: 12, fontWeight: 700 }}>
      {score}
    </span>
  )
}

export default function Pipeline() {
  const [jobs, setJobs] = useState([])

  useEffect(() => {
    sendMsg({ type: 'GET_PIPELINE' }).then((res) => {
      if (res?.pipeline) setJobs([...res.pipeline].reverse())
    })
  }, [])

  async function handleStatusChange(id, status) {
    await sendMsg({ type: 'UPDATE_JOB', id, updates: { status } })
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status } : j)))
  }

  if (jobs.length === 0) {
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
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>{jobs.length} job{jobs.length !== 1 ? 's' : ''} in pipeline</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {jobs.map((job) => (
          <div key={job.id} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {job.title || '(no title)'}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{job.company || ''}</div>
              </div>
              <ScoreBadge score={job.score || 0} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <select
                value={job.status || 'Saved'}
                onChange={(e) => handleStatusChange(job.id, e.target.value)}
                style={{
                  padding: '4px 8px', borderRadius: 6, border: `1.5px solid ${STATUS_COLORS[job.status || 'Saved']}`,
                  color: STATUS_COLORS[job.status || 'Saved'], fontSize: 11, fontWeight: 600,
                  background: `${STATUS_COLORS[job.status || 'Saved']}10`, fontFamily: 'inherit', cursor: 'pointer',
                }}
              >
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>
                  {job.dateSaved ? new Date(job.dateSaved).toLocaleDateString() : ''}
                </span>
                {job.url && (
                  <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: '#3b82f6', textDecoration: 'none' }}>
                    View →
                  </a>
                )}
              </div>
            </div>

            {job.matchedKeywords?.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {job.matchedKeywords.map((kw) => (
                  <span key={kw} style={{ background: '#f1f5f9', color: '#475569', fontSize: 10, padding: '2px 6px', borderRadius: 999 }}>{kw}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
