import { Router } from 'express'
import { query } from '../lib/db.js'

const router = Router()

router.get('/', async (req, res) => {
  const [profileResult, jobsResult, historyResult] = await Promise.all([
    query('SELECT data FROM profile ORDER BY id DESC LIMIT 1'),
    query('SELECT * FROM jobs ORDER BY created_at'),
    query('SELECT * FROM status_history ORDER BY changed_at'),
  ])

  res.json({
    exportedAt: new Date().toISOString(),
    profile: profileResult.rows[0]?.data || null,
    jobs: jobsResult.rows,
    statusHistory: historyResult.rows,
  })
})

router.post('/import', async (req, res) => {
  const { profile, jobs, statusHistory } = req.body
  if (!profile && !jobs) return res.status(400).json({ error: 'Import payload must include profile or jobs' })

  const client = await (await import('../lib/db.js')).query

  // Profile
  if (profile) {
    const existing = await query('SELECT id FROM profile ORDER BY id DESC LIMIT 1')
    if (existing.rows.length) {
      await query('UPDATE profile SET data = $1, updated_at = now() WHERE id = $2', [profile, existing.rows[0].id])
    } else {
      await query('INSERT INTO profile (data) VALUES ($1)', [profile])
    }
  }

  // Jobs + history
  const jobIdMap = {}
  for (const job of jobs || []) {
    const oldId = job.id
    const result = await query(
      `INSERT INTO jobs (company, title, url, description, match_score, matched_skills, status, source, created_at, status_updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [job.company, job.title, job.url, job.description, job.match_score, job.matched_skills || [], job.status, job.source, job.created_at, job.status_updated_at]
    )
    jobIdMap[oldId] = result.rows[0].id
  }

  for (const row of statusHistory || []) {
    const newJobId = jobIdMap[row.job_id]
    if (newJobId) {
      await query('INSERT INTO status_history (job_id, status, changed_at) VALUES ($1, $2, $3)', [newJobId, row.status, row.changed_at])
    }
  }

  res.json({ success: true, jobsImported: Object.keys(jobIdMap).length })
})

export default router
