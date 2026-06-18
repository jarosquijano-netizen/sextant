import { Router } from 'express'
import { query } from '../lib/db.js'

const router = Router()

router.get('/', async (req, res) => {
  const result = await query('SELECT data FROM profile ORDER BY id DESC LIMIT 1')
  if (!result.rows.length) {
    return res.json(defaultProfile())
  }
  res.json(result.rows[0].data)
})

router.put('/', async (req, res) => {
  const data = req.body
  if (!data || typeof data !== 'object') return res.status(400).json({ error: 'Invalid profile data' })

  const existing = await query('SELECT id FROM profile ORDER BY id DESC LIMIT 1')
  if (existing.rows.length) {
    await query('UPDATE profile SET data = $1, updated_at = now() WHERE id = $2', [data, existing.rows[0].id])
  } else {
    await query('INSERT INTO profile (data) VALUES ($1)', [data])
  }
  res.json(data)
})

function defaultProfile() {
  return {
    personal: {
      firstName: 'Joe', lastName: '', email: '', phone: '',
      location: 'Barcelona, Spain', linkedinUrl: '',
      workAuthorization: 'EU citizen / no sponsorship required',
      remotePreference: 'Remote, EU timezone',
      salaryExpectationMin: 280000, salaryExpectationMax: 350000, salaryCurrency: 'EUR',
    },
    summary: 'SVP Product with 19 years combined logistics operations (10 yrs) and product management (9 yrs) experience.',
    targetTitles: ['VP Product', 'Head of Product', 'Senior Director of Product', 'Chief Product Officer'],
    targetDomains: ['B2B SaaS', 'logistics tech', 'supply chain', 'TMS platforms', 'fintech/payments infrastructure'],
    experience: [{
      company: 'Freightos', title: 'SVP Product', startDate: '', endDate: 'present',
      bullets: ['Lead a 25-person product organization, $18M ARR scope'],
    }],
    education: [{ degree: "Master's, International Economics and Logistics", school: '', year: '' }],
    skills: {
      product: ['Product strategy', 'Roadmapping', 'B2B SaaS', 'Platform/API products'],
      domain: ['Freight/logistics operations', 'Supply chain', 'Payments'],
      leadership: ['Org scaling', 'Cross-functional leadership', 'Stakeholder management'],
      languages: ['English (fluent)', 'Spanish (fluent)'],
    },
  }
}

export default router
