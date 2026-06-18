import React, { useState, useEffect } from 'react'

function sendMsg(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (res) => {
      if (chrome.runtime.lastError) resolve(null)
      else resolve(res)
    })
  })
}

const STATUS_COLORS = { saved: '#94a3b8', applied: '#3b82f6', screening: '#f59e0b', rejected: '#ef4444', offer: '#22c55e' }

function FunnelBar({ label, count, max, color }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'capitalize' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{count}</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: '#e2e8f0', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.4s' }} />
      </div>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#1e3a5f' }}>{value}</div>
      <div style={{ fontSize: 10, color: '#64748b', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
    </div>
  )
}

function VelocityChart({ data }) {
  if (!data?.length) return null
  const max = Math.max(...data.map((d) => d.count), 1)
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#1e3a5f', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Applications / Week</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
        {data.slice(-8).map((d) => (
          <div key={d.week} title={`${d.week}: ${d.count}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ width: '100%', background: '#3b82f6', borderRadius: '3px 3px 0 0', height: `${(d.count / max) * 52}px`, minHeight: 2 }} />
            <span style={{ fontSize: 8, color: '#94a3b8', whiteSpace: 'nowrap' }}>{d.week?.split('-W')[1] || ''}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Stats() {
  const [stats, setStats] = useState(null)
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    sendMsg({ type: 'GET_STATS' }).then((res) => {
      if (res?.error) setError(res.error)
      else setStats(res?.stats || res)
      setLoading(false)
    })
  }, [])

  async function loadInsights(refresh = false) {
    setInsightsLoading(true)
    const res = await sendMsg({ type: refresh ? 'REFRESH_INSIGHTS' : 'GET_INSIGHTS' })
    setInsights(res?.error ? { error: res.error } : res)
    setInsightsLoading(false)
  }

  if (loading) return <div style={{ color: '#94a3b8', fontSize: 13 }}>Loading stats…</div>

  if (error) return (
    <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 8, padding: 12, fontSize: 12, color: '#dc2626' }}>
      {error}
    </div>
  )

  const funnel = stats?.funnel || {}
  const maxFunnel = Math.max(...Object.values(funnel), 1)
  const cr = stats?.conversionRates || {}
  const total = Object.values(funnel).reduce((a, b) => a + b, 0)

  if (total === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>No data yet</div>
        <div style={{ fontSize: 12, lineHeight: 1.5 }}>Save jobs from LinkedIn to start building your pipeline stats.</div>
      </div>
    )
  }

  return (
    <div>
      {/* AI Insights */}
      <div style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: 10, padding: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>✨ AI Insights</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {!insights && <button onClick={() => loadInsights(false)} disabled={insightsLoading}
              style={{ padding: '3px 10px', background: '#0369a1', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {insightsLoading ? 'Loading…' : 'Load'}
            </button>}
            {insights && <button onClick={() => loadInsights(true)} disabled={insightsLoading}
              style={{ padding: '3px 10px', background: '#fff', color: '#0369a1', border: '1px solid #0369a1', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {insightsLoading ? 'Refreshing…' : 'Regenerate'}
            </button>}
          </div>
        </div>
        {!insights && !insightsLoading && <div style={{ fontSize: 12, color: '#64748b' }}>Click Load to generate an AI narrative summary of your pipeline.</div>}
        {insightsLoading && <div style={{ fontSize: 12, color: '#0369a1' }}>Generating insights…</div>}
        {insights?.error && <div style={{ fontSize: 12, color: '#dc2626' }}>{insights.error}</div>}
        {insights?.summary && (
          <div>
            <p style={{ fontSize: 12, color: '#1e293b', lineHeight: 1.6, marginBottom: 10 }}>{insights.summary}</p>
            {insights.recommendations?.length > 0 && (
              <ul style={{ paddingLeft: 16, margin: 0 }}>
                {insights.recommendations.map((r, i) => (
                  <li key={i} style={{ fontSize: 11, color: '#475569', marginBottom: 4, lineHeight: 1.5 }}>{r}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Funnel */}
      <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#1e3a5f', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pipeline Funnel</div>
        {Object.entries(funnel).map(([status, count]) => (
          <FunnelBar key={status} label={status} count={count} max={maxFunnel} color={STATUS_COLORS[status] || '#64748b'} />
        ))}
      </div>

      {/* Conversion rates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
        <StatCard label="Saved→Applied" value={`${Math.round((cr.savedToApplied || 0) * 100)}%`} />
        <StatCard label="Applied→Screen" value={`${Math.round((cr.appliedToScreening || 0) * 100)}%`} />
        <StatCard label="Screen→Offer" value={`${Math.round((cr.screeningToOffer || 0) * 100)}%`} />
      </div>

      {/* Velocity chart */}
      {stats?.applicationVelocity?.length > 0 && (
        <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <VelocityChart data={stats.applicationVelocity} />
        </div>
      )}

      {/* Top matched skills */}
      {stats?.topMatchedSkills?.length > 0 && (
        <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1e3a5f', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Top Matched Skills</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {stats.topMatchedSkills.slice(0, 10).map(({ skill, count }) => (
              <span key={skill} style={{ background: '#f1f5f9', color: '#475569', fontSize: 11, padding: '3px 8px', borderRadius: 999 }}>
                {skill} <strong>{count}</strong>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
