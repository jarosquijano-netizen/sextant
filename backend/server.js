import express from 'express'
import cors from 'cors'
import { runMigrations } from './lib/db.js'
import profileRouter from './routes/profile.js'
import jobsRouter from './routes/jobs.js'
import statsRouter from './routes/stats.js'
import cvRouter from './routes/cv.js'
import aiRouter from './routes/ai.js'
import exportRouter from './routes/export.js'

const app = express()
const PORT = process.env.PORT || 3000

// CORS — driven entirely by env var so adding the Netlify dashboard origin never requires a code change
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman, service worker) and all chrome-extension origins
    if (!origin) return cb(null, true)
    if (origin.startsWith('chrome-extension://')) return cb(null, true)
    if (allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error(`CORS: origin ${origin} not allowed`))
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json({ limit: '5mb' }))

// Auth middleware — single static API key
app.use((req, res, next) => {
  const auth = req.headers['authorization'] || ''
  const key = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!process.env.SEXTANT_API_KEY) {
    return res.status(500).json({ error: 'SEXTANT_API_KEY not configured on server.' })
  }
  if (key !== process.env.SEXTANT_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: missing or invalid API key.' })
  }
  next()
})

app.use('/profile', profileRouter)
app.use('/jobs', jobsRouter)
app.use('/stats', statsRouter)
app.use('/cv', cvRouter)
app.use('/ai', aiRouter)
app.use('/export', exportRouter)
app.post('/import', (req, res, next) => {
  req.url = '/import'
  exportRouter(req, res, next)
})

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

app.use((err, _req, res, _next) => {
  console.error(err)
  const status = err.status || 500
  res.status(status).json({ error: err.message || 'Internal server error' })
})

async function start() {
  try {
    await runMigrations()
    app.listen(PORT, () => console.log(`Sextant backend running on port ${PORT}`))
  } catch (err) {
    console.error('Failed to start:', err)
    process.exit(1)
  }
}

start()
