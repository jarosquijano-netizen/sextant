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
  try {
    const { jobId, jobTitle, company, jobDescription, tone = 'professional', regenerate = false } = req.body

    const profile = await getProfile()

    let jobInfo = { title: jobTitle || '', company: company || '', description: jobDescription || '' }

    if (jobId) {
      const job = await getJob(jobId)
      if (!job) return res.status(404).json({ error: 'Job not found' })
      jobInfo = { title: job.title || jobTitle || '', company: job.company || company || '', description: job.description || jobDescription || '' }

      // Return cached artifact unless regenerate is requested
      if (!regenerate) {
        const prior = await query(
          `SELECT content FROM ai_artifacts WHERE job_id = $1 AND kind = $2 AND content->>'tone' = $3 ORDER BY created_at DESC LIMIT 1`,
          [jobId, 'cover_letter', tone]
        )
        if (prior.rows.length) return res.json(prior.rows[0].content)
      }
    }

    const toneInstructions = {
      professional: 'Write in a polished, confident, and formal tone. Focus on business impact and leadership.',
      enthusiastic: 'Write with genuine enthusiasm and energy. Show passion for the company mission and role.',
      concise: 'Write very concisely — 2 short paragraphs, under 120 words total. Every sentence must earn its place.',
    }

    const draft = await callClaude({
      system: `You are an expert cover letter writer. ${toneInstructions[tone] || toneInstructions.professional} Use the applicant's real experience and achievements — no generic filler. Write the letter only, no subject line, no "Dear Hiring Manager" unless the company name is known. End with a confident closing line.`,
      user: `Applicant profile:\n${JSON.stringify(profile, null, 2)}\n\nRole: ${jobInfo.title} at ${jobInfo.company || 'the company'}\nJob description:\n${(jobInfo.description || 'Not provided').slice(0, 4000)}`,
      maxTokens: 900,
    })

    const content = { draft, tone, jobTitle: jobInfo.title, company: jobInfo.company }
    if (jobId) await storeArtifact(jobId, 'cover_letter', content)
    res.json(content)
  } catch (err) {
    console.error('/ai/cover-letter error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /ai/draft-answer
router.post('/draft-answer', async (req, res) => {
  try {
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
  } catch (err) {
    console.error('/ai/draft-answer error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /ai/bullet-suggestions
router.post('/bullet-suggestions', async (req, res) => {
  try {
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
  } catch (err) {
    console.error('/ai/bullet-suggestions error:', err.message)
    res.status(500).json({ error: err.message })
  }
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
