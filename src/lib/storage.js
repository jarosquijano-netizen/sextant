const DEFAULT_PROFILE = {
  personal: {
    firstName: 'Joe',
    lastName: '',
    email: '',
    phone: '',
    location: 'Barcelona, Spain',
    linkedinUrl: '',
    workAuthorization: 'EU citizen / no sponsorship required',
    remotePreference: 'Remote, EU timezone',
    salaryExpectationMin: 280000,
    salaryExpectationMax: 350000,
    salaryCurrency: 'EUR',
  },
  summary:
    'SVP Product with 19 years combined logistics operations (10 yrs) and product management (9 yrs) experience. Currently leads a 25-person product org responsible for $18M ARR at Freightos (NASDAQ: CRGO). Master\'s in International Economics and Logistics.',
  targetTitles: ['VP Product', 'Head of Product', 'Senior Director of Product', 'Chief Product Officer'],
  targetDomains: ['B2B SaaS', 'logistics tech', 'supply chain', 'TMS platforms', 'fintech/payments infrastructure'],
  experience: [
    {
      company: 'Freightos',
      title: 'SVP Product',
      startDate: '',
      endDate: 'present',
      bullets: ['Lead a 25-person product organization, $18M ARR scope'],
    },
  ],
  education: [{ degree: "Master's, International Economics and Logistics", school: '', year: '' }],
  skills: {
    product: ['Product strategy', 'Roadmapping', 'B2B SaaS', 'Platform/API products'],
    domain: ['Freight/logistics operations', 'Supply chain', 'Payments'],
    leadership: ['Org scaling', 'Cross-functional leadership', 'Stakeholder management'],
    languages: ['English (fluent)', 'Spanish (fluent)'],
  },
  commonAnswers: {
    whyThisCompany: '',
    whyLeavingCurrentRole: '',
    noticePeriod: '',
  },
}

function storageGet(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
      else resolve(result)
    })
  })
}

function storageSet(data) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(data, () => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
      else resolve()
    })
  })
}

export async function getProfile() {
  const result = await storageGet(['profile'])
  return result.profile || DEFAULT_PROFILE
}

export async function setProfile(profile) {
  await storageSet({ profile })
}

export async function getPipeline() {
  const result = await storageGet(['pipeline'])
  return result.pipeline || []
}

export async function addToPipeline(job) {
  const pipeline = await getPipeline()
  const newJob = { ...job, id: Date.now(), dateSaved: new Date().toISOString(), status: 'Saved' }
  pipeline.push(newJob)
  await storageSet({ pipeline })
  return newJob
}

export async function updatePipelineJob(id, updates) {
  const pipeline = await getPipeline()
  const idx = pipeline.findIndex((j) => j.id === id)
  if (idx === -1) return false
  pipeline[idx] = { ...pipeline[idx], ...updates }
  await storageSet({ pipeline })
  return true
}

export async function getSettings() {
  const result = await storageGet(['settings'])
  return result.settings || { apiKey: '', aiEnabled: false }
}

export async function setSettings(settings) {
  await storageSet({ settings })
}
