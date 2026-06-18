import { Router } from 'express'
import { query } from '../lib/db.js'

const router = Router()

router.post('/', async (req, res) => {
  const { company, title, url, description, match_score, matched_skills, source } = req.body
  const result = await query(
    `INSERT INTO jobs (company, title, url, description, match_score, matched_skills, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [company, title, url, description, match_score, matched_skills || [], source]
  )
  const job = result.rows[0]
  await query('INSERT INTO status_history (job_id, status) VALUES ($1, $2)', [job.id, job.status])
  res.status(201).json(job)
})

router.get('/', async (req, res) => {
  const { status } = req.query
  let text = 'SELECT * FROM jobs'
  const params = []
  if (status) {
    text += ' WHERE status = $1'
    params.push(status)
  }
  text += ' ORDER BY created_at DESC'
  const result = await query(text, params)
  res.json(result.rows)
})

router.patch('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  const { status } = req.body
  if (!status) return res.status(400).json({ error: 'status is required' })

  const result = await query(
    'UPDATE jobs SET status = $1, status_updated_at = now() WHERE id = $2 RETURNING *',
    [status, id]
  )
  if (!result.rows.length) return res.status(404).json({ error: 'Job not found' })

  await query('INSERT INTO status_history (job_id, status) VALUES ($1, $2)', [id, status])
  res.json(result.rows[0])
})

export default router
