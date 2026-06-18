import { Router } from 'express'
import { query } from '../lib/db.js'
import { callClaude } from '../lib/claude-client.js'

const router = Router()

async function getProfile() {
  const result = await query('SELECT data FROM profile ORDER BY id DESC LIMIT 1')
  return result.rows[0]?.data || {}
}

async function getJob(jobId) {
  const result = await query('SELECT * FROM jobs WHERE id = $1', [jobId])
  return result.rows[0] || null
}

async function storeArtifact(jobId, kind, content) {
  await query(
    'INSERT INTO ai_artifacts (job_id, kind, content) VALUES ($1, $2, $3)',
    [jobId || null, kind, content]
  )
}

// POST /ai/cover-letter
router.post('/cover-letter', async (req, res) => {
  const { jobId } = req.body
  if (!jobId) return res.status(400).json({ error: 'jobId is required' })

  const [profile, job] = await Promise.all([getProfile(), getJob(jobId)])
  if (!job) return res.status(404).json({ error: 'Job not found' })

  // Return prior artifact if it exists
  const prior = await query(
    'SELECT content FROM ai_artifacts WHERE job_id = $1 AND kind = $2 ORDER BY created_at DESC LIMIT 1',
    [jobId, 'cover_letter']
  )
  if (prior.rows.length) return res.json(prior.rows[0].content)

  const draft = await callClaude({
    system: `You are a professional cover letter writer. Write a concise, specific cover letter (3 short paragraphs, ~200 words) based on the applicant's profile and the job description. Use the applicant's real experience. No generic filler. End with the letter only.`,
    user: `Applicant profile:\n${JSON.stringify(profile, null, 2)}\n\nJob: ${job.title} at ${job.company}\nJob description:\n${job.description || 'Not available'}`,
    maxTokens: 800,
  })

  const content = { draft }
  await storeArtifact(jobId, 'cover_letter', content)
  res.json(content)
})

// POST /ai/draft-answer
router.post('/draft-answer', async (req, res) => {
  const { jobId, jobDescription, questionText } = req.body
  if (!questionText) return res.status(400).json({ error: 'questionText is required' })

  const profile = await getProfile()
  let jobDesc = jobDescription || ''
  if (jobId && !jobDesc) {
    const job = await getJob(jobId)
    jobDesc = job?.description || ''
  }

  const draft = await callClaude({
    system: `You are helping a job applicant answer a specific application form question. Write a concise, honest answer (2-4 sentences unless the question implies more) using the applicant's real profile. Be specific, not generic. Return only the answer text.`,
    user: `Question: "${questionText}"\n\nApplicant profile:\n${JSON.stringify(profile, null, 2)}\n\nJob context:\n${jobDesc.slice(0, 4000)}`,
    maxTokens: 400,
  })

  if (jobId) await storeArtifact(jobId, 'draft_answer', { question: questionText, draft })
  res.json({ draft })
})

// POST /ai/bullet-suggestions
router.post('/bullet-suggestions', async (req, res) => {
  const { jobId, jobDescription } = req.body

  const profile = await getProfile()
  let jobDesc = jobDescription || ''
  if (jobId && !jobDesc) {
    const job = await getJob(jobId)
    jobDesc = job?.description || ''
  }

  const allBullets = (profile.experience || []).flatMap((e) => e.bullets || [])

  const result = await callClaude({
    system: `You are a career coach. Given an applicant's resume bullets and a job description, identify the 3-5 most relevant bullets verbatim (do NOT rewrite them) and provide a one-line rationale for why each is relevant. Return JSON: { "suggestedBullets": [{ "bullet": "...", "rationale": "..." }] }`,
    user: `Resume bullets:\n${allBullets.map((b) => `• ${b}`).join('\n')}\n\nJob description:\n${jobDesc.slice(0, 4000)}`,
    jsonMode: true,
    maxTokens: 600,
  })

  if (jobId) await storeArtifact(jobId, 'bullet_suggestions', result)
  res.json(result)
})

// GET /ai/insights
router.get('/insights', async (req, res) => {
  const CACHE_TTL_HOURS = 24
  const cached = await query(
    `SELECT payload, generated_at FROM ai_insights_cache ORDER BY id DESC LIMIT 1`
  )
  if (cached.rows.length) {
    const age = (Date.now() - new Date(cached.rows[0].generated_at)) / 3600000
    if (age < CACHE_TTL_HOURS) return res.json(cached.rows[0].payload)
  }

  return generateInsights(res)
})

// POST /ai/insights/refresh
router.post('/insights/refresh', async (req, res) => {
  return generateInsights(res)
})

async function generateInsights(res) {
  // Get stats inline (same logic as stats route, avoids circular HTTP call)
  const jobsResult = await query('SELECT * FROM jobs')
  const jobs = jobsResult.rows

  const funnel = { saved: 0, applied: 0, screening: 0, rejected: 0, offer: 0 }
  for (const job of jobs) {
    const s = (job.status || 'saved').toLowerCase()
    if (s in funnel) funnel[s]++
  }

  const statsSnapshot = {
    funnel,
    totalJobs: jobs.length,
    avgMatchScore: jobs.length
      ? Math.round(jobs.reduce((a, b) => a + (b.match_score || 0), 0) / jobs.length)
      : 0,
  }

  const payload = await callClaude({
    system: `You are a job search advisor. Given a user's application pipeline statistics, write a helpful 2-4 sentence narrative summary of their progress and trends, followed by 2-3 concrete, specific recommendations. Return JSON: { "summary": "...", "recommendations": ["...", "..."] }`,
    user: `Pipeline stats:\n${JSON.stringify(statsSnapshot, null, 2)}`,
    jsonMode: true,
    maxTokens: 500,
  })

  await query('INSERT INTO ai_insights_cache (payload) VALUES ($1)', [payload])
  res.json(payload)
}

export default router
