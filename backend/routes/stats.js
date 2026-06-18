import { Router } from 'express'
import { query } from '../lib/db.js'

const router = Router()

router.get('/', async (req, res) => {
  const [jobsResult, historyResult] = await Promise.all([
    query('SELECT * FROM jobs'),
    query('SELECT * FROM status_history ORDER BY changed_at'),
  ])

  const jobs = jobsResult.rows
  const history = historyResult.rows

  // Funnel counts
  const funnel = { saved: 0, applied: 0, screening: 0, rejected: 0, offer: 0 }
  for (const job of jobs) {
    const s = (job.status || 'saved').toLowerCase()
    if (s in funnel) funnel[s]++
  }

  // Conversion rates
  const savedToApplied = funnel.saved > 0 ? (funnel.applied + funnel.screening + funnel.rejected + funnel.offer) / (funnel.saved + funnel.applied + funnel.screening + funnel.rejected + funnel.offer) : 0
  const appliedToScreening = funnel.applied > 0 ? funnel.screening / (funnel.applied + funnel.screening + funnel.rejected + funnel.offer) : 0
  const screeningToOffer = funnel.screening > 0 ? funnel.offer / funnel.screening : 0

  // Avg match score by status
  const scoresByStatus = {}
  for (const job of jobs) {
    const s = (job.status || 'saved').toLowerCase()
    if (!scoresByStatus[s]) scoresByStatus[s] = []
    if (job.match_score != null) scoresByStatus[s].push(job.match_score)
  }
  const avgMatchScoreByStatus = {}
  for (const [s, scores] of Object.entries(scoresByStatus)) {
    avgMatchScoreByStatus[s] = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  }

  // Avg days in stage (applied, screening)
  const avgDaysInStage = { applied: 0, screening: 0 }
  const stageDurations = { applied: [], screening: [] }
  const jobHistory = {}
  for (const row of history) {
    if (!jobHistory[row.job_id]) jobHistory[row.job_id] = []
    jobHistory[row.job_id].push(row)
  }
  for (const [, entries] of Object.entries(jobHistory)) {
    for (let i = 0; i < entries.length - 1; i++) {
      const stage = (entries[i].status || '').toLowerCase()
      if (stage === 'applied' || stage === 'screening') {
        const days = (new Date(entries[i + 1].changed_at) - new Date(entries[i].changed_at)) / 86400000
        stageDurations[stage]?.push(days)
      }
    }
  }
  for (const [stage, durations] of Object.entries(stageDurations)) {
    avgDaysInStage[stage] = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0
  }

  // Application velocity by week
  const weekCounts = {}
  for (const job of jobs) {
    if (!job.created_at) continue
    const d = new Date(job.created_at)
    const week = `${d.getFullYear()}-W${String(getISOWeek(d)).padStart(2, '0')}`
    weekCounts[week] = (weekCounts[week] || 0) + 1
  }
  const applicationVelocity = Object.entries(weekCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count }))

  // Top matched skills
  const skillCounts = {}
  for (const job of jobs) {
    for (const skill of job.matched_skills || []) {
      skillCounts[skill] = (skillCounts[skill] || 0) + 1
    }
  }
  const topMatchedSkills = Object.entries(skillCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([skill, count]) => ({ skill, count }))

  // Source breakdown
  const sourceBreakdown = {}
  for (const job of jobs) {
    const s = job.source || 'unknown'
    sourceBreakdown[s] = (sourceBreakdown[s] || 0) + 1
  }

  res.json({
    funnel,
    conversionRates: { savedToApplied, appliedToScreening, screeningToOffer },
    avgMatchScoreByStatus,
    avgDaysInStage,
    applicationVelocity,
    topMatchedSkills,
    sourceBreakdown,
  })
})

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

export default router
