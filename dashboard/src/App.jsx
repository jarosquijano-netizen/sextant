import React, { useState, useEffect } from 'react'
import { getStats, getInsights, refreshInsights, getJobs } from './api.js'

const STATUS_COLORS = { saved: '#94a3b8', applied: '#3b82f6', screening: '#f59e0b', rejected: '#ef4444', offer: '#22c55e' }

function FunnelBar({ label, count, max, color }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#475569', textTransform: 'capitalize' }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color }}>{count}</span>
      </div>
      <div style={{ height: 10, borderRadius: 5, background: '#e2e8f0', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${max > 0 ? (count / max) * 100 : 0}%`, background: color, borderRadius: 5, transition: 'width 0.5s' }} />
      </div>
    </div>
  )
}

function Card({ title, children, action }) {
  return (
    <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: 24, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

function StatPill({ label, value }) {
  return (
    <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '12px 18px', textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#1e3a5f' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
    </div>
  )
}

export default function App() {
  const [stats, setStats] = useState(null)
  const [insights, setInsights] = useState(null)
  const [jobs, setJobs] = useState([])
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getStats(), getJobs()])
      .then(([s, j]) => { setStats(s); setJobs(j) })
      .catch((e) => setError(e.message))
  }, [])

  async function loadInsights(refresh = false) {
    setInsightsLoading(true)
    try {
      const data = refresh ? await refreshInsights() : await getInsights()
      setInsights(data)
    } catch (e) {
      setInsights({ error: e.message })
    } finally {
      setInsightsLoading(false)
    }
  }

  const isConfigured = !!(import.meta.env.VITE_API_BASE_URL && import.meta.env.VITE_API_KEY)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <span style={{ fontSize: 32 }}>🧭</span>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e3a5f' }}>Sextant Dashboard</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Job search pipeline overview</p>
        </div>
      </div>

      {!isConfigured && (
        <div style={{ background: '#fef9c3', border: '1.5px solid #fde047', borderRadius: 10, padding: '14px 18px', marginBottom: 24, fontSize: 13, color: '#854d0e' }}>
          <strong>Setup required:</strong> Set <code>VITE_API_BASE_URL</code> and <code>VITE_API_KEY</code> in your Netlify environment variables, then redeploy.
        </div>
      )}

      {error && (
        <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 10, padding: '14px 18px', marginBottom: 24, fontSize: 13, color: '#dc2626' }}>
          {error}
        </div>
      )}

      {/* AI Insights */}
      <Card title="✨ AI Insights" action={
        <button onClick={() => loadInsights(insights ? true : false)} disabled={insightsLoading}
          style={{ padding: '6px 14px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          {insightsLoading ? 'Loading…' : insights ? 'Regenerate' : 'Load Insights'}
        </button>
      }>
        {!insights && !insightsLoading && <p style={{ fontSize: 13, color: '#94a3b8' }}>Click "Load Insights" to generate an AI narrative summary of your pipeline.</p>}
        {insightsLoading && <p style={{ fontSize: 13, color: '#64748b' }}>Generating insights from your pipeline data…</p>}
        {insights?.error && <p style={{ fontSize: 13, color: '#dc2626' }}>{insights.error}</p>}
        {insights?.summary && (
          <div>
            <p style={{ fontSize: 14, color: '#1e293b', lineHeight: 1.7, marginBottom: 14 }}>{insights.summary}</p>
            {insights.recommendations?.length > 0 && (
              <ul style={{ paddingLeft: 20 }}>
                {insights.recommendations.map((r, i) => (
                  <li key={i} style={{ fontSize: 13, color: '#475569', marginBottom: 6, lineHeight: 1.6 }}>{r}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>

      {stats && (
        <>
          {/* Summary pills */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 20 }}>
            <StatPill label="Total Jobs" value={Object.values(stats.funnel || {}).reduce((a, b) => a + b, 0)} />
            <StatPill label="Applied" value={stats.funnel?.applied || 0} />
            <StatPill label="Screening" value={stats.funnel?.screening || 0} />
            <StatPill label="Offers" value={stats.funnel?.offer || 0} />
            <StatPill label="Avg Score (Applied)" value={stats.avgMatchScoreByStatus?.applied ?? '—'} />
          </div>

          {/* Funnel */}
          <Card title="Pipeline Funnel">
            {Object.entries(stats.funnel || {}).map(([status, count]) => (
              <FunnelBar key={status} label={status} count={count} max={Math.max(...Object.values(stats.funnel), 1)} color={STATUS_COLORS[status] || '#94a3b8'} />
            ))}
          </Card>

          {/* Conversion rates */}
          <Card title="Conversion Rates">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <StatPill label="Saved → Applied" value={`${Math.round((stats.conversionRates?.savedToApplied || 0) * 100)}%`} />
              <StatPill label="Applied → Screening" value={`${Math.round((stats.conversionRates?.appliedToScreening || 0) * 100)}%`} />
              <StatPill label="Screening → Offer" value={`${Math.round((stats.conversionRates?.screeningToOffer || 0) * 100)}%`} />
            </div>
          </Card>

          {/* Top matched skills */}
          {stats.topMatchedSkills?.length > 0 && (
            <Card title="Top Matched Skills">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {stats.topMatchedSkills.map(({ skill, count }) => (
                  <span key={skill} style={{ background: '#f1f5f9', color: '#475569', fontSize: 13, padding: '5px 12px', borderRadius: 999, border: '1px solid #e2e8f0' }}>
                    {skill} <strong style={{ color: '#1e3a5f' }}>{count}</strong>
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Weekly velocity */}
          {stats.applicationVelocity?.length > 0 && (
            <Card title="Applications per Week">
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
                {(() => {
                  const max = Math.max(...stats.applicationVelocity.map((d) => d.count), 1)
                  return stats.applicationVelocity.slice(-12).map((d) => (
                    <div key={d.week} title={`${d.week}: ${d.count}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: '100%', background: '#3b82f6', borderRadius: '4px 4px 0 0', height: `${(d.count / max) * 64}px`, minHeight: 3 }} />
                      <span style={{ fontSize: 9, color: '#94a3b8' }}>W{d.week?.split('-W')[1]}</span>
                    </div>
                  ))
                })()}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Recent jobs table */}
      {jobs.length > 0 && (
        <Card title="Recent Jobs">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                {['Company', 'Title', 'Score', 'Status', 'Saved'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 10px', fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.slice(0, 20).map((job) => {
                const color = STATUS_COLORS[(job.status || 'saved').toLowerCase()] || '#94a3b8'
                return (
                  <tr key={job.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{job.company || '—'}</td>
                    <td style={{ padding: '8px 10px', color: '#475569' }}>{job.title || '—'}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ fontWeight: 700, color: (job.match_score || 0) >= 70 ? '#22c55e' : (job.match_score || 0) >= 40 ? '#eab308' : '#ef4444' }}>
                        {job.match_score ?? '—'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ background: `${color}18`, color, border: `1px solid ${color}`, borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>
                        {job.status || 'saved'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', color: '#94a3b8', fontSize: 11 }}>
                      {job.created_at ? new Date(job.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}

      <div style={{ textAlign: 'center', fontSize: 11, color: '#cbd5e1', marginTop: 32 }}>🧭 Sextant</div>
    </div>
  )
}
